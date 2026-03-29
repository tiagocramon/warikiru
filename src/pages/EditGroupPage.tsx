import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  editGroupSchema,
  editInviteEmailSchema,
  inviteMemberSchema,
  type EditGroupForm,
  type EditInviteEmailForm,
  type InviteMemberForm,
} from '../lib/schemas'
import {
  fetchGroupDetail,
  updateGroup,
  inviteMember,
  updatePendingMemberInviteEmail,
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
  initialGroup: GroupWithMembers | null
}

export default function EditGroupBottomSheet({ open, onClose, groupId, initialGroup }: EditGroupBottomSheetProps) {
  const { user } = useAuth()
  const { toasts, showToast } = useLocalToast()

  const [group, setGroup] = useState<GroupWithMembers | null>(initialGroup)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!initialGroup)
  const [saving, setSaving] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
  const [editingInviteMember, setEditingInviteMember] = useState<GroupMember | null>(null)
  const [editingInviteError, setEditingInviteError] = useState('')
  const [editingInviteSaving, setEditingInviteSaving] = useState(false)

  const editForm = useForm<EditGroupForm>({
    resolver: zodResolver(editGroupSchema),
  })
  const percentages = editForm.watch('percentages')

  const inviteFormHook = useForm<InviteMemberForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { percentage: 50 },
  })
  const editInviteEmailForm = useForm<EditInviteEmailForm>({
    resolver: zodResolver(editInviteEmailSchema),
    defaultValues: { email: '' },
  })

  const applyGroupData = useCallback((nextGroup: GroupWithMembers) => {
    setGroup(nextGroup)
    const pcts: Record<string, number> = {}
    nextGroup.members.forEach((member) => {
      pcts[member.id] = member.percentage
    })
    editForm.reset({ name: nextGroup.name, percentages: pcts })
  }, [editForm])

  const loadGroup = useCallback(async (options?: { showLoading?: boolean }) => {
    if (!groupId) return
    const showLoading = options?.showLoading ?? true
    if (showLoading) setLoading(true)
    const { data } = await fetchGroupDetail(groupId)
    if (data) {
      applyGroupData(data as GroupWithMembers)
    }
    if (showLoading) setLoading(false)
  }, [groupId, applyGroupData])

  useEffect(() => {
    if (open) {
      if (initialGroup) {
        applyGroupData(initialGroup)
        setLoading(false)
        loadGroup({ showLoading: false })
      } else {
        loadGroup({ showLoading: true })
      }
      setError('')
    }
  }, [open, initialGroup, applyGroupData, loadGroup])

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

  function handleOpenInviteEmailEditor(member: GroupMember) {
    setEditingInviteError('')
    setEditingInviteMember(member)
    editInviteEmailForm.reset({ email: member.invited_email ?? '' })
  }

  function handleCloseInviteEmailEditor() {
    setEditingInviteMember(null)
    setEditingInviteError('')
    setEditingInviteSaving(false)
    editInviteEmailForm.reset({ email: '' })
  }

  async function handleSaveInviteEmail(data: EditInviteEmailForm) {
    if (!editingInviteMember) return

    setEditingInviteError('')
    setEditingInviteSaving(true)

    const { error } = await updatePendingMemberInviteEmail(editingInviteMember.id, data.email)

    if (error) {
      const isDuplicateInvite =
        ('code' in error && error.code === '23505') ||
        error.message?.includes('group_members_group_id_invited_email_key')

      setEditingInviteError(
        isDuplicateInvite
          ? 'Ja existe um membro ou convite com esse e-mail neste grupo.'
          : error.message || 'Erro ao atualizar e-mail do convite.'
      )
      showToast('Ops, tivemos um erro!', 'error')
      setEditingInviteSaving(false)
      return
    }

    await loadGroup()
    handleCloseInviteEmailEditor()
    showToast('E-mail do convite atualizado. Compartilhe o link novamente.', 'success')
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
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 right-0 left-0 z-50 w-full max-w-[480px] mx-auto"
            style={{ maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 16px)' }}
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

                  {loading && !group ? (
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
                          <p className="text-[16px] leading-[1.4] text-[#F5F7FA]">Nome do Grupo</p>
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
                              className="flex w-full flex-col items-start justify-center gap-[8px] rounded-[8px] bg-[#1C1D25] px-[20px] py-[8px]"
                            >
                              <div className="flex w-full items-center">
                                <div className="flex shrink-0 items-center gap-[8px] min-w-0">
                                  {(!member.user_id || member.user_id !== group.owner_id) ? (
                                    <button
                                      type="button"
                                      onClick={() => setRemoveMemberId(member.id)}
                                      className="shrink-0 text-danger opacity-70 hover:opacity-100 transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  ) : (
                                    <Trash2 size={16} className="text-[#7C8394] opacity-20 shrink-0" />
                                  )}
                                  <p className="truncate text-[16px] leading-[1.4] text-[#F5F7FA]">
                                    {member.name}
                                  </p>
                                </div>

                                <div className="flex min-w-0 flex-[1_0_0] items-center justify-end gap-[16px]">
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

                              {member.status === 'pending' && !member.user_id && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenInviteEmailEditor(member)}
                                  className="inline-flex h-[24px] w-fit items-center justify-center rounded-full bg-[rgba(245,194,73,0.16)] px-[20px] text-[12px] font-medium leading-[1.4] text-[#F5C249] hover:bg-[rgba(245,194,73,0.22)] transition-colors"
                                >
                                  Pendente - Editar E-mail
                                </button>
                              )}
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

      <ModalWithToast
        open={!!editingInviteMember}
        onClose={handleCloseInviteEmailEditor}
        title="Editar e-mail do convite"
        toasts={toasts}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-body-sm text-text-secondary">
              Depois de salvar, compartilhe novamente o link do grupo com o convidado.
            </p>
          </div>

          <div className="flex flex-col gap-[8px]">
            <p className="text-[16px] leading-[1.4] text-[#F5F7FA]">E-mail do convidado</p>
            <div className="flex items-center h-[48px] bg-[#1C1D25] rounded-[8px] px-[16px]">
              <input
                type="email"
                className="flex-1 bg-transparent text-[16px] leading-[1.4] text-[#F5F7FA] outline-none placeholder:text-[#7C8394]"
                placeholder="E-mail do convidado"
                {...editInviteEmailForm.register('email')}
              />
            </div>
            {editInviteEmailForm.formState.errors.email?.message && (
              <p className="text-[12px] text-danger">{editInviteEmailForm.formState.errors.email.message}</p>
            )}
            {editingInviteError && (
              <p className="text-[12px] text-danger">{editingInviteError}</p>
            )}
          </div>

          <div className="flex gap-[16px]">
            <button
              type="button"
              onClick={handleCloseInviteEmailEditor}
              className="flex h-[48px] flex-1 items-center justify-center rounded-[8px] bg-[#1C1D25] text-[16px] font-medium leading-[1.4] text-[#F5F7FA]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={editInviteEmailForm.handleSubmit(handleSaveInviteEmail)}
              disabled={editingInviteSaving}
              className="flex h-[48px] flex-1 items-center justify-center rounded-[8px] bg-[#F5C249] text-[16px] font-medium leading-[1.4] text-[#101116] disabled:opacity-40"
            >
              {editingInviteSaving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#101116] border-t-transparent" />
              ) : (
                'Salvar e-mail'
              )}
            </button>
          </div>
        </div>
      </ModalWithToast>
    </>
  )
}
