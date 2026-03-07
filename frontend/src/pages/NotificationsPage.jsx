import { Link } from 'react-router-dom'
import { Nav } from '../components/UI/Nav'
import { useNotifications } from '../hooks/useNotifications'
import { formatTimeAgo } from '../utils/formatters'
import { Spinner } from '../components/UI/Spinner'

const TYPE_ICONS = {
  event_reminder: '⏰',
  new_nearby_event: '📍',
  event_updated: '📝',
  report_linked: '🔗',
  post_event_confirm: '✅',
}

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications()

  return (
    <div className="min-h-screen bg-brand-blue">
      <Nav />
      <div className="pt-16 max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white font-bold text-xl">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-brand-teal text-sm hover:underline flex items-center gap-1"
            >
              {markAllRead.isPending && <Spinner size="sm" />}
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">🔔</p>
            <p>No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`bg-brand-blue/60 border rounded-xl p-4 flex gap-3 transition-colors ${
                  n.is_read
                    ? 'border-brand-sky/10 opacity-70'
                    : 'border-brand-teal/40 bg-brand-teal/5'
                }`}
              >
                <span className="text-xl">{TYPE_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1">
                  <p className="text-white text-sm">{n.message}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{formatTimeAgo(n.created_at)}</p>
                  {n.related_event_id && (
                    <Link
                      to={`/events/${n.related_event_id}`}
                      className="text-brand-teal text-xs hover:underline mt-1 inline-block"
                    >
                      View Event →
                    </Link>
                  )}
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    className="text-gray-500 hover:text-brand-teal text-xs shrink-0"
                  >
                    ✓
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
