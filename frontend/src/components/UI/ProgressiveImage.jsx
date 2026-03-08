import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Thumbnail: loads lazily, blurred while loading (blur-up), shimmer placeholder.
 * Click → full-size lightbox rendered in a portal above all other UI.
 * Close lightbox by clicking the backdrop or pressing Escape.
 */
export function ProgressiveImage({ src, alt = 'Photo' }) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [fullLoaded, setFullLoaded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  // Reset full-load state each time the lightbox opens
  useEffect(() => {
    if (expanded) setFullLoaded(false)
  }, [expanded])

  if (errored) return (
    <div className="w-full h-24 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
      <span className="text-xs text-gray-500">Photo couldn't be loaded</span>
    </div>
  )

  return (
    <>
      {/* ── Thumbnail ────────────────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(true)}
        className="relative w-full h-24 rounded-lg overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal"
        aria-label="Expand photo"
      >
        {/* Shimmer skeleton shown while image is fetching */}
        {!loaded && (
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        )}

        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full h-full object-cover transition-all duration-700 ease-out ${
            loaded ? 'blur-0 scale-100' : 'blur-md scale-110'
          }`}
        />

        {/* Expand icon — fades in on hover once loaded */}
        {loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/45 transition-colors duration-200">
            <svg
              className="w-6 h-6 text-white drop-shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </div>
        )}
      </button>

      {/* ── Lightbox (portal) ────────────────────────────────────────── */}
      {expanded && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Spinner while full image loads */}
            {!fullLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}

            <img
              src={src}
              alt={alt}
              onLoad={() => setFullLoaded(true)}
              className={`max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
                fullLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />

            <button
              onClick={() => setExpanded(false)}
              className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 text-white text-sm flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
