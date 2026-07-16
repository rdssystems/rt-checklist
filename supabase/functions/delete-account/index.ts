import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Apaga recursivamente todos os arquivos de um usuário em um bucket (pastas: userId/... ou userId/subpasta/...)
async function deleteUserFiles(admin: ReturnType<typeof createClient>, bucket: string, userId: string) {
  const { data: entries } = await admin.storage.from(bucket).list(userId, { limit: 1000 })
  if (!entries || entries.length === 0) return

  const filePaths: string[] = []
  for (const entry of entries) {
    if (entry.id) {
      // É um arquivo direto na pasta do usuário
      filePaths.push(`${userId}/${entry.name}`)
    } else {
      // É uma subpasta (ex: checklist_fotos/userId/campoId/...)
      const { data: subFiles } = await admin.storage.from(bucket).list(`${userId}/${entry.name}`, { limit: 1000 })
      for (const f of subFiles || []) {
        filePaths.push(`${userId}/${entry.name}/${f.name}`)
      }
    }
  }

  if (filePaths.length > 0) {
    await admin.storage.from(bucket).remove(filePaths)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Identificar o usuário autenticado a partir do token da requisição
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await admin.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id

    // 2. Apagar todos os arquivos do usuário no Storage
    for (const bucket of ['checklist_fotos', 'logos', 'avatars']) {
      try {
        await deleteUserFiles(admin, bucket, userId)
      } catch (e) {
        console.error(`Erro ao limpar bucket ${bucket}:`, e)
      }
    }

    // 3. Apagar agendamentos explicitamente (FK sem cascade garantido)
    await admin.from('agendamentos').delete().eq('tenant_id', userId)

    // 4. Excluir o usuário do Auth — o ON DELETE CASCADE em profiles
    //    remove profiles -> clientes -> modelos_checklist -> aplicacoes_checklist
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro ao excluir conta:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
