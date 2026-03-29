import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type ElementType } from 'react'
import { useMinLoading } from '../hooks/useMinLoading'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppLayout } from '../components/layout/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { fetchGroupDetail, deleteGroup } from '../services/groupService'
import { fetchExpenses, deleteExpense, getPendingRecurringExpenses, generateRecurringExpense, fetchRecurringExpenses, deleteRecurringExpense } from '../services/expenseService'
import { fetchPayments } from '../services/paymentService'
import { fetchAuditLog } from '../services/auditService'
import { formatCurrency } from '../lib/formatting'
import { useLocalToast } from '../hooks/useLocalToast'
import type { GroupWithMembers, Expense, AuditLog, Payment, RecurringExpense } from '../types/database'
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
  Search,
  X,

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

interface DailySpendingBar {
  day: number
  date: string
  dailyTotal: number
  cumulativeTotal: number
  x: number
  y: number
  width: number
  height: number
}

interface DailySpendingChartModel {
  bars: DailySpendingBar[]
  width: number
  height: number
  baselineY: number
  monthTotal: number
  maxDailyTotal: number
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
  return format(parseISO(dateStr), "dd 'de' MMM", { locale: ptBR })
}

function formatPercentLabel(value: number): string {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`
}

function roundCurrencyValue(value: number): number {
  return Math.round(value * 100) / 100
}

function getLastExpenseDay(expenses: Expense[]): number {
  return expenses.reduce((max, expense) => {
    const expenseDay = parseISO(expense.date).getDate()
    return expenseDay > max ? expenseDay : max
  }, 0)
}

function getVisibleMonthDays(month: string, expenses: Expense[]): number {
  const [year, monthNumber] = month.split('-').map(Number)
  const totalDays = new Date(year, monthNumber, 0).getDate()
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === monthNumber
  const lastExpenseDay = getLastExpenseDay(expenses)

  return isCurrentMonth ? Math.min(Math.max(now.getDate(), lastExpenseDay), totalDays) : totalDays
}

function getDefaultSelectedChartDay(month: string, expenses: Expense[]): number {
  const lastExpenseDay = getLastExpenseDay(expenses)

  return lastExpenseDay > 0 ? lastExpenseDay : getVisibleMonthDays(month, expenses)
}

function buildBarPath(bar: DailySpendingBar, topRadius = 4): string {
  if (bar.height <= 0 || bar.width <= 0) return ''

  const radius = Math.min(topRadius, bar.width / 2, bar.height)
  const left = bar.x
  const right = bar.x + bar.width
  const top = bar.y
  const bottom = bar.y + bar.height

  return [
    `M ${left.toFixed(2)} ${bottom.toFixed(2)}`,
    `L ${left.toFixed(2)} ${(top + radius).toFixed(2)}`,
    `Q ${left.toFixed(2)} ${top.toFixed(2)} ${(left + radius).toFixed(2)} ${top.toFixed(2)}`,
    `L ${(right - radius).toFixed(2)} ${top.toFixed(2)}`,
    `Q ${right.toFixed(2)} ${top.toFixed(2)} ${right.toFixed(2)} ${(top + radius).toFixed(2)}`,
    `L ${right.toFixed(2)} ${bottom.toFixed(2)}`,
    'Z',
  ].join(' ')
}

function buildMonthlySpendingChartModel(
  month: string,
  expenses: Expense[],
  chartWidth: number
): DailySpendingChartModel {
  const visibleDays = getVisibleMonthDays(month, expenses)
  const chartHeight = 180
  const chartTop = 30
  const chartBottom = 166
  const horizontalPadding = 6
  const barGap = 4
  const minimumBarHeight = 6
  const totalsByDay = Array.from({ length: visibleDays }, () => 0)

  expenses.forEach((expense) => {
    const expenseDay = parseISO(expense.date).getDate()
    if (expenseDay <= visibleDays) {
      totalsByDay[expenseDay - 1] += expense.amount
    }
  })

  let runningTotal = 0

  const rawBars = totalsByDay.map((dailyTotal, index) => {
    runningTotal = roundCurrencyValue(runningTotal + dailyTotal)

    return {
      day: index + 1,
      date: `${month}-${String(index + 1).padStart(2, '0')}`,
      dailyTotal: roundCurrencyValue(dailyTotal),
      cumulativeTotal: runningTotal,
    }
  })

  const monthTotal = rawBars[rawBars.length - 1]?.cumulativeTotal ?? 0
  const maxDailyTotal = rawBars.reduce(
    (max, bar) => (bar.dailyTotal > max ? bar.dailyTotal : max),
    0
  )
  const innerWidth = chartWidth - horizontalPadding * 2
  const slotWidth = rawBars.length > 0 ? innerWidth / rawBars.length : 0
  const barWidth = slotWidth > 0 ? Math.max(Math.min(slotWidth - barGap, 18), 4) : 0
  const usableHeight = chartBottom - chartTop

  const bars = rawBars.map((bar, index) => {
    const scaledHeight =
      maxDailyTotal === 0
        ? minimumBarHeight
        : bar.dailyTotal === 0
          ? minimumBarHeight
          : Math.max((bar.dailyTotal / maxDailyTotal) * usableHeight, 12)

    return {
      ...bar,
      x: horizontalPadding + slotWidth * index + Math.max((slotWidth - barWidth) / 2, 0),
      y: chartBottom - scaledHeight,
      width: barWidth,
      height: scaledHeight,
    }
  })

  return {
    bars,
    width: chartWidth,
    height: chartHeight,
    baselineY: chartBottom,
    monthTotal,
    maxDailyTotal,
  }
}

const SWIPE_THRESHOLD = 60
const SWIPE_ACTION_WIDTH = 160

function SwipeableExpenseCard({
  expenseId,
  swipedExpenseId,
  onSwipeOpen,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onDuplicate,
  children,
}: {
  expenseId: string
  swipedExpenseId: string | null
  onSwipeOpen: (id: string | null) => void
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  children: React.ReactNode
}) {
  const x = useMotionValue(0)
  const isOpen = swipedExpenseId === expenseId
  const actionsOpacity = useTransform(x, [-SWIPE_ACTION_WIDTH, -30, 0], [1, 0.5, 0])
  const fadeOpacity = useTransform(x, [-SWIPE_ACTION_WIDTH, -20, 0], [0.85, 0.3, 0])

  useEffect(() => {
    if (!isOpen) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    }
  }, [isOpen, x])

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    const shouldOpen = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -500

    if (shouldOpen) {
      animate(x, -SWIPE_ACTION_WIDTH, { type: 'spring', stiffness: 400, damping: 30 })
      onSwipeOpen(expenseId)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
      onSwipeOpen(null)
    }
  }

  function handleTap() {
    if (isOpen) {
      onSwipeOpen(null)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[8px]">
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: SWIPE_ACTION_WIDTH, opacity: actionsOpacity }}
      >
        <button
          onClick={onDuplicate}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-text-tertiary transition-colors hover:text-text-secondary"
          aria-label="Repetir despesa"
        >
          <Copy size={18} />
          <span className="text-[10px] font-medium">Repetir</span>
        </button>
        {canEdit && (
          <button
            onClick={onEdit}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-text-tertiary transition-colors hover:text-text-secondary"
            aria-label="Editar despesa"
          >
            <Pencil size={18} />
            <span className="text-[10px] font-medium">Editar</span>
          </button>
        )}
        {canDelete && (
          <button
            onClick={onDelete}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-text-tertiary transition-colors hover:text-text-secondary"
            aria-label="Excluir despesa"
          >
            <Trash2 size={18} />
            <span className="text-[10px] font-medium">Excluir</span>
          </button>
        )}
      </motion.div>

      <motion.div
        className="relative flex flex-col gap-3 rounded-[8px] bg-surface-2 p-5"
        style={{ x }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -SWIPE_ACTION_WIDTH, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        onTap={handleTap}
      >
        {children}

        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[8px]"
          style={{
            opacity: fadeOpacity,
            background: 'linear-gradient(to right, transparent 40%, var(--surface-01) 100%)',
          }}
        />
      </motion.div>
    </div>
  )
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
  const [swipedExpenseId, setSwipedExpenseId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterPayer, setFilterPayer] = useState<string | null>(null)
  const [pendingRecurring, setPendingRecurring] = useState<RecurringExpense[]>([])
  const [allRecurring, setAllRecurring] = useState<RecurringExpense[]>([])
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const isOwner = group?.owner_id === user?.id

  const monthExpenses = expenses
  const monthPayments = payments
  const totalExpensesMonth = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  const hasActiveFilters = searchQuery !== '' || filterCategory !== null || filterPayer !== null
  const filteredExpenses = monthExpenses.filter((expense) => {
    if (searchQuery && !expense.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterCategory && expense.category !== filterCategory) return false
    if (filterPayer && expense.paid_by_member_id !== filterPayer) return false
    return true
  })
  const chartModel = buildMonthlySpendingChartModel(selectedMonth, monthExpenses, chartWidth)
  const lastExpenseBar =
    [...chartModel.bars].reverse().find((bar) => bar.dailyTotal > 0) ??
    chartModel.bars[chartModel.bars.length - 1] ??
    null
  const selectedChartBar =
    selectedChartDay == null
      ? lastExpenseBar
      : chartModel.bars.find((bar) => bar.day === selectedChartDay) ??
        lastExpenseBar ??
        null
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

  const loadPendingRecurring = useCallback(async () => {
    if (!groupId) return
    const { pending, error } = await getPendingRecurringExpenses(groupId, selectedMonth)
    if (error) console.error('Erro ao buscar recorrentes pendentes:', error)
    setPendingRecurring(pending)
  }, [groupId, selectedMonth])

  const loadAllRecurring = useCallback(async () => {
    if (!groupId) return
    const { data, error } = await fetchRecurringExpenses(groupId)
    if (error) console.error('Erro ao buscar recorrentes:', error)
    setAllRecurring(data ?? [])
  }, [groupId])

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

    Promise.all([loadGroup(), loadExpenses(), loadPayments(), loadAuditLogs(), loadPendingRecurring(), loadAllRecurring()]).then(() => {
      if (active) doneLoading()
    })

    return () => {
      active = false
    }
  }, [loadGroup, loadExpenses, loadPayments, loadAuditLogs, loadPendingRecurring, loadAllRecurring, refreshKey, doneLoading])

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
    const defaultDay = getDefaultSelectedChartDay(selectedMonth, expenses)
    const visibleDays = getVisibleMonthDays(selectedMonth, expenses)

    setSelectedChartDay((currentDay) => {
      if (currentDay != null && currentDay >= 1 && currentDay <= visibleDays) {
        return currentDay
      }

      return defaultDay
    })
  }, [selectedMonth, expenses])

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

  async function handleDeleteRecurring(recurringId: string) {
    const { error } = await deleteRecurringExpense(recurringId)
    if (error) {
      showToast('Erro ao desativar', 'error')
    } else {
      showToast('Recorrente desativada', 'success')
      setAllRecurring((prev) => prev.filter((r) => r.id !== recurringId))
      setPendingRecurring((prev) => prev.filter((r) => r.id !== recurringId))
    }
  }

  async function handleGenerateRecurring(recurring: RecurringExpense) {
    setGeneratingId(recurring.id)
    const { error } = await generateRecurringExpense(recurring, selectedMonth)
    setGeneratingId(null)

    if (error) {
      console.error('Erro ao gerar recorrente:', error)
      showToast('Erro ao gerar despesa', 'error')
    } else {
      showToast('Despesa gerada!', 'success')
      setPendingRecurring((prev) => prev.filter((r) => r.id !== recurring.id))
      loadExpenses()
      loadAuditLogs()
    }
  }

  function handleMonthChange(delta: number) {
    const [year, monthNumber] = selectedMonth.split('-').map(Number)
    const nextDate = new Date(year, monthNumber - 1 + delta, 1)

    setExpandedExpenseId(null)
    setSelectedChartDay(null)
    setSearchQuery('')
    setFilterCategory(null)
    setFilterPayer(null)
    setSelectedMonth(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    )
  }

  function handleExpenseToggle(expenseId: string) {
    setExpandedExpenseId((currentId) => (currentId === expenseId ? null : expenseId))
  }

  function handleChartSelection(clientX: number) {
    if (!chartRef.current || chartModel.bars.length === 0) return

    const rect = chartRef.current.getBoundingClientRect()
    const relativeX = clamp(clientX - rect.left, 0, rect.width)
    const chartX = (relativeX / rect.width) * chartModel.width
    const nextBar = chartModel.bars.reduce((closestBar, bar) => {
      if (!closestBar) return bar

      const closestCenter = closestBar.x + closestBar.width / 2
      const currentCenter = bar.x + bar.width / 2

      return Math.abs(currentCenter - chartX) < Math.abs(closestCenter - chartX)
        ? bar
        : closestBar
    }, chartModel.bars[0])

    if (nextBar) setSelectedChartDay(nextBar.day)
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
  const monthExpenseCountLabel = `${monthExpenses.length} ${
    monthExpenses.length === 1 ? 'despesa lançada' : 'despesas lançadas'
  }`
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

            <div className="flex min-w-0 flex-1 items-center justify-center">
              <p className="truncate text-center text-body font-medium text-text-primary">
                {formatMonthHeading(`${selectedMonth}-01`)}
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
            <>
              <div className="rounded-[8px] bg-surface-1 p-[20px]">
                <div className="flex gap-[8px] items-center">
                  <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[rgba(245,194,73,0.16)]">
                    <Receipt size={16} className="text-[#F5C249]" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col leading-[1.4]">
                    <p className="text-[14px] font-normal text-[#A7ADBA]">
                      Total lançado no mês ({monthExpenseCountLabel})
                    </p>
                    <p className="text-[16px] font-bold text-text-primary">
                      {formatCurrency(totalExpensesMonth)}
                    </p>
                  </div>
                </div>
              </div>

              {balances.length > 0 ? (
                <div className="flex flex-col gap-[8px]">
                  {balances.map((balance, index) => (
                    <div key={index} className="rounded-[8px] bg-surface-1 p-[20px]">
                      <div className="flex gap-[8px] items-center">
                        <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full bg-[rgba(232,93,93,0.16)]">
                          <DollarSign size={16} className="text-[#E85D5D]" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col leading-[1.4]">
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
              ) : (
                <div className="rounded-[8px] bg-surface-1 p-[20px]">
                  <p className="text-[16px] leading-[1.4] text-[#4CAF50]">
                    {memberStats.some((stat) => stat.total_share > 0)
                      ? 'As contas estao quitadas.'
                      : 'Nenhuma pendência de acerto neste mês.'}
                  </p>
                </div>
              )}
            </>
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
            <>
              {pendingRecurring.length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className="text-[12px] font-medium text-accent">Despesas recorrentes pendentes</p>
                  {pendingRecurring.map((recurring) => {
                    const RecurringIcon = CATEGORY_ICONS[recurring.category] || MoreHorizontal
                    const isGenerating = generatingId === recurring.id

                    return (
                      <div
                        key={recurring.id}
                        className="flex items-center gap-3 rounded-[8px] border border-dashed border-[rgba(245,194,73,0.16)] p-4"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-accent">
                          <RecurringIcon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-text-primary">{recurring.description}</p>
                          <p className="text-[11px] text-text-tertiary">
                            {formatCurrency(recurring.amount)} · dia {recurring.day_of_month}
                          </p>
                        </div>
                        <button
                          onClick={() => handleGenerateRecurring(recurring)}
                          disabled={isGenerating}
                          className="flex h-8 items-center gap-1.5 rounded-full bg-accent/20 px-3 text-[11px] font-medium text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-accent border-t-transparent" />
                          ) : (
                            'Gerar'
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
              {monthExpenses.length === 0 && pendingRecurring.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16">
                <Receipt size={40} className="text-text-tertiary" />
                <p className="text-[14px] font-medium leading-[1.4] text-text-tertiary">
                  Nenhuma despesa neste mês
                </p>
              </div>
            ) : monthExpenses.length === 0 ? null : (
              <div className="flex flex-1 flex-col gap-3">
                {/* Search & Filters */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                    <input
                      type="text"
                      placeholder="Buscar despesa..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 w-full rounded-[8px] bg-surface-2 pl-9 pr-9 text-[13px] text-text-primary placeholder:text-text-tertiary outline-none"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {EXPENSE_CATEGORIES.map((cat) => {
                      const Icon = CATEGORY_ICONS[cat.value] || MoreHorizontal
                      const isActive = filterCategory === cat.value
                      return (
                        <button
                          key={cat.value}
                          onClick={() => setFilterCategory(isActive ? null : cat.value)}
                          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                            isActive
                              ? 'bg-accent-subtle text-accent'
                              : 'bg-surface-2 text-text-tertiary hover:text-text-secondary'
                          }`}
                        >
                          <Icon size={12} />
                          {cat.label}
                        </button>
                      )
                    })}
                  </div>

                  {group.members.length > 2 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                      {group.members.map((member) => {
                        const isActive = filterPayer === member.id
                        return (
                          <button
                            key={member.id}
                            onClick={() => setFilterPayer(isActive ? null : member.id)}
                            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                              isActive
                                ? 'bg-accent-subtle text-accent'
                                : 'bg-surface-2 text-text-tertiary hover:text-text-secondary'
                            }`}
                          >
                            {member.name}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {hasActiveFilters && (
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] text-text-tertiary">
                        {filteredExpenses.length} de {monthExpenses.length} despesas
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setFilterCategory(null)
                          setFilterPayer(null)
                        }}
                        className="text-[12px] font-medium text-accent"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  )}
                </div>

                {filteredExpenses.length === 0 && hasActiveFilters ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2">
                    <Search size={32} className="text-text-tertiary" />
                    <p className="text-[14px] font-medium text-text-tertiary">
                      Nenhuma despesa encontrada
                    </p>
                  </div>
                ) : (
                  filteredExpenses.map((expense) => {
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
                      <SwipeableExpenseCard
                        key={expense.id}
                        expenseId={expense.id}
                        swipedExpenseId={swipedExpenseId}
                        onSwipeOpen={setSwipedExpenseId}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEdit={() => navigate(`/grupos/${groupId}/despesas/${expense.id}/editar`)}
                        onDelete={() => setDeleteExpenseId(expense.id)}
                        onDuplicate={() => navigate(`/grupos/${groupId}/despesas/nova?duplicar=${expense.id}`)}
                      >
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
                      </SwipeableExpenseCard>
                    )
                  })
                )}
              </div>
            )}
            </>
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
                {chartModel.bars.length > 0 ? (
                  <section className="flex flex-col gap-[12px]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">
                          Evolução diária do mês
                        </p>
                      </div>
                      {selectedChartBar ? (
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] text-text-tertiary">
                            {capitalize(formatChartDate(selectedChartBar.date))}
                          </p>
                          <p className="text-[16px] font-bold text-text-primary">
                            {formatCurrency(selectedChartBar.dailyTotal)}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-[8px] bg-[#1C1D25] px-1 py-2 sm:px-1.5">
                      <div
                        ref={chartRefCallback}
                        className="relative h-[180px] cursor-pointer touch-pan-y"
                        onMouseEnter={(event) => handleChartSelection(event.clientX)}
                        onMouseMove={(event) => handleChartSelection(event.clientX)}
                        onClick={(event) => handleChartSelection(event.clientX)}
                        onTouchStart={(event) => handleChartSelection(event.touches[0].clientX)}
                        onTouchMove={(event) => handleChartSelection(event.touches[0].clientX)}
                      >
                        <svg
                          viewBox={`0 0 ${chartModel.width} ${chartModel.height}`}
                          className="h-full w-full overflow-visible"
                          aria-hidden="true"
                        >
                          <line
                            x1="0"
                            y1={chartModel.baselineY}
                            x2={chartModel.width}
                            y2={chartModel.baselineY}
                            stroke="rgba(124, 131, 148, 0.18)"
                            strokeWidth="1"
                          />

                          {selectedChartBar ? (
                            <line
                              x1={selectedChartBar.x + selectedChartBar.width / 2}
                              y1="8"
                              x2={selectedChartBar.x + selectedChartBar.width / 2}
                              y2={chartModel.baselineY}
                              stroke="rgba(124, 131, 148, 0.18)"
                              strokeWidth="1"
                            />
                          ) : null}

                          {chartModel.bars.map((bar) => {
                            const isSelected = selectedChartBar?.day === bar.day
                            const fill = isSelected
                              ? '#F5C249'
                              : bar.dailyTotal > 0
                                ? 'rgba(245, 194, 73, 0.34)'
                                : 'rgba(124, 131, 148, 0.18)'

                            return <path key={bar.day} d={buildBarPath(bar)} fill={fill} />
                          })}
                        </svg>
                      </div>
                      <div className="flex items-center justify-between px-1 pb-1 text-[11px] text-text-tertiary">
                        <span>Dia 1</span>
                        <span>Dia {Math.ceil(chartModel.bars.length / 2)}</span>
                        <span>Dia {chartModel.bars.length}</span>
                      </div>
                    </div>
                  </section>
                ) : null}

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

                {allRecurring.length > 0 && (
                  <section className="space-y-3">
                    <p className="text-[12px] font-medium text-accent">Despesas recorrentes ativas</p>
                    {allRecurring.map((recurring) => {
                      const RecIcon = CATEGORY_ICONS[recurring.category] || MoreHorizontal
                      const catLabel = EXPENSE_CATEGORIES.find((c) => c.value === recurring.category)?.label ?? recurring.category

                      return (
                        <div key={recurring.id} className="flex items-center gap-3 rounded-[8px] border border-dashed border-[rgba(245,194,73,0.16)] p-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-accent">
                            <RecIcon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] text-text-primary">{recurring.description}</p>
                            <p className="text-[11px] text-text-tertiary">
                              {formatCurrency(recurring.amount)} · {catLabel} · dia {recurring.day_of_month}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteRecurring(recurring.id)}
                            className="text-text-tertiary transition-colors hover:text-danger"
                            aria-label="Desativar recorrente"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </section>
                )}
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
        initialGroup={group}
      />
    </div>
  )
}
