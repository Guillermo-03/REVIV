import client from './client'

export async function fetchReports({ lat, lng, radius_km = 50, severity, status } = {}) {
  const params = {}
  if (lat != null) params.lat = lat
  if (lng != null) params.lng = lng
  if (radius_km != null) params.radius_km = radius_km
  if (severity) params.severity = severity
  if (status) params.status = status
  const res = await client.get('/reports', { params })
  return res.data
}

export async function createReport(formData) {
  const res = await client.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getReport(id) {
  const res = await client.get(`/reports/${id}`)
  return res.data
}

export async function upvoteReport(id) {
  const res = await client.patch(`/reports/${id}/upvote`)
  return res.data
}

export async function fetchHeatmap({ lat, lng, radius_km = 100 } = {}) {
  const params = {}
  if (lat != null) params.lat = lat
  if (lng != null) params.lng = lng
  if (radius_km != null) params.radius_km = radius_km
  const res = await client.get('/reports/heatmap', { params })
  return res.data
}
