import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { getUser, getUserEvents, getUserReports, updateUser } from '../api/users'
import { useAuthStore } from '../stores/authStore'
import { Nav } from '../components/UI/Nav'
import { Spinner } from '../components/UI/Spinner'
import { EventCard } from '../components/Events/EventCard'
import { ReportCard } from '../components/Reports/ReportCard'

const HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function ProfilePage() {
  const { id } = useParams()
  const { user: currentUser, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const profileId = id || currentUser?.id
  const isOwnProfile = !id || id === currentUser?.id
  const [tab, setTab] = useState('stats')
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user', profileId],
    queryFn: () => getUser(profileId),
    enabled: !!profileId,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['user-events', profileId],
    queryFn: () => getUserEvents(profileId),
    enabled: tab === 'events' && !!profileId,
  })

  const { data: reports = [] } = useQuery({
    queryKey: ['user-reports', profileId],
    queryFn: () => getUserReports(profileId),
    enabled: tab === 'reports' && !!profileId,
  })

  const updateMut = useMutation({
    mutationFn: (data) => updateUser(profileId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user', profileId] })
      if (isOwnProfile) setUser(data)
      toast.success('Profile updated')
      setEditing(false)
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Update failed'),
  })

  if (isLoading) {
    return (
      <div
        style={{ background: 'radial-gradient(ellipse at center, #2d2d2d 0%, #111111 100%)', minHeight: '100vh' }}
        className="flex items-center justify-center"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  const p = profile || currentUser
  const stats = p?.stats || {}
  const initials = (p?.display_name || 'U').slice(0, 2).toUpperCase()

  return (
    <div
      style={{ background: 'radial-gradient(ellipse at center, #2d2d2d 0%, #111111 100%)', minHeight: '100vh' }}
      className="relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none" />
      <Nav />

      <div className="relative pt-16 max-w-2xl mx-auto px-4 py-8" style={{ fontFamily: HELVETICA }}>
        {/* Header card */}
        <div className="bg-white/95 backdrop-blur-md shadow-xl border border-white/20 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {initials}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="flex gap-2">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-900 text-sm flex-1 focus:ring-2 focus:ring-emerald-400 focus:border-transparent outline-none"
                    style={{ fontFamily: HELVETICA }}
                  />
                  <button
                    onClick={() => updateMut.mutate({ display_name: displayName })}
                    className="bg-gradient-to-b from-emerald-400 to-emerald-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 text-sm px-2">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-gray-900 font-bold text-xl">{p?.display_name}</h1>
                  {isOwnProfile && (
                    <button
                      onClick={() => { setDisplayName(p?.display_name || ''); setEditing(true) }}
                      className="text-gray-400 hover:text-emerald-500 text-xs transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
              <p className="text-gray-500 text-sm mt-0.5">{p?.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white/10 border border-white/10 rounded-xl p-1">
          {['stats', 'events', 'reports'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg capitalize transition-colors ${
                tab === t
                  ? 'bg-white/95 text-emerald-600 shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'stats' && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Reports Submitted', value: stats.reports_submitted ?? 0 },
              { label: 'Reports Resolved', value: stats.reports_resolved ?? 0 },
              { label: 'Events Attended', value: stats.events_attended ?? 0 },
              { label: 'Events Organized', value: stats.events_organized ?? 0 },
              { label: 'Volunteer Hours', value: `${((stats.total_volunteer_hours ?? 0) / 60).toFixed(1)}h` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/95 backdrop-blur-md border border-white/20 rounded-xl p-4 text-center shadow-md">
                <p className="text-2xl font-bold text-emerald-500">{value}</p>
                <p className="text-gray-500 text-xs mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'events' && (
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No events yet.</p>
            ) : (
              events.map((e) => <EventCard key={e.id} event={e} />)
            )}
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-2">
            {reports.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No reports yet.</p>
            ) : (
              reports.map((r) => <ReportCard key={r.id} report={r} />)
            )}
          </div>
        )}
      </div>
    </div>
  )
}
