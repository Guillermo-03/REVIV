import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useNotifications } from '../../hooks/useNotifications'
import { EventsPanel } from './EventsPanel'

const HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif"

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
    <nav
      style={{ fontFamily: HELVETICA }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3 bg-[#111111]/90 backdrop-blur-md border-b border-white/10"
    >
      <Link to="/" className="flex items-center" style={{ height: '32px', width: '90px', overflow: 'hidden' }}>
        <img src="/REVIV.svg" alt="REVIV" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </Link>

      <div className="flex items-center gap-3">
        {/* Events dropdown */}
        <div ref={eventsAnchorRef} className="relative">
          <button
            onClick={() => setEventsOpen(v => !v)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              eventsOpen
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
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

        <Link to="/notifications" className="relative text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link to="/profile" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">
          {user?.display_name || 'Profile'}
        </Link>

        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-400 text-sm transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
