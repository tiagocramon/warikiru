import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { router } from './router'
import { useIOSStandaloneViewportFix } from './hooks/useIOSKeyboardFix'

export default function App() {
  useIOSStandaloneViewportFix()

  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  )
}
