import { useEffect, useState, useCallback } from 'react'
import { useMinLoading } from '../hooks/useMinLoading'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAppLayout } from '../components/layout/AppLayout'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newGroupSchema, type NewGroupForm } from '../lib/schemas'
import { fetchDashboardGroupSummaries, createGroup } from '../services/groupService'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../lib/formatting'
import { useLocalToast } from '../hooks/useLocalToast'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import FAB from '../components/ui/FAB'
import ModalWithToast from '../components/ui/ModalWithToast'
import Spinner from '../components/ui/Spinner'
import { ChevronRight, Users, Minus, Plus } from 'lucide-react'
import type { DashboardGroupSummary } from '../types/dashboard'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { toasts, showToast } = useLocalToast()
  const { refreshKey } = useAppLayout()
  const [groups, setGroups] = useState<DashboardGroupSummary[]>([])
  const [loading, doneLoading] = useMinLoading()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<NewGroupForm>({
    resolver: zodResolver(newGroupSchema),
    defaultValues: { name: '', ownerName: '', ownerPercentage: 50 },
  })

  const ownerPercentage = watch('ownerPercentage')
  const ownerName = watch('ownerName')

  const loadGroups = useCallback(async () => {
    const { data } = await fetchDashboardGroupSummaries()
    setGroups(data ?? [])
  }, [])

  useEffect(() => {
    loadGroups().then(() => doneLoading())
  }, [refreshKey])

  // Show toast from navigation state (e.g. after deleting a group)
  useEffect(() => {
    const state = location.state as { toast?: { message: string; type: 'success' | 'error' } } | null
    if (state?.toast) {
      showToast(state.toast.message, state.toast.type)
      // Clear state so toast doesn't reappear on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state])

  const displayName =
    user?.user_metadata?.name || user?.email?.split('@')[0] || ''

  function openCreateModal() {
    reset({ name: '', ownerName: displayName, ownerPercentage: 50 })
    setCreateModalOpen(true)
  }

  async function onSubmitCreate(data: NewGroupForm) {
    setSubmitting(true)
    const { data: groupId, error } = await createGroup(
      data.name,
      data.ownerName,
      data.ownerPercentage
    )

    if (error) {
      setError('root', { message: 'Erro ao criar grupo. Tente novamente.' })
      showToast('Ops, tivemos um erro!', 'error')
      setSubmitting(false)
    } else {
      showToast('Grupo criado com sucesso!', 'success')
      setSubmitting(false)
      setCreateModalOpen(false)
      navigate(`/grupos/${groupId}`)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="px-5 sm:px-0 py-10">
      <section className="pb-10">
        <p className="text-[16px] font-normal leading-[1.4] text-[#F5F7FA]">
          Ola, {displayName}
        </p>
        <h1 className="mt-1 text-[32px] font-normal leading-none text-[#F5F7FA]">
          Seus Grupos
        </h1>
      </section>

      {/* Empty State */}
      {!loading && groups.length === 0 && (
        <EmptyState
          icon={Users}
          message="Voce ainda nao tem nenhum grupo."
          action={{
            label: 'Criar primeiro grupo',
            onClick: openCreateModal,
          }}
        />
      )}

      {!loading && groups.length > 0 && (
        <div className="flex flex-col">
          <div className="flex flex-col gap-[8px]">
            {groups.map((group) => (
              <Link key={group.groupId} to={`/grupos/${group.groupId}`}>
                <Card interactive className="!rounded-[8px] !p-5">
                  <div className="flex flex-col gap-[20px]">
                    <div className="flex flex-col gap-[4px]">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="min-w-0 flex-1 truncate text-[20px] font-normal leading-[1.4] text-[#F5F7FA]">
                          {group.groupName}
                        </h2>
                        <ChevronRight
                          size={20}
                          strokeWidth={2}
                          className="flex-shrink-0 text-[#F5F7FA]"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <p className="min-w-0 flex-1 truncate text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">
                          {group.summaryText}
                        </p>
                        {group.amount != null ? (
                          <p className="flex-shrink-0 text-right text-[16px] font-bold leading-[1.4] text-[#F5C249]">
                            {formatCurrency(group.amount)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                  </div>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-[40px] flex justify-end">
            <FAB onClick={openCreateModal} />
          </div>
        </div>
      )}

      {/* Bottom Sheet - Criar Grupo */}
      <ModalWithToast
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Criar Grupo"
        toasts={toasts}
      >
        <form onSubmit={handleSubmit(onSubmitCreate)} noValidate className="flex flex-col gap-[32px]">
          {/* Nome do Grupo */}
          <div className="flex flex-col gap-[8px]">
            <p className="text-[16px] font-normal leading-[1.4] text-[#F5F7FA]">Nome do Grupo</p>
            <input
              type="text"
              placeholder="Escreva aqui"
              className="h-[48px] rounded-[8px] bg-[#1C1D25] px-[16px] py-[12px] text-[16px] font-normal leading-[1.4] text-[#F5F7FA] placeholder-[#7C8394] focus:outline-none"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-[12px] text-[#E85D5D]">{errors.name.message}</p>
            )}
          </div>

          {/* Hidden ownerName field */}
          <input type="hidden" {...register('ownerName')} />

          {/* Percentual dono do grupo */}
          <div className="flex flex-col gap-[8px]">
            <p className="text-[16px] font-normal leading-[1.4] text-[#F5F7FA]">Percentual dono do grupo</p>
            <div className="flex h-[48px] items-center rounded-[8px] bg-[#1C1D25] px-[20px]">
              <span className="text-[16px] font-normal leading-[1.4] text-[#F5F7FA] whitespace-nowrap">
                {ownerName || displayName}
              </span>
              <div className="flex flex-1 items-center justify-end gap-[16px]">
                <button
                  type="button"
                  onClick={() => setValue('ownerPercentage', Math.max(0, (ownerPercentage || 0) - 1))}
                  className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#16171D] text-[#A7ADBA] active:bg-[#242632]"
                >
                  <Minus size={16} />
                </button>
                <span className="w-[40px] text-center text-[20px] font-bold leading-[1.4] text-[#F5F7FA]">
                  {Math.round(ownerPercentage || 0)}
                </span>
                <button
                  type="button"
                  onClick={() => setValue('ownerPercentage', Math.min(100, (ownerPercentage || 0) + 1))}
                  className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#16171D] text-[#A7ADBA] active:bg-[#242632]"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            {errors.ownerPercentage && (
              <p className="text-[12px] text-[#E85D5D]">{errors.ownerPercentage.message}</p>
            )}
          </div>

          <p className="text-[14px] font-normal leading-[1.4] text-[#7C8394]">
            O percentual restante ({(100 - (ownerPercentage || 0)).toFixed(0)}%) será atribuído ao membro que você convidar.
          </p>

          {errors.root && (
            <p className="text-[12px] text-[#E85D5D]">{errors.root.message}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-[48px] items-center justify-center rounded-[8px] bg-[#F5C249] p-[16px] transition-colors hover:bg-[#d4a63d] disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#101116] border-t-transparent" />
            ) : (
              <span className="text-[16px] font-medium leading-[1.4] text-[#101116]">Criar Grupo</span>
            )}
          </button>
        </form>
      </ModalWithToast>
    </div>
  )
}
