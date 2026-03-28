import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
} from 'react'
import { EyeOff } from 'lucide-react'

interface AuthInputFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  labelAction?: ReactNode
  rightSlot?: ReactNode
  error?: string
}

interface AuthPasswordFieldProps
  extends Omit<AuthInputFieldProps, 'type' | 'rightSlot'> {
  visible: boolean
  onToggleVisibility: () => void
}

interface AuthPrimaryButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
}

function FigmaEyeIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="16"
      viewBox="0 0 22 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-[22px]"
    >
      <path
        d="M1.06251 8.34738C0.979165 8.12287 0.979165 7.8759 1.06251 7.65138C1.87421 5.68324 3.25202 4.00042 5.02128 2.81628C6.79053 1.63214 8.87155 1 11.0005 1C13.1295 1 15.2105 1.63214 16.9797 2.81628C18.749 4.00042 20.1268 5.68324 20.9385 7.65138C21.0218 7.8759 21.0218 8.12287 20.9385 8.34738C20.1268 10.3155 18.749 11.9983 16.9797 13.1825C15.2105 14.3666 13.1295 14.9988 11.0005 14.9988C8.87155 14.9988 6.79053 14.3666 5.02128 13.1825C3.25202 11.9983 1.87421 10.3155 1.06251 8.34738Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11.0005 10.9994C12.6574 10.9994 14.0005 9.65624 14.0005 7.99938C14.0005 6.34253 12.6574 4.99938 11.0005 4.99938C9.34365 4.99938 8.00051 6.34253 8.00051 7.99938C8.00051 9.65624 9.34365 10.9994 11.0005 10.9994Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export const AuthInputField = forwardRef<HTMLInputElement, AuthInputFieldProps>(
  function AuthInputField(
    { label, labelAction, rightSlot, error, className = '', ...props },
    ref
  ) {
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="flex items-start gap-3 text-[16px] font-normal leading-[1.4] text-[#F5F7FA]">
          <label htmlFor={props.id} className="min-w-0 flex-1">
            {label}
          </label>
          {labelAction}
        </div>

        <div
          className={`auth-input-field flex h-12 items-center rounded-[8px] bg-[#16171D] px-4 py-3 transition-colors focus-within:bg-[#1C1D25] ${
            rightSlot ? 'gap-[5px]' : ''
          }`}
        >
          <input
            ref={ref}
            className={`auth-input-element min-w-0 flex-1 bg-transparent text-[16px] font-normal leading-[1.4] text-[#F5F7FA] placeholder:text-[#7C8394] focus:outline-none ${className}`}
            {...props}
          />
          {rightSlot}
        </div>
        {error && (
          <p className="-mt-2 text-[12px] text-[#EF4444]">{error}</p>
        )}
      </div>
    )
  }
)

export const AuthPasswordField = forwardRef<
  HTMLInputElement,
  AuthPasswordFieldProps
>(function AuthPasswordField({ visible, onToggleVisibility, ...props }, ref) {
  return (
    <AuthInputField
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          className="flex h-6 w-6 items-center justify-center text-[#7C8394] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C249] focus-visible:ring-offset-2 focus-visible:ring-offset-[#16171D]"
        >
          {visible ? (
            <EyeOff size={20} strokeWidth={1.75} />
          ) : (
            <FigmaEyeIcon />
          )}
        </button>
      }
    />
  )
})

export function AuthPrimaryButton({
  type = 'button',
  loading,
  disabled,
  children,
  className = '',
  ...props
}: AuthPrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#F5C249] p-4 text-[16px] font-medium leading-[1.4] text-[#101116] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C249] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101116] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#101116] border-t-transparent" />
      )}
      {children}
    </button>
  )
}
