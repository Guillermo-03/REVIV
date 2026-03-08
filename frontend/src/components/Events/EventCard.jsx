import { Link } from 'react-router-dom'
import { Badge } from '../UI/Badge'
import { formatDateTime, formatDuration } from '../../utils/formatters'

export function EventCard({ event }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="block bg-gray-50 border border-gray-200 rounded-xl p-3 hover:border-emerald-400/60 hover:shadow-md transition-all space-y-1"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-gray-900 text-sm font-semibold">{event.name}</p>
        <Badge label={event.status} variant={event.status} />
      </div>
      <p className="text-gray-500 text-xs">{event.location_label}</p>
      <p className="text-gray-500 text-xs">{formatDateTime(event.date_time)} · {formatDuration(event.duration_minutes)}</p>
      <p className="text-emerald-600 text-xs font-medium">{event.attendee_count ?? 0} volunteers</p>
    </Link>
  )
}
