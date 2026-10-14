import { renderAsync } from "docx-preview";
import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";
import { buildDTRDOCXBlob, DTRInfo } from "./generateDTR";

/**
 * Generates a PDF of the student's Daily Time Record by populating the DOCX template,
 * then converting via Gotenberg (LibreOffice). Falls back to client-side rendering.
 */
export async function generateDTRPDF(info: DTRInfo): Promise<void> {
  const docxBlob = await buildDTRDOCXBlob(info);
  const safeName = (info.studentName || "Student").replace(/\s+/g, "_");
  const filename = `DTR_${safeName}.pdf`;

  try {
    const formData = new FormData();
    formData.append("file", docxBlob, `DTR_${safeName}.docx`);

    const res = await fetch("/api/documents/convert-pdf", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const pdfBlob = await res.blob();
      saveAs(pdfBlob, filename);
      return;
    }
    console.warn("Server PDF conversion returned non-200, falling back to client DOM renderer.");
  } catch (serverErr) {
    console.warn("Server PDF conversion failed/unreachable, falling back to client DOM renderer:", serverErr);
  }

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0px";
  container.style.top = "0px";
  container.style.width = "794px"; // A4 portrait width at 96dpi
  container.style.zIndex = "-99999";
  container.style.background = "#ffffff";
  container.style.color = "#000000";
  container.style.fontFamily = "Times New Roman, Times, serif";
  container.className = "docx-pdf-render-container";
  document.body.appendChild(container);

  try {
    await renderAsync(docxBlob, container, undefined, {
      inWrapper: true,
      ignoreWidth: true,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      experimental: true,
      useBase64URL: true,
    });

    const wsStyle = document.createElement("style");
    wsStyle.textContent = `
      .docx-pdf-render-container .docx p:empty::after,
      .docx-pdf-render-container .docx-body p:empty::after {
        content: '\\00a0';
        display: inline;
      }
      .docx-pdf-render-container .docx span,
      .docx-pdf-render-container .docx p {
        white-space: pre-wrap;
      }
      .docx-pdf-render-container .docx p {
        min-height: 1em;
      }
    `;
    container.appendChild(wsStyle);

    await new Promise((resolve) => setTimeout(resolve, 600));

    const targetElement = (container.querySelector(".docx-wrapper") || container) as HTMLElement;

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    await html2pdf().set(opt).from(targetElement).save();
  } catch (err) {
    console.error("Failed to compile DTR PDF:", err);
    throw err;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
