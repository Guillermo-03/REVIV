import { RegisterForm } from '../components/Auth/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-brand-blue flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            <span className="text-brand-teal">RE</span>VIV
          </h1>
          <p className="text-gray-400 mt-2">Join the cleanup movement</p>
        </div>
        <div className="bg-brand-blue/60 border border-brand-sky/30 rounded-2xl p-6 backdrop-blur-md">
          <h2 className="text-white font-semibold text-lg mb-4">Create Account</h2>
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
