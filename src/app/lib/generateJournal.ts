import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import { resolveUploadUrl } from "./uploads";

interface JournalEntry {
  id: string | number;
  date: string;      // YYYY-MM-DD
  hours: number;
  details: string;
  status: string;
  picture?: string | null;
}

export interface JournalMonthGroup {
  month: string;
  entries: JournalEntry[];
}

export interface JournalInfo {
  studentName: string;
  studentId: string;
  firstName: string;
  lastName: string;
  middleInitial: string;
  course: string;
  year: string;
  section: string;
  address: string;
  dateOfBirth: string;
  age: string;
  civilStatus: string;
  religion: string;
  company: string;
  companyAddress: string;
  supervisor: string;
  supervisorContact: string;
  position: string;
  avatarUrl?: string | null;
  fatherName?: string;
  fatherOccupation?: string;
  fatherPhone?: string;
  motherName?: string;
  motherOccupation?: string;
  motherPhone?: string;
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  months: JournalMonthGroup[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toDate(dateStr: string): Date {
  if (!dateStr || dateStr === "—") return new Date(NaN);
  if (dateStr.includes("T")) return new Date(dateStr);
  return new Date(dateStr + "T00:00:00");
}

function getDayOfWeek(dateStr: string): string {
  if (!dateStr || dateStr === "—") return "—";
  const d = toDate(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { weekday: "long" });
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

/**
 * Convert a base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// 1x1 transparent PNG to act as a safe fallback when no image exists
const FALLBACK_1X1_PNG = base64ToArrayBuffer(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
);

/**
 * Fetch an image URL and return an ArrayBuffer.
 * Handles both absolute URLs and /uploads/... relative paths.
 */
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

/**
 * Stitch multiple images into a 2-column grid canvas, returning the JPEG ArrayBuffer and dimensions.
 */
async function createImagesGrid(imageUrls: string[]): Promise<{ buffer: ArrayBuffer; width: number; height: number } | null> {
  if (!imageUrls || imageUrls.length === 0) return null;

  // Load all images asynchronously
  const loadedImages: HTMLImageElement[] = await Promise.all(
    imageUrls.map(url => new Promise<HTMLImageElement>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = resolveUploadUrl(url) || url;
      img.onload = () => resolve(img);
      img.onerror = () => {
        const dummy = new Image();
        resolve(dummy);
      };
    }))
  );

  // Filter valid loaded images
  const validImages = loadedImages.filter(img => img.width > 0);
  if (validImages.length === 0) return null;

  const cols = validImages.length === 1 ? 1 : 2;
  const rows = Math.ceil(validImages.length / cols);

  // Layout parameters
  const cellWidth = cols === 1 ? 480 : 350;
  const cellHeight = cols === 1 ? 320 : 250;
  const gap = 15;

  const totalWidth = cols * cellWidth + (cols - 1) * gap;
  const totalHeight = rows * cellHeight + (rows - 1) * gap;

  const canvas = document.createElement("canvas");
  canvas.width = totalWidth;
  canvas.height = totalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // White grid background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  validImages.forEach((img, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = col * (cellWidth + gap);
    const y = row * (cellHeight + gap);

    // Draw using cover-style cropping
    const imgRatio = img.width / img.height;
    const cellRatio = cellWidth / cellHeight;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;

    if (imgRatio > cellRatio) {
      sw = img.height * cellRatio;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / cellRatio;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, cellWidth, cellHeight);
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          buffer: reader.result as ArrayBuffer,
          width: totalWidth,
          height: totalHeight
        });
      };
      reader.readAsArrayBuffer(blob);
    }, "image/jpeg", 0.85);
  });
}

export async function buildJournalDOCXBlob(info: JournalInfo): Promise<Blob> {
  const formattedMonths = info.months.map(mGroup => {
    const totalHours = mGroup.entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const formattedEntries = mGroup.entries.map(e => ({
      day: getDayOfWeek(e.date),
      date: shortDate(e.date),
      accomplishment: e.details || "",
      hours: e.hours
    }));

    return {
      month: mGroup.month,
      position: info.position || "",
      entries: formattedEntries.length ? formattedEntries : [],
      hasEntries: formattedEntries.length > 0,
      totalHours: totalHours
    };
  });

  const globalTotalHours = info.months.reduce((sum, mGroup) =>
    sum + mGroup.entries.reduce((s, e) => s + Number(e.hours), 0), 0
  );

  // ── Fetch avatar image ──────────────────────────────────────────────────
  let avatarBuffer: ArrayBuffer | null = null;
  if (info.avatarUrl) {
    avatarBuffer = await fetchImageAsArrayBuffer(info.avatarUrl);
  }

  // ── Retrieve accomplishment images and build grid ───────────────────────
  const accomplishmentImages: string[] = [];
  info.months.forEach(mGroup => {
    mGroup.entries.forEach(e => {
      if (e.picture) {
        accomplishmentImages.push(e.picture);
      }
    });
  });

  const gridResult = await createImagesGrid(accomplishmentImages);
  const gridBuffer = gridResult?.buffer || null;
  const gridDimensions = gridResult ? { width: gridResult.width, height: gridResult.height } : null;

  // ── Build image module ──────────────────────────────────────────────────
  const imageModule = new ImageModule({
    centered: false,
    fileType: "docx",
    getImage(tagValue: string) {
      if (tagValue === "profilepicture2x2" && avatarBuffer) {
        return avatarBuffer;
      }
      if (tagValue === "journalEntriesImages" && gridBuffer) {
        return gridBuffer;
      }
      return FALLBACK_1X1_PNG;
    },
    getSize(_img: any, tagValue: string, _tagName: string): [number, number] {
      if (tagValue === "profilepicture2x2") {
        return [96, 96]; // 1x1 inch
      }
      if (tagValue === "journalEntriesImages") {
        if (gridDimensions) {
          const targetWidth = 480; // Fit standard margins nicely
          const scale = targetWidth / gridDimensions.width;
          return [targetWidth, Math.round(gridDimensions.height * scale)];
        }
        return [1, 1]; // Invisible 1x1 fallback spacer
      }
      return [1, 1];
    },
  });

  const data = {
    studentName: info.studentName || "",
    studentname: info.studentName || "",
    firstName: info.firstName || "",
    lastName: info.lastName || "",
    middleInitial: info.middleInitial || "",
    course: info.course || "",
    year: info.year || "",
    section: info.section || "",
    address: info.address || "",
    dateOfBirth: info.dateOfBirth || "",
    age: info.age || "",
    civilStatus: info.civilStatus || "",
    religion: info.religion || "",
    company: info.company || "",
    companyAddress: info.companyAddress || "",
    supervisor: info.supervisor || "",
    supervisorContact: info.supervisorContact || "",
    position: info.position || "",
    fatherName: info.fatherName || "",
    fatherOccupation: info.fatherOccupation || "",
    fatherPhone: info.fatherPhone || "",
    motherName: info.motherName || "",
    motherOccupation: info.motherOccupation || "",
    motherPhone: info.motherPhone || "",
    guardianName: info.guardianName || "",
    guardianRelationship: info.guardianRelationship || "",
    guardianPhone: info.guardianPhone || "",
    totalHours: globalTotalHours,
    // Note: the template tag for image must have % prefix (e.g. {%profilepicture2x2} and {%journalEntriesImages})
    profilepicture2x2: avatarBuffer ? "profilepicture2x2" : "",
    journalEntriesImages: gridBuffer ? "journalEntriesImages" : "",
    months: formattedMonths.length ? formattedMonths : []
  };

  try {
    // Fetch the template from the public directory
    const response = await fetch("/JournalTemplate.docx");
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    // Initialize PizZip and Docxtemplater
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule],
    });

    // Render the document
    doc.render(data);

    // Generate blob
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    return out as Blob;
  } catch (error) {
    console.error("Error building DOCX blob:", error);
    throw error;
  }
}

export async function generateJournalDOCX(info: JournalInfo): Promise<void> {
  const blob = await buildJournalDOCXBlob(info);
  const safeName = (info.studentName || "Student").replace(/\s+/g, "_");
  const filename = `Journal_${safeName}_All.docx`;
  saveAs(blob, filename);
}

