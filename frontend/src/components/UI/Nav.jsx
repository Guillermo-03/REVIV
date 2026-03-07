import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useNotifications } from '../../hooks/useNotifications'

export function Nav() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { unreadCount } = useNotifications()

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
