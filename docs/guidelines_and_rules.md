# Diretrizes e Regras de Desenvolvimento

Este documento descreve as regras de codificação, boas práticas e convenções estabelecidas no desenvolvimento do **RT Expert**, essenciais para manter o código limpo, consistente e livre de falhas de segurança ou desempenho.

---

## 🔒 1. Segurança e Privacidade das Imagens (LGPD)

O bucket `checklist_fotos` do Supabase Storage é **privado**. O banco de dados armazena caminhos relativos ou URLs públicas legadas, mas elas não podem ser acessadas diretamente no navegador (isso resultaria em erro 403/Acesso Negado).

### Diretrizes de Implementação:
* **Nunca** utilize a tag `<img>` comum diretamente com as URLs brutas salvas no banco.
* **Sempre** utilize o componente wrapper `<SignedPhoto />` (`src/components/SignedPhoto.tsx`) para carregar fotos de checklist:
  ```tsx
  import SignedPhoto from "@/components/SignedPhoto";

  // Uso básico
  <SignedPhoto stored={urlSalvaNoBanco} className="w-20 h-20 rounded-md" />

  // Uso com link para ampliar a foto em nova aba
  <SignedPhoto stored={urlSalvaNoBanco} openOnClick className="w-full h-auto" />
  ```
* Se precisar assinar um array de URLs diretamente em funções (por exemplo, na geração do PDF ou relatórios customizados), utilize os helpers do `src/lib/photo-utils.ts`:
  ```typescript
  import { getSignedPhotoUrl, signPhotoUrls } from "@/lib/photo-utils";

  const urlAssinada = await getSignedPhotoUrl(urlOriginal);
  const urlsAssinadas = await signPhotoUrls(listaDeUrlsOriginais);
  ```

---

## 🔠 2. Normalização de Textos (Clean Input)

Para manter a integridade visual da plataforma e evitar cadastros bagunçados (por exemplo, usuários digitando tudo em CAIXA ALTA), todos os cadastros importantes devem ser sanitizados antes de serem gravados.

### Padrões do `src/lib/text-utils.ts`:
1. **Title Case (`toTitleCase`):**
   * Usado para nomes próprios, nomes fantasia, razões sociais, nomes de ruas e bairros.
   * Transforma a primeira letra de cada palavra em maiúscula, mantendo conectivos comuns da língua portuguesa (`de`, `da`, `do`, `dos`, `e`, `em`, etc.) em minúsculo.
   * Exemplo: `"SUPERMERCADO SILVA E FILHOS LTDA"` ➔ `"Supermercado Silva e Filhos Ltda"`.
2. **Sentence Case (`toSentenceCase`):**
   * Usado para perguntas de checklists, observações, pareceres conclusivos e descrições gerais.
   * Deixa apenas a primeira letra da frase em maiúscula. Se o texto original estiver inteiramente em caixa alta, converte o restante para minúsculo. Se misturado, preserva o conteúdo original.
   * Exemplo: `"O ESTABELECIMENTO ESTÁ LIMPO?"` ➔ `"O estabelecimento está limpo?"`.

---

## ⚠️ 3. Diálogos de Confirmação Segura

Para garantir uma interface premium e evitar o comportamento intrusivo das janelas nativas do navegador:

* **Regra:** **Nunca** utilize o método nativo `confirm()` (ex: `if (confirm("Excluir?"))`) para ações destrutivas (exclusão de clientes, checklists ou logout).
* **Solução:** Utilize o componente `<ConfirmDialog />` (`src/components/ConfirmDialog.tsx`), que herda os comportamentos acessíveis do shadcn/ui AlertDialog. Ele já está estilizado de forma responsiva para desktop e mobile.

---

## 🔧 4. Sistema de Banco de Dados e Migrações

O RT Expert opera com Supabase local e produção, mas os históricos não são automaticamente sincronizados.

### Fluxo Obrigatório de Banco de Dados:
1. Ao adicionar tabelas, triggers ou novas colunas, crie o script SQL correspondente dentro do diretório `/supabase/migrations/` com a nomenclatura padrão do projeto (ex: `YYYYMMDDHHMMSS_descricao_da_migracao.sql`).
2. Como o histórico remoto não é sincronizado automaticamente pelas ferramentas locais, você deve **copiar o conteúdo do arquivo SQL recém-criado e rodá-lo diretamente no SQL Editor do Dashboard de produção** do Supabase.
3. Certifique-se de definir políticas de Row Level Security (RLS) para qualquer tabela nova:
   ```sql
   ALTER TABLE public.minha_tabela ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users can view own data" ON public.minha_tabela FOR SELECT USING (auth.uid() = tenant_id);
   ```

---

## 📱 5. Design Responsivo e Mobile-First

O aplicativo é utilizado majoritariamente em campo por celulares.
* **Componentes UI:** Certifique-se de testar qualquer mudança no layout mobile (breakpoints do Tailwind `sm` e `md`).
* **Inputs de Fotos:** Devem usar `<input type="file" accept="image/*" capture="environment" />` para forçar o acionamento direto da câmera do smartphone, sem popups WebRTC internos.
* **Assinaturas:** O canvas de assinatura deve ser ajustado dinamicamente para largura total do dispositivo, impedindo transbordamentos.
