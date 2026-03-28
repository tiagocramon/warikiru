export type DashboardGroupSummaryKind =
  | 'owes'
  | 'owed'
  | 'group_pending'
  | 'settled'

export interface DashboardGroupSummary {
  groupId: string
  groupName: string
  summaryKind: DashboardGroupSummaryKind
  summaryText: string
  amount: number | null
}
