import jsPDF from "jspdf";
import { Cliente, CampoChecklist } from "@/types";

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
  let yPos = margin;

  let logoWidth = 30;
  let logoHeight = 15;
  if (logoUrl) {
    try {
      const img = new window.Image();
      img.crossOrigin = "Anonymous";
      img.src = logoUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      const ratio = img.width / img.height;
      logoHeight = 15;
      logoWidth = 15 * ratio;
      if (logoWidth > 40) {
        logoWidth = 40;
        logoHeight = 40 / ratio;
      }
    } catch (e) {
      console.error("Error loading logo dimensions:", e);
    }
  }

  if (logoUrl) {
    try {
      pdf.addImage(logoUrl, "PNG", margin, yPos, logoWidth, logoHeight);
    } catch (e) {
      console.error("Error adding logo:", e);
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

  yPos += 12;

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

  if (cliente) {
    pdf.setFillColor(245, 245, 245);
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

  const campos = secoes.flatMap((secao) => {
    const result: Array<{ tipo: string; label: string; id: string }> = [];
    if (secao.titulo) {
      result.push({ tipo: "titulo", label: secao.titulo, id: `sec-${secao.id}` });
    }
    return result.concat((secao.campos || []).map((c) => ({ ...c, tipo: c.tipo })));
  });

  let itemNumber = 1;
  let headerDrawnForSection = false;

  campos.forEach((campo) => {
    if (yPos > pageHeight - 50) {
      pdf.addPage();
      yPos = margin;
      headerDrawnForSection = false;
    }

    if (campo.tipo === "titulo") {
      pdf.setFillColor(245, 245, 255);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);
      const titleHeight = 8;
      pdf.rect(margin, yPos, contentWidth, titleHeight, "FD");
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(40, 40, 180);
      pdf.text(campo.label, margin + 2, yPos + 5);
      pdf.setTextColor(0, 0, 0);
      yPos += titleHeight;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setFillColor(230, 230, 230);
      pdf.rect(margin, yPos, contentWidth, 8, "FD");
      pdf.text("ITEM", margin + 2, yPos + 5);
      pdf.text("PERGUNTA", margin + 14, yPos + 5);
      pdf.text("RESPOSTA", margin + 114, yPos + 5);
      yPos += 8;
      headerDrawnForSection = true;
    } else if (campo.tipo === "descricao") {
      pdf.setFillColor(250, 250, 250);
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(100, 100, 100);
      const descLines = pdf.splitTextToSize(campo.label, contentWidth - 4);
      const descHeight = descLines.length * 4 + 2;
      pdf.rect(margin, yPos, contentWidth, descHeight, "FD");
      pdf.text(descLines, margin + 2, yPos + 3);
      pdf.setTextColor(0, 0, 0);
      yPos += descHeight;
    } else {
      if (!headerDrawnForSection) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setFillColor(230, 230, 230);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.1);
        pdf.rect(margin, yPos, contentWidth, 8, "FD");
        pdf.text("ITEM", margin + 2, yPos + 5);
        pdf.text("PERGUNTA", margin + 14, yPos + 5);
        pdf.text("RESPOSTA", margin + 114, yPos + 5);
        yPos += 8;
        headerDrawnForSection = true;
      }

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

      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      const perguntaLines = pdf.splitTextToSize(campo.label, 96);
      const respostaLines = pdf.splitTextToSize(respostaText, contentWidth - 116);
      const rowHeight = Math.max(perguntaLines.length, respostaLines.length) * 4 + 3;

      const col1W = 12;
      const col2W = 100;
      const col3W = contentWidth - 112;

      pdf.rect(margin, yPos, col1W, rowHeight);
      pdf.rect(margin + col1W, yPos, col2W, rowHeight);
      pdf.rect(margin + col1W + col2W, yPos, col3W, rowHeight);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text(String(itemNumber), margin + 6, yPos + 4, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.text(perguntaLines, margin + 14, yPos + 3);

      if (campo.tipo === "foto" && Array.isArray(resposta) && resposta.length > 0) {
        pdf.setTextColor(0, 100, 0);
        pdf.setFont("helvetica", "bold");
        pdf.text(respostaText, margin + 114, yPos + 3);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont("helvetica", "normal");
      } else {
        pdf.text(respostaLines, margin + 114, yPos + 3);
      }

      yPos += rowHeight;
      itemNumber++;
    }
  });

  const allPhotos: { url: string; label: string }[] = [];
  campos.forEach((campo) => {
    if (campo.tipo === "foto" && Array.isArray(respostas[campo.id])) {
      (respostas[campo.id] as string[]).forEach((url: string) => {
        allPhotos.push({ url, label: campo.label });
      });
    }
  });

  if (allPhotos.length > 0) {
    pdf.addPage();
    yPos = margin;
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Arquivo Fotográfico", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    const cols = 4;
    const spacing = 4;
    const imgWidth = (contentWidth - (spacing * (cols - 1))) / cols;
    const imgHeight = imgWidth * 0.75;

    for (let i = 0; i < allPhotos.length; i += cols) {
      if (yPos + imgHeight + 15 > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }

      for (let j = 0; j < cols && (i + j) < allPhotos.length; j++) {
        const photo = allPhotos[i + j];
        const xPos = margin + (j * (imgWidth + spacing));

        try {
          pdf.addImage(photo.url, "JPEG", xPos, yPos, imgWidth, imgHeight);
          pdf.setFontSize(6);
          pdf.setFont("helvetica", "italic");
          pdf.text(`${i + j + 1}`, xPos + (imgWidth / 2), yPos + imgHeight + 3, { align: "center" });
        } catch (e) {
          console.error("Error adding photo to PDF:", e);
        }
      }
      yPos += imgHeight + 8;
    }
    yPos += 5;
  }

  if (parecerConclusivo) {
    if (yPos > pageHeight - 50) {
      pdf.addPage();
      yPos = margin;
    }
    yPos += 5;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Parecer Conclusivo:", margin, yPos);
    yPos += 6;
    pdf.setFont("helvetica", "normal");
    const parecerLines = pdf.splitTextToSize(parecerConclusivo, contentWidth);
    pdf.text(parecerLines, margin, yPos);
    yPos += (4 * parecerLines.length) + 8;
  }

  if (dataProximaInspecao) {
    pdf.setFont("helvetica", "bold");
    pdf.text("Próxima Inspeção:", margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(new Date(dataProximaInspecao).toLocaleDateString("pt-BR"), margin + 40, yPos);
    yPos += 8;
  }

  if (responsavelInspecao || nomeRT) {
    const nome = responsavelInspecao || nomeRT || "";
    pdf.setFont("helvetica", "bold");
    pdf.text("Responsável pela Inspeção:", margin, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(nome, margin + 48, yPos);
    yPos += 12;
  }

  if (assinaturaRT || assinaturaCliente || assinaturaTestemunha) {
    if (yPos > pageHeight - 65) {
      pdf.addPage();
      yPos = margin + 10;
    } else {
      yPos += 12;
    }

    const signatureWidth = 50;
    const signatureHeight = 18;
    const spacing = (contentWidth - (signatureWidth * 3)) / 2;

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
