import { supabase } from '../lib/supabase'
import type { AuditLog } from '../types/database'

export async function fetchAuditLog(
  groupId: string,
  { limit = 50, offset = 0 } = {}
) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return { data: data as AuditLog[] | null, error }
}
