import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useGlobeStore } from '../../stores/globeStore'
import { useAuthStore } from '../../stores/authStore'
import { getReport, upvoteReport } from '../../api/reports'
import { Badge } from '../UI/Badge'
import { Spinner } from '../UI/Spinner'
import { ProgressiveImage } from '../UI/ProgressiveImage'
import { formatSeverity, formatCategory, formatTimeAgo, formatDateTime } from '../../utils/formatters'

const HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export function DetailPanel({ onCreateEvent }) {
  const { selectedMarker, panelOpen, closePanel } = useGlobeStore()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()

  const isReport = selectedMarker?.type === 'report'
  const isEvent = selectedMarker?.type === 'event'

  const { data: report, isLoading } = useQuery({
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

  return (
    <div
      style={{ fontFamily: HELVETICA }}
      className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-[#111111]/97 backdrop-blur-md border-l border-white/10 z-40 transform transition-transform duration-300 flex flex-col ${
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
        {isLoading && (
          <div className="flex justify-center mt-8">
            <Spinner />
          </div>
        )}

        {isReport && report && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge label={formatSeverity(report.severity)} variant={report.severity} />
              <Badge label={formatCategory(report.category)} variant="default" />
              <Badge label={report.status === 'resolved' ? 'Resolved' : 'Active'} variant={report.status === 'resolved' ? 'resolved' : 'active'} />
            </div>

            <div>
              <p className="text-emerald-400 text-sm font-medium">{report.location_label || 'Location'}</p>
              <p className="text-gray-500 text-xs mt-0.5">{formatTimeAgo(report.created_at)}</p>
            </div>

            {report.description && (
              <p className="text-gray-300 text-sm leading-relaxed">{report.description}</p>
            )}

            {(() => {
              const viewable = (report.photo_urls ?? []).filter((url) =>
                /\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(url)
              )
              if (viewable.length === 0) return (
                <div className="flex items-center justify-center h-20 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-gray-500">No photo attached</span>
                </div>
              )
              return (
                <div className="grid grid-cols-2 gap-2">
                  {viewable.map((url, i) => (
                    <ProgressiveImage key={i} src={url} alt={`Report photo ${i + 1}`} />
                  ))}
                </div>
              )
            })()}

            {report.submitted_by && (
              <p className="text-gray-500 text-xs">
                Reported by <span className="text-gray-300">{report.submitted_by.display_name || 'Anonymous'}</span>
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => upvoteMutation.mutate()}
                disabled={upvoteMutation.isPending}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  hasUpvoted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {hasUpvoted ? '▲' : '△'} {report.upvote_count ?? 0}
              </button>
              {report.status === 'active' && (
                <button
                  onClick={() => onCreateEvent && onCreateEvent(report)}
                  className="flex-1 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-semibold px-3 py-1.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  + Create Event Here
                </button>
              )}
            </div>
          </div>
        )}

        {isEvent && selectedMarker && (
          <div className="space-y-3">
            <h3 className="text-white font-semibold text-lg">{selectedMarker.name}</h3>
            <Badge label={selectedMarker.status} variant={selectedMarker.status} />
            <p className="text-gray-400 text-sm">{selectedMarker.location_label}</p>
            {(selectedMarker.status === 'completed' || selectedMarker.status === 'resolved') && selectedMarker.completed_at && (
              <p className="text-amber-400 text-xs">
                ⚠ This event will be removed from the map at{' '}
                {formatDateTime(new Date(new Date(selectedMarker.completed_at).getTime() + 24 * 60 * 60 * 1000))}
              </p>
            )}
            <Link
              to={`/events/${selectedMarker.id}`}
              onClick={closePanel}
              className="block w-full text-center bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold px-4 py-2.5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
            >
              View Details →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
