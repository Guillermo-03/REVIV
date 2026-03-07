export function createEventMarkerEl(event) {
  const el = document.createElement('div')
  el.style.cssText = `
    width: 28px;
    height: 36px;
    cursor: pointer;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  `
  const statusColors = {
    open: '#52b788',
    full: '#f8961e',
    in_progress: '#4cc9f0',
    completed: '#a855f7',
    resolved: '#6b7280',
  }
  const color = statusColors[event.status] || '#52b788'
  el.innerHTML = `
    <svg viewBox="0 0 24 30" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 18 12 18s12-9 12-18C24 5.37 18.63 0 12 0z" fill="${color}"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
      <text x="12" y="16" text-anchor="middle" font-size="8" fill="${color}" font-weight="bold">E</text>
    </svg>
  `
  return el
}
