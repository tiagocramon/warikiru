import { motion, AnimatePresence } from 'framer-motion'
import Toast from './Toast'

interface LocalToast {
  id: number
  message: string
  type: 'success' | 'error'
}

interface FloatingToastProps {
  toasts: LocalToast[]
}

export default function FloatingToast({ toasts }: FloatingToastProps) {
  return (
    <AnimatePresence>
      {toasts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-[20px] left-[20px] right-[20px] z-[60] rounded-[8px] bg-[#101116] sm:max-w-[640px] sm:mx-auto"
        >
          <Toast message={toasts[toasts.length - 1].message} type={toasts[toasts.length - 1].type} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
