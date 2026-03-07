import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useGlobeStore } from '../../stores/globeStore'
import { useAuthStore } from '../../stores/authStore'
import { getReport, upvoteReport } from '../../api/reports'
import { Badge } from '../UI/Badge'
import { Spinner } from '../UI/Spinner'
import { formatSeverity, formatCategory, formatTimeAgo, formatDateTime } from '../../utils/formatters'

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
      className={`fixed top-0 right-0 h-full w-80 md:w-96 bg-brand-blue/95 backdrop-blur-md border-l border-brand-sky/30 z-40 transform transition-transform duration-300 flex flex-col ${
        panelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Collapse arrow tab on the left edge */}
      <button
        onClick={closePanel}
        className={`absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-16 bg-brand-blue/95 border border-brand-sky/30 border-r-0 rounded-l-lg flex items-center justify-center text-gray-300 hover:text-white hover:bg-brand-sky/20 transition-colors ${panelOpen ? '' : 'hidden'}`}
        aria-label="Close panel"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="flex items-center p-4 border-b border-brand-sky/20">
        <h2 className="text-white font-semibold">
          {isReport ? 'Litter Report' : isEvent ? 'Cleanup Event' : 'Details'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
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
              <p className="text-brand-teal text-sm font-medium">{report.location_label || 'Location'}</p>
              <p className="text-gray-400 text-xs">{formatTimeAgo(report.created_at)}</p>
            </div>

            {report.description && (
              <p className="text-gray-200 text-sm leading-relaxed">{report.description}</p>
            )}

            {report.photo_urls?.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {report.photo_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt="Report photo"
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}

            {report.submitted_by && (
              <p className="text-gray-400 text-xs">
                Reported by <span className="text-gray-200">{report.submitted_by.display_name || 'Anonymous'}</span>
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => upvoteMutation.mutate()}
                disabled={upvoteMutation.isPending}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  hasUpvoted
                    ? 'bg-brand-teal text-white'
                    : 'bg-brand-sky/20 text-gray-300 hover:bg-brand-sky/30'
                }`}
              >
                {hasUpvoted ? '▲' : '△'} {report.upvote_count ?? 0}
              </button>
              {report.status === 'active' && (
                <button
                  onClick={() => onCreateEvent && onCreateEvent(report)}
                  className="flex-1 bg-brand-teal hover:bg-brand-green text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
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
              <p className="text-yellow-400 text-xs">
                ⚠ This event will be removed from the map at{' '}
                {formatDateTime(new Date(new Date(selectedMarker.completed_at).getTime() + 24 * 60 * 60 * 1000))}
              </p>
            )}
            <Link
              to={`/events/${selectedMarker.id}`}
              onClick={closePanel}
              className="block w-full text-center bg-brand-teal hover:bg-brand-green text-white font-medium px-4 py-2 rounded-lg transition-colors mt-4"
            >
              View Details →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
