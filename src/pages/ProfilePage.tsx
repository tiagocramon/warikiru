import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { fetchUserGroups, updateUserNameInAllGroups } from '../services/groupService'
import { formatDate } from '../lib/formatting'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileNameSchema, type ProfileNameForm } from '../lib/schemas'
import { useLocalToast } from '../hooks/useLocalToast'
import FloatingToast from '../components/ui/FloatingToast'
import { LogOut, Users, Calendar, Mail, Pencil, X } from 'lucide-react'

interface ProfileBottomSheetProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ProfileBottomSheet({ open, onClose, onSuccess }: ProfileBottomSheetProps) {
  const { user, signOut, refreshUser } = useAuth()
  const { toasts, showToast } = useLocalToast()

  const [groupsCount, setGroupsCount] = useState<number | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [savingName, setSavingName] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ProfileNameForm>({
    resolver: zodResolver(profileNameSchema),
  })

  const displayName =
    user?.user_metadata?.name || user?.email?.split('@')[0] || ''
  const email = user?.email || ''
  const createdAt = user?.created_at
    ? formatDate(user.created_at.split('T')[0])
    : ''

  useEffect(() => {
    if (open) {
      fetchUserGroups().then(({ data }) => {
        setGroupsCount(data?.length ?? 0)
      })
    }
  }, [open])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  function startEditName() {
    reset({ name: displayName })
    setEditingName(true)
  }

  async function onSubmit(data: ProfileNameForm) {
    if (!data.name.trim()) return
    setSavingName(true)

    const newName = data.name.trim()
    const { error } = await supabase.auth.updateUser({
      data: { name: newName },
    })

    if (error) {
      showToast('Ops, tivemos um erro!', 'error')
      setSavingName(false)
    } else {
      // Run DB update and auth refresh in parallel
      await Promise.all([
        user?.id ? updateUserNameInAllGroups(user.id, newName) : Promise.resolve(),
        refreshUser(),
      ])

      setEditingName(false)
      setSavingName(false)
      onClose()
      onSuccess?.()
      showToast('Salvo com sucesso!', 'success')
    }
  }

  async function handleSignOut() {
    await signOut()
    onClose()
  }

  function handleSave() {
    if (editingName) {
      handleSubmit(onSubmit)()
    } else {
      onClose()
    }
  }

  const modal = createPortal(
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-[32px] rounded-t-[20px] bg-[#16171D] p-[20px]">
              {/* Header - Fechar X */}
              <button
                onClick={onClose}
                className="flex items-center gap-[4px] self-end"
              >
                <span className="text-[12px] font-normal leading-[1.4] text-[#7C8394]">
                  Fechar
                </span>
                <X size={20} className="text-[#7C8394]" />
              </button>

              {/* Title + Name input */}
              <div className="flex flex-col gap-[24px]">
                <p className="text-[28px] font-normal leading-none text-[#F5F7FA]">
                  Perfil
                </p>

                <div className="flex flex-col gap-[8px]">
                  <p className="text-[16px] font-normal leading-[1.4] text-[#F5F7FA]">
                    Seu Nome
                  </p>
                  {!editingName ? (
                    <button
                      onClick={startEditName}
                      className="flex h-[48px] items-center gap-[5px] rounded-[8px] bg-[#1C1D25] px-[16px]"
                    >
                      <span className="flex-1 text-left text-[16px] font-normal leading-[1.4] text-[#7C8394]">
                        {displayName}
                      </span>
                      <Pencil size={16} className="text-[#7C8394]" />
                    </button>
                  ) : (
                    <div className="flex h-[48px] items-center gap-[5px] rounded-[8px] bg-[#1C1D25] px-[16px]">
                      <input
                        type="text"
                        className="flex-1 bg-transparent text-[16px] font-normal leading-[1.4] text-[#F5F7FA] outline-none placeholder:text-[#7C8394]"
                        autoFocus
                        {...register('name')}
                      />
                      <Pencil size={16} className="text-[#F5C249]" />
                    </div>
                  )}
                </div>
              </div>

              {/* Detalhes */}
              <div className="flex flex-col gap-[8px]">
                <p className="text-[14px] font-normal leading-[1.4] text-[#A7ADBA]">
                  Detalhes
                </p>

                {/* Email */}
                <div className="flex items-center gap-[8px] rounded-[8px] bg-[#1C1D25] p-[20px]">
                  <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[rgba(245,194,73,0.16)]">
                    <Mail size={16} className="text-[#F5C249]" />
                  </div>
                  <div className="flex flex-1 flex-col leading-[1.4]">
                    <span className="text-[12px] text-[#7C8394]">Seu e-mail</span>
                    <span className="text-[14px] text-[#F5F7FA]">{email}</span>
                  </div>
                </div>

                {/* Grupos */}
                <div className="flex items-center gap-[8px] rounded-[8px] bg-[#1C1D25] p-[20px]">
                  <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[rgba(245,194,73,0.16)]">
                    <Users size={16} className="text-[#F5C249]" />
                  </div>
                  <div className="flex flex-1 flex-col leading-[1.4]">
                    <span className="text-[12px] text-[#7C8394]">Grupos</span>
                    <span className="text-[14px] text-[#F5F7FA]">
                      {groupsCount ?? '...'}
                    </span>
                  </div>
                </div>

                {/* Conta criada em */}
                <div className="flex items-center gap-[8px] rounded-[8px] bg-[#1C1D25] p-[20px]">
                  <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[rgba(245,194,73,0.16)]">
                    <Calendar size={16} className="text-[#F5C249]" />
                  </div>
                  <div className="flex flex-1 flex-col leading-[1.4]">
                    <span className="text-[12px] text-[#7C8394]">Conta criada em</span>
                    <span className="text-[14px] text-[#F5F7FA]">{createdAt}</span>
                  </div>
                </div>
              </div>

              {/* Sair da Conta */}
              <button
                onClick={handleSignOut}
                className="flex items-center gap-[8px] self-start"
              >
                <LogOut size={16} className="text-[#E85D5D]" />
                <span className="text-[14px] font-normal leading-[1.4] text-[#E85D5D]">
                  Sair da Conta
                </span>
              </button>

              {/* Salvar */}
              <button
                onClick={handleSave}
                className="flex h-[48px] items-center justify-center rounded-[8px] bg-[#F5C249] p-[16px]"
              >
                <span className="text-[16px] font-medium leading-[1.4] text-[#101116]">
                  Salvar
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )

  return (
    <>
      {modal}
      <FloatingToast toasts={toasts} />
    </>
  )
}
