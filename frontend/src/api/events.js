import client from './client'

export async function fetchAllEvents() {
  const res = await client.get('/events/all')
  return res.data
}

export async function fetchEvents({ lat, lng, radius_km = 50, date_from, date_to, status } = {}) {
  const params = {}
  if (lat != null) params.lat = lat
  if (lng != null) params.lng = lng
  if (radius_km != null) params.radius_km = radius_km
  if (date_from) params.date_from = date_from
  if (date_to) params.date_to = date_to
  if (status) params.status = status
  const res = await client.get('/events', { params })
  return res.data
}

export async function createEvent(data) {
  const res = await client.post('/events', null, { params: data })
  return res.data
}

export async function getEvent(id) {
  const res = await client.get(`/events/${id}`)
  return res.data
}

export async function updateEvent(id, data) {
  const res = await client.patch(`/events/${id}`, data)
  return res.data
}

export async function joinEvent(id) {
  const res = await client.post(`/events/${id}/join`)
  return res.data
}

export async function leaveEvent(id) {
  const res = await client.post(`/events/${id}/leave`)
  return res.data
}

export async function completeEvent(id, formData) {
  const res = await client.post(`/events/${id}/complete`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function confirmEvent(id) {
  const res = await client.post(`/events/${id}/confirm`)
  return res.data
}
