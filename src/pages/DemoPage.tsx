import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Spinner from '../components/ui/Spinner'
import PublicHeader from '../components/public/PublicHeader'
import {
  Users,
  UserPlus,
  Receipt,
  BarChart3,
  ChevronRight,
  ShoppingCart,
  DollarSign,
  Check,
  Utensils,
} from 'lucide-react'

const heroSections = [
  {
    icon: Users,
    title: 'Crie grupos',
    description:
      'Organize suas contas por moradia, viagem, evento ou qualquer situação onde vocês dividem despesas.',
  },
  {
    icon: UserPlus,
    title: 'Convide membros',
    description:
      'Adicione as pessoas do grupo por e-mail. Cada um acessa com sua própria conta e acompanha tudo em tempo real.',
  },
  {
    icon: Receipt,
    title: 'Registre despesas',
    description:
      'Cadastre cada gasto com categoria, quem pagou e como dividir. Simples e rápido.',
  },
  {
    icon: BarChart3,
    title: 'Veja o resumo',
    description:
      'Saiba exatamente quem deve quanto para quem. Sem planilhas, sem confusão.',
  },
]

function PhoneFrame({ children, parentBg }: { children: React.ReactNode; parentBg: string }) {
  return (
    <div className="w-full sm:w-[280px] shrink-0">
      <div className="relative h-[240px] overflow-hidden rounded-t-[20px] bg-[#101116] p-4">
        <div className="mb-3 flex justify-center">
          <div className="h-[4px] w-[40px] rounded-full bg-[#2A2B35]" />
        </div>
        <div className="flex flex-col gap-2">{children}</div>
        {/* Fade mask at bottom */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[60px]"
          style={{
            background: `linear-gradient(to bottom, transparent, ${parentBg})`,
          }}
        />
      </div>
    </div>
  )
}

function MockupGroups({ parentBg }: { parentBg: string }) {
  const groups = [
    { name: 'Casa Tiago & Carol', members: 2, amount: 'R$ 1.240,00' },
    { name: 'Viagem Floripa', members: 4, amount: 'R$ 3.800,00' },
    { name: 'Churrasco Fim de Ano', members: 6, amount: 'R$ 950,00' },
  ]
  return (
    <PhoneFrame parentBg={parentBg}>
      {groups.map((g) => (
        <div key={g.name} className="flex flex-col gap-1 rounded-[8px] bg-[#1C1D25] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[14px] font-normal text-[#F5F7FA]">{g.name}</p>
            <ChevronRight size={16} className="shrink-0 text-[#7C8394]" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] text-[#A7ADBA]">{g.members} membros</p>
            <p className="text-[14px] font-bold text-[#F5C249]">{g.amount}</p>
          </div>
        </div>
      ))}
    </PhoneFrame>
  )
}

function MockupMembers({ parentBg }: { parentBg: string }) {
  const members = [
    { name: 'Tiago', pct: 50, status: 'ativo', color: '#4CAF50' },
    { name: 'Carol', pct: 30, status: 'ativo', color: '#4CAF50' },
    { name: 'Lucas', pct: 20, status: 'pendente', color: '#F5C249' },
  ]
  return (
    <PhoneFrame parentBg={parentBg}>
      {members.map((m) => (
        <div key={m.name} className="flex items-center gap-3 rounded-[8px] bg-[#1C1D25] p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(245,194,73,0.12)]">
            <span className="text-[12px] font-medium text-[#F5C249]">{m.name[0]}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-normal text-[#F5F7FA]">{m.name}</p>
            <p className="text-[12px] text-[#A7ADBA]">{m.pct}%</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-[11px] text-[#7C8394]">{m.status}</span>
          </div>
        </div>
      ))}
    </PhoneFrame>
  )
}

function MockupExpense({ parentBg }: { parentBg: string }) {
  return (
    <PhoneFrame parentBg={parentBg}>
      <div className="flex flex-col gap-3 rounded-[8px] bg-[#1C1D25] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(245,194,73,0.12)]">
            <ShoppingCart size={16} className="text-[#F5C249]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] text-[#F5F7FA]">Compras da semana</p>
            <p className="text-[16px] font-bold text-[#F5F7FA]">R$ 320,00</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-[rgba(245,194,73,0.12)] px-3 text-[11px] font-medium text-[#F5C249]">
            Mercado
          </span>
          <p className="text-[11px] text-[#7C8394]">Pago por Tiago</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-[8px] bg-[#1C1D25] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(245,194,73,0.12)]">
            <Utensils size={16} className="text-[#F5C249]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] text-[#F5F7FA]">Jantar restaurante</p>
            <p className="text-[16px] font-bold text-[#F5F7FA]">R$ 180,00</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-[rgba(245,194,73,0.12)] px-3 text-[11px] font-medium text-[#F5C249]">
            Alimentação
          </span>
          <p className="text-[11px] text-[#7C8394]">Pago por Carol</p>
        </div>
      </div>
    </PhoneFrame>
  )
}

function MockupSummary({ parentBg }: { parentBg: string }) {
  return (
    <PhoneFrame parentBg={parentBg}>
      <div className="rounded-[8px] bg-[#1C1D25] p-4">
        <div className="flex flex-col gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(232,93,93,0.16)]">
            <DollarSign size={14} className="text-[#E85D5D]" />
          </div>
          <p className="text-[12px] text-[#A7ADBA]">Carol deve pagar para Tiago</p>
          <p className="text-[14px] font-bold text-[#E85D5D]">R$ 160,00</p>
        </div>
      </div>
      <div className="rounded-[8px] bg-[#1C1D25] p-4">
        <div className="flex flex-col gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(232,93,93,0.16)]">
            <DollarSign size={14} className="text-[#E85D5D]" />
          </div>
          <p className="text-[12px] text-[#A7ADBA]">Lucas deve pagar para Ana</p>
          <p className="text-[14px] font-bold text-[#E85D5D]">R$ 95,00</p>
        </div>
      </div>
      <div className="rounded-[8px] bg-[#1C1D25] p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(76,175,80,0.16)]">
            <Check size={14} className="text-[#4CAF50]" />
          </div>
          <p className="text-[14px] text-[#4CAF50]">Contas quitadas</p>
        </div>
      </div>
    </PhoneFrame>
  )
}

const BG_COLORS = ['#16171D', '#1C1D25'] as const

function CTAButtons() {
  return (
    <div className="flex items-center gap-3">
      <Link
        to="/entrar"
        className="inline-flex h-[46px] items-center justify-center rounded-[12px] border border-[#F5C249] px-5 text-[16px] font-medium leading-[1.4] text-[#F5C249]"
      >
        Entrar
      </Link>
      <Link
        to="/cadastro"
        className="inline-flex h-[46px] items-center justify-center rounded-[12px] bg-[#F5C249] px-5 text-[16px] font-medium leading-[1.4] text-[#101116]"
      >
        Criar Conta
      </Link>
    </div>
  )
}

export default function DemoPage() {
  const { user, loading } = useAuth()

  if (loading) return <Spinner fullScreen />
  if (user) return <Navigate to="/grupos" replace />

  const mockups = [
    (bg: string) => <MockupGroups parentBg={bg} />,
    (bg: string) => <MockupMembers parentBg={bg} />,
    (bg: string) => <MockupExpense parentBg={bg} />,
    (bg: string) => <MockupSummary parentBg={bg} />,
  ]

  return (
    <div className="min-h-dvh bg-[#101116] text-[#F5F7FA]">
      <div className="mx-auto flex w-full sm:max-w-[900px] flex-col bg-[#101116]">
        <PublicHeader />

        <main className="flex flex-col px-5 sm:px-0">
          {heroSections.map((section, i) => {
            const Icon = section.icon
            const isEven = i % 2 === 0
            const bgHex = BG_COLORS[isEven ? 0 : 1]
            const bgColor = `bg-[${bgHex}]`
            const flexDir = isEven ? 'sm:flex-row' : 'sm:flex-row-reverse'
            const isFirst = i === 0
            const isLast = i === heroSections.length - 1

            return (
              <section
                key={section.title}
                className={`${bgColor} px-5 sm:px-12 py-12 sm:py-16 ${isFirst ? 'rounded-t-[20px]' : ''} ${isLast ? 'rounded-b-[20px]' : ''}`}
              >
                <div className={`flex flex-col ${flexDir} items-center gap-8 sm:gap-12`}>
                  <div className="flex flex-1 flex-col gap-4">
                    <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px] bg-[rgba(245,194,73,0.12)]">
                      <Icon size={24} className="text-[#F5C249]" strokeWidth={1.75} />
                    </div>
                    <h3 className="text-[24px] font-medium leading-none text-[#F5F7FA]">
                      {section.title}
                    </h3>
                    <p className="text-[16px] font-normal leading-[1.5] text-[#A7ADBA]">
                      {section.description}
                    </p>
                  </div>

                  {mockups[i](bgHex)}
                </div>
              </section>
            )
          })}

          <section className="flex flex-col items-center gap-6 px-5 py-16">
            <h2 className="text-center text-[36px] font-medium leading-none text-[#F5F7FA]">
              Pronto para dividir?
            </h2>
            <CTAButtons />
          </section>
        </main>
      </div>
    </div>
  )
}
