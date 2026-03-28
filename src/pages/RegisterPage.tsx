import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterForm } from '../lib/schemas'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/ui/Spinner'
import AuthPixelShell from '../components/auth/AuthPixelShell'
import AuthStatusView from '../components/auth/AuthStatusView'
import {
  AuthInputField,
  AuthPasswordField,
  AuthPrimaryButton,
} from '../components/auth/AuthFields'

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

export default function RegisterPage() {
  const { user, loading: authLoading, signUp } = useAuth()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const redirect = getSafeRedirect(searchParams.get('redirect'))
  const redirectTo = redirect || '/grupos'
  const loginHref = redirect
    ? `/entrar?redirect=${encodeURIComponent(redirect)}`
    : '/entrar'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterForm) {
    setLoading(true)
    const emailRedirectTo = redirect
      ? new URL(redirect, window.location.origin).toString()
      : undefined
    const { error } = await signUp(data.email, data.password, data.name, emailRedirectTo)
    if (error) {
      setError('root', {
        message: error.message || 'Erro ao criar conta. Tente novamente.',
      })
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (authLoading) return <Spinner fullScreen />
  if (user) return <Navigate to={redirectTo} replace />

  if (success) {
    return (
      <AuthStatusView
        title="Conta Criada"
        description="Verifique seu e-mail para confirmar o cadastro."
        linkTo={loginHref}
        linkLabel="Ir para o Login"
      />
    )
  }

  return (
    <AuthPixelShell title="Cadastre-se">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-6">
          <AuthInputField
            id="register-name"
            label="Nome"
            type="text"
            autoComplete="name"
            placeholder="Seu nome"
            error={errors.name?.message}
            {...register('name')}
          />

          <AuthInputField
            id="register-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="Seu e-mail"
            error={errors.email?.message}
            {...register('email')}
          />

          <AuthPasswordField
            id="register-password"
            label="Senha"
            autoComplete="new-password"
            placeholder="Sua senha"
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((current) => !current)}
            error={errors.password?.message}
            {...register('password')}
          />

          <AuthPasswordField
            id="register-confirm-password"
            label="Confirmar Senha"
            autoComplete="new-password"
            placeholder="Confirmar sua senha"
            visible={showConfirmPassword}
            onToggleVisibility={() =>
              setShowConfirmPassword((current) => !current)
            }
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          {errors.root && (
            <p className="text-center text-body-sm text-danger">{errors.root.message}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <AuthPrimaryButton type="submit" loading={loading}>
            Cadastrar
          </AuthPrimaryButton>

          <p className="flex items-center gap-2 text-[16px] font-normal leading-[1.4]">
            <span className="text-[#70707B]">Já tem uma conta?</span>
            <Link
              to={loginHref}
              className="text-[#F5C249] focus:outline-none focus-visible:underline"
            >
              Entre
            </Link>
          </p>
        </div>
      </form>
    </AuthPixelShell>
  )
}
