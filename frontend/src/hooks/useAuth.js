import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { loginUser, registerUser } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

export function useLogin() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      login(data.access_token, data.user)
      navigate('/')
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Login failed')
    },
  })
}

export function useRegister() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  return useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      login(data.access_token, data.user)
      navigate('/')
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Registration failed')
    },
  })
}
