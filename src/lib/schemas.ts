import { z } from 'zod'

// Auth schemas

export const loginSchema = z.object({
  email: z.string().min(1, 'Campo obrigatório.').email('E-mail inválido.'),
  password: z.string().min(1, 'Campo obrigatório.'),
})

export const registerSchema = z
  .object({
    name: z.string().min(1, 'Campo obrigatório.'),
    email: z.string().min(1, 'Campo obrigatório.').email('E-mail inválido.'),
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
    confirmPassword: z.string().min(1, 'Campo obrigatório.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Campo obrigatório.').email('E-mail inválido.'),
})

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
    confirmPassword: z.string().min(1, 'Campo obrigatório.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

// Profile

export const profileNameSchema = z.object({
  name: z.string().min(1, 'Campo obrigatório.'),
})

// Group schemas

export const newGroupSchema = z.object({
  name: z.string().min(1, 'Campo obrigatório.'),
  ownerName: z.string().min(1, 'Campo obrigatório.'),
  ownerPercentage: z.number({ error: 'Informe um número.' }).min(0, 'Mínimo 0.').max(100, 'Máximo 100.'),
})

export const editGroupSchema = z
  .object({
    name: z.string().min(1, 'Campo obrigatório.'),
    percentages: z.record(z.string(), z.number().min(0).max(100)),
  })
  .refine(
    (data) => {
      const total = Object.values(data.percentages).reduce((s, v) => s + v, 0)
      return Math.abs(total - 100) <= 0.01
    },
    {
      message: 'Os percentuais devem somar 100%.',
      path: ['percentages'],
    }
  )

export const inviteMemberSchema = z.object({
  email: z.string().min(1, 'Campo obrigatório.').email('E-mail inválido.'),
  name: z.string().min(1, 'Campo obrigatório.'),
  percentage: z.number({ error: 'Informe um número.' }).min(0, 'Mínimo 0.').max(100, 'Máximo 100.'),
})

// Expense schema

const expenseCategoryValues = [
  'mercado',
  'moradia',
  'alimentacao',
  'saude',
  'educacao',
  'transporte',
  'lazer',
  'servicos',
  'viagem',
  'assinaturas',
  'pets',
  'presentes',
  'festas',
  'contas',
  'outros',
] as const

export const expenseSchema = z
  .object({
    amount: z.number({ error: 'Informe um valor.' }).positive('O valor deve ser maior que zero.'),
    category: z.enum(expenseCategoryValues),
    description: z.string().min(1, 'Campo obrigatório.'),
    date: z.string().min(1, 'Campo obrigatório.'),
    paidByMemberId: z.string().min(1, 'Campo obrigatório.'),
    useCustomPercentages: z.boolean(),
    customPercentages: z.record(z.string(), z.number().min(0).max(100)),
  })
  .superRefine((data, ctx) => {
    if (data.useCustomPercentages) {
      const total = Object.values(data.customPercentages).reduce(
        (s, v) => s + v,
        0
      )
      if (Math.abs(total - 100) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Os percentuais devem somar 100%. Atual: ${total.toFixed(1)}%`,
          path: ['customPercentages'],
        })
      }
    }
  })

// Type exports
export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>
export type ProfileNameForm = z.infer<typeof profileNameSchema>
export type NewGroupForm = z.infer<typeof newGroupSchema>
export type EditGroupForm = z.infer<typeof editGroupSchema>
export type InviteMemberForm = z.infer<typeof inviteMemberSchema>
export type ExpenseForm = z.infer<typeof expenseSchema>
