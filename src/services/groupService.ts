import { supabase } from '../lib/supabase'
import { calculateMonthlyBalance } from '../lib/balance'
import type { Expense, Group, GroupMember, Payment } from '../types/database'
import type { DashboardGroupSummary } from '../types/dashboard'

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function sumAmounts(values: number[]) {
  return roundCurrency(values.reduce((total, value) => total + value, 0))
}

function buildDashboardGroupSummary(
  group: Group,
  members: GroupMember[],
  expenses: Expense[],
  payments: Payment[],
  userId: string
): DashboardGroupSummary | null {
  const currentMember = members.find((member) => member.user_id === userId)
  if (!currentMember) return null

  const balances = calculateMonthlyBalance(expenses, members, payments)
  const membersById = new Map(members.map((member) => [member.id, member]))
  const incomingBalances = balances.filter(
    (balance) => balance.to_member_id === currentMember.id
  )
  const outgoingBalances = balances.filter(
    (balance) => balance.from_member_id === currentMember.id
  )

  if (incomingBalances.length > 0) {
    const counterpartIds = [
      ...new Set(incomingBalances.map((balance) => balance.from_member_id)),
    ]
    const summaryText =
      counterpartIds.length === 1
        ? `${membersById.get(counterpartIds[0])?.name ?? '1 pessoa'} deve para voce`
        : `${counterpartIds.length} pessoas devem para voce`

    return {
      groupId: group.id,
      groupName: group.name,
      summaryKind: 'owed',
      summaryText,
      amount: sumAmounts(incomingBalances.map((balance) => balance.amount)),
    }
  }

  if (outgoingBalances.length > 0) {
    const counterpartIds = [
      ...new Set(outgoingBalances.map((balance) => balance.to_member_id)),
    ]
    const summaryText =
      counterpartIds.length === 1
        ? `Voce deve para ${membersById.get(counterpartIds[0])?.name ?? '1 pessoa'}`
        : `Voce deve para ${counterpartIds.length} pessoas`

    return {
      groupId: group.id,
      groupName: group.name,
      summaryKind: 'owes',
      summaryText,
      amount: sumAmounts(outgoingBalances.map((balance) => balance.amount)),
    }
  }

  const totalOpenAmount = sumAmounts(balances.map((balance) => balance.amount))

  if (totalOpenAmount > 0.01) {
    return {
      groupId: group.id,
      groupName: group.name,
      summaryKind: 'group_pending',
      summaryText: 'Pendencias entre membros',
      amount: totalOpenAmount,
    }
  }

  return {
    groupId: group.id,
    groupName: group.name,
    summaryKind: 'settled',
    summaryText: 'Sem pendencias neste mes',
    amount: null,
  }
}

export async function fetchUserGroups() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Não autenticado') }

  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (memberError) return { data: null, error: memberError }
  if (!memberships?.length) return { data: [], error: null }

  const groupIds = memberships.map((m) => m.group_id)

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: false })

  return { data: data as Group[] | null, error }
}

export async function fetchDashboardGroupSummaries() {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Nao autenticado') }

  const { data: memberships, error: membershipError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  if (membershipError) return { data: null, error: membershipError }
  if (!memberships?.length) return { data: [], error: null }

  const groupIds = memberships.map((membership) => membership.group_id)
  const month = getCurrentMonth()
  const [year, monthNumber] = month.split('-').map(Number)
  const startDate = `${year}-${String(monthNumber).padStart(2, '0')}-01`
  const endMonth = monthNumber === 12 ? 1 : monthNumber + 1
  const endYear = monthNumber === 12 ? year + 1 : year
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

  const [
    { data: groups, error: groupsError },
    { data: members, error: membersError },
    { data: expenses, error: expensesError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('group_members')
      .select('*')
      .in('group_id', groupIds)
      .order('name'),
    supabase
      .from('expenses')
      .select('*')
      .in('group_id', groupIds)
      .gte('date', startDate)
      .lt('date', endDate),
    supabase
      .from('payments')
      .select('*')
      .in('group_id', groupIds)
      .eq('reference_month', `${month}-01`),
  ])

  if (groupsError) return { data: null, error: groupsError }
  if (membersError) return { data: null, error: membersError }
  if (expensesError) return { data: null, error: expensesError }
  if (paymentsError) return { data: null, error: paymentsError }

  const membersByGroupId = new Map<string, GroupMember[]>()
  for (const member of (members ?? []) as GroupMember[]) {
    const existing = membersByGroupId.get(member.group_id) ?? []
    existing.push(member)
    membersByGroupId.set(member.group_id, existing)
  }

  const expensesByGroupId = new Map<string, Expense[]>()
  for (const expense of (expenses ?? []) as Expense[]) {
    const existing = expensesByGroupId.get(expense.group_id) ?? []
    existing.push(expense)
    expensesByGroupId.set(expense.group_id, existing)
  }

  const paymentsByGroupId = new Map<string, Payment[]>()
  for (const payment of (payments ?? []) as Payment[]) {
    const existing = paymentsByGroupId.get(payment.group_id) ?? []
    existing.push(payment)
    paymentsByGroupId.set(payment.group_id, existing)
  }

  const summaries = ((groups ?? []) as Group[])
    .map((group) =>
      buildDashboardGroupSummary(
        group,
        membersByGroupId.get(group.id) ?? [],
        expensesByGroupId.get(group.id) ?? [],
        paymentsByGroupId.get(group.id) ?? [],
        user.id
      )
    )
    .filter((summary): summary is DashboardGroupSummary => summary !== null)

  return { data: summaries, error: null }
}

export async function fetchGroupDetail(groupId: string) {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single()

  if (groupError) return { data: null, error: groupError }

  const { data: members, error: memberError } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .order('name')

  if (memberError) return { data: null, error: memberError }

  return {
    data: { ...group, members: members as GroupMember[] },
    error: null,
  }
}

export async function createGroup(
  name: string,
  ownerName: string,
  ownerPercentage: number
) {
  const { data, error } = await supabase.rpc('create_group_with_owner', {
    p_name: name,
    p_owner_name: ownerName,
    p_owner_percentage: ownerPercentage,
  })

  return { data, error }
}

export async function updateGroup(groupId: string, name: string) {
  const { error } = await supabase
    .from('groups')
    .update({ name })
    .eq('id', groupId)

  return { error }
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase.rpc('safe_delete_group', {
    p_group_id: groupId,
  })
  return { error }
}

export async function inviteMember(
  groupId: string,
  email: string,
  name: string,
  percentage: number
) {
  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    invited_email: email.toLowerCase().trim(),
    name,
    percentage,
    status: 'pending',
  })

  return { error }
}

export async function removeMember(memberId: string) {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('id', memberId)

  return { error }
}

export async function updateMemberPercentages(
  updates: { id: string; percentage: number }[]
) {
  const errors: Error[] = []
  for (const { id, percentage } of updates) {
    const { error } = await supabase
      .from('group_members')
      .update({ percentage })
      .eq('id', id)
    if (error) errors.push(error)
  }
  return { error: errors.length ? errors[0] : null }
}

export async function checkGroupMembership(groupId: string, userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select('id, status')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  return { isMember: !!data, error }
}

export async function acceptInvitation(groupId: string) {
  const { error } = await supabase.rpc('accept_invitation', {
    p_group_id: groupId,
  })
  return { error }
}

export async function updateUserNameInAllGroups(userId: string, newName: string) {
  const { error } = await supabase
    .from('group_members')
    .update({ name: newName })
    .eq('user_id', userId)
  return { error }
}
