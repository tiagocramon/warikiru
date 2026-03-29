export interface Group {
  id: string
  owner_id: string
  name: string
  created_at: string
}

export type MemberStatus = 'pending' | 'active'

export interface GroupMember {
  id: string
  group_id: string
  user_id: string | null
  name: string
  percentage: number
  invited_email: string | null
  status: MemberStatus
  invited_at: string
  joined_at: string | null
}

export type ExpenseCategory =
  | 'mercado'
  | 'moradia'
  | 'saude'
  | 'educacao'
  | 'transporte'
  | 'lazer'
  | 'alimentacao'
  | 'servicos'
  | 'viagem'
  | 'assinaturas'
  | 'pets'
  | 'presentes'
  | 'festas'
  | 'contas'
  | 'outros'

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'mercado', label: 'Mercado' },
  { value: 'moradia', label: 'Moradia' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'viagem', label: 'Viagem' },
  { value: 'assinaturas', label: 'Assinaturas' },
  { value: 'pets', label: 'Pets' },
  { value: 'presentes', label: 'Presentes' },
  { value: 'festas', label: 'Festas/Eventos' },
  { value: 'contas', label: 'Contas' },
  { value: 'outros', label: 'Outros' },
]

export interface Expense {
  id: string
  group_id: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  paid_by_member_id: string
  created_by_user_id: string
  custom_percentages: Record<string, number> | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  group_id: string
  reference_month: string
  from_user_id: string
  to_user_id: string
  amount: number
  paid_at: string
}

export interface AuditLog {
  id: string
  group_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

export interface RecurringExpense {
  id: string
  group_id: string
  category: ExpenseCategory
  description: string
  amount: number
  day_of_month: number
  paid_by_member_id: string
  created_by_user_id: string
  custom_percentages: Record<string, number> | null
  frequency: 'monthly'
  is_active: boolean
  last_generated_month: string | null
  created_at: string
}

export interface GroupWithMembers extends Group {
  members: GroupMember[]
}
