import { Badge } from '../UI/Badge'
import { formatCategory, formatSeverity, formatTimeAgo } from '../../utils/formatters'

export function ReportCard({ report }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5">
      <div className="flex gap-2 items-center flex-wrap">
        <Badge label={formatSeverity(report.severity)} variant={report.severity} />
        <Badge label={formatCategory(report.category)} variant="default" />
        <Badge label={report.status} variant={report.status === 'resolved' ? 'resolved' : 'active'} />
      </div>
      <p className="text-gray-900 text-sm font-semibold">{report.location_label || 'Unknown location'}</p>
      <p className="text-gray-400 text-xs">{formatTimeAgo(report.created_at)}</p>
    </div>
  )
}
