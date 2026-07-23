# Banco de Dados e Armazenamento

Este documento apresenta a estrutura física de dados do **RT Expert**, detalhando as tabelas do Supabase (PostgreSQL), políticas de Row Level Security (RLS) e o comportamento dos Buckets de Armazenamento.

---

## 🗄️ Tabelas do Banco de Dados

Todas as tabelas contêm a coluna `tenant_id` vinculada à tabela `profiles.id` (que por sua vez referencia `auth.users.id`). Isso garante que cada Responsável Técnico (RT) acesse de maneira isolada seus clientes, modelos de checklist, aplicações e visitas.

### 1. `profiles`
Armazena as configurações da conta do Responsável Técnico (RT), dados da empresa, logotipo e status da assinatura.
* **id** (`uuid`, PK): Identificador do usuário (estrangeira de `auth.users.id`).
* **nome_rt** (`text`): Nome completo do Responsável Técnico.
* **email** (`text`, Unique): E-mail da conta.
* **company_name** (`text`): Razão social ou nome fantasia da empresa do RT.
* **logo_url** (`text`): URL do logotipo da empresa do RT.
* **avatar_url** (`text`): URL da foto de perfil do RT.
* **plan_type** (`text`, default `'free'`): Tipo do plano do usuário (`free`, `premium`, `expert`).
* **trial_ends_at** (`timestamptz`): Encerramento do trial de 7 dias concedido na criação da conta.
* **subscription_id** (`text`): ID da assinatura recorrente criada no Asaas.
* **plan_expires_at** (`timestamptz`): Data de expiração de assinaturas avulsas (ex: PIX 30 dias).
* **cpf_cnpj** (`text`): CPF ou CNPJ do RT para fins de faturamento e notas fiscais.
* **created_at** (`timestamptz`): Carimbo de data/hora de criação do perfil.

### 2. `clientes`
Armazena as empresas ou estabelecimentos comerciais atendidos pelo RT.
* **id** (`uuid`, PK): Identificador único do cliente.
* **tenant_id** (`uuid`, FK -> `profiles.id`): Dono do registro.
* **razao_social** (`text`): Razão social do cliente.
* **nome_fantasia** (`text`): Nome comercial do cliente.
* **cnpj** (`text`): CNPJ da empresa cliente.
* **cep** (`text`): CEP do local.
* **rua** (`text`): Nome da rua/avenida.
* **numero** (`text`): Número ou "S/N".
* **bairro** (`text`): Bairro.
* **cidade** (`text`): Município.
* **estado** (`text`): Unidade federativa.
* **telefone** (`text`): Telefone de contato.
* **email_cliente** (`text`): E-mail do cliente.
* **responsavel_legal** (`text`): Nome do dono ou gerente.
* **cpf_responsavel** (`text`): CPF do responsável legal.
* **latitude** (`numeric`): Coordenada decimal Y (ex: `-18.9188`).
* **longitude** (`numeric`): Coordenada decimal X (ex: `-48.2766`).
* **data_cadastro** (`timestamptz`): Carimbo de data/hora do cadastro.
* **Restrição única:** `UNIQUE(tenant_id, cnpj)` e `UNIQUE(tenant_id, razao_social)`. Um mesmo RT não pode duplicar CNPJ ou Razão Social.

### 3. `modelos_checklist`
Armazena a estrutura de perguntas do checklist (modelos que viram templates para vistorias).
* **id** (`uuid`, PK): Identificador único do modelo.
* **tenant_id** (`uuid`, FK -> `profiles.id`): Criador do modelo.
* **nome_modelo** (`text`): Nome identificador do checklist.
* **estrutura_json** (`jsonb`): Contém as seções e perguntas do checklist.
  * O schema padrão do JSON é: `{"secoes": [{"id": "...", "titulo": "...", "campos": [{"id": "...", "tipo": "sim_nao_na", "label": "...", "opcoes": [], "obrigatorio": true}]}]}`.
* **created_at** (`timestamptz`)
* **updated_at** (`timestamptz`): Modificado por meio do trigger `update_modelos_checklist_updated_at`.

### 4. `aplicacoes_checklist`
Armazena as vistorias concluídas no campo de trabalho.
* **id** (`uuid`, PK): Identificador único da vistoria realizada.
* **tenant_id** (`uuid`, FK -> `profiles.id`): RT executor.
* **cliente_id** (`uuid`, FK -> `clientes.id`): Estabelecimento inspecionado.
* **modelo_id** (`uuid`, FK -> `modelos_checklist.id`): Template utilizado.
* **data_aplicacao** (`timestamptz`): Momento em que a vistoria foi concluída.
* **respostas_json** (`jsonb`): Dicionário de respostas mapeado por ID do campo do checklist (ex: `{"campo_id": "sim", "foto_campo_id": ["https://...", "https://..."]}`).
* **assinatura_rt** (`text`): SVG/base64 da assinatura do RT.
* **assinatura_cliente** (`text`): SVG/base64 da assinatura do cliente.
* **assinatura_testemunha** (`text`): SVG/base64 da assinatura da testemunha (opcional).
* **nome_cliente_assinatura** (`text`): Nome de quem assinou pelo estabelecimento.
* **nome_testemunha_assinatura** (`text`): Nome da testemunha.
* **parecer_conclusivo** (`text`): Considerações finais do laudo.
* **data_proxima_inspecao** (`date`): Data recomendada da próxima visita.
* **responsavel_inspecao** (`text`): Nome do inspetor (RT).
* **created_at** (`timestamptz`).

### 5. `agendamentos`
Guarda as visitas e inspeções futuras marcadas no calendário.
* **id** (`uuid`, PK): Identificador único da visita.
* **tenant_id** (`uuid`, FK -> `profiles.id`): RT responsável pela visita.
* **cliente_id** (`uuid`, FK -> `clientes.id`): Cliente a ser visitado.
* **data_visita** (`timestamptz`): Data e hora programadas.
* **status** (`text`, default `'pendente'`): Pode ser `'pendente'`, `'concluido'`, ou `'cancelado'`.
* **descricao** (`text`): Anotações ou objetivos da inspeção.
* **created_at** (`timestamptz`).

---

## 🔒 Políticas RLS (Row Level Security)

Todas as tabelas listadas acima possuem RLS habilitado e aplicam o isolamento por locatário (multi-tenant) baseado no identificador do usuário logado:

* **Tabelas gerais:** `aplicacoes_checklist`, `clientes`, `modelos_checklist`, `agendamentos`
  * **SELECT / INSERT / UPDATE / DELETE:** Permite ler, inserir, atualizar e apagar apenas se o `tenant_id` for igual ao `auth.uid()` do usuário autenticado no Supabase.
* **Tabela `profiles`:**
  * **SELECT / INSERT / UPDATE:** Permite operações apenas se a coluna `id` for igual ao `auth.uid()`.

---

## 📦 Armazenamento (Supabase Storage Buckets)

O sistema gerencia o upload de mídias usando 3 Buckets de Armazenamento:

### 1. `checklist_fotos` (Bucket PRIVADO)
* **Objetivo:** Fotos capturadas durante as inspeções no campo de trabalho.
* **Segurança (LGPD):** Acesso estrito por diretório com o ID do usuário:
  * Caminho de upload: `{auth.uid()}/{uuid-da-foto}.jpg`.
  * **Políticas RLS do Storage:** Leitura, escrita, atualização e deleção permitidas somente se o primeiro segmento do caminho da foto (`storage.foldername(name)[1]`) for idêntico ao `auth.uid()::text`.
  * **Exibição:** O arquivo original **não é público**. O frontend solicita uma URL assinada por meio da Edge Function ou SDK do Supabase com tempo de expiração curto para renderizar a imagem no client.

### 2. `logos` (Bucket PÚBLICO)
* **Objetivo:** Logotipos das empresas dos RTs utilizados nos laudos em PDF e no cabeçalho do app.
* **Acesso:** Leitura pública permitida para qualquer usuário. Upload limitado ao diretório correspondente ao ID do RT (`logos/{auth.uid()}.png`).

### 3. `avatars` (Bucket PÚBLICO)
* **Objetivo:** Foto de perfil do Responsável Técnico.
* **Acesso:** Leitura pública geral. Escrita limitada ao arquivo correspondente ao ID do usuário (`avatars/{auth.uid()}.jpg`).

---

## ⚡ Triggers e Funções do Banco de Dados

* **`handle_new_user()`:**
  * Executado quando um novo registro é adicionado na tabela interna de autenticação `auth.users`.
  * Cria automaticamente uma linha na tabela `public.profiles`.
  * **Regra de Negócio Importante:** Define por padrão o plano como `'free'` e calcula o `trial_ends_at` adicionando um intervalo de **7 dias** (`now() + interval '7 days'`).
* **`update_updated_at_column()`:**
  * Atualiza automaticamente a coluna `updated_at` de tabelas modificadas para o instante atual (`NOW()`).
