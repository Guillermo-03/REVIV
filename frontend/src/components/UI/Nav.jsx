import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useNotifications } from '../../hooks/useNotifications'
import { EventsPanel } from './EventsPanel'

export function Nav() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()
  const [eventsOpen, setEventsOpen] = useState(false)
  const eventsAnchorRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-brand-blue/80 backdrop-blur-md border-b border-brand-sky/20">
      <Link to="/" className="text-white font-bold text-xl tracking-tight">
        <span className="text-brand-teal">RE</span>VIV
      </Link>

      <div className="flex items-center gap-4">
        {/* Events dropdown anchor */}
        <div ref={eventsAnchorRef} className="relative">
          <button
            onClick={() => setEventsOpen(v => !v)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              eventsOpen
                ? 'bg-brand-teal/20 text-brand-teal'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Events
            <svg className={`w-3 h-3 transition-transform duration-200 ${eventsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <EventsPanel open={eventsOpen} onClose={() => setEventsOpen(false)} />
        </div>

        <Link to="/notifications" className="relative text-gray-300 hover:text-white">
          <span className="text-lg">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
        <Link to="/profile" className="text-gray-300 hover:text-white text-sm">
          {user?.display_name || 'Profile'}
        </Link>
        <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 text-sm transition-colors">
          Logout
        </button>
      </div>
    </nav>
  )
}
