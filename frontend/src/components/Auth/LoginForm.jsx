import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useLogin } from '../../hooks/useAuth'
import { Spinner } from '../UI/Spinner'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const { mutate, isPending } = useLogin()

  return (
    <form onSubmit={handleSubmit(mutate)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
        <input
          {...register('email')}
          type="email"
          className="w-full bg-brand-blue/60 border border-brand-sky/40 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-teal"
          placeholder="you@example.com"
        />
        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
        <input
          {...register('password')}
          type="password"
          className="w-full bg-brand-blue/60 border border-brand-sky/40 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-teal"
          placeholder="••••••••"
        />
        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-teal hover:bg-brand-green text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isPending && <Spinner size="sm" />}
        Sign In
      </button>
      <p className="text-center text-sm text-gray-400">
        No account?{' '}
        <Link to="/register" className="text-brand-teal hover:underline">Register</Link>
      </p>
    </form>
  )
}
