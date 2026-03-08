import { RegisterForm } from '../components/Auth/RegisterForm'

const HELVETICA = "'Helvetica Neue', Helvetica, Arial, sans-serif"

export default function RegisterPage() {
  return (
    <div
      style={{ background: 'radial-gradient(ellipse at center, #2d2d2d 0%, #111111 100%)', minHeight: '100vh' }}
      className="relative flex flex-col items-center px-4 pt-10 pb-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_60%)] pointer-events-none" />

      {/* Logo */}
      <div style={{
        width: 'clamp(240px, 36vw, 440px)',
        height: '26vh',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <img
          src="/REVIV.svg"
          alt="REVIV"
          className="drop-shadow-lg"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-md shadow-2xl border border-white/20 rounded-2xl p-10" style={{ marginTop: '16px' }}>
        <h2
          className="text-center text-xl font-bold mb-6 text-gray-900"
          style={{ fontFamily: HELVETICA }}
        >
          Create Account
        </h2>
        <RegisterForm />
      </div>
    </div>
  )
}
