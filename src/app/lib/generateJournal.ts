import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

interface JournalEntry {
  id: string | number;
  date: string;      // YYYY-MM-DD
  hours: number;
  details: string;
  status: string;
}

export interface JournalMonthGroup {
  month: string;
  entries: JournalEntry[];
}

export interface JournalInfo {
  studentName: string;
  studentId: string;
  section: string;
  company: string;
  companyAddress: string;
  supervisor: string;
  supervisorContact: string;
  position: string;
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

export async function generateJournalDOCX(info: JournalInfo): Promise<void> {
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

  const data = {
    studentName: info.studentName || "",
    section: info.section || "",
    company: info.company || "",
    companyAddress: info.companyAddress || "",
    supervisor: info.supervisor || "",
    supervisorContact: info.supervisorContact || "",
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
    });

    // Render the document
    doc.render(data);

    // Generate blob
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // Trigger download
    const safeName = (info.studentName || "Student").replace(/\s+/g, "_");
    const filename = `Journal_${safeName}_All.docx`;

    saveAs(out, filename);
  } catch (error) {
    console.error("Error generating DOCX:", error);
    throw error;
  }
}
