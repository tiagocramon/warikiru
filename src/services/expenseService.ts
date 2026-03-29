import { supabase } from '../lib/supabase'
import type { Expense, ExpenseCategory, RecurringExpense } from '../types/database'

export async function fetchExpenses(
  groupId: string,
  month?: string
) {
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('group_id', groupId)
    .order('date', { ascending: false })

  if (month) {
    const [year, m] = month.split('-').map(Number)
    const startDate = `${year}-${String(m).padStart(2, '0')}-01`
    const endMonth = m === 12 ? 1 : m + 1
    const endYear = m === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

    query = query.gte('date', startDate).lt('date', endDate)
  }

  const { data, error } = await query
  return { data: data as Expense[] | null, error }
}

export async function createExpense(expense: {
  group_id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  paid_by_member_id: string
  custom_percentages?: Record<string, number> | null
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Não autenticado') }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      ...expense,
      created_by_user_id: user.id,
    })
    .select()
    .single()

  return { data, error }
}

export async function updateExpense(
  expenseId: string,
  updates: Partial<{
    category: ExpenseCategory
    description: string
    amount: number
    date: string
    paid_by_member_id: string
    custom_percentages: Record<string, number> | null
  }>
) {
  const { data, error } = await supabase
    .from('expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', expenseId)
    .select()
    .single()

  return { data, error }
}

export async function deleteExpense(expenseId: string) {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)

  return { error }
}

// --- Recurring Expenses ---

export async function fetchRecurringExpenses(groupId: string) {
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  return { data: data as RecurringExpense[] | null, error }
}

export async function createRecurringExpense(expense: {
  group_id: string
  category: ExpenseCategory
  description: string
  amount: number
  day_of_month: number
  paid_by_member_id: string
  custom_percentages?: Record<string, number> | null
  last_generated_month?: string
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Não autenticado') }

  const { last_generated_month, ...rest } = expense
  const { data, error } = await supabase
    .from('recurring_expenses')
    .insert({
      ...rest,
      created_by_user_id: user.id,
      ...(last_generated_month ? { last_generated_month } : {}),
    })
    .select()
    .single()

  return { data: data as RecurringExpense | null, error }
}

export async function deleteRecurringExpense(recurringExpenseId: string) {
  const { error } = await supabase
    .from('recurring_expenses')
    .update({ is_active: false })
    .eq('id', recurringExpenseId)

  return { error }
}

export async function getPendingRecurringExpenses(groupId: string, month: string) {
  const { data: recurring, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)

  if (error || !recurring) return { pending: [], error }

  const pending = (recurring as RecurringExpense[]).filter(
    (r) => !r.last_generated_month || r.last_generated_month < month
  )

  return { pending, error: null }
}

export async function generateRecurringExpense(
  recurringExpense: RecurringExpense,
  month: string
) {
  const [year, m] = month.split('-').map(Number)
  const daysInMonth = new Date(year, m, 0).getDate()
  const day = Math.min(recurringExpense.day_of_month, daysInMonth)
  const date = `${year}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Não autenticado') }

  const { error: expenseError } = await supabase.from('expenses').insert({
    group_id: recurringExpense.group_id,
    category: recurringExpense.category,
    description: recurringExpense.description,
    amount: recurringExpense.amount,
    date,
    paid_by_member_id: recurringExpense.paid_by_member_id,
    created_by_user_id: user.id,
    custom_percentages: recurringExpense.custom_percentages,
  })

  if (expenseError) return { error: expenseError }

  const { error: updateError } = await supabase
    .from('recurring_expenses')
    .update({ last_generated_month: month })
    .eq('id', recurringExpense.id)

  return { error: updateError }
}
