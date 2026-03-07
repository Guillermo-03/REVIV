import { create } from 'zustand'

export const useGlobeStore = create((set) => ({
  selectedMarker: null,
  panelOpen: false,
  viewportCenter: { lat: 20, lng: 0 },
  zoomAltitude: 2.5,

  setSelectedMarker: (marker) => set({ selectedMarker: marker }),
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false, selectedMarker: null }),
  setViewport: (lat, lng, altitude) =>
    set({ viewportCenter: { lat, lng }, zoomAltitude: altitude }),
}))
