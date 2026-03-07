import { useRef, useEffect, useState, useCallback } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useGlobeStore } from '../../stores/globeStore'
import { useAuthStore } from '../../stores/authStore'
import { useGeoLocation } from '../../hooks/useGeoLocation'
import { fetchReports, fetchHeatmap } from '../../api/reports'
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
  const starsCanvasRef = useRef(null)
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

  // Round coords to a coarse grid to avoid re-fetching on tiny pans.
  // Fetch 1.5× the visible radius as a buffer so edges don't go empty mid-pan.
  const fetchLat    = Math.round(viewState.lat * 5) / 5
  const fetchLng    = Math.round(viewState.lng * 5) / 5
  const fetchRadius = Math.max(10, Math.round((radiusKm * 1.5) / 10) * 10)

  const { data: reports = [] } = useQuery({
    queryKey: ['reports', fetchLat, fetchLng, fetchRadius],
    queryFn: () => fetchReports({ lat: fetchLat, lng: fetchLng, radius_km: fetchRadius, status: 'active' }),
    staleTime: 120000,
    gcTime: 300000,
    placeholderData: keepPreviousData,
  })

  const { data: events = [] } = useQuery({
    queryKey: ['events', fetchLat, fetchLng, fetchRadius],
    queryFn: () => fetchEvents({ lat: fetchLat, lng: fetchLng, radius_km: fetchRadius }),
    staleTime: 120000,
    gcTime: 300000,
    placeholderData: keepPreviousData,
  })

  const { data: heatmapPoints = [] } = useQuery({
    queryKey: ['heatmap', fetchLat, fetchLng, fetchRadius],
    queryFn: () => fetchHeatmap({ lat: fetchLat, lng: fetchLng, radius_km: fetchRadius }),
    staleTime: 120000,
    gcTime: 300000,
    placeholderData: keepPreviousData,
  })

  // Keep reports in a ref so click handlers always have fresh data
  useEffect(() => { reportsRef.current = reports }, [reports])

  // ── Draw static starfield canvas ──────────────────────────────────────────
  useEffect(() => {
    const canvas = starsCanvasRef.current
    if (!canvas) return

    const draw = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const { width: w, height: h } = canvas
      const ctx = canvas.getContext('2d')

      // Deep space radial gradient background
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75)
      bg.addColorStop(0,   '#0d1b3e')
      bg.addColorStop(0.4, '#060d20')
      bg.addColorStop(1,   '#010308')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      const rnd = () => Math.random()

      // ── Tiny background stars (high count, very dim)
      for (let i = 0; i < 320; i++) {
        ctx.beginPath()
        ctx.arc(rnd() * w, rnd() * h, rnd() * 0.6 + 0.1, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(210, 225, 255, ${rnd() * 0.35 + 0.1})`
        ctx.fill()
      }

      // ── Medium stars
      for (let i = 0; i < 100; i++) {
        const hue = rnd() < 0.15 ? '200, 220, 255' : rnd() < 0.08 ? '255, 240, 200' : '255, 255, 255'
        ctx.beginPath()
        ctx.arc(rnd() * w, rnd() * h, rnd() * 1.0 + 0.4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${hue}, ${rnd() * 0.5 + 0.45})`
        ctx.fill()
      }

      // ── Bright stars with soft glow halo
      for (let i = 0; i < 18; i++) {
        const x  = rnd() * w
        const y  = rnd() * h
        const r  = rnd() * 1.4 + 0.8
        const isBlue   = rnd() < 0.3
        const isYellow = !isBlue && rnd() < 0.2
        const core  = isBlue ? '180, 210, 255' : isYellow ? '255, 240, 180' : '255, 255, 255'
        const halo  = isBlue ? '140, 180, 255' : isYellow ? '255, 220, 120' : '200, 220, 255'

        // Outer glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 5)
        glow.addColorStop(0,   `rgba(${halo}, 0.25)`)
        glow.addColorStop(0.4, `rgba(${halo}, 0.08)`)
        glow.addColorStop(1,   'rgba(0,0,0,0)')
        ctx.beginPath()
        ctx.arc(x, y, r * 5, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Bright core
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${core}, 0.95)`
        ctx.fill()
      }

      // ── Faint nebula-like smudge (purely cosmetic, one radial blob)
      const nx = w * (0.2 + rnd() * 0.6)
      const ny = h * (0.1 + rnd() * 0.5)
      const nebula = ctx.createRadialGradient(nx, ny, 0, nx, ny, w * 0.18)
      nebula.addColorStop(0,   'rgba(60, 80, 160, 0.07)')
      nebula.addColorStop(0.5, 'rgba(40, 60, 120, 0.03)')
      nebula.addColorStop(1,   'rgba(0, 0, 0, 0)')
      ctx.beginPath()
      ctx.arc(nx, ny, w * 0.18, 0, Math.PI * 2)
      ctx.fillStyle = nebula
      ctx.fill()
    }

    draw()

    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

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
          color: 'rgba(160, 200, 255, 0.8)',    // bright blue-white atmosphere limb
          'high-color': 'rgba(8, 16, 60, 0.95)', // deep indigo fading to black
          'horizon-blend': 0.02,                 // thin sharp atmosphere edge
          'space-color': 'rgb(2, 4, 14)',        // near-black deep space
          'star-intensity': 1.0,                 // maximum MapLibre stars
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

      // ── Pollution heatmap ──────────────────────────────────────────────
      map.addSource('heatmap-data', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer(
        {
          id: 'pollution-heatmap',
          type: 'heatmap',
          source: 'heatmap-data',
          paint: {
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 0, 0, 3, 0.5, 6, 1],
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 2, 0.4, 8, 1.2, 12, 2.0],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 2, 20, 8, 35, 12, 60],
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0,   'rgba(0,0,0,0)',
              0.1, 'rgba(0,230,200,0.2)',
              0.3, 'rgba(64,224,208,0.6)',
              0.5, 'rgba(249,199,79,0.75)',
              0.7, 'rgba(248,150,30,0.85)',
              1.0, 'rgba(249,65,68,0.95)',
            ],
            'heatmap-opacity': [
              'interpolate', ['linear'], ['zoom'],
              7, 0.85, 11, 0.55, 13, 0.30, 15, 0,
            ],
          },
        },
        'cluster-halo',
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

  // ── Sync heatmap data ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    const source = map.getSource('heatmap-data')
    if (!source) return
    const features = heatmapPoints.map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { weight: p.weight },
    }))
    source.setData({ type: 'FeatureCollection', features })
  }, [heatmapPoints, mapReady])

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

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: '#010308' }}>
      <canvas ref={starsCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />
    </div>
  )
}
