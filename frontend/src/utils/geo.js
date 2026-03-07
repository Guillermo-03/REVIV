export function coordsToGeoJSON(lat, lng) {
  return { type: 'Point', coordinates: [lng, lat] }
}

export function geoJSONToCoords(point) {
  if (!point || !point.coordinates) return { lat: 0, lng: 0 }
  return { lat: point.coordinates[1], lng: point.coordinates[0] }
}

export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function globeAltitudeToRadiusKm(altitude) {
  return Math.min(altitude * 1200, 5000)
}
