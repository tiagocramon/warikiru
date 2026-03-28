import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Hook that ensures a minimum loading duration to avoid flash/flicker.
 * Returns [loading, done] where `done()` should be called when data is ready.
 * The loading state will only become false after both:
 * 1. `done()` has been called
 * 2. At least `minMs` milliseconds have elapsed
 */
export function useMinLoading(minMs = 1000): [boolean, () => void] {
  const [loading, setLoading] = useState(true)
  const startTime = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const done = useCallback(() => {
    const elapsed = Date.now() - startTime.current
    const remaining = Math.max(0, minMs - elapsed)

    if (remaining === 0) {
      if (mountedRef.current) setLoading(false)
    } else {
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) setLoading(false)
      }, remaining)
    }
  }, [minMs])

  return [loading, done]
}
