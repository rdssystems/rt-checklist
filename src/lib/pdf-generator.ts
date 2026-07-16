import jsPDF from "jspdf";
import { Cliente, CampoChecklist } from "@/types";
import { signPhotoUrls } from "@/lib/photo-utils";

export interface PDFGeneratorOptions {
  logoUrl?: string;
  companyName?: string;
  rtCpfCnpj?: string;
  nomeRT?: string;
  dataAplicacao?: string;
  modeloNome?: string;
  secoes?: { id: string; titulo?: string; campos?: CampoChecklist[] }[];
  respostas: Record<string, unknown>;
  parecerConclusivo?: string | null;
  dataProximaInspecao?: string | null;
  responsavelInspecao?: string | null;
  assinaturaRT?: string | null;
  assinaturaCliente?: string | null;
  assinaturaTestemunha?: string | null;
  nomeClienteAssinatura?: string | null;
  nomeTestemunhaAssinatura?: string | null;
  cliente?: Partial<Cliente> & { razao_social: string; cnpj: string };
}

const BRAND_BLUE: [number, number, number] = [37, 99, 235];

/** Carrega uma imagem e normaliza via canvas (resolve formato e fornece dimensões reais). */
const loadImageData = async (
  url: string,
  format: "image/png" | "image/jpeg" = "image/jpeg"
): Promise<{ dataUrl: string; w: number; h: number } | null> => {
  try {
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL(format, 0.85), w: img.naturalWidth, h: img.naturalHeight };
  } catch {
    return null;
  }
};

export async function gerarPDFInspecao(options: PDFGeneratorOptions) {
  const {
    logoUrl,
    companyName,
    rtCpfCnpj,
    nomeRT,
    dataAplicacao,
    modeloNome,
    secoes = [],
    respostas,
    parecerConclusivo,
    dataProximaInspecao,
    responsavelInspecao,
    assinaturaRT,
    assinaturaCliente,
    assinaturaTestemunha,
    nomeClienteAssinatura,
    nomeTestemunhaAssinatura,
    cliente,
  } = options;

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  const footerReserve = 22; // espaço reservado ao rodapé em todas as páginas
  const contentBottom = pageHeight - footerReserve;
  let yPos = margin;

  // ---------- Helpers de paginação ----------

  /** Nova página com cabeçalho compacto (modelo à esquerda, cliente à direita). */
  const newPage = () => {
    pdf.addPage();
    pdf.setFillColor(...BRAND_BLUE);
    pdf.rect(0, 0, pageWidth, 2, "F");
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(130, 130, 130);
    pdf.text(modeloNome || "Relatório de Inspeção", margin, margin - 4);
    if (cliente?.razao_social) {
      pdf.text(cliente.razao_social, pageWidth - margin, margin - 4, { align: "right" });
    }
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.1);
    pdf.line(margin, margin - 2, pageWidth - margin, margin - 2);
    pdf.setTextColor(0, 0, 0);
    yPos = margin + 3;
  };

  /** Garante espaço para um bloco de `height` mm; quebra a página se necessário. */
  const ensureSpace = (height: number): boolean => {
    if (yPos + height > contentBottom) {
      newPage();
      return true;
    }
    return false;
  };

  // ---------- Cabeçalho da primeira página ----------

  pdf.setFillColor(...BRAND_BLUE);
  pdf.rect(0, 0, pageWidth, 3, "F");

  let logoWidth = 30;
  let logoHeight = 15;
  let logoData: { dataUrl: string; w: number; h: number } | null = null;
  if (logoUrl) {
    logoData = await loadImageData(logoUrl, "image/png");
    if (logoData) {
      const ratio = logoData.w / logoData.h;
      logoHeight = 15;
      logoWidth = 15 * ratio;
      if (logoWidth > 40) {
        logoWidth = 40;
        logoHeight = 40 / ratio;
      }
      try {
        pdf.addImage(logoData.dataUrl, "PNG", margin, yPos, logoWidth, logoHeight);
      } catch (e) {
        console.error("Error adding logo:", e);
      }
    }
  }

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  if (companyName) {
    pdf.text(companyName, pageWidth - margin, yPos, { align: "right" });
  }

  if (rtCpfCnpj) {
    const formatted = rtCpfCnpj.replace(/\D/g, "").length > 11
      ? rtCpfCnpj.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
      : rtCpfCnpj.replace(/\D/g, "").replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    pdf.setFontSize(8);
    pdf.text(formatted.trim(), pageWidth - margin, yPos + 4, { align: "right" });
    pdf.setFontSize(9);
  }

  const dateStr = dataAplicacao || new Date().toLocaleDateString("pt-BR");
  pdf.text(dateStr, pageWidth - margin, yPos + (rtCpfCnpj ? 8 : 5), { align: "right" });

  yPos += Math.max(12, logoHeight + 3);

  pdf.setFontSize(20);
  pdf.setFont("helvetica", "bold");
  pdf.text("Relatório de Inspeção", pageWidth / 2, yPos, { align: "center" });
  yPos += 8;

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(modeloNome || "", pageWidth / 2, yPos, { align: "center" });
  pdf.setTextColor(0, 0, 0);
  yPos += 8;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // ---------- Box do cliente ----------

  if (cliente) {
    pdf.setFillColor(245, 247, 250);
    const hasResponsavel = cliente.responsavel_legal;
    const boxHeight = hasResponsavel ? 24 : 18;
    pdf.rect(margin, yPos, contentWidth, boxHeight, "F");

    yPos += 5;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Razão Social:", margin + 3, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(cliente.razao_social, margin + 35, yPos);
    yPos += 5;

    pdf.setFont("helvetica", "bold");
    pdf.text("CNPJ:", margin + 3, yPos);
    pdf.setFont("helvetica", "normal");
    const formattedCNPJ = (cliente.cnpj || "").replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    pdf.text(formattedCNPJ, margin + 35, yPos);
    yPos += 5;

    const endereco = [cliente.rua, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(", ");
    if (endereco) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Endereço:", margin + 3, yPos);
      pdf.setFont("helvetica", "normal");
      const enderecoLines = pdf.splitTextToSize(endereco, contentWidth - 38);
      pdf.text(enderecoLines, margin + 35, yPos);
      yPos += 5 * enderecoLines.length;
    }

    if (hasResponsavel) {
      pdf.setFont("helvetica", "bold");
      pdf.text("Responsável Legal:", margin + 3, yPos);
      pdf.setFont("helvetica", "normal");
      pdf.text(cliente.responsavel_legal!, margin + 48, yPos);
      yPos += 4;
    }

    yPos += 6;
  }

  // ---------- Tabela de itens ----------

  const campos = secoes.flatMap((secao) => {
    const result: Array<{ tipo: string; label: string; id: string }> = [];
    if (secao.titulo) {
      result.push({ tipo: "titulo", label: secao.titulo, id: `sec-${secao.id}` });
    }
    return result.concat((secao.campos || []).map((c) => ({ ...c, tipo: c.tipo })));
  });

  const col1W = 12;
  const col2W = 100;
  const col3W = contentWidth - 112;

  const drawTableHeader = () => {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setFillColor(230, 234, 240);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    pdf.rect(margin, yPos, contentWidth, 8, "FD");
    pdf.text("ITEM", margin + 2, yPos + 5);
    pdf.text("PERGUNTA", margin + 14, yPos + 5);
    pdf.text("RESPOSTA", margin + 114, yPos + 5);
    yPos += 8;
  };

  let itemNumber = 1;
  let rowIndex = 0;
  let headerDrawnForSection = false;

  campos.forEach((campo) => {
    if (campo.tipo === "titulo") {
      // Título de seção nunca fica órfão: precisa caber título + cabeçalho + 1 linha
      ensureSpace(8 + 8 + 10);
      pdf.setFillColor(238, 242, 252);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);
      const titleHeight = 8;
      pdf.rect(margin, yPos, contentWidth, titleHeight, "FD");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...BRAND_BLUE);
      pdf.text(campo.label, margin + 2, yPos + 5);
      pdf.setTextColor(0, 0, 0);
      yPos += titleHeight;

      drawTableHeader();
      headerDrawnForSection = true;
      rowIndex = 0;
    } else if (campo.tipo === "descricao") {
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      const descLines = pdf.splitTextToSize(campo.label, contentWidth - 4);
      const descHeight = descLines.length * 4 + 2;
      ensureSpace(descHeight);
      pdf.setFillColor(250, 250, 250);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);
      pdf.setTextColor(100, 100, 100);
      pdf.rect(margin, yPos, contentWidth, descHeight, "FD");
      pdf.text(descLines, margin + 2, yPos + 3);
      pdf.setTextColor(0, 0, 0);
      yPos += descHeight;
    } else {
      const resposta = respostas[campo.id];
      const outrosText = respostas[`${campo.id}_outros_text`] as string | undefined;
      let respostaText = "---";

      if (campo.tipo === "foto" && Array.isArray(resposta) && resposta.length > 0) {
        respostaText = `${resposta.length} foto(s) anexada(s)`;
      } else if (Array.isArray(resposta)) {
        respostaText = resposta.join(", ");
        if (outrosText) {
          respostaText += ` (${outrosText})`;
        }
      } else if (resposta !== undefined && resposta !== null && resposta !== "") {
        respostaText = String(resposta);
      }

      const observacao = respostas[`${campo.id}_observacao`] as string | undefined;
      if (observacao) {
        respostaText += `\nObs: ${observacao}`;
      }

      // Mede a linha ANTES de desenhar, para quebrar página só quando necessário
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const perguntaLines = pdf.splitTextToSize(campo.label, 96);
      const respostaLines = pdf.splitTextToSize(respostaText, contentWidth - 116);
      const rowHeight = Math.max(perguntaLines.length, respostaLines.length) * 4 + 3;

      const brokePage = ensureSpace(rowHeight + (headerDrawnForSection ? 0 : 8));
      if (brokePage || !headerDrawnForSection) {
        drawTableHeader();
        headerDrawnForSection = true;
      }

      // Zebra: fundo alternado para leitura
      if (rowIndex % 2 === 1) {
        pdf.setFillColor(247, 249, 252);
        pdf.rect(margin, yPos, contentWidth, rowHeight, "F");
      }

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);
      pdf.rect(margin, yPos, col1W, rowHeight);
      pdf.rect(margin + col1W, yPos, col2W, rowHeight);
      pdf.rect(margin + col1W + col2W, yPos, col3W, rowHeight);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(String(itemNumber), margin + 6, yPos + 4, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.text(perguntaLines, margin + 14, yPos + 3);

      // Cor da resposta: Sim (verde), Não (vermelho), N.A (cinza), fotos (verde escuro)
      const firstAnswer = String(respostaText).split("\n")[0].trim();
      if (campo.tipo === "foto" && Array.isArray(resposta) && resposta.length > 0) {
        pdf.setTextColor(0, 100, 0);
        pdf.setFont("helvetica", "bold");
      } else if (/^sim\b/i.test(firstAnswer)) {
        pdf.setTextColor(22, 130, 60);
        pdf.setFont("helvetica", "bold");
      } else if (/^n[ãa]o\b/i.test(firstAnswer)) {
        pdf.setTextColor(190, 30, 30);
        pdf.setFont("helvetica", "bold");
      } else if (/^n\.?a\b/i.test(firstAnswer)) {
        pdf.setTextColor(120, 120, 120);
      }
      pdf.text(respostaLines, margin + 114, yPos + 3);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");

      yPos += rowHeight;
      itemNumber++;
      rowIndex++;
    }
  });

  // ---------- Arquivo fotográfico ----------

  const allPhotos: { url: string; label: string }[] = [];
  campos.forEach((campo) => {
    if (campo.tipo === "foto" && Array.isArray(respostas[campo.id])) {
      (respostas[campo.id] as string[]).forEach((url: string) => {
        allPhotos.push({ url, label: campo.label });
      });
    }
  });

  if (allPhotos.length > 0) {
    // Bucket privado: converte para URLs assinadas antes de embutir no PDF
    const signedUrls = await signPhotoUrls(allPhotos.map((p) => p.url));
    const loadedPhotos = await Promise.all(
      signedUrls.map((url) => loadImageData(url, "image/jpeg"))
    );

    // Grid adaptativo: poucas fotos ganham células maiores
    const cols = allPhotos.length <= 4 ? 2 : 3;
    const spacing = 5;
    const cellWidth = (contentWidth - spacing * (cols - 1)) / cols;
    const cellHeight = cellWidth * 0.75;
    const captionHeight = 7;
    const rowBlockHeight = cellHeight + captionHeight + 4;

    // Continua na mesma página se couber o título + 1 linha de fotos
    const brokeForPhotos = ensureSpace(24 + rowBlockHeight);
    if (!brokeForPhotos) yPos += 12; // respiro em relação ao bloco anterior

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Arquivo Fotográfico", margin, yPos);
    yPos += 4;
    pdf.setDrawColor(...BRAND_BLUE);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPos, margin + 45, yPos);
    pdf.setLineWidth(0.1);
    yPos += 6;

    for (let i = 0; i < allPhotos.length; i += cols) {
      ensureSpace(rowBlockHeight);

      for (let j = 0; j < cols && i + j < allPhotos.length; j++) {
        const idx = i + j;
        const photo = allPhotos[idx];
        const loaded = loadedPhotos[idx];
        const xPos = margin + j * (cellWidth + spacing);

        // Moldura da célula
        pdf.setDrawColor(210, 210, 210);
        pdf.rect(xPos, yPos, cellWidth, cellHeight);

        if (loaded) {
          // Encaixa preservando a proporção (sem esticar)
          const ratio = loaded.w / loaded.h;
          let drawW = cellWidth - 2;
          let drawH = drawW / ratio;
          if (drawH > cellHeight - 2) {
            drawH = cellHeight - 2;
            drawW = drawH * ratio;
          }
          const offX = xPos + (cellWidth - drawW) / 2;
          const offY = yPos + (cellHeight - drawH) / 2;
          try {
            pdf.addImage(loaded.dataUrl, "JPEG", offX, offY, drawW, drawH);
          } catch (e) {
            console.error("Error adding photo to PDF:", e);
          }
        } else {
          pdf.setFontSize(7);
          pdf.setTextColor(150, 150, 150);
          pdf.text("Foto indisponível", xPos + cellWidth / 2, yPos + cellHeight / 2, { align: "center" });
          pdf.setTextColor(0, 0, 0);
        }

        // Legenda com o item de origem
        pdf.setFontSize(6.5);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(90, 90, 90);
        const caption = pdf.splitTextToSize(`Foto ${idx + 1} — ${photo.label}`, cellWidth)[0];
        pdf.text(caption, xPos + cellWidth / 2, yPos + cellHeight + 4, { align: "center" });
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
      }
      yPos += rowBlockHeight;
    }
    yPos += 2;
  }

  // ---------- Parecer conclusivo (paginado linha a linha) ----------

  if (parecerConclusivo) {
    ensureSpace(16);
    yPos += 5;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Parecer Conclusivo:", margin, yPos);
    yPos += 6;
    pdf.setFont("helvetica", "normal");
    const parecerLines: string[] = pdf.splitTextToSize(parecerConclusivo, contentWidth);
    for (const line of parecerLines) {
      ensureSpace(5);
      pdf.text(line, margin, yPos);
      yPos += 4.5;
    }
    yPos += 6;
  }

  if (dataProximaInspecao) {
    ensureSpace(10);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Próxima Inspeção:", margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(new Date(dataProximaInspecao).toLocaleDateString("pt-BR"), margin + 40, yPos);
    yPos += 8;
  }

  if (responsavelInspecao || nomeRT) {
    ensureSpace(14);
    const nome = responsavelInspecao || nomeRT || "";
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Responsável pela Inspeção:", margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(nome, margin + 48, yPos);
    yPos += 12;
  }

  // ---------- Assinaturas ----------

  if (assinaturaRT || assinaturaCliente || assinaturaTestemunha) {
    // Assinaturas sempre ancoradas no rodapé da última página
    const signatureBlockHeight = 32;
    const targetY = contentBottom - signatureBlockHeight;
    if (yPos > targetY) {
      newPage();
    }
    yPos = targetY;

    const signatureWidth = 50;
    const signatureHeight = 18;
    const spacing = (contentWidth - signatureWidth * 3) / 2;

    let xPos = margin;

    if (assinaturaRT) {
      pdf.addImage(assinaturaRT, "PNG", xPos, yPos, signatureWidth, signatureHeight);
    }
    pdf.line(xPos, yPos + signatureHeight + 2, xPos + signatureWidth, yPos + signatureHeight + 2);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(nomeRT || responsavelInspecao || "RT", xPos + signatureWidth / 2, yPos + signatureHeight + 6, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.text("Responsável Técnico", xPos + signatureWidth / 2, yPos + signatureHeight + 10, { align: "center" });

    xPos += signatureWidth + spacing;

    if (assinaturaCliente) {
      pdf.addImage(assinaturaCliente, "PNG", xPos, yPos, signatureWidth, signatureHeight);
    }
    pdf.line(xPos, yPos + signatureHeight + 2, xPos + signatureWidth, yPos + signatureHeight + 2);
    pdf.setFont("helvetica", "bold");
    pdf.text(nomeClienteAssinatura || "Dono/Gerente", xPos + signatureWidth / 2, yPos + signatureHeight + 6, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.text("Dono do Estabelecimento", xPos + signatureWidth / 2, yPos + signatureHeight + 10, { align: "center" });

    xPos += signatureWidth + spacing;

    if (assinaturaTestemunha || nomeTestemunhaAssinatura) {
      if (assinaturaTestemunha) {
        pdf.addImage(assinaturaTestemunha, "PNG", xPos, yPos, signatureWidth, signatureHeight);
      }
      pdf.line(xPos, yPos + signatureHeight + 2, xPos + signatureWidth, yPos + signatureHeight + 2);
      pdf.setFont("helvetica", "bold");
      pdf.text(nomeTestemunhaAssinatura || "", xPos + signatureWidth / 2, yPos + signatureHeight + 6, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.text("Testemunha", xPos + signatureWidth / 2, yPos + signatureHeight + 10, { align: "center" });
    }

    yPos += signatureHeight + 15;
  }

  // ---------- Rodapé em todas as páginas ----------

  const pageCount = (pdf as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 12;
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.1);
    pdf.line(margin, footerY - 8, pageWidth - margin, footerY - 8);
    pdf.setFontSize(6);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(150, 150, 150);
    pdf.text("Gerado automaticamente por", pageWidth / 2, footerY - 4, { align: "center" });
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    const rtWidth = pdf.getTextWidth("RT ");
    const expertWidth = pdf.getTextWidth("Expert");
    const totalWidth = rtWidth + expertWidth;
    const startX = (pageWidth - totalWidth) / 2;
    pdf.text("RT ", startX, footerY);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(59, 130, 246);
    pdf.text("Expert", startX + rtWidth, footerY);
    pdf.setFontSize(5);
    pdf.setTextColor(160, 160, 160);
    pdf.setFont("helvetica", "normal");
    pdf.text("GESTÃO INTELIGENTE", pageWidth / 2, footerY + 3.5, { align: "center" });
    pdf.setFontSize(6);
    pdf.setTextColor(180, 180, 180);
    pdf.text(`Página ${i} de ${pageCount}`, pageWidth - margin, footerY + 3.5, { align: "right" });
  }

  const razaoSocial = cliente?.razao_social || "empresa";
  const datePrefix = dataAplicacao
    ? new Date(dataAplicacao).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  pdf.save(`relatorio_${razaoSocial}_${datePrefix}.pdf`);
}
