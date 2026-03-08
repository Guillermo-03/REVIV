import { useEffect, useState } from 'react'

export function SplashScreen({ onComplete }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 500)
    const t2 = setTimeout(onComplete, 1900)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse at center, #2d2d2d 0%, #111111 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.3rem',
        zIndex: 50,
        opacity: fading ? 0 : 1,
        transition: 'opacity 1.2s ease-in-out',
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      <img
        src="/REVIV.svg"
        alt="REVIV"
        style={{
          width: 'min(72vw, 660px)',
          height: 'auto',
          transform: fading ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 1.2s ease-in-out',
        }}
      />
    </div>
  )
}
