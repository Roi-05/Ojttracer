import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { BookOpen, FileText, ChevronDown, Download, Plus, FileSpreadsheet } from "lucide-react";
import { DailyAccomplishment } from "../../hooks/useStudentData";
import { formatDate, monthLabel, StatusBadge } from "./shared";
import { toast } from "sonner";
import { generateJournalDOCX } from "../../lib/generateJournal";
import { generateJournalPDF } from "../../lib/generateJournalPDF";
import { resolveUploadUrl } from "../../lib/uploads";

interface JournalTabProps {
  accomplishmentList: DailyAccomplishment[];
  openAddModal: () => void;
  studentId: string;
  studentName?: string;
  studentSection?: string;
  deployment?: {
    company?: string;
    position?: string;
    supervisor?: string;
    companyAddress?: string;
    supervisorContact?: string;
  };
  studentProfile?: any;
}

// Days of week for journal template ordering
const DOW_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Normalize any date string (YYYY-MM-DD or full ISO) into a JS Date
function toDate(dateStr: string): Date {
  if (!dateStr || dateStr === "—") return new Date(NaN);
  // Already has time component — use as-is
  if (dateStr.includes("T")) return new Date(dateStr);
  // Plain date — add local midnight to avoid timezone shifting
  return new Date(dateStr + "T00:00:00");
}

function getDayOfWeek(dateStr: string): string {
  const d = toDate(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = d.getTime() - startOfYear.getTime();
  return Math.ceil((diff / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7);
}

function groupByWeek(entries: DailyAccomplishment[]): Record<string, DailyAccomplishment[]> {
  const groups: Record<string, DailyAccomplishment[]> = {};
  for (const e of entries) {
    if (!e.date || e.date === "—") continue;
    const d = toDate(e.date);
    if (isNaN(d.getTime())) continue;
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // ISO week starts Monday
    const key = monday.toISOString().split("T")[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

function weekLabel(mondayISO: string): string {
  const start = new Date(mondayISO + "T00:00:00");
  if (isNaN(start.getTime())) return "Unknown Week";
  const end = new Date(start);
  end.setDate(start.getDate() + 4); // Friday
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `Week of ${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

export function JournalTab({
  accomplishmentList,
  openAddModal,
  studentId,
  studentName = "",
  studentSection = "",
  deployment = {},
  studentProfile = {},
}: JournalTabProps) {
  const sortedDesc = [...accomplishmentList].sort((a, b) => b.date.localeCompare(a.date));
  const approved = accomplishmentList.filter(a => a.status === "approved").length;

  const getJournalPayload = () => {
    // Group all valid entries by month
    const entriesByMonth: Record<string, DailyAccomplishment[]> = {};
    const validEntries = accomplishmentList
      .filter(a => !!a.date && a.date !== "—" && a.status === "approved")
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const e of validEntries) {
      const mLabel = monthLabel(e.date);
      if (mLabel === "—") continue;
      if (!entriesByMonth[mLabel]) entriesByMonth[mLabel] = [];
      entriesByMonth[mLabel].push(e);
    }

    const monthsPayload = Object.entries(entriesByMonth).map(([month, entries]) => ({
      month,
      entries
    }));

    let ageStr = "";
    if (studentProfile.dateOfBirth) {
      const dob = new Date(studentProfile.dateOfBirth);
      const diffMs = Date.now() - dob.getTime();
      const ageDt = new Date(diffMs);
      ageStr = String(Math.abs(ageDt.getUTCFullYear() - 1970));
    }

    return {
      studentName: studentProfile.name || studentName,
      studentId: studentProfile.studentId || studentId,
      firstName: studentProfile.firstName || "",
      lastName: studentProfile.lastName || "",
      middleInitial: studentProfile.middleName ? studentProfile.middleName.charAt(0) + "." : "",
      course: studentProfile.course || "",
      year: studentProfile.year || "",
      section: studentProfile.section || studentSection,
      address: studentProfile.address || "",
      dateOfBirth: studentProfile.dateOfBirth ? new Date(studentProfile.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "",
      age: ageStr,
      civilStatus: studentProfile.civilStatus || "",
      religion: studentProfile.religion || "",
      company: deployment.company || "",
      companyAddress: deployment.companyAddress || "",
      supervisor: deployment.supervisor || "",
      supervisorContact: deployment.supervisorContact || "",
      position: deployment.position || "",
      avatarUrl: studentProfile.avatarUrl || null,
      fatherName: studentProfile.fatherName || "",
      fatherOccupation: studentProfile.fatherOccupation || "",
      fatherPhone: studentProfile.fatherPhone || "",
      motherName: studentProfile.motherName || "",
      motherOccupation: studentProfile.motherOccupation || "",
      motherPhone: studentProfile.motherPhone || "",
      guardianName: studentProfile.guardianName || "",
      guardianRelationship: studentProfile.guardianRelationship || "",
      guardianPhone: studentProfile.guardianPhone || "",
      months: monthsPayload,
    };
  };

  const handleDownloadPDF = async () => {
    const payload = getJournalPayload();
    const promise = generateJournalPDF(payload);
    toast.promise(promise, {
      loading: 'Compiling PDF Journal...',
      success: 'Journal PDF downloaded successfully!',
      error: 'Failed to compile PDF. Please try again.',
    });
  };

  const handleDownloadDOCX = async () => {
    const payload = getJournalPayload();
    const promise = generateJournalDOCX(payload);
    toast.promise(promise, {
      loading: 'Generating Word Document...',
      success: 'Journal (.docx) downloaded successfully!',
      error: 'Failed to generate Word document. Please try again.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Journal</h1>
          <p className="text-muted-foreground mt-1">Post your daily accomplishments — your supervisor will review and approve.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
            onClick={handleDownloadPDF}
            disabled={approved === 0}
          >
            <Download className="h-4 w-4" /> Generate Journal (PDF)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-border text-muted-foreground hover:text-foreground"
            onClick={handleDownloadDOCX}
            disabled={approved === 0}
            title="Download editable Word document (.docx)"
          >
            <FileText className="h-3.5 w-3.5" /> Word (.docx)
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={openAddModal}>
            <Plus className="h-4 w-4" /> Post Daily Entry
          </Button>
        </div>
      </div>

      {/* Profile completeness note */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <span className="mt-0.5 text-base">ℹ️</span>
        <span>
          <strong>Note:</strong> Please complete your <strong>Profile Information</strong> (name, date of birth, address, religion, parent/guardian details, etc.) for a complete and accurate journal document when generated.
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Entries</p><p className="text-2xl font-bold">{accomplishmentList.length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{approved}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Review</p><p className="text-2xl font-bold text-orange-500">{accomplishmentList.length - approved}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Hours</p><p className="text-2xl font-bold text-blue-600">{accomplishmentList.filter(a => a.status === "approved").reduce((s, a) => s + Number(a.hours), 0)}</p></CardContent></Card>
      </div>

      {/* Daily Entries List */}
      <div className="space-y-4">
        {sortedDesc.length === 0 ? (
          <div className="p-8 text-center bg-muted/20 border border-border rounded-xl">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No journal entries yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start posting daily entries to build your OJT journal.</p>
            <Button variant="outline" className="mt-4" onClick={openAddModal}>Post your first entry</Button>
          </div>
        ) : sortedDesc.map(a => (
          <Card key={a.id} className="border border-border shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-2 gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-lg">{formatDate(a.date)}</h3>
                  <p className="text-sm text-muted-foreground">{getDayOfWeek(a.date)} · {a.hours} hours</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">{a.details}</p>
              {a.picture && (
                <img
                  src={resolveUploadUrl(a.picture)!}
                  alt="evidence"
                  className="mt-3 rounded-lg border border-border max-h-56 object-cover"
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>


    </div>
  );
}
