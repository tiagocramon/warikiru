import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  options: { value: string; label: string }[]
}

export default function Select({
  label,
  error,
  id,
  options,
  className = '',
  ...props
}: SelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-')

  return (
    <div>
      <div className="relative">
        <select
          id={selectId}
          className={`w-full h-12 px-4 pt-5 pb-1 pr-10 rounded-xl bg-surface-2 border text-text-primary text-body transition-colors duration-200 focus:outline-none focus:ring-1 ${
            error
              ? 'border-danger focus:border-danger focus:ring-danger/30'
              : 'border-border focus:border-accent focus:ring-accent/30'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface-2 text-text-primary">
              {opt.label}
            </option>
          ))}
        </select>
        <label
          htmlFor={selectId}
          className="absolute left-4 top-1.5 text-caption text-text-secondary pointer-events-none"
        >
          {label}
        </label>
      </div>
      {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  )
}
