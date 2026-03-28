import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordForm } from '../lib/schemas'
import { supabase } from '../lib/supabase'
import AuthPixelShell from '../components/auth/AuthPixelShell'
import AuthStatusView from '../components/auth/AuthStatusView'
import {
  AuthInputField,
  AuthPrimaryButton,
} from '../components/auth/AuthFields'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordForm) {
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })

    if (error) {
      setError('root', { message: 'Erro ao enviar e-mail. Tente novamente.' })
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <AuthStatusView
        title="E-mail enviado"
        description="Verifique sua caixa de entrada para redefinir a sua senha."
        linkTo="/entrar"
        linkLabel="Voltar para o Login"
      />
    )
  }

  return (
    <AuthPixelShell title="Esqueceu a senha">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-6">
          <p className="max-w-[320px] sm:max-w-none text-[16px] font-normal leading-[1.4] text-[#A7ADBA]">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>

          <AuthInputField
            id="forgot-password-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="Seu e-mail"
            error={errors.email?.message}
            {...register('email')}
          />

          {errors.root && (
            <p className="text-center text-body-sm text-danger">{errors.root.message}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <AuthPrimaryButton type="submit" loading={loading}>
            Enviar Link
          </AuthPrimaryButton>

          <Link
            to="/entrar"
            className="inline-flex items-center gap-2 text-[16px] font-normal leading-[1.4] text-[#F5C249] focus:outline-none focus-visible:underline"
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
            <span>Voltar para o Login</span>
          </Link>
        </div>
      </form>
    </AuthPixelShell>
  )
}
