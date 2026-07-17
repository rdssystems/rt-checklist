# RT Expert (RT-Checklist)

SaaS para Responsáveis Técnicos: modelos de checklist, inspeções em campo com fotos,
clientes no mapa, agenda de visitas e laudos em PDF.

## Stack
- React + Vite + TypeScript + Tailwind + shadcn/ui — dev: `npm run dev` (porta 8080+, expõe na rede)
- Supabase: projeto **`ismemgtitjpvedgxmayo`** ("Checklist RT") — auth, Postgres (RLS por `tenant_id`), storage, edge functions
- Vercel: hospeda o frontend e as funções em `api/` (asaas, webhook-asaas, google-auth, google-refresh)
- Pagamentos: Asaas (assinatura R$80/mês ou avulso R$99,90/30 dias)
- Typecheck: `npx tsc --noEmit`

## Regras do domínio
- Planos: `plan_type` interno é `'premium'`; "Expert" é só o nome comercial. Regra única em
  `src/lib/plan-limits.ts` (`computePlanStatus` + `PLAN_LIMITS`) — nunca duplicar a lógica.
  Free: 2 modelos, 10 clientes, 5 checklists/mês, 5 fotos/checklist (800px q0.6).
  Premium: ilimitado, 10 fotos/checklist (1024px q0.7). Trial de 7 dias vem do trigger `handle_new_user`.
- Fotos de inspeção: bucket privado `checklist_fotos` — exibir sempre via `SignedPhoto` /
  `photo-utils.ts` (URLs assinadas). O banco guarda URLs no formato público antigo; o helper converte.
- Textos: normalizar com `text-utils.ts` ao salvar (nomes = toTitleCase, frases = toSentenceCase).
- Confirmações destrutivas: usar `ConfirmDialog` (nunca `confirm()` nativo).
- Edge functions deployadas: `delete-account` (LGPD), `cleanup-orphan-photos` (órfãs > 7 dias).
- Deploy de function: `npx supabase functions deploy <nome> --project-ref ismemgtitjpvedgxmayo`.
- Migrações locais precisam ser coladas manualmente no SQL Editor do dashboard (histórico remoto não sincronizado).

## ⚠️ PENDÊNCIAS — lembrar o usuário (Patrick)

### Google Cloud Console (para nome do app no OAuth e Agenda estável)
- [ ] Tela de permissão OAuth (Branding): nome "RT Expert", logo, e-mail de suporte, domínio autorizado
- [ ] Publicar o app: status "Em produção" (em "Teste", refresh tokens expiram em 7 dias!)
- [ ] Solicitar verificação do app (escopo Calendar é sensível) — usar a página `/privacidade` como URL da política
- [ ] Credenciais → OAuth Client: adicionar origens JS autorizadas da produção (e `http://localhost:8082` para dev)
- [ ] Confirmar Google Calendar API habilitada na Biblioteca de APIs

### Vercel (variáveis de ambiente)
- [ ] Conferir: `VITE_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Criar `ASAAS_WEBHOOK_TOKEN` com token NOVO gerado no painel Asaas — o antigo vazou no histórico do Git

### Supabase
- [ ] Aplicar no SQL Editor a migração `20260716210000_fix_plan_expiry_and_trial.sql` (plan_expires_at + trial no trigger) — se ainda não foi
- [ ] Conferir Auth → Providers → Google usa o client ID/secret próprios (mesmo projeto Google Cloud do branding)
- [ ] Rodar `cleanup-orphan-photos` uma vez pelo dashboard (fotos órfãs históricas)
- [ ] (Opcional, pago) Custom domain para tirar "supabase.co" da tela de login Google

### Produto (decisões futuras do Patrick)
- [ ] Novos planos: um mais barato e um ilimitado (ajustar `PLAN_LIMITS` e Upgrade.tsx)
- [ ] Usuários antigos de mês avulso ficaram premium sem expiração (sem backfill seguro) — ajustar `plan_expires_at` manualmente se houver casos
