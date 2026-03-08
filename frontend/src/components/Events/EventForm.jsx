import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createEvent } from '../../api/events'
import { useAuthStore } from '../../stores/authStore'
import { Spinner } from '../UI/Spinner'
import { LocationPicker } from '../UI/LocationPicker'

const schema = z.object({
  name: z.string().min(3, 'Name required'),
  description: z.string().optional(),
  what_to_bring: z.string().optional(),
  date_time: z.string().min(1, 'Date & time required'),
  duration_minutes: z.coerce.number().min(15),
  max_volunteers: z.coerce.number().optional().or(z.literal('')),
  linked_report_id: z.string().optional(),
})

export function EventForm({ defaultLat, defaultLng, defaultLocationLabel, linkedReportId, onSuccess }) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [location, setLocation] = useState(
    defaultLat && defaultLng
      ? { lat: defaultLat, lng: defaultLng, label: defaultLocationLabel || '' }
      : null,
  )
  const [locationError, setLocationError] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      duration_minutes: 120,
      linked_report_id: linkedReportId || '',
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        lat: location.lat,
        lng: location.lng,
        location_label: location.label,
      }
      if (!payload.max_volunteers) delete payload.max_volunteers
      if (!payload.linked_report_id) delete payload.linked_report_id
      return createEvent(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events-all'] })
      queryClient.invalidateQueries({ queryKey: ['user-events', user?.id] })
      toast.success('Event created!')
      onSuccess?.()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create event'),
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
        <label className={labelCls}>Event Name</label>
        <input {...register('name')} className={inputCls} placeholder="Community Cleanup at..." />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea {...register('description')} className={inputCls} rows={2} placeholder="What's the plan?" />
      </div>
      <div>
        <label className={labelCls}>What to Bring</label>
        <input {...register('what_to_bring')} className={inputCls} placeholder="Gloves, bags, sunscreen..." />
      </div>
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
          <label className={labelCls}>Date & Time</label>
          <input {...register('date_time')} type="datetime-local" className={inputCls} />
          {errors.date_time && <p className="text-red-400 text-xs mt-1">{errors.date_time.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Duration (min)</label>
          <input {...register('duration_minutes')} type="number" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Max Volunteers (optional)</label>
        <input {...register('max_volunteers')} type="number" className={inputCls} placeholder="Leave blank for unlimited" />
      </div>
      {linkedReportId && (
        <input type="hidden" {...register('linked_report_id')} value={linkedReportId} />
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-teal hover:bg-brand-green text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {isPending && <Spinner size="sm" />}
        Create Event
      </button>
    </form>
  )
}
