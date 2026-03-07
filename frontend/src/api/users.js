import client from './client'

export async function getUser(id) {
  const res = await client.get(`/users/${id}`)
  return res.data
}

export async function updateUser(id, data) {
  const res = await client.patch(`/users/${id}`, data)
  return res.data
}

export async function getUserEvents(id) {
  const res = await client.get(`/users/${id}/events`)
  return res.data
}

export async function getUserReports(id) {
  const res = await client.get(`/users/${id}/reports`)
  return res.data
}

export async function getStats() {
  const res = await client.get('/stats')
  return res.data
}
