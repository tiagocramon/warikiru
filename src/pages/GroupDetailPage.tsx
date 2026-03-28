import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useCallback, useEffect, useRef, useState, type ElementType } from 'react'
import { useMinLoading } from '../hooks/useMinLoading'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppLayout } from '../components/layout/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { fetchGroupDetail, deleteGroup } from '../services/groupService'
import { fetchExpenses, deleteExpense } from '../services/expenseService'
import { fetchPayments } from '../services/paymentService'
import { fetchAuditLog } from '../services/auditService'
import { formatCurrency } from '../lib/formatting'
import { useLocalToast } from '../hooks/useLocalToast'
import type { GroupWithMembers, Expense, AuditLog, Payment } from '../types/database'
import { EXPENSE_CATEGORIES } from '../types/database'
import { calculateMonthlyBalance, calculateMemberStats } from '../lib/balance'
import EmptyState from '../components/ui/EmptyState'
import ModalWithToast from '../components/ui/ModalWithToast'
import Spinner from '../components/ui/Spinner'
import EditGroupBottomSheet from './EditGroupPage'
import {
  ShoppingCart,
  Home,
  HeartPulse,
  BookOpen,
  Car,
  Gamepad2,
  Utensils,
  Zap,
  MoreHorizontal,
  Plane,
  CreditCard,
  PawPrint,
  Gift,
  PartyPopper,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Receipt,
  Clock,
  BarChart3,
  Copy,
  ChevronDown,
  DollarSign,
  UserPlus,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, ElementType> = {
  mercado: ShoppingCart,
  moradia: Home,
  saude: HeartPulse,
  educacao: BookOpen,
  transporte: Car,
  lazer: Gamepad2,
  alimentacao: Utensils,
  servicos: Zap,
  viagem: Plane,
  assinaturas: CreditCard,
  pets: PawPrint,
  presentes: Gift,
  festas: PartyPopper,
  contas: Receipt,
  outros: MoreHorizontal,
}

const FIELD_LABELS: Record<string, string> = {
  description: 'Descricao',
  amount: 'Valor',
  category: 'Categoria',
  paid_by_member_id: 'Pago por',
  date: 'Data',
  name: 'Nome',
  percentage: 'Percentual',
  invited_email: 'Email convidado',
  status: 'Status',
  reference_month: 'Mes referencia',
  from_user_id: 'De',
  to_user_id: 'Para',
}

const RELEVANT_FIELDS: Record<string, string[]> = {
  expenses: ['description', 'amount', 'category', 'paid_by_member_id', 'date'],
  group_members: ['name', 'percentage', 'invited_email', 'status'],
  payments: ['amount', 'from_user_id', 'to_user_id', 'reference_month'],
}

type Tab = 'despesas' | 'resumo' | 'historico'

interface ChartPoint {
  day: number
  date: string
  total: number
  x: number
  y: number
}

interface ChartModel {
  points: ChartPoint[]
  width: number
  height: number
  baselineY: number
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function capitalize(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function formatMonthHeading(dateStr: string): string {
  return capitalize(format(parseISO(dateStr), 'MMMM yyyy', { locale: ptBR }))
}

function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy')
}

function formatChartDate(dateStr: string): string {
  return capitalize(format(parseISO(dateStr), 'MMM dd, yyyy', { locale: ptBR }))
}

function formatPercentLabel(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`
}

function buildLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return ''

  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    )
    .join(' ')
}

function buildAreaPath(points: ChartPoint[], baselineY: number): string {
  if (points.length === 0) return ''

  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]

  return `${buildLinePath(points)} L ${lastPoint.x.toFixed(2)} ${baselineY.toFixed(
    2
  )} L ${firstPoint.x.toFixed(2)} ${baselineY.toFixed(2)} Z`
}

function buildMonthlyChartModel(month: string, expenses: Expense[], chartWidth: number): ChartModel {
  const [year, monthNumber] = month.split('-').map(Number)
  const totalDays = new Date(year, monthNumber, 0).getDate()
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === monthNumber
  const lastExpenseDay = expenses.reduce((max, e) => {
    const d = parseISO(e.date).getDate()
    return d > max ? d : max
  }, 0)
  const visibleDays = isCurrentMonth ? Math.min(Math.max(now.getDate(), lastExpenseDay), totalDays) : totalDays
  const chartHeight = 180
  const chartTop = 34
  const chartBottom = 140
  const horizontalPadding = 4
  const totalsByDay = Array.from({ length: visibleDays }, () => 0)

  expenses.forEach((expense) => {
    const expenseDay = parseISO(expense.date).getDate()
    if (expenseDay <= visibleDays) {
      totalsByDay[expenseDay - 1] += expense.amount
    }
  })

  let runningTotal = 0

  const rawPoints = totalsByDay.map((dailyTotal, index) => {
    runningTotal += dailyTotal

    return {
      day: index + 1,
      date: `${month}-${String(index + 1).padStart(2, '0')}`,
      total: runningTotal,
    }
  })

  const maxTotal = rawPoints[rawPoints.length - 1]?.total ?? 0
  const innerWidth = chartWidth - horizontalPadding * 2
  const stepX = rawPoints.length > 1 ? innerWidth / (rawPoints.length - 1) : 0
  const usableHeight = chartBottom - chartTop

  const points = rawPoints.map((point, index) => ({
    ...point,
    x: horizontalPadding + stepX * index,
    y:
      maxTotal === 0
        ? chartBottom
        : chartBottom - (point.total / maxTotal) * usableHeight,
  }))

  return {
    points,
    width: chartWidth,
    height: chartHeight,
    baselineY: chartHeight,
  }
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toasts, showToast } = useLocalToast()
  const { refreshKey } = useAppLayout()
  const chartRef = useRef<HTMLDivElement | null>(null)
  const chartObserverRef = useRef<ResizeObserver | null>(null)
  const [chartWidth, setChartWidth] = useState(350)

  const chartRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (chartObserverRef.current) {
      chartObserverRef.current.disconnect()
      chartObserverRef.current = null
    }

    chartRef.current = node

    if (node) {
      const width = node.getBoundingClientRect().width
      if (width > 0) setChartWidth(width)

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width
          if (w > 0) setChartWidth(w)
        }
      })

      observer.observe(node)
      chartObserverRef.current = observer
    }
  }, [])

  const [group, setGroup] = useState<GroupWithMembers | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditHasMore, setAuditHasMore] = useState(true)
  const [auditLoadingMore, setAuditLoadingMore] = useState(false)
  const auditSentinelRef = useRef<HTMLDivElement | null>(null)
  const [loading, doneLoading] = useMinLoading()
  const [activeTab, setActiveTab] = useState<Tab>('despesas')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [selectedChartDay, setSelectedChartDay] = useState<number | null>(null)
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null)
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const isOwner = group?.owner_id === user?.id

  const monthExpenses = expenses.filter((expense) => expense.date.startsWith(selectedMonth))
  const monthPayments = payments.filter((payment) =>
    payment.reference_month.startsWith(selectedMonth)
  )
  const totalExpensesMonth = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const chartModel = buildMonthlyChartModel(selectedMonth, monthExpenses, chartWidth)
  const selectedChartPoint =
    selectedChartDay == null
      ? null
      : chartModel.points.find((point) => point.day === selectedChartDay) ?? null
  const selectedChartIndex = selectedChartPoint
    ? chartModel.points.findIndex((point) => point.day === selectedChartPoint.day)
    : -1
  const activeChartPoints =
    selectedChartIndex >= 0 ? chartModel.points.slice(0, selectedChartIndex + 1) : []
  const loadGroup = useCallback(async () => {
    if (!groupId) return
    const { data } = await fetchGroupDetail(groupId)
    if (data) setGroup(data as GroupWithMembers)
  }, [groupId])

  const loadExpenses = useCallback(async () => {
    if (!groupId) return
    const { data } = await fetchExpenses(groupId, selectedMonth)
    setExpenses(data ?? [])
  }, [groupId, selectedMonth])

  const loadPayments = useCallback(async () => {
    if (!groupId) return
    const { data } = await fetchPayments(groupId, selectedMonth)
    setPayments(data ?? [])
  }, [groupId, selectedMonth])

  const AUDIT_PAGE_SIZE = 10

  const loadAuditLogs = useCallback(async () => {
    if (!groupId) return
    const { data } = await fetchAuditLog(groupId, { limit: AUDIT_PAGE_SIZE, offset: 0 })
    const logs = data ?? []
    setAuditLogs(logs)
    setAuditHasMore(logs.length >= AUDIT_PAGE_SIZE)
  }, [groupId])

  const loadMoreAuditLogs = useCallback(async () => {
    if (!groupId || !auditHasMore || auditLoadingMore) return
    setAuditLoadingMore(true)
    const { data } = await fetchAuditLog(groupId, { limit: AUDIT_PAGE_SIZE, offset: auditLogs.length })
    const newLogs = data ?? []
    setAuditLogs((prev) => [...prev, ...newLogs])
    setAuditHasMore(newLogs.length >= AUDIT_PAGE_SIZE)
    setAuditLoadingMore(false)
  }, [groupId, auditHasMore, auditLoadingMore, auditLogs.length])

  useEffect(() => {
    let active = true

    Promise.all([loadGroup(), loadExpenses(), loadPayments(), loadAuditLogs()]).then(() => {
      if (active) doneLoading()
    })

    return () => {
      active = false
    }
  }, [loadGroup, loadExpenses, loadPayments, loadAuditLogs, refreshKey])

  useEffect(() => {
    const sentinel = auditSentinelRef.current
    if (!sentinel || activeTab !== 'historico') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreAuditLogs()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [activeTab, loadMoreAuditLogs])

  useEffect(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    if (selectedMonth === currentMonth) {
      setSelectedChartDay(now.getDate())
    } else {
      // For past/future months, select last day of that month
      const [y, m] = selectedMonth.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      setSelectedChartDay(lastDay)
    }
  }, [selectedMonth])

  useEffect(() => {
    if (expandedExpenseId && !monthExpenses.some((expense) => expense.id === expandedExpenseId)) {
      setExpandedExpenseId(null)
    }
  }, [expandedExpenseId, monthExpenses])

  function getMemberNameById(memberId: string): string {
    const member = group?.members.find((entry) => entry.id === memberId)
    if (!member) return 'Desconhecido'
    return member.status === 'pending' ? `${member.name} (pendente)` : member.name
  }

  function getMemberNameByUserId(userId: string): string {
    return group?.members.find((member) => member.user_id === userId)?.name ?? 'Desconhecido'
  }

  function formatFieldValue(key: string, value: unknown): string {
    if (value == null) return '-'
    if (key === 'amount' && typeof value === 'number') return formatCurrency(value)
    if (key === 'percentage' && typeof value === 'number') return formatPercentLabel(value)
    if (key === 'category') {
      const category = EXPENSE_CATEGORIES.find((entry) => entry.value === value)
      return category?.label ?? String(value)
    }
    if (key === 'paid_by_member_id' && typeof value === 'string') return getMemberNameById(value)
    if (key === 'from_user_id' && typeof value === 'string') return getMemberNameByUserId(value)
    if (key === 'to_user_id' && typeof value === 'string') return getMemberNameByUserId(value)
    if (key === 'date' && typeof value === 'string') {
      try {
        return formatShortDate(value)
      } catch {
        return String(value)
      }
    }
    if (key === 'reference_month' && typeof value === 'string') {
      try {
        return formatMonthHeading(value)
      } catch {
        return String(value)
      }
    }
    if (key === 'status') {
      if (value === 'pending') return 'Pendente'
      if (value === 'active') return 'Ativo'
    }
    return String(value)
  }

  async function handleDeleteGroup() {
    if (!groupId) return

    const { error } = await deleteGroup(groupId)

    if (error) {
      console.error('Erro ao excluir grupo:', error)
      showToast('Ops, tivemos um erro!', 'error')
      return
    }

    setDeleteModalOpen(false)
    navigate('/grupos', { state: { toast: { message: 'Grupo excluído com sucesso!', type: 'success' } } })
  }

  async function handleDeleteExpense() {
    if (!deleteExpenseId) return

    await deleteExpense(deleteExpenseId)
    showToast('Deletado com sucesso!', 'success')
    setDeleteExpenseId(null)
    setTimeout(() => {
      loadExpenses()
      loadAuditLogs()
    }, 500)
  }

  function handleMonthChange(delta: number) {
    const [year, monthNumber] = selectedMonth.split('-').map(Number)
    const nextDate = new Date(year, monthNumber - 1 + delta, 1)

    setExpandedExpenseId(null)
    setSelectedChartDay(null)
    setSelectedMonth(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    )
  }

  function handleExpenseToggle(expenseId: string) {
    setExpandedExpenseId((currentId) => (currentId === expenseId ? null : expenseId))
  }

  function handleChartSelection(clientX: number) {
    if (!chartRef.current || chartModel.points.length === 0) return

    const rect = chartRef.current.getBoundingClientRect()
    const relativeX = clamp(clientX - rect.left, 0, rect.width)
    const pointIndex = Math.round((relativeX / rect.width) * (chartModel.points.length - 1))
    const nextPoint = chartModel.points[pointIndex]

    if (nextPoint) setSelectedChartDay(nextPoint.day)
  }

  function translateAction(action: string, entityType: string): string {
    const actionMap: Record<string, string> = {
      'create:expenses': 'Despesa criada',
      'update:expenses': 'Despesa editada',
      'delete:expenses': 'Despesa excluida',
      'create:payments': 'Pagamento registrado',
      'create:group_members': 'Membro convidado',
      'update:group_members': 'Membro atualizado',
      'delete:group_members': 'Membro removido',
    }

    return actionMap[`${action}:${entityType}`] ?? `${action} ${entityType}`
  }

  if (loading) {
    return <Spinner />
  }

  if (!group) {
    return (
      <div className="px-5 pt-6">
        <EmptyState message="Grupo nao encontrado." />
      </div>
    )
  }

  const tabs: { key: Tab; label: string; icon: ElementType }[] = [
    { key: 'despesas', label: 'Despesas', icon: Receipt },
    { key: 'resumo', label: 'Resumo', icon: BarChart3 },
    { key: 'historico', label: 'Historico', icon: Clock },
  ]

  const categoryTotals = monthExpenses.reduce((accumulator, expense) => {
    accumulator[expense.category] = (accumulator[expense.category] || 0) + expense.amount
    return accumulator
  }, {} as Record<string, number>)

  const balances = calculateMonthlyBalance(monthExpenses, group.members, monthPayments)
  const memberStats = calculateMemberStats(monthExpenses, group.members, monthPayments)
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])
  const memberCountLabel = `${group.members.length} ${
    group.members.length === 1 ? 'membro' : 'membros'
  }`

  return (
    <div className="flex flex-1 flex-col pt-4 pb-0">
      <section className="space-y-5 px-5 sm:px-0">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/grupos')}
            className="inline-flex items-center gap-2 text-body text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>

          <Link
            to={`/grupos/${groupId}/despesas/nova`}
            className="inline-flex h-10 items-center justify-center rounded-[8px] bg-accent px-4 text-[14px] font-medium text-text-inverse transition-colors hover:bg-accent-hover"
          >
            Nova Despesa
          </Link>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 flex flex-col">
            <h1 className="overflow-hidden text-ellipsis whitespace-nowrap text-[28px] font-normal leading-[130%] text-text-primary">
              {group.name}
            </h1>
            <p className="text-[16px] leading-[1.4] text-text-primary">{memberCountLabel}</p>
          </div>

          {isOwner ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition-colors hover:bg-[#242632] hover:text-text-primary"
                aria-label="Editar grupo"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition-colors hover:bg-[#242632] hover:text-danger"
                aria-label="Excluir grupo"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="mt-8 mb-3 flex items-center gap-4 rounded-full bg-surface-1">
            <button
              onClick={() => handleMonthChange(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition-colors hover:bg-[#242632] hover:text-text-primary"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-body font-medium text-text-primary">
                {formatMonthHeading(`${selectedMonth}-01`)}
              </p>
              <p className="shrink-0 text-body font-bold text-accent">
                {formatCurrency(selectedChartPoint ? selectedChartPoint.total : totalExpensesMonth)}
              </p>
            </div>

            <button
              onClick={() => handleMonthChange(1)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-text-secondary transition-colors hover:bg-[#242632] hover:text-text-primary"
              aria-label="Proximo mes"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {monthExpenses.length > 0 ? (
            <div
              ref={chartRefCallback}
              className="relative h-[180px] cursor-pointer touch-pan-y"
              onPointerDown={(event) => handleChartSelection(event.clientX)}
              onPointerMove={(event) => {
                if (event.pointerType === 'mouse' || event.buttons === 1) {
                  handleChartSelection(event.clientX)
                }
              }}
            >
              {selectedChartPoint ? (
                <div
                  className="pointer-events-none absolute top-0 z-10 whitespace-nowrap text-[10px] text-text-tertiary"
                  style={{
                    left: selectedChartPoint.x <= chartModel.width / 2
                      ? `${(selectedChartPoint.x / chartModel.width) * 100}%`
                      : undefined,
                    right: selectedChartPoint.x > chartModel.width / 2
                      ? `${((chartModel.width - selectedChartPoint.x) / chartModel.width) * 100}%`
                      : undefined,
                    paddingLeft: selectedChartPoint.x <= chartModel.width / 2 ? 8 : undefined,
                    paddingRight: selectedChartPoint.x > chartModel.width / 2 ? 8 : undefined,
                  }}
                >
                  {formatChartDate(selectedChartPoint.date)}
                </div>
              ) : null}

              <svg
                viewBox={`0 0 ${chartModel.width} ${chartModel.height}`}
                className="h-full w-full overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="month-chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(245, 194, 73, 0.2)" />
                    <stop offset="100%" stopColor="rgba(245, 194, 73, 0)" />
                  </linearGradient>
                </defs>

                <path
                  d={buildLinePath(chartModel.points)}
                  fill="none"
                  stroke="rgba(124, 131, 148, 0.18)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {chartModel.points.length > 0 ? (
                  <path d={buildAreaPath(chartModel.points, chartModel.baselineY)} fill="url(#month-chart-fill)" />
                ) : null}

                {activeChartPoints.length > 0 ? (
                  <path
                    d={buildLinePath(activeChartPoints)}
                    fill="none"
                    stroke="#F5C249"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}

                {selectedChartPoint ? (
                  <>
                    <line
                      x1={selectedChartPoint.x}
                      y1="0"
                      x2={selectedChartPoint.x}
                      y2={chartModel.height}
                      stroke="rgba(124, 131, 148, 0.22)"
                      strokeWidth="1"
                    />
                    <circle
                      cx={selectedChartPoint.x}
                      cy={selectedChartPoint.y}
                      r="4.5"
                      fill="#F5C249"
                    />
                    <circle
                      cx={selectedChartPoint.x}
                      cy={selectedChartPoint.y}
                      r="7.5"
                      fill="rgba(245, 194, 73, 0.18)"
                    />
                  </>
                ) : null}
              </svg>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-4 flex flex-1 flex-col rounded-t-[20px] bg-surface-1 pb-6">
        <div className="flex items-start px-5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex h-12 flex-1 items-center justify-center gap-2 border-b-2 transition-colors ${
                  isActive ? 'border-[#F5C249] text-text-primary' : 'border-[#1C1D25] text-text-tertiary'
                }`}
              >
                <tab.icon size={16} />
                <span className="text-[14px] font-medium leading-[1.4]">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-1 flex-col px-5 pt-5">
          {activeTab === 'despesas' ? (
            monthExpenses.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16">
                <Receipt size={40} className="text-text-tertiary" />
                <p className="text-[14px] font-medium leading-[1.4] text-text-tertiary">
                  Nenhuma despesa neste mês
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {monthExpenses.map((expense) => {
                  const payerName = getMemberNameById(expense.paid_by_member_id)
                  const category = EXPENSE_CATEGORIES.find((entry) => entry.value === expense.category)
                  const CategoryIcon = CATEGORY_ICONS[expense.category] || MoreHorizontal
                  const splitPercentages =
                    expense.custom_percentages ??
                    Object.fromEntries(group.members.map((member) => [member.id, member.percentage]))
                  const shares = Object.entries(splitPercentages).map(([memberId, percentage]) => ({
                    memberId,
                    amount: expense.amount * (Number(percentage) / 100),
                    percentage: Number(percentage),
                  }))
                  const isExpanded = expandedExpenseId === expense.id
                  const canEdit = expense.created_by_user_id === user?.id
                  const canDelete = expense.created_by_user_id === user?.id || isOwner

                  return (
                    <div key={expense.id} className="flex flex-col gap-3 rounded-[8px] bg-surface-2 p-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-subtle text-accent">
                          <CategoryIcon size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] text-text-primary">{expense.description}</p>
                          <p className="text-[16px] font-bold text-text-primary">{formatCurrency(expense.amount)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 items-center rounded-full bg-accent-subtle px-5 text-[12px] font-medium text-accent">
                          {category?.label ?? expense.category}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-[12px] text-text-tertiary">
                          {payerName} pagou em {formatShortDate(expense.date)}
                        </p>
                      </div>

                      <div className="rounded-[4px] bg-[rgba(255,255,255,0.04)]">
                        <button
                          onClick={() => handleExpenseToggle(expense.id)}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        >
                          <span className="text-[12px] font-medium text-accent">Ver divisao</span>
                          <ChevronDown
                            size={16}
                            className={`text-accent transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>

                        <div
                          className="grid transition-[grid-template-rows] duration-200 ease-out"
                          style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-2 px-4 pb-3">
                              {shares.map((share) => {
                                const isPayer = share.memberId === expense.paid_by_member_id

                                return (
                                  <div key={share.memberId} className="flex items-center justify-between gap-3 text-[12px]">
                                    <span className="min-w-0 flex-1 truncate text-text-secondary">
                                      {getMemberNameById(share.memberId)} ({formatPercentLabel(share.percentage)})
                                    </span>
                                    <span className={isPayer ? 'text-success' : 'text-danger'}>
                                      {isPayer ? `pagou ${formatCurrency(share.amount)}` : `deve ${formatCurrency(share.amount)}`}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <Link
                          to={`/grupos/${groupId}/despesas/nova?duplicar=${expense.id}`}
                          className="flex items-center justify-center gap-2 rounded-[8px] py-2 text-[12px] font-medium text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-primary"
                        >
                          <Copy size={16} />
                          Repetir
                        </Link>

                        {canEdit ? (
                          <Link
                            to={`/grupos/${groupId}/despesas/${expense.id}/editar`}
                            className="flex items-center justify-center gap-2 rounded-[8px] py-2 text-[12px] font-medium text-text-tertiary transition-colors hover:bg-white/5 hover:text-text-primary"
                          >
                            <Pencil size={16} />
                            Editar
                          </Link>
                        ) : (
                          <span className="flex items-center justify-center gap-2 rounded-[8px] py-2 text-[12px] font-medium text-text-tertiary opacity-30 cursor-not-allowed">
                            <Pencil size={16} />
                            Editar
                          </span>
                        )}

                        {canDelete ? (
                          <button
                            onClick={() => setDeleteExpenseId(expense.id)}
                            className="flex items-center justify-center gap-2 rounded-[8px] py-2 text-[12px] font-medium text-text-tertiary transition-colors hover:bg-white/5 hover:text-danger"
                          >
                            <Trash2 size={16} />
                            Excluir
                          </button>
                        ) : (
                          <span className="flex items-center justify-center gap-2 rounded-[8px] py-2 text-[12px] font-medium text-text-tertiary opacity-30 cursor-not-allowed">
                            <Trash2 size={16} />
                            Excluir
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : null}

          {activeTab === 'resumo' ? (
            sortedCategories.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16">
                <BarChart3 size={40} className="text-text-tertiary" />
                <p className="text-[14px] font-medium leading-[1.4] text-text-tertiary">
                  Nenhuma despesa neste mês
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-[20px]">
                <section className="flex flex-col gap-[8px]">
                  <p className="text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">
                    Gasto total de todos os membros por categoria
                  </p>
                  <div className="flex gap-[8px] overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                    {sortedCategories.map(([categoryValue, total]) => {
                      const categoryLabel =
                        EXPENSE_CATEGORIES.find((entry) => entry.value === categoryValue)?.label ??
                        categoryValue
                      const Icon = CATEGORY_ICONS[categoryValue] || MoreHorizontal

                      return (
                        <div key={categoryValue} className="w-[160px] shrink-0 rounded-[8px] bg-[#1C1D25] p-[20px]">
                          <div className="flex flex-col gap-[8px]">
                            <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[rgba(245,194,73,0.16)]">
                              <Icon size={16} className="text-[#F5C249]" />
                            </div>
                            <div className="flex flex-col leading-[1.4]">
                              <p className="text-[14px] font-normal text-[#A7ADBA]">{categoryLabel}</p>
                              <p className="text-[16px] font-bold text-[#F5F7FA]">{formatCurrency(total)}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {memberStats.length > 0 ? (
                  <section className="flex flex-col gap-[8px]">
                    <p className="text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">
                      Gasto excedido de cada membro
                    </p>
                    <div className="flex flex-col gap-[8px]">
                      {memberStats.map((stat) => (
                        <div key={stat.member_id} className="rounded-[8px] bg-[#1C1D25] p-[20px]">
                          <div className="flex items-center text-[16px] leading-[1.4]">
                            <p className="min-w-0 flex-1 font-normal text-[#F5F7FA]">
                              {getMemberNameById(stat.member_id)}
                            </p>
                            <p className="shrink-0 font-bold text-[#F5C249] text-right whitespace-nowrap">
                              {formatCurrency(stat.paid_for_others)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="flex flex-col gap-[8px]">
                  <p className="text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">
                    Acerto de Contas
                  </p>

                  {balances.length > 0 ? (
                    <div className="flex flex-col gap-[8px]">
                      {balances.map((balance, index) => (
                        <div key={index} className="rounded-[8px] bg-[#1C1D25] p-[20px]">
                          <div className="flex flex-col gap-[8px]">
                            <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[rgba(232,93,93,0.16)]">
                              <DollarSign size={16} className="text-[#E85D5D]" />
                            </div>
                            <div className="flex flex-col leading-[1.4]">
                              <p className="text-[14px] font-normal text-[#A7ADBA]">
                                {getMemberNameById(balance.from_member_id)} deve pagar para {getMemberNameById(balance.to_member_id)}
                              </p>
                              <p className="text-[16px] font-bold text-[#E85D5D]">
                                {formatCurrency(balance.amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : memberStats.some((stat) => stat.total_share > 0) ? (
                    <div className="rounded-[8px] bg-[#1C1D25] p-[20px]">
                      <p className="text-[16px] leading-[1.4] text-[#4CAF50]">As contas estao quitadas.</p>
                    </div>
                  ) : null}
                </section>
              </div>
            )
          ) : null}

          {activeTab === 'historico' ? (() => {
            const filteredLogs = auditLogs.filter((log) => {
              // Allow create only for invited members (pending) and payments
              if (log.action === 'create') {
                if (log.entity_type === 'payments') return true
                if (log.entity_type === 'group_members') {
                  return log.new_value?.status === 'pending'
                }
                return false
              }
              // For updates, only show if at least one relevant field actually changed
              if (log.action === 'update' && log.old_value && log.new_value) {
                const fields = RELEVANT_FIELDS[log.entity_type] ?? []
                const hasRelevantChange = fields.some(
                  (field) => String(log.old_value?.[field] ?? '') !== String(log.new_value?.[field] ?? '')
                )
                if (!hasRelevantChange) return false
              }
              return true
            })

            return filteredLogs.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16">
                <Clock size={40} className="text-text-tertiary" />
                <p className="text-[14px] font-medium leading-[1.4] text-text-tertiary">
                  Nenhum registro no histórico
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-[20px]">
                {filteredLogs.map((log) => {
                  const isDelete = log.action === 'delete'
                  const isCreate = log.action === 'create'
                  const ActionIcon = isDelete ? Trash2 : isCreate ? UserPlus : Pencil
                  const iconBg = isDelete ? 'bg-[rgba(232,93,93,0.16)]' : isCreate ? 'bg-[rgba(24,179,107,0.16)]' : 'bg-[rgba(91,141,239,0.16)]'
                  const iconColor = isDelete ? 'text-[#E85D5D]' : isCreate ? 'text-[#18B36B]' : 'text-[#5B8DEF]'
                  const isExpanded = expandedAuditId === log.id
                  const fields = RELEVANT_FIELDS[log.entity_type] ?? []

                  return (
                    <div key={log.id} className="rounded-[8px] bg-[#1C1D25] p-[20px]">
                      <button
                        onClick={() => setExpandedAuditId(isExpanded ? null : log.id)}
                        className="flex w-full items-center gap-[8px]"
                      >
                        <div className={`flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                          <ActionIcon size={16} className={iconColor} />
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-[14px] font-normal leading-[1.4] text-[#F5F7FA]">
                            {translateAction(log.action, log.entity_type)}
                          </p>
                          <p className="text-[12px] font-normal leading-[1.4] text-[#7C8394]">
                            {getMemberNameByUserId(log.user_id)} em {formatShortDate(log.created_at.split('T')[0])}
                          </p>
                        </div>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-[#F5C249] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      <div
                        className="grid transition-[grid-template-rows] duration-200 ease-out"
                        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
                      >
                        <div className="overflow-hidden">
                          <div className="flex flex-col gap-[4px] pt-[12px] text-[12px] font-normal leading-[1.4]">
                            {log.action === 'create' && log.new_value ? (
                              fields
                                .filter((field) => log.new_value?.[field] != null)
                                .map((field) => (
                                  <div key={field} className="flex gap-[8px]">
                                    <span className="shrink-0 text-[#A7ADBA]">{FIELD_LABELS[field] || field}:</span>
                                    <span className="min-w-0 flex-1 text-[#F5F7FA]">
                                      {formatFieldValue(field, log.new_value?.[field])}
                                    </span>
                                  </div>
                                ))
                            ) : null}

                            {log.action === 'delete' && log.old_value ? (
                              fields
                                .filter((field) => log.old_value?.[field] != null)
                                .map((field) => (
                                  <div key={field} className="flex gap-[8px]">
                                    <span className="shrink-0 text-[#A7ADBA]">{FIELD_LABELS[field] || field}:</span>
                                    <span className="min-w-0 flex-1 text-[#F5F7FA]">
                                      {formatFieldValue(field, log.old_value?.[field])}
                                    </span>
                                  </div>
                                ))
                            ) : null}

                            {log.action === 'update' && log.new_value ? (
                              fields
                                .filter((field) => log.new_value?.[field] != null)
                                .map((field) => {
                                  const oldVal = log.old_value?.[field]
                                  const newVal = log.new_value?.[field]
                                  const changed = oldVal !== newVal && oldVal != null

                                  return (
                                    <div key={field} className="flex gap-[8px]">
                                      <span className="shrink-0 text-[#A7ADBA]">{FIELD_LABELS[field] || field}:</span>
                                      <span className="min-w-0 flex-1 text-[#F5F7FA]">
                                        {changed ? (
                                          <>
                                            <span className="text-[#7C8394] line-through">{formatFieldValue(field, oldVal)}</span>
                                            <span className="text-[#7C8394]"> → </span>
                                            {formatFieldValue(field, newVal)}
                                          </>
                                        ) : (
                                          formatFieldValue(field, newVal)
                                        )}
                                      </span>
                                    </div>
                                  )
                                })
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Sentinel para infinite scroll */}
                {auditHasMore && (
                  <div ref={auditSentinelRef} className="flex items-center justify-center py-4">
                    {auditLoadingMore && (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#F5C249] border-t-transparent" />
                    )}
                  </div>
                )}
              </div>
            )
          })() : null}
        </div>
      </section>

      <ModalWithToast
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Excluir Grupo"
        toasts={toasts}
      >
        <p className="text-[14px] font-normal leading-[1.4] text-[#7C8394]">
          Tem certeza que deseja excluir o grupo &quot;{group.name}&quot;? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-[16px]">
          <button
            onClick={() => setDeleteModalOpen(false)}
            className="flex h-[48px] flex-1 items-center justify-center rounded-[8px] bg-[#1C1D25] text-[16px] font-medium leading-[1.4] text-[#F5F7FA]"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteGroup}
            className="flex h-[48px] flex-1 items-center justify-center rounded-[8px] bg-[rgba(232,93,93,0.16)] text-[16px] font-medium leading-[1.4] text-[#E85D5D]"
          >
            Excluir
          </button>
        </div>
      </ModalWithToast>

      <ModalWithToast
        open={!!deleteExpenseId}
        onClose={() => setDeleteExpenseId(null)}
        title="Excluir Despesa"
        toasts={toasts}
      >
        <p className="text-[14px] font-normal leading-[1.4] text-[#7C8394]">
          Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-[16px]">
          <button
            onClick={() => setDeleteExpenseId(null)}
            className="flex h-[48px] flex-1 items-center justify-center rounded-[8px] bg-[#1C1D25] text-[16px] font-medium leading-[1.4] text-[#F5F7FA]"
          >
            Cancelar
          </button>
          <button
            onClick={handleDeleteExpense}
            className="flex h-[48px] flex-1 items-center justify-center rounded-[8px] bg-[rgba(232,93,93,0.16)] text-[16px] font-medium leading-[1.4] text-[#E85D5D]"
          >
            Excluir
          </button>
        </div>
      </ModalWithToast>

      <EditGroupBottomSheet
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          loadGroup()
        }}
        groupId={groupId!}
      />
    </div>
  )
}
