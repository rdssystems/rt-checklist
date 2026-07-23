# Planos, Limites e Assinaturas

Este documento descreve as regras de negócios que limitam o uso do aplicativo nos diferentes planos, a estrutura lógica de validação, o suporte a armazenamento em nuvem própria (BYOS - Google Drive) e o fluxo de upgrade de conta.

---

## 📊 Tabela de Planos e Limites

Os limites do sistema são definidos centralizadamente em `src/lib/plan-limits.ts`:

| Recurso | Plano Free | Plano Expert **DRIVE** | Plano Expert **CLOUD** | Plano **ENTERPRISE** |
| :--- | :--- | :--- | :--- | :--- |
| **Preço Mensal** | R$ 0 | **R$ 59,90 /mês** | **R$ 89,90 /mês** | **R$ 149,90 /mês** |
| **Provedor de Mídia** | Servidor RT Expert | **Google Drive do Cliente (BYOS)** | Servidor RT Expert | Servidor RT Expert |
| **Limite de Disco** | 100 MB | **Ilimitado (Drive Próprio)** | 15 GB inclusos | 50 GB inclusos |
| **Modelos de Checklist** | Máximo 2 | Ilimitado | Ilimitado | Ilimitado |
| **Clientes Cadastrados** | Máximo 10 | Ilimitado | Ilimitado | Ilimitado |
| **Checklists por Mês** | Máximo 5 | Ilimitado | Ilimitado | Ilimitado |
| **Fotos por Checklist** | Máximo 5 / vistoria | **Ilimitadas** | 15 / vistoria | **Ilimitadas** |
| **Dimensão da Imagem** | Max 800px (q0.6) | Max 1024px (q0.7) | Max 1024px (q0.7) | Max 1024px (q0.7) |
| **Busca Automática CNPJ** | ❌ | ✅ | ✅ | ✅ |
| **plan_tier no Banco** | `free` | `drive` | `cloud` | `enterprise` |

---

## ⚡ Regra de Validação de Premium Ativo

O status da assinatura do usuário é calculado em tempo de execução com base no registro do seu perfil. Um usuário possui o plano **Expert Ativo** se atender a qualquer uma das condições abaixo:

1. **Período de Testes (Trial):** A data atual é anterior à data de expiração do trial (`trial_ends_at > agora`).
2. **Assinatura Recorrente:** O nível do plano (`plan_tier` ou `plan_type`) está em `drive`, `cloud`, `enterprise` ou `premium`, e a assinatura recorrente está ativa (sem expiração configurada no campo `plan_expires_at`).
3. **Plano Avulso Ativo:** O plano pago possui expiração futura (`plan_expires_at > agora`).

---

## 📁 Armazenamento em Nuvem Própria (BYOS - Google Drive)

No plano **Expert DRIVE**, o RT Expert se conecta ao Google Drive do profissional usando a permissão OAuth segura `https://www.googleapis.com/auth/drive.file`:
* As fotos capturadas nas inspeções são enviadas para a pasta `RT-Expert / Inspeções / [Nome do Cliente]`.
* As fotos ficam sob controle permanente do usuário e não consomem espaço no servidor Supabase da plataforma.
* O custo de armazenamento de mídias para a plataforma cai para R$ 0,00.

---

## 💳 Fluxo de Checkout e Upgrade de Plano

O aplicativo oferece modalidades de upgrade de conta via tela `/upgrade`:

1. **Assinaturas Recorrentes (Mensais):** Cobrança contínua via Asaas (cartão de crédito/boleto/pix) nos valores R$ 59,90, R$ 89,90 ou R$ 149,90.
2. **Checkout Seguro via Asaas:** A rota `/api/asaas` gera o link de pagamento vinculando a chave `planTier`.
3. **Webhook de Confirmação:** Ao confirmar o pagamento em `/api/webhook-asaas`, as colunas `plan_tier`, `plan_type` e `storage_provider` são atualizadas no Supabase.
