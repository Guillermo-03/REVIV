import { formatDistanceToNow, format } from 'date-fns'

export function formatSeverity(severity) {
  const map = { low: 'Low', medium: 'Medium', high: 'High' }
  return map[severity] || severity
}

export function formatCategory(category) {
  const map = {
    roadside: 'Roadside',
    park: 'Park',
    waterway: 'Waterway',
    construction: 'Construction',
    illegal_dump: 'Illegal Dump',
  }
  return map[category] || category
}

export function formatTimeAgo(dateString) {
  if (!dateString) return ''
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  } catch {
    return ''
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return ''
  try {
    return format(new Date(dateString), 'PPp')
  } catch {
    return ''
  }
}

export function formatDuration(minutes) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
