import { CheckCircle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthPixelShell from './AuthPixelShell'

interface AuthStatusViewProps {
  title: string
  description: string
  linkTo: string
  linkLabel: string
}

export default function AuthStatusView({
  title,
  description,
  linkTo,
  linkLabel,
}: AuthStatusViewProps) {
  return (
    <AuthPixelShell fullWidth>
      <div className="flex w-full flex-col gap-8">
        <div className="flex flex-col items-start gap-4">
          <CheckCircle
            size={56}
            strokeWidth={1.9}
            className="text-[#18B36B]"
          />

          <div className="flex flex-col gap-4">
            <h1 className="text-[32px] font-normal leading-none text-[#F5F7FA]">
              {title}
            </h1>
            <p className="max-w-[320px] sm:max-w-none text-[16px] font-normal leading-[1.4] text-[#A7ADBA]">
              {description}
            </p>
          </div>
        </div>

        <Link
          to={linkTo}
          className="inline-flex items-center gap-2 text-[16px] font-normal leading-[1.4] text-[#F5C249] focus:outline-none focus-visible:underline"
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
          <span>{linkLabel}</span>
        </Link>
      </div>
    </AuthPixelShell>
  )
}
