import { type InputHTMLAttributes, forwardRef, useRef, useState, useEffect, useCallback } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, className = '', value, defaultValue, onChange, onBlur, ...props },
  externalRef
) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-')
  const internalRef = useRef<HTMLInputElement | null>(null)
  const [hasValue, setHasValue] = useState(false)

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      internalRef.current = node
      if (typeof externalRef === 'function') {
        externalRef(node)
      } else if (externalRef) {
        externalRef.current = node
      }
    },
    [externalRef]
  )

  useEffect(() => {
    setHasValue(!!(value || defaultValue || internalRef.current?.value))
  }, [value, defaultValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value)
    onChange?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setHasValue(!!e.target.value)
    onBlur?.(e)
  }

  const isFloating = hasValue || props.type === 'date'

  return (
    <div>
      <div className="relative group">
        <input
          ref={setRefs}
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          className={`peer w-full h-12 px-4 pt-5 pb-1 rounded-xl bg-surface-2 border text-text-primary text-body placeholder-transparent transition-colors duration-200 focus:outline-none focus:ring-1 ${
            error
              ? 'border-danger focus:border-danger focus:ring-danger/30'
              : 'border-border focus:border-accent focus:ring-accent/30'
          } ${className}`}
          placeholder={label}
          {...props}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        <label
          htmlFor={inputId}
          className={`absolute left-4 pointer-events-none transition-all duration-200 ${
            isFloating
              ? 'top-1.5 text-caption text-text-secondary'
              : 'top-1/2 -translate-y-1/2 text-body text-text-tertiary peer-focus:top-1.5 peer-focus:translate-y-0 peer-focus:text-caption peer-focus:text-text-secondary'
          }`}
        >
          {label}
        </label>
      </div>
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  )
})

export default Input
