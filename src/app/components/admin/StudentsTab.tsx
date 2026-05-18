import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, Upload, Phone, MapPin, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { AdminStudent } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface StudentsTabProps {
  students: AdminStudent[];
  sections: string[];
  openImportModal: () => void;
}

function age(dob: string | null): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) a--;
  return String(a);
}

function StudentRow({ s }: { s: AdminStudent }) {
  const [expanded, setExpanded] = useState(false);
  const initials = [s.firstName.charAt(0), s.lastName.charAt(0)].filter(Boolean).join("") || s.name.charAt(0);
  const displayName = s.lastName && s.firstName
    ? `${s.lastName}, ${s.firstName}${s.middleName ? " " + s.middleName.charAt(0) + "." : ""}`
    : s.name;

  return (
    <div className="border-b border-border last:border-0">
      <div
        className="flex items-center gap-4 py-3 px-4 hover:bg-muted/20 cursor-pointer transition-colors"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground font-mono">{s.studentId}</p>
        </div>
        <div className="hidden sm:block text-xs text-muted-foreground text-center w-16">
          <span className="font-medium text-foreground">{s.course}</span>
          <br />{s.yearLevel}
        </div>
        <div className="hidden md:block text-xs text-muted-foreground text-center w-10">
          {s.section || "—"}
        </div>
        <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground w-36 truncate">
          <Phone className="h-3 w-3 shrink-0" />{s.phone || "—"}
        </div>
        <div className="shrink-0">
          <StatusBadge status={s.status} />
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-muted/10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-sm ml-13 pl-[52px]">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
              <p className="font-medium">{[s.firstName, s.middleName, s.lastName].filter(Boolean).join(" ") || s.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Student No.</p>
              <p className="font-mono">{s.studentId || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Course / Year / Section</p>
              <p>{s.course} {s.yearLevel} — {s.section || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Date of Birth / Age</p>
              <p>{s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"} / {age(s.dateOfBirth)} yrs</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Sex / Civil Status</p>
              <p>{s.sex || "—"} / {s.civilStatus || "—"}</p>
            </div>
            <div className="flex items-start gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Contact No.</p>
                <p>{s.phone || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5 sm:col-span-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                <p>{s.address || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-1.5 sm:col-span-2 lg:col-span-1">
              <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">PSU Email</p>
                <p className="text-blue-600 break-all">{s.email || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentsTab({ students, sections, openImportModal }: StudentsTabProps) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = students.filter(s =>
    (sectionFilter === "all" || s.section === sectionFilter) &&
    (statusFilter === "all" || s.status === statusFilter) &&
    (search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Student Directory</h1>
          <p className="text-muted-foreground mt-1">{students.length} registered student{students.length !== 1 ? "s" : ""}</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={openImportModal}>
          <Upload className="h-4 w-4" /> Import Students (Excel)
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, student no, or email…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-border rounded-lg px-3 text-sm bg-card" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
          <option value="all">All Sections</option>
          {sections.map(s => <option key={s} value={s}>BSIT {s}</option>)}
        </select>
        <select className="border border-border rounded-lg px-3 text-sm bg-card" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Column headers */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center gap-4 py-2.5 px-4 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground">
            <div className="h-9 w-9 shrink-0" />
            <div className="flex-1">Name / Student No.</div>
            <div className="hidden sm:block w-16 text-center">Course</div>
            <div className="hidden md:block w-10 text-center">Section</div>
            <div className="hidden lg:block w-36">Contact No.</div>
            <div className="w-20 text-right pr-5">Status</div>
          </div>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {students.length === 0 ? "No students yet. Use \"Import Students\" to add them." : "No students match your search."}
            </div>
          ) : (
            filtered.map(s => <StudentRow key={s.id} s={s} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
