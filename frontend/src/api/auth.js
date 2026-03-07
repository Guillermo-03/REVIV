import client from './client'

export async function registerUser(data) {
  const res = await client.post('/auth/register', data)
  return res.data
}

export async function loginUser(data) {
  const res = await client.post('/auth/login', data)
  return res.data
}

export async function getMe() {
  const res = await client.get('/auth/me')
  return res.data
}
