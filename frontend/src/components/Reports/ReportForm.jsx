import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createReport } from '../../api/reports'
import { Spinner } from '../UI/Spinner'
import { LocationPicker } from '../UI/LocationPicker'

const schema = z.object({
  severity: z.enum(['low', 'medium', 'high']),
  category: z.enum(['roadside', 'park', 'waterway', 'construction', 'illegal_dump']),
  description: z.string().optional(),
  photos: z.any().optional(),
})

export function ReportForm({ defaultLat, defaultLng, defaultLocationLabel, onSuccess }) {
  const queryClient = useQueryClient()
  const [location, setLocation] = useState(
    defaultLat && defaultLng
      ? { lat: defaultLat, lng: defaultLng, label: defaultLocationLabel || '' }
      : null,
  )
  const [locationError, setLocationError] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { severity: 'medium', category: 'roadside' },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => {
      const fd = new FormData()
      fd.append('lat', location.lat)
      fd.append('lng', location.lng)
      fd.append('location_label', location.label)
      Object.entries(data).forEach(([k, v]) => { if (k !== 'photos' && v !== undefined && v !== '') fd.append(k, v) })
      if (data.photos) {
        Array.from(data.photos).forEach((f) => fd.append('photos', f))
      }
      return createReport(fd)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report submitted!')
      onSuccess?.()
    },
    onError: (err) => {
      const detail = err.response?.data?.detail
      const message = Array.isArray(detail)
        ? detail.map((d) => d.msg).join(', ')
        : detail || 'Failed to submit report'
      toast.error(message)
    },
  })

  const onSubmit = (data) => {
    if (!location) { setLocationError(true); return }
    setLocationError(false)
    mutate(data)
  }

  const inputCls = 'w-full bg-brand-blue/60 border border-brand-sky/40 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-brand-teal text-sm'
  const labelCls = 'block text-sm font-medium text-gray-300 mb-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className={labelCls}>Location</label>
        <LocationPicker
          onChange={(loc) => { setLocation(loc); setLocationError(false) }}
          defaultLabel={defaultLocationLabel || ''}
        />
        {locationError && <p className="text-red-400 text-xs mt-1">Please select a location first</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Severity</label>
          <select {...register('severity')} className={inputCls}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select {...register('category')} className={inputCls}>
            <option value="roadside">Roadside</option>
            <option value="park">Park</option>
            <option value="waterway">Waterway</option>
            <option value="construction">Construction</option>
            <option value="illegal_dump">Illegal Dump</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          {...register('description')}
          className={inputCls}
          rows={3}
          placeholder="Describe the litter situation..."
        />
      </div>
      <div>
        <label className={labelCls}>Photos</label>
        <input
          {...register('photos')}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm text-gray-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-brand-sky/20 file:text-white hover:file:bg-brand-sky/30"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-teal hover:bg-brand-green text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isPending && <Spinner size="sm" />}
        Submit Report
      </button>
    </form>
  )
}
