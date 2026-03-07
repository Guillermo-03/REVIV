import { Badge } from '../UI/Badge'
import { formatCategory, formatSeverity, formatTimeAgo } from '../../utils/formatters'

export function ReportCard({ report }) {
  return (
    <div className="bg-brand-blue/40 border border-brand-sky/20 rounded-lg p-3 space-y-1">
      <div className="flex gap-2 items-center">
        <Badge label={formatSeverity(report.severity)} variant={report.severity} />
        <Badge label={formatCategory(report.category)} variant="default" />
        <Badge label={report.status} variant={report.status === 'resolved' ? 'resolved' : 'active'} />
      </div>
      <p className="text-white text-sm font-medium">{report.location_label || 'Unknown location'}</p>
      <p className="text-gray-400 text-xs">{formatTimeAgo(report.created_at)}</p>
    </div>
  )
}
