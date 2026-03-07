import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (token, user) => {
    localStorage.setItem('reviv_token', token)
    localStorage.setItem('reviv_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('reviv_token')
    localStorage.removeItem('reviv_user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user }),
}))

// Hydrate from localStorage on load
const token = localStorage.getItem('reviv_token')
const userRaw = localStorage.getItem('reviv_user')
if (token && userRaw) {
  try {
    const user = JSON.parse(userRaw)
    useAuthStore.setState({ token, user, isAuthenticated: true })
  } catch {
    localStorage.removeItem('reviv_token')
    localStorage.removeItem('reviv_user')
  }
}
