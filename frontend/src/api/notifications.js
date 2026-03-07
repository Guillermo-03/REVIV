import client from './client'

export async function fetchNotifications() {
  const res = await client.get('/notifications')
  return res.data
}

export async function markNotificationRead(id) {
  const res = await client.patch(`/notifications/${id}/read`)
  return res.data
}

export async function markAllNotificationsRead() {
  const res = await client.patch('/notifications/read-all')
  return res.data
}
