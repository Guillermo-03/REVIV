import { Link } from 'react-router-dom'
import { Nav } from '../components/UI/Nav'
import { useNotifications } from '../hooks/useNotifications'
import { formatTimeAgo } from '../utils/formatters'
import { Spinner } from '../components/UI/Spinner'

const HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif"

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
    <div
      style={{ background: 'radial-gradient(ellipse at center, #2d2d2d 0%, #111111 100%)', minHeight: '100vh' }}
      className="relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none" />
      <Nav />

      <div className="relative pt-16 max-w-2xl mx-auto px-4 py-8" style={{ fontFamily: HELVETICA }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white font-bold text-xl">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors flex items-center gap-1"
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
                className={`bg-white border rounded-xl p-4 flex gap-3 shadow-md transition-all ${
                  n.is_read
                    ? 'border-gray-100 opacity-60'
                    : 'border-emerald-300/50 ring-1 ring-emerald-400/20'
                }`}
              >
                <span className="text-xl">{TYPE_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1">
                  <p className="text-gray-900 text-sm">{n.message}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{formatTimeAgo(n.created_at)}</p>
                  {n.related_event_id && (
                    <Link
                      to={`/events/${n.related_event_id}`}
                      className="text-emerald-500 hover:text-emerald-600 text-xs mt-1 inline-block font-medium"
                    >
                      View Event →
                    </Link>
                  )}
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    className="text-gray-400 hover:text-emerald-500 text-xs shrink-0 transition-colors"
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
