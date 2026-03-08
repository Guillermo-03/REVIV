import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getEvent, joinEvent, leaveEvent, completeEvent, confirmEvent } from '../api/events'
import { useAuthStore } from '../stores/authStore'
import { Badge } from '../components/UI/Badge'
import { Spinner } from '../components/UI/Spinner'
import { Nav } from '../components/UI/Nav'
import { formatDateTime, formatDuration } from '../utils/formatters'

const HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function EventDetailPage() {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [photoFiles, setPhotoFiles] = useState([])

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => getEvent(id),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['event', id] })
    queryClient.invalidateQueries({ queryKey: ['events'] })
  }

  const joinMut = useMutation({
    mutationFn: () => joinEvent(id),
    onSuccess: () => { toast.success('Joined event!'); invalidate() },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to join'),
  })
  const leaveMut = useMutation({
    mutationFn: () => leaveEvent(id),
    onSuccess: () => { toast.success('Left event'); invalidate() },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to leave'),
  })
  const completeMut = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      photoFiles.forEach((f) => fd.append('photos', f))
      return completeEvent(id, fd)
    },
    onSuccess: () => { toast.success('Event marked complete!'); invalidate() },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to complete'),
  })
  const confirmMut = useMutation({
    mutationFn: () => confirmEvent(id),
    onSuccess: () => { toast.success('Confirmed clean!'); invalidate() },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to confirm'),
  })

  if (isLoading) {
    return (
      <div
        style={{ background: 'radial-gradient(ellipse at center, #2d2d2d 0%, #111111 100%)', minHeight: '100vh' }}
        className="flex items-center justify-center"
      >
        <Spinner size="lg" />
      </div>
    )
  }
  if (!event) {
    return (
      <div
        style={{ background: 'radial-gradient(ellipse at center, #2d2d2d 0%, #111111 100%)', minHeight: '100vh' }}
        className="flex items-center justify-center"
      >
        <p className="text-gray-400">Event not found.</p>
      </div>
    )
  }

  const isOrganizer = event.organizer_id === user?.id
  const isAttending = event.attendee_ids?.includes(user?.id)
  const isWaitlisted = event.waitlist_ids?.includes(user?.id)
  const hasConfirmed = event.resolution_confirmations?.includes(user?.id)
  const confirmCount = event.resolution_confirmations?.length ?? 0
  const attendeeCount = event.attendee_ids?.length ?? 0

  return (
    <div
      style={{ background: 'radial-gradient(ellipse at center, #2d2d2d 0%, #111111 100%)', minHeight: '100vh' }}
      className="relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none" />
      <Nav />

      <div className="relative pt-16 max-w-2xl mx-auto px-4 py-8" style={{ fontFamily: HELVETICA }}>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-block font-medium transition-colors">
          ← Back to Globe
        </Link>

        {/* Main card */}
        <div className="bg-white/95 backdrop-blur-md shadow-2xl border border-white/20 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <Badge label={event.status} variant={event.status} />
          </div>

          <div className="space-y-1.5 text-sm">
            <p className="text-gray-600"><span className="text-gray-400 font-medium">When: </span>{formatDateTime(event.date_time)} · {formatDuration(event.duration_minutes)}</p>
            <p className="text-gray-600"><span className="text-gray-400 font-medium">Where: </span>{event.location_label}</p>
            <p>
              <span className="text-gray-400 font-medium text-sm">Volunteers: </span>
              <span className="text-emerald-600 font-semibold">{attendeeCount}</span>
              {event.max_volunteers && <span className="text-gray-400"> / {event.max_volunteers}</span>}
            </p>
            {event.organizer && (
              <p className="text-gray-600"><span className="text-gray-400 font-medium">Organizer: </span>{event.organizer?.display_name}</p>
            )}
          </div>

          {event.description && (
            <div>
              <h3 className="text-gray-900 font-semibold mb-1">About</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {event.what_to_bring && (
            <div>
              <h3 className="text-gray-900 font-semibold mb-1">What to Bring</h3>
              <p className="text-gray-600 text-sm">{event.what_to_bring}</p>
            </div>
          )}

          {event.post_cleanup_photos?.length > 0 && (
            <div>
              <h3 className="text-gray-900 font-semibold mb-2">After Photos</h3>
              <div className="grid grid-cols-3 gap-2">
                {event.post_cleanup_photos.map((url, i) => (
                  <img key={i} src={url} alt="After" className="w-full h-24 object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {event.status === 'completed' && (
            <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
              Confirmations: <span className="text-emerald-600 font-semibold">{confirmCount} / {attendeeCount}</span> attendees confirmed clean
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 space-y-2">
            {!isOrganizer && event.status !== 'completed' && event.status !== 'resolved' && (
              <>
                {isAttending && (
                  <button
                    onClick={() => leaveMut.mutate()}
                    disabled={leaveMut.isPending}
                    className="w-full border border-red-400 text-red-500 hover:bg-red-50 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {leaveMut.isPending && <Spinner size="sm" />} Leave Event
                  </button>
                )}
                {isWaitlisted && (
                  <button
                    onClick={() => leaveMut.mutate()}
                    disabled={leaveMut.isPending}
                    className="w-full border border-orange-400 text-orange-500 hover:bg-orange-50 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {leaveMut.isPending && <Spinner size="sm" />} Leave Waitlist
                  </button>
                )}
                {!isAttending && !isWaitlisted && (
                  <button
                    onClick={() => joinMut.mutate()}
                    disabled={joinMut.isPending}
                    className="w-full bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {joinMut.isPending && <Spinner size="sm" />}
                    {event.status === 'full' ? 'Join Waitlist' : 'Join Event'}
                  </button>
                )}
              </>
            )}

            {isOrganizer && (event.status === 'open' || event.status === 'full' || event.status === 'in_progress') && (
              <div className="space-y-2">
                <label className="block text-sm text-gray-500 font-medium">Add after photos (optional)</label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setPhotoFiles(Array.from(e.target.files))}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:font-medium file:cursor-pointer hover:file:bg-gray-200"
                />
                <button
                  onClick={() => completeMut.mutate()}
                  disabled={completeMut.isPending}
                  className="w-full bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {completeMut.isPending && <Spinner size="sm" />} Mark Event Complete
                </button>
              </div>
            )}

            {isAttending && event.status === 'completed' && !hasConfirmed && (
              <button
                onClick={() => confirmMut.mutate()}
                disabled={confirmMut.isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {confirmMut.isPending && <Spinner size="sm" />} Confirm Area is Clean
              </button>
            )}
            {hasConfirmed && (
              <p className="text-center text-green-600 text-sm font-semibold">✓ You confirmed this area is clean</p>
            )}

            {event.status === 'resolved' && (
              <div className="text-center py-2">
                <Badge label="Resolved" variant="resolved" />
                <p className="text-gray-400 text-xs mt-1">This cleanup has been verified complete</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendees list */}
        {event.attendees?.length > 0 && (
          <div className="mt-4 bg-white/95 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl">
            <h3 className="text-gray-900 font-semibold mb-2">Volunteers ({attendeeCount})</h3>
            <div className="flex flex-wrap gap-2">
              {event.attendees.map((a) => (
                <span key={a.id} className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {a.display_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
