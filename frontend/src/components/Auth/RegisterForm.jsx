import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useRegister } from '../../hooks/useAuth'
import { Spinner } from '../UI/Spinner'

const schema = z
  .object({
    display_name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export function RegisterForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const { mutate, isPending } = useRegister()

  const onSubmit = ({ confirm_password, ...data }) => mutate(data)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
        <input
          {...register('display_name')}
          className="w-full bg-brand-blue/60 border border-brand-sky/40 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-teal"
          placeholder="Your name"
        />
        {errors.display_name && <p className="text-red-400 text-xs mt-1">{errors.display_name.message}</p>}
      </div>
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
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
        <input
          {...register('confirm_password')}
          type="password"
          className="w-full bg-brand-blue/60 border border-brand-sky/40 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-teal"
          placeholder="••••••••"
        />
        {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-teal hover:bg-brand-green text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isPending && <Spinner size="sm" />}
        Create Account
      </button>
      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-teal hover:underline">Sign in</Link>
      </p>
    </form>
  )
}
