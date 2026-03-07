import { useRef, useEffect, useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Globe from 'react-globe.gl'
import { useGlobeStore } from '../../stores/globeStore'
import { useGeoLocation } from '../../hooks/useGeoLocation'
import { fetchReports } from '../../api/reports'
import { fetchEvents } from '../../api/events'
import { globeAltitudeToRadiusKm, geoJSONToCoords } from '../../utils/geo'
import { getReportPointColor, getReportPointRadius } from './ReportMarker'
import { createEventMarkerEl } from './EventMarker'

export function GlobeView({ onReportClick, onEventClick }) {
  const globeRef = useRef()
  const { location, loading: geoLoading } = useGeoLocation()
  const { viewportCenter, zoomAltitude, setViewport } = useGlobeStore()
  const [viewLat, setViewLat] = useState(20)
  const [viewLng, setViewLng] = useState(0)
  const [viewAlt, setViewAlt] = useState(2.5)
  const debounceRef = useRef(null)

  // Fly to user location on load
  useEffect(() => {
    if (location && globeRef.current) {
      globeRef.current.pointOfView({ lat: location.lat, lng: location.lng, altitude: 1.5 }, 1500)
      setViewLat(location.lat)
      setViewLng(location.lng)
      setViewAlt(1.5)
      setViewport(location.lat, location.lng, 1.5)
    }
  }, [location, geoLoading])

  const radiusKm = globeAltitudeToRadiusKm(viewAlt)

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', viewLat, viewLng, radiusKm],
    queryFn: () => fetchReports({ lat: viewLat, lng: viewLng, radius_km: radiusKm, status: 'active' }),
    enabled: radiusKm > 0,
    staleTime: 30000,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events', viewLat, viewLng, radiusKm],
    queryFn: () => fetchEvents({ lat: viewLat, lng: viewLng, radius_km: radiusKm }),
    enabled: radiusKm > 0,
    staleTime: 30000,
  })

  const handleViewChange = useCallback(() => {
    if (!globeRef.current) return
    const pov = globeRef.current.pointOfView()
    if (!pov) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setViewLat(pov.lat)
      setViewLng(pov.lng)
      setViewAlt(pov.altitude)
      setViewport(pov.lat, pov.lng, pov.altitude)
    }, 500)
  }, [setViewport])

  // Prepare points data — reports
  const pointsData = reports.map((r) => {
    const coords = geoJSONToCoords(r.location)
    return { ...r, lat: coords.lat, lng: coords.lng }
  })

  // Prepare event HTML elements
  const eventsWithCoords = events.map((e) => {
    const coords = geoJSONToCoords(e.location)
    return { ...e, lat: coords.lat, lng: coords.lng }
  })

  return (
    <div className="w-full h-full">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        atmosphereColor="lightskyblue"
        atmosphereAltitude={0.15}
        backgroundColor="#1d3557"
        onGlobeClick={handleViewChange}
        onZoom={handleViewChange}
        // Report points
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d) => getReportPointColor(d)}
        pointRadius={(d) => getReportPointRadius(d)}
        pointAltitude={0.005}
        pointLabel={(d) => `<div style="background:#1d3557;border:1px solid #457b9d;border-radius:6px;padding:6px 10px;color:white;font-size:12px"><b>${d.location_label || 'Report'}</b><br/>Severity: ${d.severity}</div>`}
        onPointClick={(point) => {
          if (onReportClick) onReportClick({ ...point, type: 'report' })
        }}
        // Event HTML markers
        htmlElementsData={eventsWithCoords}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.01}
        htmlElement={(d) => {
          const el = createEventMarkerEl(d)
          el.addEventListener('click', () => {
            if (onEventClick) onEventClick({ ...d, type: 'event' })
          })
          return el
        }}
      />
    </div>
  )
}
