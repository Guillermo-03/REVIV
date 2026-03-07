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
      <div className="min-h-screen bg-brand-blue flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const p = profile || currentUser
  const stats = p?.stats || {}
  const initials = (p?.display_name || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-brand-blue">
      <Nav />
      <div className="pt-16 max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-brand-blue/60 border border-brand-sky/30 rounded-2xl p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-teal flex items-center justify-center text-white text-2xl font-bold">
              {initials}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="flex gap-2">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-brand-blue/60 border border-brand-sky/40 rounded-lg px-3 py-1 text-white text-sm flex-1"
                  />
                  <button
                    onClick={() => updateMut.mutate({ display_name: displayName })}
                    className="bg-brand-teal text-white px-3 py-1 rounded-lg text-sm"
                  >
                    Save
                  </button>
                  <button onClick={() => setEditing(false)} className="text-gray-400 text-sm px-2">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-bold text-xl">{p?.display_name}</h1>
                  {isOwnProfile && (
                    <button
                      onClick={() => { setDisplayName(p?.display_name || ''); setEditing(true) }}
                      className="text-gray-400 hover:text-brand-teal text-xs"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
              <p className="text-gray-400 text-sm">{p?.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-brand-blue/40 border border-brand-sky/20 rounded-xl p-1">
          {['stats', 'events', 'reports'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                tab === t ? 'bg-brand-teal text-white' : 'text-gray-400 hover:text-white'
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
              <div key={label} className="bg-brand-blue/60 border border-brand-sky/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-brand-teal">{value}</p>
                <p className="text-gray-400 text-xs mt-1">{label}</p>
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
