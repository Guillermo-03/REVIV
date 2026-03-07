import { Link } from 'react-router-dom'
import { Badge } from '../UI/Badge'
import { formatDateTime, formatDuration } from '../../utils/formatters'

export function EventCard({ event }) {
  return (
    <Link to={`/events/${event.id}`} className="block bg-brand-blue/40 border border-brand-sky/20 rounded-lg p-3 hover:border-brand-teal/50 transition-colors space-y-1">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white text-sm font-medium">{event.name}</p>
        <Badge label={event.status} variant={event.status} />
      </div>
      <p className="text-gray-400 text-xs">{event.location_label}</p>
      <p className="text-gray-400 text-xs">{formatDateTime(event.date_time)} · {formatDuration(event.duration_minutes)}</p>
      <p className="text-brand-teal text-xs">{event.attendee_count ?? 0} volunteers</p>
    </Link>
  )
}
