import { useState, useEffect } from 'react'

export function useGeoLocation() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLoading(false)
      },
      () => {
        // Failed — leave location as null so the map stays at world view
        setLoading(false)
      },
      { timeout: 5000 },
    )
  }, [])

  return { location, loading }
}
