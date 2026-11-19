import { useState, useMemo } from "react";
import { Search, Filter, GraduationCap, Building2, Clock, CheckCircle } from "lucide-react";
import { Input } from "../ui/input";
import { AdminStudent } from "../../hooks/useAdminData";

const COURSES = ["ALL", "BSIT", "BEED", "BSSW", "BSBA"] as const;

interface SuperAdminStudentsTabProps {
  students: AdminStudent[];
}

export function SuperAdminStudentsTab({ students }: SuperAdminStudentsTabProps) {
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [selectedSy, setSelectedSy] = useState<string>("ALL");

  const schoolYears = useMemo(() => {
    const sys = new Set<string>();
    students.forEach(s => {
      if (s.schoolYear) sys.add(s.schoolYear);
    });
    return Array.from(sys);
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      // Course filter
      if (selectedCourse !== "ALL") {
        if ((s.course || "BSIT").toUpperCase() !== selectedCourse) return false;
      }
      // SY filter
      if (selectedSy !== "ALL") {
        if (s.schoolYear !== selectedSy) return false;
      }
      // Search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchNum = s.studentId?.toLowerCase().includes(q);
        const matchComp = s.company?.toLowerCase().includes(q);
        const matchSec = s.section?.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchComp && !matchSec) return false;
      }
      return true;
    });
  }, [students, selectedCourse, selectedSy, search]);

  return (
    <div className="space-y-4">
      {/* Controls & Filter bar */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by student name, number, section, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* School Year Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Cohort:</span>
            <select
              value={selectedSy}
              onChange={(e) => setSelectedSy(e.target.value)}
              aria-label="Filter by School Year"
              className="border border-border bg-background rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="ALL">All School Years</option>
              {schoolYears.map((sy) => (
                <option key={sy} value={sy}>S.Y. {sy}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Course Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/50">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Department:
          </span>
          {COURSES.map((crs) => {
            const count = crs === "ALL" 
              ? students.length 
              : students.filter(s => (s.course || "BSIT").toUpperCase() === crs).length;
            const active = selectedCourse === crs;
            return (
              <button
                key={crs}
                onClick={() => setSelectedCourse(crs)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {crs} <span className="opacity-70 text-[10px] ml-1">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">
            Displaying {filtered.length} of {students.length} students
          </p>
          <span className="text-[11px] text-muted-foreground">Read-only oversight</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-sm text-foreground">No students matched</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your department or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Program / Sec</th>
                  <th className="py-3 px-4">School Year</th>
                  <th className="py-3 px-4">Host Company</th>
                  <th className="py-3 px-4">Hours Logged</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((s) => {
                  const courseBadge = 
                    s.course === "BSIT" ? "bg-blue-100 text-blue-800 border-blue-200" :
                    s.course === "BEED" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                    s.course === "BSSW" ? "bg-amber-100 text-amber-800 border-amber-200" :
                    "bg-purple-100 text-purple-800 border-purple-200";

                  const progress = Math.min(100, Math.round(((s.hoursCompleted || 0) / (s.requiredHours || 486)) * 100));

                  return (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground text-sm leading-tight">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{s.studentId || "—"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${courseBadge}`}>
                            {s.course || "BSIT"}
                          </span>
                          <span className="text-muted-foreground text-xs">{s.section || "—"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground font-medium">
                        {s.schoolYear || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        {s.company && s.company !== "—" ? (
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[160px]">{s.company}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Undeployed</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[11px] font-medium">
                            <span>{s.hoursCompleted || 0}h</span>
                            <span className="text-muted-foreground">{progress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                          s.status === "completed" ? "bg-emerald-100 text-emerald-800" :
                          s.status === "ongoing" || s.company ? "bg-blue-100 text-blue-800" :
                          "bg-amber-100 text-amber-800"
                        }`}>
                          {s.status || (s.company ? "Ongoing" : "Pending")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

