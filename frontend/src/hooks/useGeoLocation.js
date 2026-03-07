import { useState, useEffect } from 'react'

const FALLBACK = { lat: 20, lng: 0 }

export function useGeoLocation() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(FALLBACK)
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      () => {
        setLocation(FALLBACK)
        setLoading(false)
      },
      { timeout: 5000 },
    )
  }, [])

  return { location, loading }
}
