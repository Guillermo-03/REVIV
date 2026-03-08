import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useLogin } from '../../hooks/useAuth'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const { mutate, isPending } = useLogin()

  return (
    <form onSubmit={handleSubmit(mutate)} className="space-y-6">
      <div>
        <label
          className="block text-sm font-semibold text-gray-700 mb-1.5"
          style={{ fontFamily: HELVETICA }}
        >
          Email
        </label>
        <input
          {...register('email')}
          type="email"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-transparent focus:scale-[1.01] transition-all duration-200 outline-none"
          style={{ fontFamily: HELVETICA }}
          placeholder="you@example.com"
        />
        {errors.email && (
          <p className="text-red-500 text-xs mt-1.5 pl-1" style={{ fontFamily: HELVETICA }}>
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          className="block text-sm font-semibold text-gray-700 mb-1.5"
          style={{ fontFamily: HELVETICA }}
        >
          Password
        </label>
        <input
          {...register('password')}
          type="password"
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-400 focus:border-transparent focus:scale-[1.01] transition-all duration-200 outline-none"
          style={{ fontFamily: HELVETICA }}
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-red-500 text-xs mt-1.5 pl-1" style={{ fontFamily: HELVETICA }}>
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20 transition rounded-lg py-2.5 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{ fontFamily: HELVETICA }}
      >
        {isPending ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </button>

      <div className="mt-4 pt-4 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500" style={{ fontFamily: HELVETICA }}>
          No account?{' '}
          <Link
            to="/register"
            className="text-emerald-500 hover:text-emerald-600 font-medium transition"
            style={{ fontFamily: HELVETICA }}
          >
            Register
          </Link>
        </p>
      </div>
    </form>
  )
}
