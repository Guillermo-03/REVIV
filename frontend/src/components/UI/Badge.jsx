const variants = {
  low: 'bg-yellow-400 text-yellow-900',
  medium: 'bg-orange-400 text-orange-900',
  high: 'bg-red-500 text-white',
  active: 'bg-blue-500 text-white',
  resolved: 'bg-green-500 text-white',
  open: 'bg-brand-teal text-white',
  full: 'bg-orange-500 text-white',
  in_progress: 'bg-blue-400 text-white',
  completed: 'bg-purple-500 text-white',
  default: 'bg-gray-500 text-white',
}

export function Badge({ label, variant }) {
  const cls = variants[variant] || variants.default
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}
