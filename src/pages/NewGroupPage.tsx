import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newGroupSchema, type NewGroupForm } from '../lib/schemas'
import { createGroup } from '../services/groupService'
import { useLocalToast } from '../hooks/useLocalToast'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { ArrowLeft } from 'lucide-react'

export default function NewGroupPage() {
  const navigate = useNavigate()
  const { showToast } = useLocalToast()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<NewGroupForm>({
    resolver: zodResolver(newGroupSchema),
    defaultValues: { name: '', ownerName: '', ownerPercentage: 50 },
  })

  const ownerPercentage = watch('ownerPercentage')

  async function onSubmit(data: NewGroupForm) {
    setLoading(true)
    const { data: groupId, error } = await createGroup(
      data.name,
      data.ownerName,
      data.ownerPercentage
    )

    if (error) {
      setError('root', { message: 'Erro ao criar grupo. Tente novamente.' })
      showToast('Ops, tivemos um erro!', 'error')
      setLoading(false)
    } else {
      showToast('Grupo criado com sucesso!', 'success')
      navigate(`/grupos/${groupId}`)
    }
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="pt-4 pb-6">
        <button
          onClick={() => navigate('/grupos')}
          className="flex items-center gap-1.5 text-text-secondary text-body-sm hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>
        <h1 className="text-h1 text-text-primary">Novo Grupo</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            label="Nome do grupo"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Seu nome (como aparecera no grupo)"
            error={errors.ownerName?.message}
            {...register('ownerName')}
          />

          <Input
            label="Seu percentual (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            error={errors.ownerPercentage?.message}
            {...register('ownerPercentage')}
          />

          <p className="text-body-sm text-text-tertiary">
            O percentual restante ({(100 - (ownerPercentage || 0)).toFixed(1)}
            %) sera atribuido ao membro que voce convidar.
          </p>

          {errors.root && (
            <p className="text-body-sm text-danger">{errors.root.message}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} fullWidth>
              Criar Grupo
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
