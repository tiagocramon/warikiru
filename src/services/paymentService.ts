import { supabase } from '../lib/supabase'
import type { Payment } from '../types/database'

export async function fetchPayments(groupId: string, month?: string) {
  let query = supabase
    .from('payments')
    .select('*')
    .eq('group_id', groupId)
    .order('paid_at', { ascending: false })

  if (month) {
    query = query.eq('reference_month', `${month}-01`)
  }

  const { data, error } = await query
  return { data: data as Payment[] | null, error }
}

export async function markAsPaid(payment: {
  group_id: string
  reference_month: string
  from_user_id: string
  to_user_id: string
  amount: number
}) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      reference_month: `${payment.reference_month}-01`,
    })
    .select()
    .single()

  return { data, error }
}
