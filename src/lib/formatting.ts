import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatMonth(dateStr: string): string {
  return format(parseISO(dateStr), "MMMM 'de' yyyy", { locale: ptBR })
}

export function formatPercentage(value: number): string {
  return `${Number(value).toFixed(1)}%`
}
