import { EventCard } from './EventCard'

export function EventList({ events }) {
  if (!events?.length) {
    return <p className="text-gray-400 text-sm text-center py-4">No events found.</p>
  }
  return (
    <div className="space-y-2">
      {events.map((e) => <EventCard key={e.id} event={e} />)}
    </div>
  )
}
