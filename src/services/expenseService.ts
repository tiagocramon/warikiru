import { supabase } from '../lib/supabase'
import type { Expense, ExpenseCategory } from '../types/database'

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
