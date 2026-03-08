import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useGlobeStore } from '../../stores/globeStore'
import { useAuthStore } from '../../stores/authStore'
import { getReport, upvoteReport } from '../../api/reports'
import { getEvent, joinEvent, leaveEvent } from '../../api/events'
import { Badge } from '../UI/Badge'
import { Spinner } from '../UI/Spinner'
import { ProgressiveImage } from '../UI/ProgressiveImage'
import { formatSeverity, formatCategory, formatTimeAgo, formatDateTime, formatDuration } from '../../utils/formatters'

const HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export function DetailPanel({ onCreateEvent }) {
  const { selectedMarker, panelOpen, closePanel } = useGlobeStore()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const isReport = selectedMarker?.type === 'report'
  const isEvent = selectedMarker?.type === 'event'

  // ── Report data ──────────────────────────────────────────────────
  const { data: report, isLoading: reportLoading, isError: reportError } = useQuery({
    queryKey: ['report', selectedMarker?.id],
    queryFn: () => getReport(selectedMarker.id),
    enabled: isReport && !!selectedMarker?.id,
  })

  const upvoteMutation = useMutation({
    mutationFn: () => upvoteReport(selectedMarker.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report', selectedMarker?.id] }),
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to upvote'),
  })

  const hasUpvoted = report?.upvotes?.includes(user?.id)

  // ── Event data ───────────────────────────────────────────────────
  const { data: event, isLoading: eventLoading, isError: eventError } = useQuery({
    queryKey: ['event', selectedMarker?.id],
    queryFn: () => getEvent(selectedMarker.id),
    enabled: isEvent && !!selectedMarker?.id,
  })

  const joinMutation = useMutation({
    mutationFn: () => joinEvent(selectedMarker.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', selectedMarker?.id] })
      queryClient.invalidateQueries({ queryKey: ['events-all'] })
      toast.success('You joined the event!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Could not join event'),
  })

  const leaveMutation = useMutation({
    mutationFn: () => leaveEvent(selectedMarker.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', selectedMarker?.id] })
      queryClient.invalidateQueries({ queryKey: ['events-all'] })
      toast.success('You left the event')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Could not leave event'),
  })

  const isAttending = event?.attendee_ids?.includes(user?.id)
  const isOrganizer = event?.organizer_id === user?.id
  const canJoin = ['open', 'in_progress'].includes(event?.status)
  const isBusy = joinMutation.isPending || leaveMutation.isPending

  return (
    <div
      style={{ fontFamily: HELVETICA, zIndex: 9999 }}
      className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-[#111111]/97 backdrop-blur-md border-l border-white/10 transform transition-transform duration-300 flex flex-col ${
        panelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Collapse tab */}
      <button
        onClick={closePanel}
        className={`absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-16 bg-[#111111]/97 border border-white/10 border-r-0 rounded-l-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-colors ${panelOpen ? '' : 'hidden'}`}
        aria-label="Close panel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Header */}
      <div className="flex items-center px-5 py-4 border-b border-white/10">
        <h2 className="text-white font-semibold text-sm tracking-wide">
          {isReport ? 'Litter Report' : isEvent ? 'Cleanup Event' : 'Details'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-5">

        {/* ── Report view ──
             Use selectedMarker directly — it already has the full report object
             (both map markers and sidebar rows spread the complete API response).
             The getReport fetch only adds submitter info on top.              */}
        {isReport && reportError && (
          <div className="flex flex-col items-center justify-center mt-12 gap-2 text-center px-4">
            <p className="text-red-400 text-sm font-medium">Failed to load report</p>
            <p className="text-gray-600 text-xs">Please close and try again</p>
          </div>
        )}

        {isReport && !reportError && !selectedMarker?.category && (
          <div className="flex justify-center mt-8"><Spinner /></div>
        )}

        {isReport && selectedMarker?.category && (() => {
          // Prefer enriched data from fetch, fall back to selectedMarker
          const r = report ?? selectedMarker
          const submitterName = report?.submitter?.display_name ?? null

          const viewable = (r.photo_urls ?? []).filter((url) =>
            url && (url.startsWith('data:image/') || /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(url))
          )

          return (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge label={formatSeverity(r.severity)} variant={r.severity} />
                <Badge label={formatCategory(r.category)} variant="default" />
                <Badge label={r.status === 'resolved' ? 'Resolved' : 'Active'} variant={r.status === 'resolved' ? 'resolved' : 'active'} />
              </div>

              <div>
                <p className="text-emerald-400 text-sm font-medium">{r.location_label || 'Location'}</p>
                <p className="text-gray-500 text-xs mt-0.5">{formatTimeAgo(r.created_at)}</p>
              </div>

              {r.description ? (
                <div>
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Description</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{r.description}</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">No description provided.</p>
              )}

              {viewable.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {viewable.map((url, i) => (
                    <ProgressiveImage key={i} src={url} alt={`Report photo ${i + 1}`} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-500">No photo attached</span>
                </div>
              )}

              {submitterName && (
                <p className="text-gray-500 text-xs">
                  Reported by <span className="text-gray-300">{submitterName}</span>
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => upvoteMutation.mutate()}
                  disabled={upvoteMutation.isPending}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    hasUpvoted ? 'bg-emerald-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {hasUpvoted ? '▲' : '△'} {r.upvote_count ?? 0}
                </button>
                {r.status === 'active' && (
                  <button
                    onClick={() => onCreateEvent && onCreateEvent(r)}
                    className="flex-1 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    + Create Event Here
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Event view ── */}
        {isEvent && eventError && (
          <div className="flex flex-col items-center justify-center mt-12 gap-2 text-center px-4">
            <p className="text-red-400 text-sm font-medium">Failed to load event</p>
            <p className="text-gray-600 text-xs">Please close and try again</p>
          </div>
        )}

        {eventLoading && isEvent && !eventError && <div className="flex justify-center mt-8"><Spinner /></div>}

        {isEvent && event && (
          <div className="space-y-4">
            {/* Name + status */}
            <div>
              <h3 className="text-white font-bold text-lg leading-snug">{event.name}</h3>
              <div className="mt-1.5">
                <Badge label={event.status?.replace('_', ' ')} variant={event.status} />
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-col gap-1.5 text-sm">
              {event.location_label && (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <span>{event.location_label}</span>
                </div>
              )}
              {event.date_time && (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
                  </svg>
                  <span>{formatDateTime(event.date_time)}</span>
                </div>
              )}
              {event.duration_minutes && (
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formatDuration(event.duration_minutes)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400">
                <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span>
                  {event.attendee_count ?? event.attendee_ids?.length ?? 0} volunteer{event.max_volunteers ? ` / ${event.max_volunteers} max` : 's'}
                </span>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">About</p>
                <p className="text-gray-300 text-sm leading-relaxed">{event.description}</p>
              </div>
            )}

            {/* What to bring */}
            {event.what_to_bring && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">What to bring</p>
                <p className="text-gray-300 text-sm leading-relaxed">{event.what_to_bring}</p>
              </div>
            )}

            {/* Completed warning */}
            {(event.status === 'completed' || event.status === 'resolved') && event.completed_at && (
              <p className="text-amber-400 text-xs bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                ⚠ This event will be removed from the map 24 hours after completion.
              </p>
            )}

            {/* Join / Leave / View */}
            <div className="flex flex-col gap-2 pt-1">
              {!isOrganizer && canJoin && (
                isAttending ? (
                  <button
                    onClick={() => leaveMutation.mutate()}
                    disabled={isBusy}
                    className="w-full bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-gray-300 hover:text-red-400 text-sm font-semibold px-4 py-2.5 rounded-lg transition-all disabled:opacity-60"
                  >
                    {leaveMutation.isPending ? 'Leaving…' : '✓ Joined — Leave Event'}
                  </button>
                ) : (
                  <button
                    onClick={() => joinMutation.mutate()}
                    disabled={isBusy || event.status === 'full'}
                    className="w-full bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {joinMutation.isPending ? 'Joining…' : event.status === 'full' ? 'Event Full' : 'Join Event'}
                  </button>
                )
              )}

              {isOrganizer && (
                <p className="text-center text-emerald-400 text-xs font-medium py-1">You're organising this event</p>
              )}

              <Link
                to={`/events/${event.id}`}
                onClick={closePanel}
                className="block w-full text-center bg-white/8 hover:bg-white/12 border border-white/10 text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                View Full Details →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
