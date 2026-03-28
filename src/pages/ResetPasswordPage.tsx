import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema, type ResetPasswordForm } from '../lib/schemas'
import { supabase } from '../lib/supabase'
import Spinner from '../components/ui/Spinner'
import AuthPixelShell from '../components/auth/AuthPixelShell'
import AuthStatusView from '../components/auth/AuthStatusView'
import {
  AuthPasswordField,
  AuthPrimaryButton,
} from '../components/auth/AuthFields'
import { AlertCircle, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session)
      setChecking(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
        setChecking(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function onSubmit(data: ResetPasswordForm) {
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: data.password })

    if (error) {
      setError('root', { message: 'Erro ao redefinir senha. Tente novamente.' })
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/grupos'), 2000)
    }
  }

  if (checking) return <Spinner fullScreen />

  if (!validSession) {
    return (
      <AuthPixelShell fullWidth>
        <div className="flex w-full flex-col gap-8">
          <div className="flex flex-col items-start gap-4">
            <AlertCircle
              size={56}
              strokeWidth={1.9}
              className="text-[#E85D5D]"
            />
            <div className="flex flex-col gap-4">
              <h1 className="text-[32px] font-normal leading-none text-[#F5F7FA]">
                Link inválido
              </h1>
              <p className="max-w-[320px] sm:max-w-none text-[16px] font-normal leading-[1.4] text-[#A7ADBA]">
                Este link expirou ou já foi utilizado. Solicite um novo link de recuperação.
              </p>
            </div>
          </div>

          <Link
            to="/esqueci-senha"
            className="inline-flex items-center gap-2 text-[16px] font-normal leading-[1.4] text-[#F5C249] focus:outline-none focus-visible:underline"
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
            <span>Solicitar novo link</span>
          </Link>
        </div>
      </AuthPixelShell>
    )
  }

  if (success) {
    return (
      <AuthStatusView
        title="Senha redefinida!"
        description="Redirecionando para o app..."
        linkTo="/grupos"
        linkLabel="Ir para o app"
      />
    )
  }

  return (
    <AuthPixelShell title="Redefinir senha">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-6">
          <AuthPasswordField
            id="reset-password"
            label="Nova senha"
            autoComplete="new-password"
            placeholder="Nova senha"
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((current) => !current)}
            error={errors.password?.message}
            {...register('password')}
          />

          <AuthPasswordField
            id="reset-confirm-password"
            label="Confirmar nova senha"
            autoComplete="new-password"
            placeholder="Confirmar nova senha"
            visible={showConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          {errors.root && (
            <p className="text-center text-body-sm text-danger">{errors.root.message}</p>
          )}
        </div>

        <AuthPrimaryButton type="submit" loading={loading}>
          Redefinir senha
        </AuthPrimaryButton>
      </form>
    </AuthPixelShell>
  )
}
