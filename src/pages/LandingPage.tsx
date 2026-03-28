import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/ui/Spinner'
import PublicHeader from '../components/public/PublicHeader'

export default function LandingPage() {
  const { user, loading } = useAuth()

  if (loading) return <Spinner fullScreen />
  if (user) return <Navigate to="/grupos" replace />

  return (
    <div className="min-h-dvh bg-[#101116] text-[#F5F7FA]">
      <div className="mx-auto flex min-h-dvh w-full sm:max-w-[900px] flex-col bg-[#101116]">
        <PublicHeader />

        <main className="flex flex-1 flex-col justify-end gap-10 px-5 sm:px-0 pb-10">
          <section className="flex flex-col gap-5">
            <h1 className="text-[48px] font-normal leading-none tracking-normal text-[#F5F7FA]">
              <span className="block sm:inline">Divida contas </span>
              <span className="block sm:inline">com clareza!</span>
            </h1>

            <p className="text-[16px] font-normal leading-[1.4] text-[#F5F7FA]">
              <span className="block sm:inline"><span className="text-[#F5C249]">Warikiru</span> ajuda você a dividir contas, </span>
              <span className="block sm:inline">registrar despesas e manter tudo </span>
              <span className="block sm:inline">transparente entre todos.</span>
            </p>
          </section>

          <div className="flex items-center gap-3">
            <Link
              to="/entrar"
              className="inline-flex h-[46px] items-center justify-center rounded-[12px] border border-[#F5C249] px-5 text-[16px] font-medium leading-[1.4] text-[#F5C249] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C249] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101116]"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="inline-flex h-[46px] items-center justify-center rounded-[12px] bg-[#F5C249] px-5 text-[16px] font-medium leading-[1.4] text-[#101116] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C249] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101116]"
            >
              Criar Conta
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
