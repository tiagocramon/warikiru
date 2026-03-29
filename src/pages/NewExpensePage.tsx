import { useEffect, useState, useCallback, useMemo } from 'react'
import { useMinLoading } from '../hooks/useMinLoading'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppLayout } from '../components/layout/AppLayout'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { expenseSchema, type ExpenseForm } from '../lib/schemas'
import { fetchGroupDetail } from '../services/groupService'
import { fetchExpenses, createExpense, createRecurringExpense } from '../services/expenseService'
import { useLocalToast } from '../hooks/useLocalToast'
import type { GroupMember, GroupWithMembers, ExpenseCategory } from '../types/database'
import { EXPENSE_CATEGORIES } from '../types/database'
import Spinner from '../components/ui/Spinner'
import {
  ArrowLeft,
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
  Receipt,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
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

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const days: { day: number; currentMonth: boolean; dateStr: string }[] = []

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    days.push({
      day: d,
      currentMonth: false,
      dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      currentMonth: true,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }

  // Next month leading days (fill to complete last row of 7)
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 11 ? 0 : month + 1
      const nextYear = month === 11 ? year + 1 : year
      days.push({
        day: d,
        currentMonth: false,
        dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      })
    }
  }

  return days
}

export default function NewExpensePage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { showToast } = useLocalToast()
  const { refreshKey } = useAppLayout()
  const [searchParams] = useSearchParams()
  const duplicateFromId = searchParams.get('duplicar')

  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, doneLoading] = useMinLoading()
  const [submitting, setSubmitting] = useState(false)
  const [amountRaw, setAmountRaw] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: undefined as unknown as number,
      category: 'outros',
      description: '',
      date: new Date().toISOString().split('T')[0],
      paidByMemberId: '',
      useCustomPercentages: false,
      customPercentages: {},
      isRecurring: false,
      dayOfMonth: new Date().getDate(),
    },
  })

  const category = watch('category')
  const paidByMemberId = watch('paidByMemberId')
  const useCustomPercentages = watch('useCustomPercentages')
  const customPercentages = watch('customPercentages')
  const description = watch('description')
  const isRecurring = watch('isRecurring')
  const date = watch('date')

  const calendarDays = useMemo(
    () => getCalendarDays(calendarMonth.year, calendarMonth.month),
    [calendarMonth.year, calendarMonth.month]
  )

  const syncAmountFromRaw = useCallback(
    (raw: string) => {
      if (!raw) {
        setValue('amount', undefined as unknown as number)
        return
      }
      const parsed = parseInt(raw, 10)
      if (!isNaN(parsed)) {
        setValue('amount', parsed / 100)
      }
    },
    [setValue]
  )

  function handleKeyPress(key: string) {
    if (key === 'Deletar') {
      const next = amountRaw.slice(0, -1)
      setAmountRaw(next)
      syncAmountFromRaw(next)
      return
    }
    if (amountRaw.length >= 10) return
    const next = amountRaw + key
    setAmountRaw(next)
    syncAmountFromRaw(next)
  }

  function formatDisplayAmount(raw: string): { prefix: string; value: string } {
    if (!raw) return { prefix: 'R$', value: '0,00' }
    const padded = raw.padStart(3, '0')
    const intPart = padded.slice(0, -2)
    const decPart = padded.slice(-2)
    const intFormatted = parseInt(intPart, 10).toLocaleString('pt-BR')
    return { prefix: 'R$', value: `${intFormatted},${decPart}` }
  }

  function handleCalendarMonthChange(delta: number) {
    setCalendarMonth((prev) => {
      let newMonth = prev.month + delta
      let newYear = prev.year
      if (newMonth < 0) {
        newMonth = 11
        newYear--
      } else if (newMonth > 11) {
        newMonth = 0
        newYear++
      }
      return { year: newYear, month: newMonth }
    })
  }

  function handleDaySelect(dateStr: string) {
    setValue('date', dateStr)
    // Sync calendar view to the selected date's month
    const [y, m] = dateStr.split('-').map(Number)
    setCalendarMonth({ year: y, month: m - 1 })
  }

  const loadData = useCallback(async () => {
    if (!groupId) return

    const { data } = await fetchGroupDetail(groupId!)
    if (data) {
      const g = data as GroupWithMembers
      setMembers(g.members)
      if (g.members.length > 0) {
        setValue('paidByMemberId', g.members[0].id)
        const pcts: Record<string, number> = {}
        g.members.forEach((m: GroupMember) => {
          pcts[m.id] = m.percentage
        })
        setValue('customPercentages', pcts)
      }

      if (duplicateFromId) {
        const { data: allExpenses } = await fetchExpenses(groupId!)
        const source = allExpenses?.find((e) => e.id === duplicateFromId)
        if (source) {
          setValue('category', source.category)
          setValue('description', source.description)
          setValue('amount', source.amount)
          setValue('paidByMemberId', source.paid_by_member_id)
          const cents = Math.round(source.amount * 100).toString()
          setAmountRaw(cents)
          if (source.custom_percentages) {
            setValue('useCustomPercentages', true)
            const pcts: Record<string, number> = {}
            Object.entries(source.custom_percentages).forEach(([k, v]) => {
              pcts[k] = Number(v)
            })
            setValue('customPercentages', pcts)
          }
        }
      }
    }
    doneLoading()
  }, [groupId, duplicateFromId, setValue, syncAmountFromRaw])

  useEffect(() => {
    loadData()
  }, [loadData, refreshKey])

  async function onSubmit(data: ExpenseForm) {
    setSubmitting(true)

    const parsedCustom = data.useCustomPercentages ? data.customPercentages : null

    const { error } = await createExpense({
      group_id: groupId!,
      category: data.category as ExpenseCategory,
      description: data.description,
      amount: data.amount,
      date: data.date,
      paid_by_member_id: data.paidByMemberId,
      custom_percentages: parsedCustom,
    })

    if (error) {
      setError('root', { message: 'Erro ao criar despesa. Tente novamente.' })
      showToast('Ops, tivemos um erro!', 'error')
      setSubmitting(false)
      return
    }

    if (data.isRecurring && data.dayOfMonth) {
      const currentMonth = data.date.slice(0, 7)
      const { error: recurringError } = await createRecurringExpense({
        group_id: groupId!,
        category: data.category as ExpenseCategory,
        description: data.description,
        amount: data.amount,
        day_of_month: data.dayOfMonth,
        paid_by_member_id: data.paidByMemberId,
        custom_percentages: parsedCustom,
        last_generated_month: currentMonth,
      })
      if (recurringError) {
        console.error('Erro ao criar recorrente:', recurringError)
        showToast('Despesa criada, mas erro ao salvar recorrência', 'error')
        navigate(`/grupos/${groupId}`)
        return
      }
    }

    showToast(
      data.isRecurring ? 'Despesa recorrente criada!' : 'Despesa criada com sucesso!',
      'success'
    )
    navigate(`/grupos/${groupId}`)
  }

  if (loading) return <Spinner />

  const display = formatDisplayAmount(amountRaw)
  const hasValue = amountRaw.length > 0

  return (
    <div className="flex flex-1 flex-col pt-[16px]">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex flex-col gap-[20px] px-[20px] sm:px-0">
          {/* Voltar */}
          <button
            type="button"
            onClick={() => navigate(`/grupos/${groupId}`)}
            className="flex h-[40px] items-center gap-[8px]"
          >
            <ArrowLeft size={20} className="text-[#7C8394]" />
            <span className="text-[16px] font-normal leading-[1.4] text-[#7C8394]">Voltar</span>
          </button>

          {/* Título + Valor */}
          <div className="flex flex-col gap-[4px]">
            <p className="text-[28px] font-normal leading-none text-[#F5F7FA]">Cadastrar Despesa</p>
            <div className={`flex items-center gap-[8px] leading-none ${hasValue ? 'text-[#F5C249]' : 'text-[#7C8394]'}`}>
              <span className="text-[24px] font-normal">{display.prefix}</span>
              <span className="text-[40px] font-bold">{display.value}</span>
            </div>
            {errors.amount && (
              <p className="text-[12px] text-[#E85D5D] mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Numeric keypad - 0 spans 2 columns, no comma key */}
          <div className="grid grid-cols-3 gap-[8px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                className="flex h-[32px] items-center justify-center rounded-[8px] bg-[#16171D] text-[14px] font-medium leading-[1.4] text-[#A7ADBA] active:bg-[#1C1D25] transition-colors"
              >
                {key}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="col-span-2 flex h-[32px] items-center justify-center rounded-[8px] bg-[#16171D] text-[14px] font-medium leading-[1.4] text-[#A7ADBA] active:bg-[#1C1D25] transition-colors"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('Deletar')}
              className="flex h-[32px] items-center justify-center rounded-[8px] bg-[#16171D] text-[14px] font-medium leading-[1.4] text-[#A7ADBA] active:bg-[#1C1D25] transition-colors"
            >
              Deletar
            </button>
          </div>
        </div>

        {/* Surface-1 section */}
        <div className="mt-[32px] flex flex-1 flex-col gap-[32px] rounded-t-[20px] bg-[#16171D] p-[20px]">
          {/* Categorias */}
          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">Categorias</p>
            <div className="grid grid-cols-3 gap-[8px]">
              {EXPENSE_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.value] || MoreHorizontal
                const isSelected = category === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setValue('category', cat.value as ExpenseForm['category'])}
                    className={`flex flex-col items-center gap-[8px] rounded-[8px] p-[20px] transition-colors ${
                      isSelected
                        ? 'bg-[rgba(245,194,73,0.16)]'
                        : 'bg-[#1C1D25]'
                    }`}
                  >
                    <Icon
                      size={24}
                      className={isSelected ? 'text-[#F5C249]' : 'text-[#A7ADBA]'}
                    />
                    <span
                      className={`text-[12px] font-normal leading-[1.4] whitespace-nowrap ${
                        isSelected ? 'text-[#F5C249]' : 'text-[#A7ADBA]'
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Inputs */}
          <div className="flex flex-col gap-[24px]">
            {/* Descrição */}
            <div className="flex flex-col gap-[8px]">
              <p className="text-[16px] font-normal leading-[1.4] text-[#F5F7FA]">Descrição</p>
              <input
                type="text"
                placeholder="Escreva algo curto"
                className="h-[48px] rounded-[8px] border-[3px] border-[#1C1D25] bg-[#1C1D25] px-[16px] py-[12px] text-[16px] font-normal leading-[1.4] text-[#F5F7FA] placeholder-[#7C8394] focus:outline-none"
                value={description}
                onChange={(e) => setValue('description', e.target.value)}
              />
              {errors.description && (
                <p className="text-[12px] text-[#E85D5D]">{errors.description.message}</p>
              )}
            </div>

            {/* Data - Custom Calendar */}
            <div className="flex flex-col gap-[8px]">
              <p className="text-[16px] font-normal leading-[1.4] text-[#F5F7FA]">Data</p>
              <div className="overflow-hidden rounded-[8px] bg-[#1C1D25] px-[20px] pb-[12px] pt-[20px]">
                {/* Month navigation */}
                <div className="flex items-center gap-[12px]">
                  <button
                    type="button"
                    onClick={() => handleCalendarMonthChange(-1)}
                    className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#1C1D25]"
                  >
                    <ChevronLeft size={20} className="text-[#7C8394]" />
                  </button>
                  <p className="flex-1 text-center text-[14px] font-bold leading-[1.4] text-[#7C8394]">
                    {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCalendarMonthChange(1)}
                    className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#1C1D25]"
                  >
                    <ChevronRight size={20} className="text-[#7C8394]" />
                  </button>
                </div>

                {/* Weekday headers */}
                <div className="mt-[16px] flex">
                  {WEEKDAYS.map((day) => (
                    <span
                      key={day}
                      className="flex-1 text-center text-[10px] font-medium leading-none text-[#F5F7FA] opacity-[0.56]"
                    >
                      {day}
                    </span>
                  ))}
                </div>

                {/* Days grid */}
                <div className="mt-[8px] flex flex-wrap">
                  {calendarDays.map((d, idx) => {
                    const isSelected = date === d.dateStr
                    const isCurrentMonth = d.currentMonth

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDaySelect(d.dateStr)}
                        className={`flex h-[42px] items-center justify-center rounded-full ${
                          isSelected
                            ? 'bg-[rgba(245,194,73,0.16)]'
                            : ''
                        }`}
                        style={{ width: `${100 / 7}%` }}
                      >
                        <span
                          className={`text-[12px] font-normal leading-none ${
                            isSelected
                              ? 'text-[#F5C249]'
                              : isCurrentMonth
                                ? 'text-[#F5F7FA]'
                                : 'text-[#7C8394]'
                          }`}
                        >
                          {d.day}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {errors.date && (
                <p className="text-[12px] text-[#E85D5D]">{errors.date.message}</p>
              )}
            </div>
          </div>

          {/* Pago por */}
          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">Pago por</p>
            <div className="grid grid-cols-2 gap-[8px]">
              {members.map((m) => {
                const isSelected = paidByMemberId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setValue('paidByMemberId', m.id)}
                    className={`flex h-[40px] items-center justify-center rounded-[8px] px-[20px] py-[12px] transition-colors ${
                      isSelected
                        ? 'bg-[rgba(245,194,73,0.16)]'
                        : 'bg-[#1C1D25]'
                    }`}
                  >
                    <span
                      className={`text-[12px] font-normal leading-[1.4] whitespace-nowrap ${
                        isSelected ? 'text-[#F5C249]' : 'text-[#A7ADBA]'
                      }`}
                    >
                      {m.name}{m.status === 'pending' ? ' (pendente)' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="flex flex-col gap-[12px]">
            <button
              type="button"
              onClick={() => setValue('isRecurring', !isRecurring)}
              className="flex items-center gap-[4px]"
            >
              <div
                className={`relative h-[24px] w-[40px] shrink-0 rounded-full transition-colors duration-200 ${
                  isRecurring ? 'bg-[#F5C249]' : 'bg-[#1C1D25]'
                }`}
              >
                <div
                  className={`absolute top-[2px] h-[20px] w-[20px] rounded-full transition-transform duration-200 ${
                    isRecurring
                      ? 'translate-x-[18px] bg-[#16171D]'
                      : 'translate-x-[2px] bg-[#F5F7FA]'
                  }`}
                />
              </div>
              <div className="flex flex-1 flex-col text-left">
                <span className="text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">
                  Despesa recorrente
                </span>
                {isRecurring && (
                  <span className="text-[11px] text-text-tertiary">Repetir todo mês</span>
                )}
              </div>
            </button>

            {isRecurring && (
              <div className="flex flex-col gap-[8px]">
                <p className="text-[12px] text-text-tertiary">Dia do mês para repetir</p>
                <div className="flex gap-[6px] overflow-x-auto scrollbar-hide">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const selectedDay = watch('dayOfMonth') ?? new Date().getDate()
                    const isSelected = selectedDay === day
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setValue('dayOfMonth', day)}
                        className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-[12px] font-medium transition-colors ${
                          isSelected
                            ? 'bg-accent-subtle text-accent'
                            : 'bg-surface-2 text-text-tertiary'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Custom percentages toggle */}
          <div className="flex flex-col gap-[12px]">
            <button
              type="button"
              onClick={() => setValue('useCustomPercentages', !useCustomPercentages)}
              className="flex items-center gap-[4px]"
            >
              <div
                className={`relative h-[24px] w-[40px] shrink-0 rounded-full transition-colors duration-200 ${
                  useCustomPercentages ? 'bg-[#F5C249]' : 'bg-[#1C1D25]'
                }`}
              >
                <div
                  className={`absolute top-[2px] h-[20px] w-[20px] rounded-full transition-transform duration-200 ${
                    useCustomPercentages
                      ? 'translate-x-[18px] bg-[#16171D]'
                      : 'translate-x-[2px] bg-[#F5F7FA]'
                  }`}
                />
              </div>
              <span className="flex-1 text-left text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">
                Mudar % que cada usuário deve pagar
              </span>
            </button>

            {useCustomPercentages && (
              <div className="flex flex-col gap-[12px]">
                {members.map((m) => {
                  const pct = customPercentages[m.id] ?? 0

                  return (
                    <div
                      key={m.id}
                      className="flex flex-col gap-[8px] rounded-[8px] bg-[#1C1D25] px-[20px] py-[12px]"
                    >
                      <div className="flex items-center">
                        <span className="text-[16px] font-normal leading-[1.4] text-[#F5F7FA] whitespace-nowrap">
                          {m.name}
                        </span>
                        <div className="flex flex-1 items-center justify-end gap-[16px]">
                          <button
                            type="button"
                            onClick={() =>
                              setValue('customPercentages', {
                                ...customPercentages,
                                [m.id]: Math.max(0, pct - 1),
                              })
                            }
                            className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] bg-[#16171D] text-[#7C8394] active:bg-[#242632]"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-[40px] text-center text-[20px] font-bold leading-[1.4] text-[#F5F7FA]">
                            {Math.round(pct)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setValue('customPercentages', {
                                ...customPercentages,
                                [m.id]: Math.min(100, pct + 1),
                              })
                            }
                            className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] bg-[#16171D] text-[#7C8394] active:bg-[#242632]"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-[6px]">
                        {[25, 50, 75, 100].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              const updated = { ...customPercentages, [m.id]: preset }
                              if (preset === 100) {
                                members.forEach((o) => { if (o.id !== m.id) updated[o.id] = 0 })
                              }
                              setValue('customPercentages', updated)
                            }}
                            className={`flex h-[28px] flex-1 items-center justify-center rounded-[6px] text-[12px] font-normal transition-colors ${
                              Math.round(pct) === preset
                                ? 'bg-[rgba(245,194,73,0.16)] text-[#F5C249]'
                                : 'bg-[#16171D] text-[#7C8394] active:bg-[#242632]'
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {(() => {
                  const total = Object.values(customPercentages).reduce((s, v) => s + Number(v), 0)
                  return (
                    <p className={`text-[14px] leading-[1.4] ${Math.abs(total - 100) > 0.01 ? 'text-[#E85D5D]' : 'text-[#7C8394]'}`}>
                      Total: {total.toFixed(1)}%
                    </p>
                  )
                })()}
                {errors.customPercentages?.root?.message && (
                  <p className="text-[12px] text-[#E85D5D]">{errors.customPercentages.root.message}</p>
                )}
              </div>
            )}
          </div>

          {errors.root && (
            <p className="text-[12px] text-[#E85D5D]">{errors.root.message}</p>
          )}

          {/* Salvar */}
          <button
            type="submit"
            disabled={submitting || (useCustomPercentages && Math.abs(Object.values(customPercentages).reduce((s, v) => s + Number(v), 0) - 100) > 0.01)}
            className="flex h-[48px] items-center justify-center rounded-[8px] bg-[#F5C249] p-[16px] transition-colors hover:bg-[#d4a63d] disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#101116] border-t-transparent" />
            ) : (
              <span className="text-[16px] font-medium leading-[1.4] text-[#101116]">Salvar</span>
            )}
          </button>
        </div>

        {/* Hidden fields for react-hook-form */}
        <input type="hidden" {...register('amount', { valueAsNumber: true })} />
        <input type="hidden" {...register('category')} />
        <input type="hidden" {...register('description')} />
        <input type="hidden" {...register('date')} />
        <input type="hidden" {...register('paidByMemberId')} />
        <input type="hidden" {...register('useCustomPercentages')} />
      </form>
    </div>
  )
}
