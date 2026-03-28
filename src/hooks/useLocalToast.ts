import { useState, useCallback } from 'react'

interface LocalToast {
  id: number
  message: string
  type: 'success' | 'error'
}

let toastId = 0

export function useLocalToast() {
  const [toasts, setToasts] = useState<LocalToast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return { toasts, showToast }
}
