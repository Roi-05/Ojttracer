import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

export interface ECertificateInfo {
  studentName: string;
  companyName: string;
  position: string;
  schoolYear?: string;
  startDate?: string;
  endDate?: string;
  completionDate?: string;
  supervisorName?: string;
  coordinatorName?: string;
}

/**
 * Formats a raw date string into an official human-readable date (e.g. "February 1, 2026").
 */
export function formatCertDate(dateStr?: string | null): string {
  if (!dateStr || dateStr.trim() === "" || dateStr === "—") return "";
  const trimmed = dateStr.trim();
  const d = trimmed.includes("T") ? new Date(trimmed) : new Date(trimmed + "T00:00:00");
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return trimmed;
}

/**
 * Generates a populated DOCX Blob from public/ecertTemplate.docx with student and deployment details.
 */
export async function buildECertificateDOCXBlob(info: ECertificateInfo): Promise<Blob> {
  const formattedStart = formatCertDate(info.startDate) || info.startDate || "";
  const formattedCompletion =
    formatCertDate(info.completionDate || info.endDate) ||
    new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const data = {
    studentName: (info.studentName || "").trim(),
    companyName: (info.companyName || "").trim(),
    position: (info.position || "Intern").trim(),
    schoolYear: (info.schoolYear || "").trim(),
    startDate: formattedStart,
    completionDate: formattedCompletion,
    supervisorName: (info.supervisorName || "").trim(),
    coordinatorName: (info.coordinatorName || "").trim(),
  };

  const response = await fetch("/ecertTemplate.docx");
  if (!response.ok) {
    throw new Error(`Failed to load e-certificate template: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  doc.render(data);

  const out = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return out as Blob;
}

/**
 * Directly downloads the filled certificate as a Word (.docx) document.
 */
export async function generateECertificateDOCX(info: ECertificateInfo): Promise<void> {
  const blob = await buildECertificateDOCXBlob(info);
  const safeName = (info.studentName || "Student").replace(/\s+/g, "_");
  saveAs(blob, `Certificate_${safeName}.docx`);
}

