import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return

  const contents = readFileSync(filePath, 'utf8')
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '')

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function printUsage() {
  console.log(`Uso:
  node scripts/delete-auth-users.mjs [--yes] [--soft] [--keep=email1,email2]

Opcoes:
  --yes    Executa a exclusao de verdade. Sem isso, roda em dry-run.
  --soft   Usa soft delete no Auth.
  --keep   Mantem usuarios por e-mail.
`)
}

async function listAllUsers(adminClient) {
  const users = []
  let page = 1

  while (true) {
    const {
      data: { users: pageUsers } = {},
      error,
    } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })

    if (error) throw error
    if (!pageUsers?.length) break

    users.push(...pageUsers)
    if (pageUsers.length < 1000) break
    page += 1
  }

  return users
}

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env.local'))
  loadEnvFile(resolve(process.cwd(), '.env'))

  const args = new Set(process.argv.slice(2))
  if (args.has('--help') || args.has('-h')) {
    printUsage()
    return
  }

  const keepArg = process.argv.find((arg) => arg.startsWith('--keep='))
  const keepEmails = new Set(
    (keepArg?.slice('--keep='.length) ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const dryRun = !args.has('--yes')
  const softDelete = args.has('--soft')

  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL ou VITE_SUPABASE_URL nao encontrado no ambiente/.env.local.'
    )
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY nao encontrado. Exporte a chave antes de rodar o script.'
    )
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const users = await listAllUsers(adminClient)
  const candidates = users.filter((user) => {
    const email = user.email?.toLowerCase() ?? ''
    return !keepEmails.has(email)
  })

  if (!candidates.length) {
    console.log('Nenhum usuario para excluir.')
    return
  }

  console.log(
    `${dryRun ? 'Dry-run' : 'Exclusao'}: ${candidates.length} usuario(s) encontrado(s).`
  )

  for (const user of candidates) {
    console.log(`- ${user.id} ${user.email ?? '(sem e-mail)'}`)
  }

  if (dryRun) {
    console.log('\nNada foi apagado. Rode novamente com --yes para confirmar.')
    return
  }

  for (const user of candidates) {
    const { error } = await adminClient.auth.admin.deleteUser(user.id, softDelete)
    if (error) {
      console.error(`Falha ao excluir ${user.email ?? user.id}: ${error.message}`)
      continue
    }

    console.log(`Excluido: ${user.email ?? user.id}`)
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
