# Banco de Dados e Armazenamento

Este documento apresenta a estrutura física de dados do **RT Expert**, detalhando as tabelas do Supabase (PostgreSQL), políticas de Row Level Security (RLS) e o comportamento dos Buckets de Armazenamento e integrações com o Google Drive.

---

## 🗄️ Tabelas do Banco de Dados

Todas as tabelas contêm a coluna `tenant_id` vinculada à tabela `profiles.id` (que por sua vez referencia `auth.users.id`). Isso garante o isolamento multi-tenant de cada Responsável Técnico (RT).

### 1. `profiles`
Armazena as configurações da conta do RT, dados da empresa, logotipo, plano e integração com o Google Drive.
* **id** (`uuid`, PK): Identificador do usuário (`auth.users.id`).
* **nome_rt** (`text`): Nome completo do Responsável Técnico.
* **email** (`text`, Unique): E-mail da conta.
* **company_name** (`text`): Razão social ou nome fantasia da empresa do RT.
* **logo_url** (`text`): URL do logotipo da empresa do RT.
* **avatar_url** (`text`): URL da foto de perfil do RT.
* **plan_type** (`text`, default `'free'`): Tipo do plano (`free`, `premium`, `expert`).
* **plan_tier** (`text`, default `'free'`): Nível específico do plano (`'free'`, `'drive'`, `'cloud'`, `'enterprise'`).
* **storage_provider** (`text`, default `'supabase'`): Provedor de mídia (`'supabase'` ou `'google_drive'`).
* **google_drive_folder_id** (`text`): ID da pasta raiz `RT-Expert` criada no Google Drive do usuário.
* **storage_used_bytes** (`bigint`, default `0`): Total de armazenamento consumido no servidor em bytes.
* **trial_ends_at** (`timestamptz`): Encerramento do trial de 7 dias.
* **subscription_id** (`text`): ID da assinatura no Asaas.
* **plan_expires_at** (`timestamptz`): Data de expiração de assinaturas avulsas.
* **cpf_cnpj** (`text`): CPF ou CNPJ do RT para faturamento.
* **created_at** (`timestamptz`).

### 2. `clientes`
Armazena os estabelecimentos comerciais atendidos pelo RT.
* **id** (`uuid`, PK)
* **tenant_id** (`uuid`, FK -> `profiles.id`)
* **razao_social** (`text`), **nome_fantasia** (`text`), **cnpj** (`text`), **cep** (`text`), **rua** (`text`), **numero** (`text`), **bairro** (`text`), **cidade** (`text`), **estado** (`text`), **telefone** (`text`), **email_cliente** (`text`), **responsavel_legal** (`text`), **cpf_responsavel** (`text`)
* **latitude** (`numeric`), **longitude** (`numeric`)
* **data_cadastro** (`timestamptz`)

### 3. `modelos_checklist`
Armazena a estrutura dos formulários (templates).
* **id** (`uuid`, PK)
* **tenant_id** (`uuid`, FK -> `profiles.id`)
* **nome_modelo** (`text`)
* **estrutura_json** (`jsonb`): Schema contendo seções e perguntas do checklist.

### 4. `aplicacoes_checklist`
Armazena as vistorias concluídas em campo.
* **id** (`uuid`, PK)
* **tenant_id** (`uuid`, FK -> `profiles.id`), **cliente_id** (`uuid`, FK -> `clientes.id`), **modelo_id** (`uuid`, FK -> `modelos_checklist.id`)
* **data_aplicacao** (`timestamptz`)
* **respostas_json** (`jsonb`): Dicionário de respostas e links/IDs das fotos (do Supabase Storage ou Google Drive).
* **assinatura_rt** (`text`), **assinatura_cliente** (`text`), **assinatura_testemunha** (`text`), **nome_cliente_assinatura** (`text`), **nome_testemunha_assinatura** (`text`), **parecer_conclusivo** (`text`), **data_proxima_inspecao** (`date`), **responsavel_inspecao** (`text`).

### 5. `agendamentos`
Guarda as visitas futuras agendadas.
* **id** (`uuid`, PK), **tenant_id** (`uuid`), **cliente_id** (`uuid`), **data_visita** (`timestamptz`), **status** (`text`), **descricao** (`text`).

---

## 🔒 Armazenamento & Mídia (Hybrid Storage)

O RT Expert possui um modelo híbrido de fotos de vistorias:

1. **Bucket `checklist_fotos` (Supabase Storage - Privado):** Utilizado nos planos Free, Expert Cloud e Enterprise. Acesso restrito a arquivos da pasta do próprio usuário (`{auth.uid()}/...`).
2. **Google Drive Integration (BYOS):** Utilizado no plano **Expert DRIVE**. As fotos sobem para o Google Drive do usuário dentro do diretório `RT-Expert / Inspeções / [Cliente]`. Os links de visualização são renderizados no aplicativo e nos laudos PDF.
