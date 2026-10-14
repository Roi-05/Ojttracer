import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { resolveUploadUrl } from "./uploads";

export interface DTREntry {
  date: string; // YYYY-MM-DD
  timeIn: string | null;
  timeOut: string | null;
  hours: number;
  status?: string;
}

export interface DTRMonthGroup {
  month: string;
  entries: DTREntry[];
}

export interface DTRInfo {
  studentName: string;
  firstName: string;
  lastName: string;
  middleInitial: string;
  signatureUrl?: string | null;
  supervisorSignatureUrl?: string | null;
  months: DTRMonthGroup[];
}

function toDate(dateStr: string): Date {
  if (!dateStr || dateStr === "—") return new Date(NaN);
  if (dateStr.includes("T")) return new Date(dateStr);
  return new Date(dateStr + "T00:00:00");
}

function shortDate(dateStr: string): string {
  if (!dateStr || dateStr === "—") return "—";
  const d = toDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${mm}-${dd}-${yy}`;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

const FALLBACK_1X1_PNG = base64ToArrayBuffer(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
);

async function fetchImageAsArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const proxyUrl = resolveUploadUrl(url) || url;
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export async function buildDTRDOCXBlob(info: DTRInfo): Promise<Blob> {
  let studentSigBuffer: ArrayBuffer | null = null;
  if (info.signatureUrl) {
    studentSigBuffer = await fetchImageAsArrayBuffer(info.signatureUrl);
  }

  let supervisorSigBuffer: ArrayBuffer | null = null;
  if (info.supervisorSignatureUrl) {
    supervisorSigBuffer = await fetchImageAsArrayBuffer(info.supervisorSignatureUrl);
  }

  const imageModule = new ImageModule({
    centered: false,
    fileType: "docx",
    getImage(tagValue: string) {
      const lower = tagValue ? tagValue.toLowerCase() : "";
      if (lower === "studentsignature" && studentSigBuffer) {
        return studentSigBuffer;
      }
      if (lower === "supervisorsignature" && supervisorSigBuffer) {
        return supervisorSigBuffer;
      }
      return FALLBACK_1X1_PNG;
    },
    getSize(_img: any, tagValue: string): [number, number] {
      const lower = tagValue ? tagValue.toLowerCase() : "";
      if (lower === "studentsignature" || lower === "supervisorsignature") {
        return [100, 35];
      }
      return [1, 1];
    },
  });

  const formattedMonths = info.months.map((mGroup) => {
    const entries = mGroup.entries.map((e) => ({
      date: shortDate(e.date),
      timeIn: e.timeIn || "—",
      timeOut: e.timeOut || "—",
      totalHours: e.hours > 0 ? Number(e.hours).toFixed(2) : "—",
      studentSignature: studentSigBuffer ? "studentSignature" : "",
      supervisorSignature: supervisorSigBuffer ? "supervisorSignature" : "",
    }));

    return {
      month: mGroup.month,
      entries,
    };
  });

  const data = {
    firstName: info.firstName || "",
    lastName: info.lastName || "",
    middleInitial: info.middleInitial || "",
    studentName: info.studentName || "",
    studentSignature: studentSigBuffer ? "studentSignature" : "",
    supervisorSignature: supervisorSigBuffer ? "supervisorSignature" : "",
    months: formattedMonths.length ? formattedMonths : [],
  };

  const response = await fetch("/DTRTemplate.docx");
  if (!response.ok) {
    throw new Error(`Failed to load DTR template: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    modules: [imageModule],
  });

  doc.render(data);

  const out = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  return out as Blob;
}

export async function generateDTRDOCX(info: DTRInfo): Promise<void> {
  const blob = await buildDTRDOCXBlob(info);
  const safeName = (info.studentName || "Student").replace(/\s+/g, "_");
  saveAs(blob, `DTR_${safeName}.docx`);
}
