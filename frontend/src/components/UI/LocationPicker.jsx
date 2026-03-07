import { useState } from 'react'
import { Spinner } from './Spinner'

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  const results = await res.json()
  if (!results.length) throw new Error('Address not found')
  const { lat, lon, display_name } = results[0]
  return { lat: parseFloat(lat), lng: parseFloat(lon), label: display_name }
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
  const result = await res.json()
  return result.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export function LocationPicker({ onChange, defaultLabel = '' }) {
  const [address, setAddress] = useState(defaultLabel)
  const [resolved, setResolved] = useState(!!defaultLabel)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const applyResult = (lat, lng, label) => {
    setAddress(label)
    setResolved(true)
    setError('')
    onChange({ lat, lng, label })
  }

  const handleSearch = async () => {
    if (!address.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await geocodeAddress(address.trim())
      applyResult(result.lat, result.lng, result.label)
    } catch {
      setError('Address not found. Try a different search.')
      setResolved(false)
    } finally {
      setLoading(false)
    }
  }

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        try {
          const label = await reverseGeocode(lat, lng)
          applyResult(lat, lng, label)
        } catch {
          applyResult(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Could not get your location. Try typing an address instead.')
        setLoading(false)
      },
      { timeout: 8000 },
    )
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
    if (resolved) setResolved(false)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={address}
            onChange={(e) => { setAddress(e.target.value); if (resolved) setResolved(false) }}
            onKeyDown={handleKeyDown}
            placeholder="Search address or place..."
            className={`w-full bg-brand-blue/60 border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none text-sm pr-8 ${
              resolved
                ? 'border-brand-teal focus:border-brand-teal'
                : 'border-brand-sky/40 focus:border-brand-teal'
            }`}
          />
          {resolved && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-teal text-sm">✓</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !address.trim()}
          className="bg-brand-sky/20 hover:bg-brand-sky/40 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
        >
          {loading ? <Spinner size="sm" /> : '🔍'}
        </button>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={loading}
          title="Use my current location"
          className="bg-brand-sky/20 hover:bg-brand-sky/40 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? <Spinner size="sm" /> : '📍'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {!resolved && !error && (
        <p className="text-gray-500 text-xs">Type an address and press Search, or use 📍 for your current location.</p>
      )}
    </div>
  )
}
