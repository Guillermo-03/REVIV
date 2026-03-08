import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchAllEvents } from '../../api/events'
import { useGeoLocation } from '../../hooks/useGeoLocation'
import { haversineDistance, geoJSONToCoords } from '../../utils/geo'
import { formatDateTime, formatDuration } from '../../utils/formatters'
import { Spinner } from './Spinner'

const STATUS_META = {
  open:        { dot: 'bg-brand-teal',  label: 'Open',        text: 'text-brand-teal',  bg: 'bg-brand-teal/15'  },
  in_progress: { dot: 'bg-sky-400',     label: 'In Progress', text: 'text-sky-400',     bg: 'bg-sky-400/15'     },
  full:        { dot: 'bg-amber-400',   label: 'Full',        text: 'text-amber-400',   bg: 'bg-amber-400/15'   },
  completed:   { dot: 'bg-violet-400',  label: 'Completed',   text: 'text-violet-400',  bg: 'bg-violet-400/15'  },
  resolved:    { dot: 'bg-gray-400',    label: 'Resolved',    text: 'text-gray-400',    bg: 'bg-gray-400/15'    },
}

const FILTERS = [
  { key: 'all',         label: 'All'         },
  { key: 'open',        label: 'Open'        },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'full',        label: 'Full'        },
  { key: 'completed',   label: 'Completed'   },
]

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function EventRow({ event, distanceKm }) {
  const m = STATUS_META[event.status] || STATUS_META.open
  return (
    <Link
      to={`/events/${event.id}`}
      className="group flex flex-col gap-1 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-white text-sm font-medium leading-snug group-hover:text-brand-teal transition-colors line-clamp-1">
          {event.name}
        </span>
        <span className={`flex items-center gap-1 shrink-0 text-xs font-medium ${m.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${m.dot} inline-block`} />
          {m.label}
        </span>
      </div>

      {event.location_label && (
        <span className="text-gray-500 text-xs line-clamp-1">{event.location_label}</span>
      )}

      <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
        <span>{formatDateTime(event.date_time)}</span>
        <span>·</span>
        <span>{formatDuration(event.duration_minutes)}</span>
        <span>·</span>
        <span className="text-brand-teal">{event.attendee_count ?? 0} volunteers</span>
        {distanceKm != null && (
          <>
            <span>·</span>
            <span className="text-violet-400">{formatDistance(distanceKm)} away</span>
          </>
        )}
      </div>
    </Link>
  )
}

export function EventsPanel({ open, onClose }) {
  const panelRef = useRef(null)
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('date')  // 'date' | 'nearest'
  const { location } = useGeoLocation()

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events-all'],
    queryFn: fetchAllEvents,
    staleTime: 60000,
    enabled: open,
  })

  // Reset filter/sort when panel closes
  useEffect(() => {
    if (!open) { setFilter('all'); setSort('date') }
  }, [open])

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Attach distance to every event (null when no location)
  const eventsWithDist = useMemo(() => events.map(ev => {
    if (!location || !ev.location) return { ev, dist: null }
    const { lat, lng } = geoJSONToCoords(ev.location)
    return { ev, dist: haversineDistance(location.lat, location.lng, lat, lng) }
  }), [events, location])

  // Filter
  const filtered = useMemo(() =>
    filter === 'all'
      ? eventsWithDist
      : eventsWithDist.filter(({ ev }) => ev.status === filter),
    [eventsWithDist, filter]
  )

  // Sort
  const sorted = useMemo(() => {
    if (sort === 'nearest' && location) {
      return [...filtered].sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
    }
    return [...filtered].sort((a, b) => new Date(a.ev.date_time) - new Date(b.ev.date_time))
  }, [filtered, sort, location])

  // Status counts for chips
  const counts = useMemo(() => {
    const c = {}
    events.forEach(ev => { c[ev.status] = (c[ev.status] ?? 0) + 1 })
    return c
  }, [events])

  return (
    <div
      ref={panelRef}
      className={`absolute top-full right-0 mt-2 w-80 md:w-[26rem] rounded-xl border border-white/10 bg-[#0d1627] backdrop-blur-lg shadow-2xl shadow-black/60 overflow-hidden z-50 transition-all duration-200 origin-top-right ${
        open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'
      }`}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h3 className="text-white font-semibold text-sm">Events</h3>
          {!isLoading && (
            <p className="text-gray-500 text-xs mt-0.5">
              {sorted.length} of {events.length} showing
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* ── Status chips ─────────────────────────────────────────── */}
      {!isLoading && events.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-white/5">
          {Object.entries(STATUS_META).map(([key, m]) =>
            counts[key] ? (
              <span key={key} className={`flex items-center gap-1 text-xs ${m.bg} ${m.text} px-2 py-0.5 rounded-full`}>
                <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                {counts[key]} {m.label}
              </span>
            ) : null
          )}
        </div>
      )}

      {/* ── Filter tabs ──────────────────────────────────────────── */}
      {!isLoading && events.length > 0 && (
        <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 overflow-x-auto no-scrollbar">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
                filter === key
                  ? 'bg-brand-teal text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
              {key !== 'all' && counts[key] ? (
                <span className="ml-1 opacity-70">({counts[key]})</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {/* ── Sort toggle ──────────────────────────────────────────── */}
      {!isLoading && events.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
          <span className="text-gray-500 text-xs">Sort:</span>
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              onClick={() => setSort('date')}
              className={`text-xs px-3 py-1 transition-colors ${
                sort === 'date' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Date
            </button>
            <button
              onClick={() => setSort('nearest')}
              disabled={!location}
              title={!location ? 'Enable location services to sort by distance' : undefined}
              className={`flex items-center gap-1 text-xs px-3 py-1 border-l border-white/10 transition-colors ${
                sort === 'nearest'
                  ? 'bg-white/10 text-white'
                  : location
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Nearest
              {!location && <span className="text-gray-600 text-xs">(no location)</span>}
            </button>
          </div>
          {sort === 'nearest' && location && (
            <span className="text-green-400 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Using your location
            </span>
          )}
        </div>
      )}

      {/* ── List ─────────────────────────────────────────────────── */}
      <div className="max-h-[52vh] overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-3xl">🌿</span>
            <p className="text-gray-400 text-sm">
              {events.length === 0 ? 'No events right now' : 'No events match this filter'}
            </p>
            {events.length === 0 && (
              <p className="text-gray-600 text-xs">Be the first to organise a cleanup!</p>
            )}
          </div>
        )}

        {!isLoading && sorted.map(({ ev, dist }) => (
          <EventRow
            key={ev.id}
            event={ev}
            distanceKm={sort === 'nearest' && dist != null ? dist : null}
          />
        ))}
      </div>
    </div>
  )
}
