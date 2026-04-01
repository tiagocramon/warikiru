import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { acceptInvitation, checkGroupMembership } from '../services/groupService'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { CheckCircle, AlertCircle, UserPlus } from 'lucide-react'

export default function InviteAcceptPage() {
  const [searchParams] = useSearchParams()
  const groupId = searchParams.get('group')
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'login'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (authLoading) return

    if (!groupId) {
      setStatus('error')
      setErrorMsg('Link de convite invalido.')
      return
    }

    if (!user) {
      const redirectUrl = encodeURIComponent(`/convite?group=${groupId}`)
      navigate(`/cadastro?redirect=${redirectUrl}`, { replace: true })
      return
    }

    async function handleInvite() {
      const { isMember } = await checkGroupMembership(groupId!, user!.id)
      if (isMember) {
        navigate(`/grupos/${groupId}`, { replace: true })
        return
      }

      const { error } = await acceptInvitation(groupId!)
      if (error) {
        setStatus('error')
        setErrorMsg('Nao foi possivel aceitar o convite. Verifique se o link esta correto.')
      } else {
        setStatus('success')
      }
    }

    handleInvite()
  }, [user, authLoading, groupId, navigate])

  if (authLoading || status === 'loading') return <Spinner fullScreen />

  const iconMap = {
    login: <UserPlus size={48} className="text-accent" strokeWidth={1.5} />,
    success: <CheckCircle size={48} className="text-success" strokeWidth={1.5} />,
    error: <AlertCircle size={48} className="text-danger" strokeWidth={1.5} />,
  }

  return (
    <div className="min-h-app bg-surface-0 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          {iconMap[status]}
        </div>

        {status === 'success' && (
          <>
            <h1 className="text-h1 text-text-primary mb-2">Convite aceito!</h1>
            <p className="text-body text-text-secondary mb-8">
              Voce agora faz parte do grupo.
            </p>
            <Button onClick={() => navigate(`/grupos/${groupId}`)}>
              Ir para o grupo
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-h1 text-text-primary mb-2">Erro</h1>
            <p className="text-body text-danger mb-8">{errorMsg}</p>
            <Link to={user ? '/grupos' : '/'}>
              <Button variant="secondary">Ir para inicio</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
