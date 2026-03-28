import type { Expense, GroupMember, Payment } from '../types/database'

export interface BalanceEntry {
  from_member_id: string
  to_member_id: string
  amount: number
}

export interface MemberStats {
  member_id: string
  total_paid: number      // Total value representing expenses paid directly by this member
  total_share: number     // Total value representing this member's share (portion) of all expenses
  paid_for_others: number // Total value this member paid on behalf of others
  money_sent: number      // Total settlements paid TO others in this month
  money_received: number  // Total settlements received FROM others in this month
  balance: number         // Final net balance: (total_paid - total_share) + money_sent - money_received
}

/**
 * Calculate the net balance between participants for a given month.
 * Uses member.id as the key (works for both pending and active members).
 * Payments use user_id, so we map them to member_id via the members list.
 */
/**
 * Calculates raw member stats: who paid what, their share, and settlement transfers.
 */
export function calculateMemberStats(
  expenses: Expense[],
  members: GroupMember[],
  payments: Payment[]
): MemberStats[] {
  const stats: Record<string, MemberStats> = {}

  for (const m of members) {
    stats[m.id] = {
      member_id: m.id,
      total_paid: 0,
      total_share: 0,
      paid_for_others: 0,
      money_sent: 0,
      money_received: 0,
      balance: 0,
    }
  }

  // 1. Accumulate Expenses
  for (const exp of expenses) {
    if (stats[exp.paid_by_member_id]) {
      stats[exp.paid_by_member_id].total_paid += exp.amount
    }

    const pcts = exp.custom_percentages ?? Object.fromEntries(members.map((m) => [m.id, m.percentage]))
    for (const [mId, pct] of Object.entries(pcts)) {
      const shareAmount = exp.amount * (pct / 100)
      if (stats[mId]) {
        stats[mId].total_share += shareAmount
      }
      if (mId !== exp.paid_by_member_id && stats[exp.paid_by_member_id]) {
        stats[exp.paid_by_member_id].paid_for_others += shareAmount
      }
    }
  }

  // 2. Accumulate Payments (Settlements)
  for (const pay of payments) {
    const fromM = members.find((m) => m.user_id === pay.from_user_id)
    const toM = members.find((m) => m.user_id === pay.to_user_id)
    if (fromM && stats[fromM.id]) stats[fromM.id].money_sent += pay.amount
    if (toM && stats[toM.id]) stats[toM.id].money_received += pay.amount
  }

  // 3. Calculate Final Balance
  for (const mId in stats) {
    const s = stats[mId]
    s.balance = (s.total_paid - s.total_share) + s.money_sent - s.money_received
  }

  return Object.values(stats)
}

/**
 * Calculate the net balance between participants for a given month.
 * Uses member.id as the key (works for both pending and active members).
 * Payments use user_id, so we map them to member_id via the members list.
 */
export function calculateMonthlyBalance(
  expenses: Expense[],
  members: GroupMember[],
  payments: Payment[]
): BalanceEntry[] {
  const ledger: Record<string, number> = {}

  // Initialize ledger with ALL members (pending + active)
  for (const member of members) {
    ledger[member.id] = 0
  }

  for (const expense of expenses) {
    // Custom percentages keys are member.id; default percentages use member.id too
    const percentages =
      expense.custom_percentages ??
      Object.fromEntries(members.map((m) => [m.id, m.percentage]))

    // The payer gets credit
    ledger[expense.paid_by_member_id] =
      (ledger[expense.paid_by_member_id] ?? 0) + expense.amount

    // Each member's share is subtracted
    for (const [memberId, pct] of Object.entries(percentages)) {
      ledger[memberId] = (ledger[memberId] ?? 0) - expense.amount * (pct / 100)
    }
  }

  // Payments use from_user_id/to_user_id — map to member_id
  for (const payment of payments) {
    const fromMember = members.find((m) => m.user_id === payment.from_user_id)
    const toMember = members.find((m) => m.user_id === payment.to_user_id)
    if (fromMember) {
      ledger[fromMember.id] = (ledger[fromMember.id] ?? 0) + payment.amount
    }
    if (toMember) {
      ledger[toMember.id] = (ledger[toMember.id] ?? 0) - payment.amount
    }
  }

  // Simplify debts
  const result: BalanceEntry[] = []
  const debtors = Object.entries(ledger)
    .filter(([, v]) => v < -0.01)
    .map(([id, v]) => ({ id, amount: v }))
  const creditors = Object.entries(ledger)
    .filter(([, v]) => v > 0.01)
    .map(([id, v]) => ({ id, amount: v }))

  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const settlement = Math.min(
      Math.abs(debtors[i].amount),
      creditors[j].amount
    )

    if (settlement > 0.01) {
      result.push({
        from_member_id: debtors[i].id,
        to_member_id: creditors[j].id,
        amount: Math.round(settlement * 100) / 100,
      })
    }

    debtors[i].amount += settlement
    creditors[j].amount -= settlement

    if (Math.abs(debtors[i].amount) < 0.01) i++
    if (creditors[j].amount < 0.01) j++
  }

  return result
}
