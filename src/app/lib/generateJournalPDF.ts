import { renderAsync } from "docx-preview";
import html2pdf from "html2pdf.js";
import { saveAs } from "file-saver";
import { buildJournalDOCXBlob, JournalInfo } from "./generateJournal";

/**
 * Generates a PDF file of the student's OJT Journal by first generating the populated DOCX blob,
 * and converting it directly to PDF via Gotenberg (LibreOffice) for native layout fidelity.
 */
export async function generateJournalPDF(info: JournalInfo): Promise<void> {
  // 1. Build the populated DOCX blob from the Word template
  const docxBlob = await buildJournalDOCXBlob(info);
  const safeName = (info.studentName || "Student").replace(/\s+/g, "_");
  const filename = `Journal_${safeName}_All.pdf`;

  // 2. Try native DOCX -> PDF server conversion via LibreOffice
  try {
    const formData = new FormData();
    formData.append("file", docxBlob, `Journal_${safeName}.docx`);

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

  // 3. Fallback: Client-side DOM rendering via docx-preview + html2pdf
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0px";
  container.style.top = "0px";
  container.style.width = "1123px"; // A4 landscape width at 96dpi
  container.style.zIndex = "-99999";
  container.style.background = "#ffffff";
  container.style.color = "#000000";
  container.style.fontFamily = "Calibri, Arial, sans-serif";
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
      margin: [6, 6, 6, 6] as [number, number, number, number],
      filename: filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    await html2pdf().set(opt).from(targetElement).save();
  } catch (err) {
    console.error("Failed to compile Journal PDF:", err);
    throw err;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}



