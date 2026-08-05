import { renderAsync } from "docx-preview";
import html2pdf from "html2pdf.js";
import { buildJournalDOCXBlob, JournalInfo } from "./generateJournal";

/**
 * Generates a PDF file of the student's OJT Journal by binding data into the DOCX template,
 * rendering it with docx-preview, and compiling to vector PDF using html2pdf.js.
 */
export async function generateJournalPDF(info: JournalInfo): Promise<void> {
  // 1. Build the populated DOCX blob from the Word template
  const docxBlob = await buildJournalDOCXBlob(info);

  // 2. Create a container positioned at 0,0 hidden behind application layers (z-index: -99999)
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0px";
  container.style.top = "0px";
  container.style.width = "794px"; // A4 portrait width at standard 96dpi
  container.style.zIndex = "-99999";
  container.style.background = "#ffffff";
  container.style.color = "#000000";
  container.style.fontFamily = "Calibri, Arial, sans-serif";
  container.className = "docx-pdf-render-container";
  document.body.appendChild(container);

  try {
    // 3. Render DOCX into the container using docx-preview
    await renderAsync(docxBlob, container, undefined, {
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      experimental: true,
      useBase64URL: true,
    });

    // Allow images and fonts to render cleanly in DOM
    await new Promise((resolve) => setTimeout(resolve, 500));

    const targetElement = (container.querySelector(".docx-wrapper") || container) as HTMLElement;

    const safeName = (info.studentName || "Student").replace(/\s+/g, "_");
    const filename = `Journal_${safeName}_All.pdf`;

    // 4. Configure html2pdf options for high quality output
    const opt = {
      margin: [8, 8, 8, 8] as [number, number, number, number], // top, right, bottom, left in mm
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
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    // 5. Generate and download PDF
    await html2pdf().set(opt).from(targetElement).save();
  } catch (err) {
    console.error("Failed to compile Journal PDF:", err);
    throw err;
  } finally {
    // Clean up DOM node
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
