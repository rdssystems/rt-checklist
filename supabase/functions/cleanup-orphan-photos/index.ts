import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BUCKET = 'checklist_fotos'
const MARKER = '/checklist_fotos/'
// Fotos mais novas que isso são preservadas (podem pertencer a um checklist em preenchimento)
const MIN_AGE_DAYS = 7

// Percorre respostas_json coletando caminhos de fotos referenciadas
function collectReferencedPaths(value: unknown, paths: Set<string>) {
  if (typeof value === 'string') {
    const idx = value.indexOf(MARKER)
    if (idx !== -1) {
      paths.add(decodeURIComponent(value.slice(idx + MARKER.length).split('?')[0]))
    } else if (/^[0-9a-f-]{36}\//.test(value)) {
      paths.add(value.split('?')[0])
    }
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectReferencedPaths(v, paths))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectReferencedPaths(v, paths))
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Coletar todos os caminhos de fotos referenciados nos checklists salvos
    const referenced = new Set<string>()
    const pageSize = 500
    for (let from = 0; ; from += pageSize) {
      const { data: rows, error } = await admin
        .from('aplicacoes_checklist')
        .select('respostas_json')
        .range(from, from + pageSize - 1)
      if (error) throw error
      if (!rows || rows.length === 0) break
      rows.forEach((r) => collectReferencedPaths(r.respostas_json, referenced))
      if (rows.length < pageSize) break
    }

    // 2. Listar todos os arquivos do bucket (userId/campoId/arquivo)
    const cutoff = Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000
    const orphans: string[] = []
    let totalFiles = 0

    const { data: userFolders } = await admin.storage.from(BUCKET).list('', { limit: 1000 })
    for (const userFolder of userFolders || []) {
      if (userFolder.id) continue // arquivo solto na raiz, ignora
      const { data: campoFolders } = await admin.storage.from(BUCKET).list(userFolder.name, { limit: 1000 })
      for (const campoFolder of campoFolders || []) {
        const prefix = `${userFolder.name}/${campoFolder.name}`
        if (campoFolder.id) {
          // arquivo direto na pasta do usuário
          totalFiles++
          const createdAt = new Date(campoFolder.created_at || 0).getTime()
          if (!referenced.has(prefix) && createdAt < cutoff) orphans.push(prefix)
          continue
        }
        const { data: files } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 })
        for (const file of files || []) {
          totalFiles++
          const path = `${prefix}/${file.name}`
          const createdAt = new Date(file.created_at || 0).getTime()
          if (!referenced.has(path) && createdAt < cutoff) orphans.push(path)
        }
      }
    }

    // 3. Remover órfãs em lotes
    let removed = 0
    for (let i = 0; i < orphans.length; i += 100) {
      const batch = orphans.slice(i, i + 100)
      const { error } = await admin.storage.from(BUCKET).remove(batch)
      if (!error) removed += batch.length
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_arquivos: totalFiles,
        referenciados: referenced.size,
        orfas_encontradas: orphans.length,
        removidas: removed,
        criterio: `sem referência em checklists e com mais de ${MIN_AGE_DAYS} dias`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro na limpeza de órfãs:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
