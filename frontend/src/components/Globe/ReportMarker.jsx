export const SEVERITY_COLORS = {
  low: '#f9c74f',
  medium: '#f8961e',
  high: '#f94144',
}

export const SEVERITY_RADIUS = {
  low: 0.4,
  medium: 0.55,
  high: 0.7,
}

export function getReportPointColor(report) {
  return SEVERITY_COLORS[report.severity] || '#f9c74f'
}

export function getReportPointRadius(report) {
  return SEVERITY_RADIUS[report.severity] || 0.4
}
