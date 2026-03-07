import { useRef, useEffect, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useGlobeStore } from '../../stores/globeStore'
import { useAuthStore } from '../../stores/authStore'
import { useGeoLocation } from '../../hooks/useGeoLocation'
import { fetchReports } from '../../api/reports'
import { fetchEvents } from '../../api/events'
import { geoJSONToCoords, mapZoomToRadiusKm } from '../../utils/geo'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

class FastZoomControl {
  onAdd(map) {
    this._map = map
    this._container = document.createElement('div')
    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group'

    const makeBtn = (cls, title, delta) => {
      const btn = document.createElement('button')
      btn.className = cls
      btn.title = title
      btn.setAttribute('aria-label', title)
      btn.innerHTML = '<span class="maplibregl-ctrl-icon"></span>'
      btn.addEventListener('click', () => map.easeTo({ zoom: map.getZoom() + delta, duration: 300 }))
      return btn
    }

    this._container.appendChild(makeBtn('maplibregl-ctrl-zoom-in', 'Zoom in', 3))
    this._container.appendChild(makeBtn('maplibregl-ctrl-zoom-out', 'Zoom out', -3))
    return this._container
  }

  onRemove() {
    this._container.parentNode?.removeChild(this._container)
    this._map = undefined
  }
}

const EVENT_STATUS_COLORS = {
  open: '#52b788',
  full: '#f8961e',
  in_progress: '#4cc9f0',
  completed: '#a855f7',
  resolved: '#6b7280',
}

export function GlobeView({ onReportClick, onEventClick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const eventMarkersRef = useRef([])
  const userMarkerRef = useRef(null)
  const reportsRef = useRef([])
  const debounceRef = useRef(null)
  const [mapReady, setMapReady] = useState(false)

  const { location } = useGeoLocation()
  const { setViewport } = useGlobeStore()
  const user = useAuthStore((s) => s.user)

  const [viewState, setViewState] = useState({ lat: 20, lng: 0, zoom: 2 })
  const radiusKm = mapZoomToRadiusKm(viewState.zoom)

  // Round coords to avoid re-fetching on tiny pans
  const fetchLat = Math.round(viewState.lat * 5) / 5
  const fetchLng = Math.round(viewState.lng * 5) / 5
  const fetchRadius = Math.max(10, Math.round(radiusKm / 10) * 10)

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', fetchLat, fetchLng, fetchRadius],
    queryFn: () => fetchReports({ lat: fetchLat, lng: fetchLng, radius_km: fetchRadius, status: 'active' }),
    staleTime: 30000,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events', fetchLat, fetchLng, fetchRadius],
    queryFn: () => fetchEvents({ lat: fetchLat, lng: fetchLng, radius_km: fetchRadius }),
    staleTime: 30000,
  })

  // Keep reports in a ref so click handlers always have fresh data
  useEffect(() => { reportsRef.current = reports }, [reports])

  // ── Initialize map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [0, 20],
      zoom: 2,
      minZoom: 1,
      maxZoom: 19,
      attributionControl: false,
    })

    mapRef.current = map

    // Increase scroll/trackpad zoom speed (default wheel rate is 1/450)
    map.scrollZoom.setWheelZoomRate(1 / 100)
    map.scrollZoom.setZoomRate(1 / 30)

    map.addControl(new FastZoomControl(), 'bottom-left')
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, showZoom: false, visualizePitch: true }),
      'bottom-left',
    )
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    map.on('load', () => {
      // ── Globe projection + atmosphere ──────────────────────────────────
      map.setProjection({ type: 'globe' })

      // setFog removed in MapLibre GL JS v5 — guard for compatibility
      if (typeof map.setFog === 'function') {
        map.setFog({
          color: 'rgba(20, 40, 70, 0.85)',
          'high-color': 'rgba(30, 60, 120, 0.5)',
          'horizon-blend': 0.03,
          'space-color': 'rgb(4, 5, 16)',
          'star-intensity': 0.6,
        })
      }

      // ── Terrain DEM for land 3D extrusion ─────────────────────────────
      map.addSource('terrain', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
        attribution: 'Terrain © Mapzen',
      })
      map.setTerrain({ source: 'terrain', exaggeration: 1.4 })

      // ── Hillshade for land — inserted below first symbol layer ───────────
      const firstSymbolId = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
      map.addLayer(
        {
          id: 'hillshade',
          type: 'hillshade',
          source: 'terrain',
          paint: {
            'hillshade-shadow-color': 'rgba(0, 0, 0, 0.8)',
            'hillshade-highlight-color': 'rgba(255, 255, 255, 0.1)',
            'hillshade-illumination-direction': 335,
            'hillshade-illumination-anchor': 'map',
            'hillshade-exaggeration': 0.85,
            'hillshade-accent-color': 'rgba(0, 4, 18, 0.5)',
          },
        },
        firstSymbolId,
      )

      // ── Reports GeoJSON source (with clustering) ───────────────────────
      map.addSource('reports', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 12,
        clusterRadius: 45,
      })

      // Cluster halo (outer glow ring)
      map.addLayer({
        id: 'cluster-halo',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'],
            'rgba(249,199,79,0.15)', 5,
            'rgba(248,150,30,0.15)', 15,
            'rgba(249,65,68,0.15)',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 28, 5, 36, 15, 44],
          'circle-stroke-width': 0,
        },
      })

      // Cluster fill
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'],
            '#f9c74f', 5,
            '#f8961e', 15,
            '#f94144',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 15, 30],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.25)',
          'circle-opacity': 0.9,
        },
      })

      // Cluster count label
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 11,
          'text-font': ['Noto Sans Bold', 'Noto Sans Regular', 'Arial Unicode MS Bold'],
        },
        paint: { 'text-color': '#fff' },
      })

      // Individual report dots — outer glow
      map.addLayer({
        id: 'report-glow',
        type: 'circle',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 16, 14, 30],
          'circle-color': ['match', ['get', 'severity'],
            'low', 'rgba(249,199,79,0.2)',
            'medium', 'rgba(248,150,30,0.2)',
            'high', 'rgba(249,65,68,0.2)',
            'rgba(249,199,79,0.2)',
          ],
          'circle-stroke-width': 0,
          'circle-blur': 1,
        },
      })

      // Individual report dots — solid fill
      map.addLayer({
        id: 'reports',
        type: 'circle',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 8, 10, 12, 14, 18],
          'circle-color': ['match', ['get', 'severity'],
            'low', '#f9c74f',
            'medium', '#f8961e',
            'high', '#f94144',
            '#f9c74f',
          ],
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.55)',
          'circle-opacity': 0.95,
        },
      })

      // ── Click handlers ─────────────────────────────────────────────────
      map.on('click', 'clusters', async (e) => {
        const feature = e.features[0]
        const clusterId = feature.properties.cluster_id
        try {
          const zoom = await map.getSource('reports').getClusterExpansionZoom(clusterId)
          map.easeTo({ center: feature.geometry.coordinates, zoom: zoom + 0.5, duration: 400 })
        } catch {
          map.easeTo({ center: feature.geometry.coordinates, zoom: map.getZoom() + 2, duration: 400 })
        }
      })

      map.on('click', 'reports', (e) => {
        const id = e.features[0].properties.id
        const report = reportsRef.current.find((r) => r.id === id)
        if (report) onReportClick?.({ ...report, type: 'report' })
      })

      // ── Cursor changes ─────────────────────────────────────────────────
      ;['clusters', 'reports'].forEach((layer) => {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      })

      setMapReady(true)
    })

    // ── Viewport change → debounced state update ───────────────────────
    map.on('moveend', () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const { lat, lng } = map.getCenter()
        const zoom = map.getZoom()
        setViewState({ lat, lng, zoom })
        setViewport(lat, lng, zoom)
      }, 500)
    })

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      eventMarkersRef.current.forEach((m) => m.remove())
      userMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── Fly to best available location + place green "you are here" dot ───────
  useEffect(() => {
    if (!mapRef.current) return

    let coords = null

    // 1. Browser geolocation (most accurate)
    if (location) {
      coords = [location.lng, location.lat]
    } else {
      // 2. User's saved profile location
      const saved = user?.location?.coordinates
      if (saved && (saved[0] !== 0 || saved[1] !== 0)) {
        coords = [saved[0], saved[1]]
      }
    }

    if (!coords) return  // nothing resolved → stay at world view

    mapRef.current.flyTo({ center: coords, zoom: 13, duration: 5000, essential: true })

    // Place / update the green "you are here" dot
    userMarkerRef.current?.remove()
    const el = document.createElement('div')
    el.style.cssText = [
      'width:14px', 'height:14px', 'border-radius:50%',
      'background:#52b788', 'border:2px solid #fff',
      'box-shadow:0 0 0 4px rgba(82,183,136,0.35)',
    ].join(';')
    userMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat(coords)
      .addTo(mapRef.current)
  }, [location, user])

  // ── Sync reports data into map source ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const source = map.getSource('reports')
    if (!source) return

    const features = reports.map((r) => ({
      type: 'Feature',
      geometry: r.location,
      properties: {
        id: r.id,
        severity: r.severity,
        category: r.category,
        location_label: r.location_label || '',
        upvote_count: r.upvote_count ?? 0,
      },
    }))
    source.setData({ type: 'FeatureCollection', features })
  }, [reports, mapReady])

  // ── Sync event markers ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return

    eventMarkersRef.current.forEach((m) => m.remove())
    eventMarkersRef.current = []

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
    const visibleEvents = events.filter((event) => {
      if ((event.status === 'completed' || event.status === 'resolved') && event.completed_at) {
        return Date.now() - new Date(event.completed_at).getTime() < TWENTY_FOUR_HOURS
      }
      return true
    })

    visibleEvents.forEach((event) => {
      const coords = geoJSONToCoords(event.location)
      const color = EVENT_STATUS_COLORS[event.status] || '#52b788'

      const el = document.createElement('div')
      el.style.cssText = 'width:32px;height:40px;cursor:pointer;'
      el.innerHTML = `
        <svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 3px 8px rgba(0,0,0,0.55))">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 24 16 24S32 27 32 16C32 7.163 24.837 0 16 0z" fill="${color}"/>
          <circle cx="16" cy="16" r="7" fill="white" opacity="0.95"/>
          <text x="16" y="20.5" text-anchor="middle" font-size="9" fill="${color}" font-weight="700" font-family="system-ui,sans-serif">E</text>
        </svg>`
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        onEventClick?.({ ...event, type: 'event' })
      })

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map)

      eventMarkersRef.current.push(marker)
    })
  }, [events, mapReady, onEventClick])

  return <div ref={containerRef} className="w-full h-full" />
}
