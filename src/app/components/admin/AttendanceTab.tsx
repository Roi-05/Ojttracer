import { useState, useMemo } from "react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Search, ChevronDown, ChevronRight, Clock, ClockIcon, User, BookOpen } from "lucide-react";
import { DTRLog } from "../../hooks/useAdminData";

interface AttendanceTabProps {
  dtrLogs: DTRLog[];
  title?: string;
  subtitle?: string;
}

function formatTime(t: string) {
  if (!t || t === "—") return "—";
  const match = t.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return t;
  let h = parseInt(match[1]);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function statusBadge(status: string) {
  if (status === "regular") return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Complete</span>;
  if (status === "ongoing") return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">No Timeout</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Rest Day</span>;
}

type StudentGroup = {
  studentId: string | number;
  name: string;
  studentNumber: string;
  section: string;
  totalHours: number;
  lastActive: string;
  logs: DTRLog[];
};

export function AttendanceTab({
  dtrLogs,
  title = "Attendance Monitoring",
  subtitle = "Student DTR records grouped by individual — expand to view full history",
}: AttendanceTabProps) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());

  // Derive unique sections from data
  const sections = useMemo(() => {
    const s = new Set(dtrLogs.map(l => l.section).filter(x => x && x !== "—"));
    return ["All", ...Array.from(s).sort()];
  }, [dtrLogs]);

  // Group logs by student
  const studentGroups = useMemo<StudentGroup[]>(() => {
    const map = new Map<string | number, StudentGroup>();
    for (const log of dtrLogs) {
      const key = log.studentId;
      if (!map.has(key)) {
        map.set(key, {
          studentId: key,
          name: log.student,
          studentNumber: log.studentNumber,
          section: log.section,
          totalHours: 0,
          lastActive: log.date,
          logs: [],
        });
      }
      const g = map.get(key)!;
      g.totalHours += log.hours;
      g.logs.push(log);
      if (log.date > g.lastActive) g.lastActive = log.date;
    }
    return Array.from(map.values());
  }, [dtrLogs]);

  // Apply filters
  const filtered = useMemo(() => {
    return studentGroups.filter(g => {
      const matchSection = sectionFilter === "All" || g.section === sectionFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || g.name.toLowerCase().includes(q) || g.studentNumber.toLowerCase().includes(q);
      return matchSection && matchSearch;
    });
  }, [studentGroups, sectionFilter, search]);

  const toggleExpand = (id: string | number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const totalHoursAll = filtered.reduce((s, g) => s + g.totalHours, 0);
  const totalLogsAll = filtered.reduce((s, g) => s + g.logs.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-100 rounded-lg flex items-center justify-center"><User className="h-4 w-4 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Students with DTR</p><p className="text-lg font-bold">{filtered.length}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 bg-green-100 rounded-lg flex items-center justify-center"><ClockIcon className="h-4 w-4 text-green-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total DTR Entries</p><p className="text-lg font-bold">{totalLogsAll}</p></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 bg-purple-100 rounded-lg flex items-center justify-center"><BookOpen className="h-4 w-4 text-purple-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Hours Logged</p><p className="text-lg font-bold">{totalHoursAll.toFixed(1)}h</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or student no..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {sections.map(s => (
            <button
              key={s}
              onClick={() => setSectionFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sectionFilter === s
                  ? "bg-primary text-white"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Student list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-14 text-center text-muted-foreground text-sm">
              No DTR records found. Students will appear here once they clock in.
            </CardContent>
          </Card>
        ) : filtered.map(g => {
          const isOpen = expandedIds.has(g.studentId);
          const complete = g.logs.filter(l => l.status === "regular").length;
          const incomplete = g.logs.filter(l => l.status === "ongoing").length;

          return (
            <Card key={g.studentId} className="border-0 shadow-sm overflow-hidden">
              {/* Student row header — clickable to expand */}
              <button
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(g.studentId)}
              >
                <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm flex-shrink-0">
                  {g.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{g.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{g.studentNumber}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Section {g.section}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{g.totalHours.toFixed(1)}h logged</span>
                    <span>{g.logs.length} day{g.logs.length !== 1 ? "s" : ""} on record</span>
                    {incomplete > 0 && <span className="text-yellow-600 font-medium">{incomplete} missing timeout</span>}
                    {complete > 0 && <span className="text-green-600 font-medium">{complete} complete</span>}
                    <span className="text-muted-foreground/60">Last: {g.lastActive}</span>
                  </div>
                </div>
                <div className="text-muted-foreground flex-shrink-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>

              {/* Expanded DTR table */}
              {isOpen && (
                <div className="border-t border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left py-2.5 px-5 font-medium text-muted-foreground text-xs">Date</th>
                          <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Day</th>
                          <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Time In</th>
                          <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Time Out</th>
                          <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Hours</th>
                          <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.logs.map((log, i) => (
                          <tr key={i} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-5 text-xs text-muted-foreground">{log.date}</td>
                            <td className="py-2.5 px-4 text-xs capitalize">{log.timeIn !== "—" ? log.day || "—" : "—"}</td>
                            <td className="py-2.5 px-4 text-xs font-mono">{formatTime(log.timeIn)}</td>
                            <td className="py-2.5 px-4 text-xs font-mono">{formatTime(log.timeOut)}</td>
                            <td className="py-2.5 px-4 text-xs">{log.hours > 0 ? `${log.hours.toFixed(2)}h` : "—"}</td>
                            <td className="py-2.5 px-4">{statusBadge(log.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-border bg-muted/20">
                        <tr>
                          <td colSpan={4} className="py-2 px-5 text-xs font-semibold text-muted-foreground">Total</td>
                          <td className="py-2 px-4 text-xs font-bold">{g.totalHours.toFixed(2)}h</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
