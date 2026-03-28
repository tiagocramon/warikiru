import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginForm } from '../lib/schemas'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/ui/Spinner'
import AuthPixelShell from '../components/auth/AuthPixelShell'
import {
  AuthInputField,
  AuthPasswordField,
  AuthPrimaryButton,
} from '../components/auth/AuthFields'

function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

export default function LoginPage() {
  const { user, loading: authLoading, signIn } = useAuth()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const redirect = getSafeRedirect(searchParams.get('redirect'))
  const redirectTo = redirect || '/grupos'
  const registerHref = redirect
    ? `/cadastro?redirect=${encodeURIComponent(redirect)}`
    : '/cadastro'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setLoading(true)

    const { error } = await signIn(data.email, data.password)
    if (error) {
      const isEmailNotConfirmed = error.message?.toLowerCase().includes('email not confirmed')
      setError('root', {
        message: isEmailNotConfirmed
          ? 'Seu cadastro ainda não foi confirmado. Verifique sua caixa de entrada e clique no link de confirmação.'
          : 'E-mail ou senha incorretos.',
      })
      setLoading(false)
    }
  }

  if (authLoading) return <Spinner fullScreen />
  if (user) return <Navigate to={redirectTo} replace />

  return (
    <AuthPixelShell title="Login">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-6">
          <AuthInputField
            id="login-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="Seu e-mail"
            error={errors.email?.message}
            {...register('email')}
          />

          <AuthPasswordField
            id="login-password"
            label="Senha"
            autoComplete="current-password"
            placeholder="Sua senha"
            visible={showPassword}
            onToggleVisibility={() => setShowPassword((current) => !current)}
            error={errors.password?.message}
            labelAction={
              <Link
                to="/esqueci-senha"
                className="text-[16px] font-normal leading-[1.4] text-[#7C8394] focus:outline-none focus-visible:text-[#F5C249]"
              >
                Esqueceu?
              </Link>
            }
            {...register('password')}
          />

          {errors.root && (
            <p className="text-center text-body-sm text-danger">{errors.root.message}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <AuthPrimaryButton type="submit" loading={loading}>
            Entrar
          </AuthPrimaryButton>

          <p className="flex items-center gap-2 text-[16px] font-normal leading-[1.4]">
            <span className="text-[#70707B]">Não tem uma conta?</span>
            <Link
              to={registerHref}
              className="text-[#F5C249] focus:outline-none focus-visible:underline"
            >
              Cadastre-se
            </Link>
          </p>
        </div>
      </form>
    </AuthPixelShell>
  )
}
