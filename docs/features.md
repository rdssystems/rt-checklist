# Funcionalidades do Produto

Este documento detalha o funcionamento das principais telas e fluxos de negócio do **RT Expert**, servindo como manual de referência para o funcionamento do aplicativo no celular e no computador.

---

## 📊 1. Dashboard Inteligente e Agenda de Hoje

O painel inicial resume o panorama geral da empresa e traz a **Agenda de Hoje** integrada de forma proeminente.

* **Indicadores Rápidos (Cards):** Exibe a contagem em tempo real de clientes cadastrados, modelos criados, inspeções totais realizadas e visitas marcadas no mês corrente.
* **Seção Dinâmica "Agenda de Hoje":**
  * Só é exibida se o usuário tiver visitas no status **'pendente'** marcadas para o dia atual.
  * O card informa a contagem e exibe um grid com os detalhes de cada agendamento (nome do cliente, horário e breve anotação).
  * **Ação Rápida "Iniciar":** Cada compromisso do dia traz um botão que redireciona o usuário diretamente para a tela de vistoria, pré-selecionando o cliente correspondente via query string (`/aplicar-checklist?clienteId=ID_DO_CLIENTE`).
  * Botão de atalho para acessar a **Agenda Completa**.

---

## 📅 2. Agenda (Gestão de Compromissos)

Página de agendamentos (`/visitas`) estruturada com controle por calendário e lista mensal.

* **Ações Disponíveis:**
  * Adicionar novos agendamentos vinculados a clientes cadastrados, com data, horário e campo livre de anotações.
  * **Iniciar Visita:** Substitui o antigo botão "Concluir". Ao clicar em "Iniciar", o usuário é redirecionado para a tela de aplicação com o cliente já configurado no formulário.
  * **Cancelar Visita:** Atualiza o status do agendamento para `'cancelado'` de forma definitiva no banco de dados e dispara notificações visuais.
* **Sincronização com o Google Calendar:** Cada compromisso criado ou modificado atualiza a agenda pessoal do RT no Google Calendar, caso a integração esteja configurada.

---

## 🗺️ 3. CRM de Clientes e Mapa de Clientes

Tela de cadastro completo de clientes (`/clientes`) e visualização geoespacial (`/mapa-clientes`).

* **Busca por CNPJ:** Consulta de CNPJ integrada com a API do BrasilAPI (exclusiva para usuários do plano Premium/Expert ativo), trazendo razão social, nome fantasia, endereço, e-mail e telefone de forma automática.
* **Busca por CEP:** A partir de 8 dígitos, faz uma busca no ViaCEP e autopreenche o endereço do cliente.
* **Atualização de Coordenadas:**
  * O app geocodifica os clientes usando a API pública do Nominatim (OpenStreetMap) a partir do endereço completo.
  * O botão "Atualizar Coordenadas" na barra de ações calcula as posições X/Y de todos os clientes sem coordenadas salvas no banco.
  * **Sinalização Visual (Bolinhas):** A lista de clientes traz uma bolinha verde para indicar que o cliente já possui coordenadas configuradas e aparece no mapa. A bolinha fica vermelha caso não possua, com um aviso sutil instruindo a editar e adicionar as coordenadas manualmente se a busca automática falhar.
* **Visualização no Mapa:** Mapa interativo baseado em Leaflet mostrando alfinetes (markers) de todos os clientes cadastrados para otimizar rotas físicas.

---

## 📝 4. Criador de Checklists (Checklist Designer)

Interface visual de arrastar e configurar (`/checklist-designer`) para montar os templates de vistorias de forma modular.

* **Tipos de Campos Suportados:**
  * **Título** e **Descrição** (elementos estruturais/explicativos).
  * **Sim / Não / N.A.** (com opção de forçar campo de observação se marcado "Não" ou "N.A.").
  * **Campo de Foto** (suporta múltiplas imagens anexadas e compressão).
  * **Múltipla Escolha** (com opções configuráveis).
  * **Observação/Texto Livre**.
  * **Data** e **Outros**.
* **Propriedades:** Permite marcar campos como obrigatórios e reordená-los facilmente antes de salvar o modelo.

---

## 🚀 5. Aplicação de Vistorias (Aplicar Checklist)

A tela central de preenchimento de checklists em campo (`/aplicar-checklist`) foi otimizada para operação ágil e resiliente no celular.

* **Modo "Google Forms" Passo a Passo:** Divide as seções do checklist em telas individuais. O usuário avança ou retorna pelas seções utilizando botões dedicados de Navegação.
* **Persistência de Progresso Resiliente:**
  * Grava o estado atual (cliente, modelo selecionado, respostas digitadas e índice da seção) no `localStorage` do navegador em tempo real.
  * Em celulares, se a página sofrer recarregamento acidental (muito comum ao acionar a câmera nativa do sistema em aparelhos com pouca memória RAM), o formulário restabelece os dados digitados imediatamente ao carregar.
* **Layout Horizontal Expandido:** Ocupa toda a extensão horizontal da tela do celular para evitar campos comprimidos, proporcionando botões grandes e de fácil clique.
* **Assinaturas Coletadas na Tela:** O usuário e os representantes assinam o checklist diretamente na tela do tablet/celular por meio de um painel de toque suave (`SignatureCanvas.tsx`).
* **Finalização:** Salva a vistoria concluída na tabela `aplicacoes_checklist` e apaga o cache do `localStorage` para permitir novas vistorias.

---

## 📷 6. Estabilidade de Captura de Fotos

O sistema de fotografia foi remodelado para garantir funcionamento estável em todos os dispositivos móveis.

* **Remoção do WebRTC Camera:** A visualização interna por câmera HTML5/WebRTC foi eliminada, pois apresentava bugs de tela preta e falhas de memória em celulares antigos.
* **Câmera Nativa do Sistema:** O input agora dispara diretamente o app de câmera do aparelho celular (`accept="image/*" capture="environment"`). A foto é carregada diretamente nos anexos após a captura sem telas adicionais.
* **Múltiplos Anexos:** Permite selecionar mais de uma foto da galeria ou tirar múltiplas fotos sequencialmente para um mesmo item do checklist.
* **Compressão em Background:** Para não estourar o limite de tráfego de rede e o plano do usuário, as fotos passam por compressão local (`image-utils.ts`) antes de serem transmitidas para o Supabase Storage.
  * Usuários Free: Max width 800px, qualidade 60%.
  * Usuários Premium: Max width 1024px, qualidade 70%.

---

## 📄 7. Emissão de Relatório / Laudo PDF

O sistema conta com um gerador profissional de laudos PDF (`pdf-generator.ts` e `ChecklistsProntos.tsx`) que roda inteiramente no navegador via `jsPDF`.

* **Cabeçalho Branded:** Carrega a logo do RT (se configurada) e alinha o nome da empresa e a data do lado direito, juntamente com o **CPF/CNPJ do RT** formatado.
* **Quadro do Estabelecimento:** Exibe a razão social do cliente, CNPJ formatado, endereço detalhado e nome do responsável legal.
* **Layout em Tabela Limpa:** Desenha uma tabela compacta dividida por colunas: Item, Pergunta e Resposta. As seções são marcadas por faixas de cabeçalho coloridas e descrições destacadas em itálico.
* **Anexo Fotográfico:** Imprime um painel ao final do PDF organizando todas as fotos anexadas em um grid limpo (4 colunas) com numeração correspondente.
* **Parecer Técnico e Assinaturas:** Espaço dedicado para o parecer conclusivo do profissional e blocos de assinatura digital (RT, Cliente e Testemunha) organizados horizontalmente na margem inferior da última página.
* **Rodapé com Numeração:** Marcação automática de páginas ("Página X de Y") com selo de controle técnico.
