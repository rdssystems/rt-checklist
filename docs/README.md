# RT Expert - Documentação do Projeto

Bem-vindo à documentação do **RT Expert** (RT-Checklist). Este repositório de documentação foi desenvolvido para orientar os agentes de Inteligência Artificial no entendimento do ecossistema do aplicativo, otimizando o consumo de contexto (tokens) e garantindo uma codificação precisa e segura.

## 🧭 Mapa da Documentação

A documentação está dividida nos seguintes arquivos organizados na pasta `docs/`:

1. **[Arquitetura e Stack](file:///c:/Users/Klisman%20rDs/Documents/RT-Checklist/docs/architecture.md)**
   * Stack tecnológica (React, Vite, TS, Supabase, Vercel).
   * Estrutura de diretórios e arquivos.
   * Fluxo de build e execução de rotas e serveless functions.
2. **[Banco de Dados e Armazenamento](file:///c:/Users/Klisman%20rDs/Documents/RT-Checklist/docs/database.md)**
   * Estrutura de tabelas (Profiles, Clientes, Modelos, Aplicações, Agendamentos).
   * Configuração de buckets do Supabase (Fotos de checklist privadas, Avatares, Logos).
   * Políticas de Segurança RLS (Row Level Security).
3. **[Funcionalidades do Produto](file:///c:/Users/Klisman%20rDs/Documents/RT-Checklist/docs/features.md)**
   * Dashboard inteligente e Agenda (Visitas / Visitas Feitas).
   * Fluxo de aplicação de vistorias passo a passo.
   * Geração avançada de laudos em PDF.
   * Módulo de captura de fotos com estabilidade mobile.
4. **[Planos, Limites e Assinaturas](file:///c:/Users/Klisman%20rDs/Documents/RT-Checklist/docs/plans_and_limits.md)**
   * Regra única de planos (`plan-limits.ts`).
   * Limites de recursos (Free vs Expert).
   * Trial de 7 dias e expirações.
5. **[APIs e Integrações](file:///c:/Users/Klisman%20rDs/Documents/RT-Checklist/docs/api_and_integrations.md)**
   * Integração de pagamentos com Asaas (recorrente e PIX 30 dias).
   * Sincronização automática com a API do Google Calendar.
   * Edge Functions do Supabase e rotas serveless na Vercel.
6. **[Diretrizes e Regras de Desenvolvimento](file:///c:/Users/Klisman%20rDs/Documents/RT-Checklist/docs/guidelines_and_rules.md)**
   * Convenções de código do projeto.
   * Normalização de textos com `text-utils.ts`.
   * Exibição segura de mídias com `SignedPhoto`.
   * Processo de migração do Supabase e checklist de produção.

---

## ⚡ Guia Rápido de Contexto

* **Domínio principal:** SaaS voltado para Responsáveis Técnicos (RTs) realizarem vistorias em campo, gerenciarem clientes no mapa e emitirem laudos profissionais em PDF.
* **Fórmula de Premium Ativo:** O usuário é premium se:
  $$\text{Premium Ativo} = (\text{plan\_type} \in \{\text{'premium'}, \text{'expert'}\} \land (\text{plan\_expires\_at} = \text{null} \lor \text{plan\_expires\_at} > \text{agora})) \lor \text{trial\_ends\_at} > \text{agora}$$
* **Bucket de fotos:** O bucket `checklist_fotos` é **privado** por segurança LGPD. Sempre renderizar fotos usando o wrapper `<SignedPhoto />` para obter URLs assinadas temporárias do Supabase Storage.
* **Banco Local vs Remoto:** O Supabase possui histórico remoto desvinculado de migrações locais. Se alterar o banco, altere o arquivo SQL local e repasse as queries no SQL Editor no Dashboard de produção do Supabase.
