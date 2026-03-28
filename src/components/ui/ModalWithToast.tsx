import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import FloatingToast from './FloatingToast'
import { X } from 'lucide-react'

interface LocalToast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface ModalWithToastProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  toasts?: LocalToast[]
}

export default function ModalWithToast({
  open,
  onClose,
  title,
  children,
  toasts = [],
}: ModalWithToastProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const modal = createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" onClick={onClose}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 right-0 left-0 z-50 w-full max-w-[480px] mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-[32px] rounded-t-[20px] bg-[#16171D] p-[20px] max-h-[90vh] overflow-y-auto">
              {/* Header - Fechar X */}
              <button
                onClick={onClose}
                className="flex items-center gap-[4px] self-end"
              >
                <span className="text-[12px] font-normal leading-[1.4] text-[#7C8394]">
                  Fechar
                </span>
                <X size={20} className="text-[#7C8394]" />
              </button>

              {/* Title */}
              <p className="text-[28px] font-normal leading-none text-[#F5F7FA]">
                {title}
              </p>

              {/* Content */}
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )

  return (
    <>
      {modal}
      <FloatingToast toasts={toasts || []} />
    </>
  )
}
