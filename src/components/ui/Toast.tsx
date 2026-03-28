import { CheckCircle2, XCircle } from 'lucide-react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
}

export default function Toast({ message, type }: ToastProps) {
  const isSuccess = type === 'success'

  return (
    <div
      className={`flex gap-[8px] items-center rounded-[8px] p-[20px] ${
        isSuccess
          ? 'bg-[rgba(24,179,107,0.16)]'
          : 'bg-[rgba(232,93,93,0.16)]'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={16} className="text-[#18B36B] flex-shrink-0" />
      ) : (
        <XCircle size={16} className="text-[#E85D5D] flex-shrink-0" />
      )}
      <p
        className={`text-[14px] font-normal leading-[1.4] ${
          isSuccess ? 'text-[#18B36B]' : 'text-[#E85D5D]'
        }`}
      >
        {message}
      </p>
    </div>
  )
}
