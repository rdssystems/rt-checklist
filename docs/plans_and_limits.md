# Planos, Limites e Assinaturas

Este documento descreve as regras de negócios que limitam o uso do aplicativo nos diferentes planos, a estrutura lógica de validação e o fluxo de upgrade de conta.

---

## 📊 Tabela de Planos e Limites

Os limites do sistema são definidos centralizadamente em `src/lib/plan-limits.ts`:

| Recurso | Plano Free | Plano Expert (Premium) |
| :--- | :--- | :--- |
| **Modelos de Checklist** | Máximo 2 | Ilimitado |
| **Clientes Cadastrados** | Máximo 10 | Ilimitado |
| **Checklists por Mês** | Máximo 5 | Ilimitado |
| **Fotos por Checklist** | Máximo 5 por vistoria | Máximo 10 por vistoria |
| **Dimensão de Imagem** | Redimensionada para no máximo 800px | Redimensionada para no máximo 1024px |
| **Qualidade da Imagem** | Comprimida a 60% (q0.6) | Comprimida a 70% (q0.7) |
| **Busca Automática CNPJ** | Indisponível | Habilitada (via BrasilAPI) |
| **Nome Comercial** | Free | Expert |
| **plan_type no banco** | `free` | `premium` ou `expert` |

---

## ⚡ Regra de Validação de Premium Ativo

O status da assinatura do usuário é calculado em tempo de execução com base no registro do seu perfil. Um usuário possui o plano **Expert (Premium) Ativo** se atender a qualquer uma das condições abaixo:

1. **Período de Testes (Trial):** A data atual é anterior à data de expiração do trial (`trial_ends_at > agora`).
2. **Assinatura Recorrente:** O tipo do plano é `premium` ou `expert` e a assinatura recorrente está ativa (sem expiração configurada no campo `plan_expires_at`).
3. **Plano Avulso Ativo:** O tipo do plano é `premium` ou `expert` e a expiração do plano avulso (geralmente PIX de 30 dias) é futura (`plan_expires_at > agora`).

### Implementação da Fórmula (`plan-limits.ts`)

```typescript
const isPaidType = profile.plan_type === "premium" || profile.plan_type === "expert";
const planExpires = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
const paidActive = isPaidType && (!planExpires || planExpires > now);

const isPremium = paidActive || trialActive;
```

---

## 📝 Verificação de Limites antes de Inserções

Antes de permitir que o usuário crie registros, o frontend executa verificações assíncronas consultando as funções auxiliares em `plan-limits.ts`:

### 1. Limite de Modelos de Checklist
* **Função:** `checkModelosLimit()`
* **Regra:** Se o usuário for Free, conta quantos registros ele tem na tabela `modelos_checklist`. Se o total for maior ou igual a **2**, bloqueia a criação de novos templates.

### 2. Limite de Clientes
* **Função:** `checkClientesLimit()`
* **Regra:** Se o usuário for Free, conta quantos registros ele tem na tabela `clientes`. Se o total for maior ou igual a **10**, bloqueia o botão de cadastro de novos clientes.

### 3. Limite de Vistorias Mensais
* **Função:** `checkChecklistLimit()`
* **Regra:** Se o usuário for Free, conta as vistorias concluídas dentro do mês atual (calculado usando `startOfMonth` e `endOfMonth` do `date-fns`). Se o total for maior ou igual a **5**, bloqueia o envio de novas inspeções.

---

## 💳 Fluxo de Checkout e Upgrade de Plano

O aplicativo oferece duas modalidades de upgrade de conta via tela `/upgrade`:

1. **Assinatura Mensal Recorrente (R$ 80,00/mês):** Cobrança contínua no cartão de crédito/boleto via Asaas.
2. **Acesso Avulso de 30 dias (R$ 99,90 pago uma vez):** Liberação de 30 dias via PIX.

### Etapas do Fluxo de Checkout:
1. **Validação de Cadastro:** O sistema verifica se o usuário possui a coluna `cpf_cnpj` preenchida no seu perfil.
2. **Preenchimento de Documento:** Caso não possua, abre-se um modal solicitando o CPF ou CNPJ. O valor é validado e gravado no banco de dados.
3. **Redirecionamento para o Gateway:** O frontend faz um POST para `/api/asaas` enviando o tipo do plano (`RECURRING` ou `SINGLE`), identificadores e documentos do usuário.
4. **Criação da Transação:** A rota serveless na Vercel comunica-se com a API do Asaas e gera a transação de pagamento.
5. **Direcionamento:** O Asaas retorna a URL da tela de checkout seguro e o frontend redireciona o usuário para a página de pagamento externa.
6. **Confirmação por Webhook:** O Asaas avisa o webhook `/api/webhook-asaas` quando o pagamento for compensado. O webhook atualiza as colunas `plan_type` e `plan_expires_at` do usuário no Supabase.
