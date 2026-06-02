import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { GreResource } from "../types";

export function generatePDF(resources: GreResource[], lastUpdated: string) {
  // Create jsPDF instance (A4 size, portrait, mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  // Colors
  const navyColor = [15, 23, 42]; // #0F172A
  const skyColor = [56, 189, 248]; // #38BDF8
  const lightGray = [241, 245, 249]; // #F1F5F9

  // Header Draw helper
  const drawHeader = () => {
    // Top colored bar (institucional azul marinho)
    doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.rect(0, 0, pageWidth, 40, "F");

    // Sky blue accent line
    doc.setFillColor(skyColor[0], skyColor[1], skyColor[2]);
    doc.rect(0, 40, pageWidth, 2, "F");

    // Title Texts
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("LOCALIZAÇÃO DE RECURSOS", 14, 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(skyColor[0], skyColor[1], skyColor[2]);
    doc.text("EMG-PM/3", 14, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text("RELAÇÃO DE EMPREGO EM APOIO OPERACIONAL", 14, 32);

    // Generation Info on the top right
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Atualizado: ${lastUpdated}`, pageWidth - 14, 18, { align: "right" });
    doc.text(`Total Registros: ${resources.length}`, pageWidth - 14, 24, { align: "right" });
    const totalGre = resources.reduce((sum, res) => sum + res.equipe, 0);
    doc.text(`Total GRE: ${totalGre}`, pageWidth - 14, 30, { align: "right" });
  };

  // Footer Draw helper
  const drawFooter = (currentPage: number, totalPages: number) => {
    doc.setFillColor(skyColor[0], skyColor[1], skyColor[2]);
    doc.rect(14, pageHeight - 15, pageWidth - 28, 0.4, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Text Slate
    doc.text("PMERJ - EMG-PM/3 | SGO - Planejamento Operacional", 14, pageHeight - 10);
    
    doc.text(`Página ${currentPage} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: "right" });
  };

  // Build the Header
  drawHeader();

  // 1. Technical Table Data (Dados Básicos)
  // Columns: Unidade, Status, Quantidade, Turno/Data
  const basicTableHeaders = [["UNIDADE APOIADA", "SITUAÇÃO / STATUS", "QTD GRE", "DATA / TURNO"]];
  const basicTableRows = resources.map((r) => [
    r.unidadeApoiada,
    r.status,
    r.equipe.toString(),
    r.dataTurno
  ]);

  // Render Basic Table (Dados Técnicos)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text("1. TABELA DE ALOCAÇÕES", 14, 52);

  autoTable(doc, {
    startY: 56,
    head: basicTableHeaders,
    body: basicTableRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left"
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59]
    },
    columnStyles: {
      0: { cellWidth: 50 }, // Unidade
      1: { cellWidth: 35, fontStyle: "bold" }, // Status
      2: { cellWidth: 20, halign: "center" }, // Qtd
      3: { cellWidth: "auto" } // Turno
    },
    margin: { top: 20, bottom: 25, left: 14, right: 14 },
    didDrawPage: (data) => {
      // Just a safety check, we don't draw anything here now
    }
  });

  // Get current Y position after the basic table
  let currentY = (doc as any).lastAutoTable.finalY + 12;

  // Check if we need to add a page break for the Detalhamento section
  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = 20; // Without header, start elegantly and cleanly of high up
  }

  // 2. Details Table (Detalhamento de Missões com Textos Longos)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text("2. DETALHAMENTO DAS MISSÕES E PRESCRIÇÕES", 14, currentY);

  const detailHeaders = [["UNIDADE", "DESCRIÇÃO DO APOIO", "PRESCRIÇÕES DIVERSAS / OBSERVAÇÕES"]];
  const detailRows = resources.map((r) => [
    r.unidadeApoiada,
    r.descricaoApoio,
    r.prescricoes || "Sem observações adicionais."
  ]);

  autoTable(doc, {
    startY: currentY + 4,
    head: detailHeaders,
    body: detailRows,
    theme: "grid",
    headStyles: {
      fillColor: [51, 65, 85], // Slate gray for secondary table header
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      valign: "top"
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Unidade
      1: { cellWidth: 75 }, // Descrição do Apoio
      2: { cellWidth: "auto" } // Prescrições (takes the rest)
    },
    margin: { top: 20, bottom: 25, left: 14, right: 14 }, // reserve space at bottom for footer
    rowPageBreak: "avoid", // Do not split single row across pages
    didDrawPage: (data) => {
      // Draw header on new pages if table spills over
      if (data.pageNumber > 1) {
        // Since we draw header on every page, we can draw it here
        // But autoTable will overlap unless we configure startY correctly inside direct drawing,
        // so we manually check page additions or draw footprints
      }
    }
  });

  // Now, calculate total pages and stamp headers/footers properly on all pages
  const totalPages = doc.internal.pages.length - 1; // standard count is pages.length - 1 because page 0 is metadata
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // Footers are applied to all pages, header is only drew on Page 1 (called manually at start)
    drawFooter(i, totalPages);
  }

  // Open PDF download or print view
  const pdfName = `relatorio-sgo-pmerj-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(pdfName);
}
