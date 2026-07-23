# APIs e Integrações

Este documento fornece detalhes sobre os serviços de terceiros e APIs integradas ao **RT Expert**, incluindo o gateway de pagamentos Asaas, a sincronização com Google Calendar e as Vercel Serverless Functions.

---

## 💳 1. Integração de Pagamentos: Asaas

O aplicativo utiliza o gateway de pagamentos **Asaas** para gerenciar cobranças e assinaturas. Há duas modalidades de ativação de conta:

### A. Assinatura Recorrente (R$ 80,00/mês)
* **Endpoint:** Executa um POST para `/api/asaas` passando `type = 'RECURRING'`.
* **API Asaas:** Cria um cliente (ou localiza por e-mail) e depois registra uma assinatura (`/v3/subscriptions`) com ciclo mensal (`cycle = 'MONTHLY'`).
* **Meio de Pagamento:** Definido como `'UNDEFINED'` no payload do Asaas. Isso obriga a abertura da tela de pagamento do Asaas, permitindo ao usuário escolher Pix, Boleto ou cadastrar Cartão de Crédito.
* **Retorno:** O Asaas retorna a URL do checkout (`invoiceUrl`), que é aberta pelo frontend.

### B. Pagamento Avulso (R$ 99,90/30 dias)
* **Endpoint:** Executa um POST para `/api/asaas` passando `type = 'SINGLE'`.
* **API Asaas:** Cria/localiza o cliente e registra uma cobrança única (`/v3/payments`) com vencimento em 3 dias.
* **Retorno:** Envia o link de pagamento do Pix/Boleto para o usuário quitar.

---

## 🔔 2. Webhook de Confirmação: Asaas

A Vercel hospeda o endpoint de callback `/api/webhook-asaas.js` para receber as notificações do Asaas e atualizar o plano do usuário no Supabase.

### Segurança e Validação:
* O webhook valida o header `asaas-access-token` comparando-o com a variável de ambiente `ASAAS_WEBHOOK_TOKEN` (definida na Vercel).
* O payload do Asaas envia `externalReference` contendo o ID do usuário no Supabase (`userId`).
* O Supabase é acessado usando a `SUPABASE_SERVICE_ROLE_KEY` para contornar as políticas RLS.

### Regras de Transição de Estado:
* **Liberação de Plano:** Ao receber qualquer um dos eventos `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `SUBSCRIPTION_CREATED`, `SUBSCRIPTION_RENEWED`:
  * **Se Recorrente:** Atualiza a tabela `profiles` configurando `plan_type = 'premium'`, `plan_expires_at = null` (ativação indeterminada) e grava o ID da assinatura em `subscription_id`.
  * **Se Avulso:** Calcula e grava `plan_expires_at` para **30 dias no futuro** e atualiza o `plan_type = 'premium'`.
* **Bloqueio/Cancelamento:** Ao receber os eventos `SUBSCRIPTION_DELETED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`:
  * Modifica o perfil do usuário para `plan_type = 'free'` e limpa `plan_expires_at`.

---

## 📅 3. Sincronização: Google Calendar

O RT Expert permite conectar a conta Google para adicionar agendamentos de vistorias diretamente na agenda pessoal do profissional.

### A. Fluxo de Autenticação OAuth 2.0
1. O usuário clica em "Conectar Google Agenda" na tela de Configurações (`/settings`).
2. É gerado um link de consentimento que aponta para o endpoint do Google Cloud do RT Expert, solicitando escopo do Google Calendar (`https://www.googleapis.com/auth/calendar.events`).
3. Ao autorizar, o Google redireciona de volta enviando o código temporário.
4. O servidor (`api/google-auth.js`) troca o código temporário por um `access_token` e um `refresh_token`.
5. Os tokens são salvos nas colunas `google_access_token`, `google_refresh_token` e `google_token_expiry` da tabela `profiles`.

### B. Sincronização de Visitas (`google-calendar.ts`)
* Quando o usuário cria ou reagenda uma visita, o script `syncToGoogleCalendar(visita)` é acionado.
* O script verifica as credenciais do Google do usuário:
  * Se o token estiver prestes a expirar (menos de 2 minutos restantes), faz uma chamada interna para a Vercel `/api/google-refresh` que utiliza o `google_refresh_token` para conseguir um novo token e atualiza a base.
* O evento é inserido na agenda primária do usuário com:
  * **Título (Summary):** `Inspeção Técnica: [Nome do Cliente]`.
  * **Descrição:** Notas digitadas pelo RT.
  * **Horário:** Início e fim (+1 hora de duração), respeitando o fuso horário `America/Sao_Paulo`.
  * **Lembretes:** E-mail com 24 horas de antecedência e notificação push com 1 hora de antecedência.

---

## 🌐 4. Rotas Serverless e Edge Functions

### Vercel Serverless Functions (`api/`)
* **`asaas.js`**: Criação de clientes e pagamentos (cartão/PIX) integrando com a API oficial do Asaas (Sandbox ou Produção dependendo de `NODE_ENV`).
* **`webhook-asaas.js`**: Callback de notificação de transações.
* **`google-auth.js`**: Manipulador do retorno do OAuth da Google.
* **`google-refresh.js`**: Renovador de tokens Google expirados.

### Supabase Edge Functions (`supabase/functions/`)
* **`delete-account`**: Processo em background acionado para exclusão definitiva de contas (LGPD), removendo todas as referências do usuário no banco e limpando as fotos físicas armazenadas no Storage.
* **`cleanup-orphan-photos`**: Rotina semanal que varre o Storage comparando os arquivos em `checklist_fotos` com o JSON de respostas da tabela `aplicacoes_checklist`. Fotos que foram carregadas no Storage mas não foram vinculadas a um checklist enviado há mais de 7 dias são excluídas para otimizar espaço.
