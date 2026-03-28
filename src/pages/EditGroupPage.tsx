import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  editGroupSchema,
  inviteMemberSchema,
  type EditGroupForm,
  type InviteMemberForm,
} from '../lib/schemas'
import {
  fetchGroupDetail,
  updateGroup,
  inviteMember,
  removeMember,
  updateMemberPercentages,
} from '../services/groupService'
import { useAuth } from '../contexts/AuthContext'
import { useLocalToast } from '../hooks/useLocalToast'
import type { GroupWithMembers, GroupMember } from '../types/database'
import Button from '../components/ui/Button'
import FloatingToast from '../components/ui/FloatingToast'
import ModalWithToast from '../components/ui/ModalWithToast'
import { X, Trash2, Minus, Plus, Pencil, Copy, Link2 } from 'lucide-react'

interface EditGroupBottomSheetProps {
  open: boolean
  onClose: () => void
  groupId: string
}

export default function EditGroupBottomSheet({ open, onClose, groupId }: EditGroupBottomSheetProps) {
  const { user } = useAuth()
  const { toasts, showToast } = useLocalToast()

  const [group, setGroup] = useState<GroupWithMembers | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)

  const editForm = useForm<EditGroupForm>({
    resolver: zodResolver(editGroupSchema),
  })
  const percentages = editForm.watch('percentages')

  const inviteFormHook = useForm<InviteMemberForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { percentage: 50 },
  })

  const loadGroup = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data } = await fetchGroupDetail(groupId)
    if (data) {
      const g = data as GroupWithMembers
      setGroup(g)
      const pcts: Record<string, number> = {}
      g.members.forEach((m) => {
        pcts[m.id] = m.percentage
      })
      editForm.reset({ name: g.name, percentages: pcts })
    }
    setLoading(false)
  }, [groupId, editForm])

  useEffect(() => {
    if (open) {
      loadGroup()
      setError('')
    }
  }, [open, loadGroup])

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  async function handleSave(data: EditGroupForm) {
    setError('')
    setSaving(true)

    const { error: nameError } = await updateGroup(groupId, data.name)
    if (nameError) {
      setError('Erro ao salvar nome.')
      setSaving(false)
      return
    }

    const updates = Object.entries(data.percentages).map(([id, pct]) => ({
      id,
      percentage: pct,
    }))
    const { error: pctError } = await updateMemberPercentages(updates)
    if (pctError) {
      setError('Erro ao salvar percentuais.')
      setSaving(false)
      return
    }

    setSaving(false)
    showToast('Salvo com sucesso!', 'success')
    onClose()
  }

  async function handleInvite(data: InviteMemberForm) {
    setError('')

    const { error } = await inviteMember(
      groupId,
      data.email,
      data.name,
      data.percentage
    )

    if (error) {
      setError(error.message || 'Erro ao convidar membro.')
      showToast('Ops, tivemos um erro!', 'error')
    } else {
      inviteFormHook.reset()
      showToast('Salvo com sucesso!', 'success')
      loadGroup()
    }
  }

  async function handleRemoveMember() {
    if (!removeMemberId) return
    const { error } = await removeMember(removeMemberId)
    if (error) {
      if (error.code === '23503' || error.message?.includes('foreign key')) {
        setError('Este membro possui despesas registradas. Remova as despesas dele antes de removê-lo do grupo.')
        showToast('Ops, tivemos um erro!', 'error')
      } else {
        setError(error.message || 'Erro ao remover membro.')
        showToast('Ops, tivemos um erro!', 'error')
      }
      setRemoveMemberId(null)
      return
    }
    showToast('Deletado com sucesso!', 'success')
    setRemoveMemberId(null)
    setTimeout(() => {
      loadGroup()
    }, 500)
  }

  function adjustPercentage(memberId: string, delta: number) {
    const current = percentages?.[memberId] ?? 0
    const next = Math.max(0, Math.min(100, current + delta))
    editForm.setValue('percentages', {
      ...percentages,
      [memberId]: next,
    })
  }

  function adjustInvitePercentage(delta: number) {
    const current = inviteFormHook.getValues('percentage') || 0
    const next = Math.max(0, Math.min(100, current + delta))
    inviteFormHook.setValue('percentage', next)
  }

  const inviteUrl = `${window.location.origin}/convite?group=${groupId}`

  async function handleCopyInvite() {
    await navigator.clipboard.writeText(inviteUrl)
    showToast('Link copiado!', 'success')
  }

  const pctTotal = Object.values(percentages || {})
    .reduce((s, v) => s + Number(v), 0)
    .toFixed(1)

  const isOwner = group?.owner_id === user?.id

  const portal = createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" onClick={onClose}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-0 right-0 left-0 z-50 w-full max-w-[480px] mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col max-h-[calc(100dvh-40px)] rounded-t-[20px] bg-[#16171D]">
              {/* Header - fixed */}
              <div className="shrink-0 flex items-center justify-end gap-[4px] p-[20px]">
                <button
                  onClick={onClose}
                  className="flex items-center gap-[4px]"
                >
                  <span className="text-[12px] font-normal leading-[1.4] text-[#7C8394]">Fechar</span>
                  <X size={20} className="text-[#7C8394]" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-[20px] pt-0">
                <div className="flex flex-col gap-[24px]">
                  {/* Title */}
                  <p className="text-[28px] font-normal leading-none text-[#F5F7FA]">
                    Editar Grupo
                  </p>

                  {loading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent" />
                    </div>
                  ) : group && isOwner ? (
                    <>
                      {/* Card 1: Informações sobre o grupo */}
                      <div className="border-2 border-[#1C1D25] rounded-[8px] p-[20px] flex flex-col gap-[24px]">
                        <p className="text-[14px] leading-[1.4] text-[#A7ADBA]">
                          Informações sobre o grupo
                        </p>

                        {/* Nome do grupo */}
                        <div className="flex flex-col gap-[8px]">
                          <p className="text-[16px] leading-[1.4] text-[#F5F7FA]">Seu Nome</p>
                          <div className="flex items-center gap-[5px] h-[48px] bg-[#1C1D25] rounded-[8px] px-[16px]">
                            <input
                              type="text"
                              className="flex-1 bg-transparent text-[16px] leading-[1.4] text-[#F5F7FA] outline-none placeholder:text-[#7C8394]"
                              placeholder="Nome do grupo"
                              {...editForm.register('name')}
                            />
                            <Pencil size={16} className="text-[#7C8394] shrink-0" />
                          </div>
                          {editForm.formState.errors.name?.message && (
                            <p className="text-[12px] text-danger">{editForm.formState.errors.name.message}</p>
                          )}
                        </div>

                        {/* Percentuais */}
                        <div className="flex flex-col gap-[8px]">
                          <p className="text-[16px] leading-[1.4] text-[#F5F7FA]">Percentuais</p>

                          {group.members.map((member: GroupMember) => (
                            <div
                              key={member.id}
                              className="flex items-center h-[48px] bg-[#1C1D25] rounded-[8px] px-[20px]"
                            >
                              <div className="flex items-center gap-[8px] shrink-0">
                                {(!member.user_id || member.user_id !== group.owner_id) ? (
                                  <button
                                    type="button"
                                    onClick={() => setRemoveMemberId(member.id)}
                                    className="text-[#7C8394] opacity-50 hover:opacity-100 hover:text-danger transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                ) : (
                                  <Trash2 size={16} className="text-[#7C8394] opacity-20" />
                                )}
                                <span className="text-[16px] leading-[1.4] text-[#F5F7FA]">
                                  {member.name}
                                </span>
                                {member.status === 'pending' && (
                                  <span className="text-[10px] font-medium leading-none text-[#F5A623] bg-[rgba(245,166,35,0.16)] rounded-full px-[8px] py-[3px]">
                                    Pendente
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 flex items-center justify-end gap-[16px]">
                                <button
                                  type="button"
                                  onClick={() => adjustPercentage(member.id, -1)}
                                  className="w-[32px] h-[32px] rounded-[8px] bg-[#252630] flex items-center justify-center text-[#F5F7FA] hover:bg-[#2E3040] transition-colors"
                                >
                                  <Minus size={16} />
                                </button>
                                <span className="text-[20px] font-bold leading-[1.4] text-[#F5F7FA] text-center w-[40px]">
                                  {percentages?.[member.id] ?? 0}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => adjustPercentage(member.id, 1)}
                                  className="w-[32px] h-[32px] rounded-[8px] bg-[#252630] flex items-center justify-center text-[#F5F7FA] hover:bg-[#2E3040] transition-colors"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                          ))}

                          <p className={`text-[14px] leading-[1.4] ${Math.abs(Number(pctTotal) - 100) > 0.01 ? 'text-danger' : 'text-[#7C8394]'}`}>
                            Total: {pctTotal}%
                          </p>
                          {editForm.formState.errors.percentages?.root?.message && (
                            <p className="text-[12px] text-danger">{editForm.formState.errors.percentages.root.message}</p>
                          )}
                        </div>

                        {/* Link do grupo */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0 flex items-center gap-2 bg-[#1C1D25] rounded-[8px] px-3 py-2">
                            <Link2 size={14} className="text-[#7C8394] shrink-0" />
                            <span className="text-[12px] text-[#A7ADBA] truncate">
                              {inviteUrl}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyInvite}
                            className="w-9 h-9 rounded-[8px] bg-[#F5C249] flex items-center justify-center text-[#101116] hover:bg-[#E5B43A] transition-colors shrink-0"
                          >
                            <Copy size={14} />
                          </button>
                        </div>

                        {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}

                        <button
                          type="button"
                          onClick={editForm.handleSubmit(handleSave)}
                          disabled={saving || Math.abs(Number(pctTotal) - 100) > 0.01}
                          className="flex items-center justify-center h-[48px] bg-[#F5C249] rounded-[8px] text-[16px] font-medium text-[#101116] hover:bg-[#E5B43A] transition-colors disabled:opacity-40"
                        >
                          {saving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#101116] border-t-transparent" />
                          ) : (
                            'Salvar'
                          )}
                        </button>
                      </div>

                      {/* Card 2: Convidar um novo Membro */}
                      <div className="border-2 border-[#1C1D25] rounded-[8px] p-[20px] flex flex-col gap-[24px]">
                        <p className="text-[14px] leading-[1.4] text-[#A7ADBA]">
                          Convidar um novo Membro
                        </p>

                        {/* E-mail */}
                        <div className="flex flex-col gap-[8px]">
                          <p className="text-[16px] leading-[1.4] text-[#F5F7FA]">E-mail do convidado</p>
                          <div className="flex items-center h-[48px] bg-[#1C1D25] rounded-[8px] px-[16px]">
                            <input
                              type="email"
                              className="flex-1 bg-transparent text-[16px] leading-[1.4] text-[#F5F7FA] outline-none placeholder:text-[#7C8394]"
                              placeholder="E-mail do convidado"
                              {...inviteFormHook.register('email')}
                            />
                          </div>
                          {inviteFormHook.formState.errors.email?.message && (
                            <p className="text-[12px] text-danger">{inviteFormHook.formState.errors.email.message}</p>
                          )}
                        </div>

                        {/* Nome */}
                        <div className="flex flex-col gap-[8px]">
                          <p className="text-[16px] leading-[1.4] text-[#F5F7FA]">Nome do convidado</p>
                          <div className="flex items-center h-[48px] bg-[#1C1D25] rounded-[8px] px-[16px]">
                            <input
                              type="text"
                              className="flex-1 bg-transparent text-[16px] leading-[1.4] text-[#F5F7FA] outline-none placeholder:text-[#7C8394]"
                              placeholder="Nome do convidado"
                              {...inviteFormHook.register('name')}
                            />
                          </div>
                          {inviteFormHook.formState.errors.name?.message && (
                            <p className="text-[12px] text-danger">{inviteFormHook.formState.errors.name.message}</p>
                          )}
                        </div>

                        {/* Percentual com +/- */}
                        <div className="flex flex-col gap-[8px]">
                          <p className="text-[16px] leading-[1.4] text-[#F5F7FA]">Percentuais</p>
                          <div className="flex items-center h-[48px] bg-[#1C1D25] rounded-[8px] px-[20px]">
                            <span className="text-[16px] leading-[1.4] text-[#F5F7FA]">Percentual (%)</span>
                            <div className="flex-1 flex items-center justify-end gap-[16px]">
                              <button
                                type="button"
                                onClick={() => adjustInvitePercentage(-1)}
                                className="w-[32px] h-[32px] rounded-[8px] bg-[#252630] flex items-center justify-center text-[#F5F7FA] hover:bg-[#2E3040] transition-colors"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="text-[20px] font-bold leading-[1.4] text-[#F5F7FA] text-center w-[40px]">
                                {inviteFormHook.watch('percentage') || 0}
                              </span>
                              <button
                                type="button"
                                onClick={() => adjustInvitePercentage(1)}
                                className="w-[32px] h-[32px] rounded-[8px] bg-[#252630] flex items-center justify-center text-[#F5F7FA] hover:bg-[#2E3040] transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                          {inviteFormHook.formState.errors.percentage?.message && (
                            <p className="text-[12px] text-danger">{inviteFormHook.formState.errors.percentage.message}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={inviteFormHook.handleSubmit(handleInvite)}
                          className="flex items-center justify-center h-[48px] bg-[#F5C249] rounded-[8px] text-[16px] font-medium text-[#101116] hover:bg-[#E5B43A] transition-colors"
                        >
                          Convidar
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )

  return (
    <>
      {portal}
      <FloatingToast toasts={toasts} />

      {/* Remove Member Confirmation */}
      <ModalWithToast
        open={!!removeMemberId}
        onClose={() => setRemoveMemberId(null)}
        title="Remover membro"
        toasts={toasts}
      >
        <p className="text-body text-text-secondary mb-6">
          Tem certeza que deseja remover este membro do grupo?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setRemoveMemberId(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleRemoveMember}>
            Remover
          </Button>
        </div>
      </ModalWithToast>
    </>
  )
}
