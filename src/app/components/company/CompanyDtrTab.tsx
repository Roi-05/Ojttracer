import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import {
  Search, Clock, CheckCircle2, AlertCircle, CalendarDays,
  ChevronDown, ChevronRight, UserCheck, Timer, TrendingUp,
} from "lucide-react";
import { DTRLog } from "../../hooks/useAdminData";

interface CompanyDtrTabProps {
  dtrLogs: DTRLog[];
  interns?: any[];
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

function formatDate(d: string) {
  if (!d || d === "—") return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function progressColor(pct: number) {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 60) return "bg-blue-500";
  if (pct >= 30) return "bg-amber-500";
  return "bg-red-400";
}

function progressTextColor(pct: number) {
  if (pct >= 100) return "text-green-600";
  if (pct >= 60) return "text-blue-600";
  if (pct >= 30) return "text-amber-600";
  return "text-red-500";
}

const REQUIRED_HOURS = 486;

export function CompanyDtrTab({ dtrLogs, interns = [] }: CompanyDtrTabProps) {
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">("all");

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().slice(0, 10);
  })();

  // Group logs by intern
  const internGroups = useMemo(() => {
    const map = new Map<string | number, {
      studentId: string | number;
      name: string;
      totalHours: number;
      lastActive: string;
      clockedInToday: boolean;
      pendingTimeout: boolean;
      logs: DTRLog[];
    }>();

    for (const log of dtrLogs) {
      const key = log.studentId;
      if (!map.has(key)) {
        map.set(key, {
          studentId: key,
          name: log.student,
          totalHours: 0,
          lastActive: "",
          clockedInToday: false,
          pendingTimeout: false,
          logs: [],
        });
      }
      const g = map.get(key)!;
      g.totalHours += log.hours;
      g.logs.push(log);
      if (!g.lastActive || log.date > g.lastActive) g.lastActive = log.date;
      if (log.date === today) {
        if (log.status === "ongoing") { g.clockedInToday = true; g.pendingTimeout = true; }
        if (log.status === "regular") g.clockedInToday = true;
      }
    }
    return Array.from(map.values());
  }, [dtrLogs, today]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return internGroups.filter(g => {
      const matchSearch = !q || g.name.toLowerCase().includes(q);
      return matchSearch;
    });
  }, [internGroups, search]);

  // Compute today's attendance from logs directly
  const todayLogs = useMemo(() =>
    dtrLogs.filter(l => l.date === today),
    [dtrLogs, today]
  );
  const uniqueTodayStudents = new Set(todayLogs.map(l => l.studentId)).size;
  const pendingTimeouts = todayLogs.filter(l => l.status === "ongoing").length;
  const totalInternsWithDtr = internGroups.length;

  const toggleExpand = (id: string | number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getFilteredLogs = (logs: DTRLog[]) => {
    if (dateFilter === "today") return logs.filter(l => l.date === today);
    if (dateFilter === "week") return logs.filter(l => l.date >= weekStart);
    return [...logs].sort((a, b) => b.date.localeCompare(a.date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Intern Attendance</h1>
        <p className="text-muted-foreground mt-1">
          Monitor daily time records for interns assigned to your establishment
        </p>
      </div>

      {/* At-a-glance summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Present Today</p>
              <p className="text-2xl font-bold">{uniqueTodayStudents}</p>
              <p className="text-xs text-muted-foreground">of {totalInternsWithDtr} interns</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Time-Out</p>
              <p className="text-2xl font-bold text-amber-600">{pendingTimeouts}</p>
              <p className="text-xs text-muted-foreground">still clocked in</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Timer className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hours Rendered</p>
              <p className="text-2xl font-bold text-green-600">
                {internGroups.reduce((s, g) => s + g.totalHours, 0).toFixed(0)}h
              </p>
              <p className="text-xs text-muted-foreground">across all interns</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search intern by name..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {([["all", "All Time"], ["today", "Today"], ["week", "This Week"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDateFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === val
                  ? "bg-primary text-white"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Intern cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground text-sm">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No attendance records yet</p>
              <p className="mt-1 text-xs">Intern attendance will appear here once they clock in.</p>
            </CardContent>
          </Card>
        ) : filtered.map(g => {
          const isOpen = expandedIds.has(g.studentId);
          const pct = Math.min(100, (g.totalHours / REQUIRED_HOURS) * 100);
          const filteredLogs = getFilteredLogs(g.logs);
          const completeToday = todayLogs.filter(l => l.studentId === g.studentId && l.status === "regular").length > 0;
          const missingTimeout = g.pendingTimeout;

          return (
            <Card key={g.studentId} className="border-0 shadow-sm overflow-hidden">
              {/* Intern row header */}
              <button
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                onClick={() => toggleExpand(g.studentId)}
              >
                {/* Avatar / initials */}
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  g.clockedInToday ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                }`}>
                  {g.name.charAt(0).toUpperCase()}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{g.name}</span>
                    {missingTimeout && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Clocked In
                      </span>
                    )}
                    {completeToday && !missingTimeout && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Complete Today
                      </span>
                    )}
                    {!g.clockedInToday && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Absent Today
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progressColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold flex-shrink-0 ${progressTextColor(pct)}`}>
                      {g.totalHours.toFixed(0)}h / {REQUIRED_HOURS}h
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> {g.logs.length} day{g.logs.length !== 1 ? "s" : ""} logged
                    </span>
                    {g.lastActive && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Last: {formatDate(g.lastActive)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand chevron */}
                <div className="text-muted-foreground flex-shrink-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>

              {/* Expanded DTR log */}
              {isOpen && (
                <div className="border-t border-border">
                  {filteredLogs.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No records for the selected period.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30">
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
                          {filteredLogs.map((log, i) => (
                            <tr key={i} className="border-t border-border/40 hover:bg-muted/10 transition-colors">
                              <td className="py-3 px-5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.date)}</td>
                              <td className="py-3 px-4 text-xs capitalize">{log.timeIn !== "—" ? log.day || "—" : "—"}</td>
                              <td className="py-3 px-4 text-xs font-mono font-medium">{formatTime(log.timeIn)}</td>
                              <td className="py-3 px-4 text-xs font-mono font-medium">{formatTime(log.timeOut)}</td>
                              <td className="py-3 px-4 text-xs">{log.hours > 0 ? `${log.hours.toFixed(2)}h` : "—"}</td>
                              <td className="py-3 px-4">
                                {log.status === "regular" && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                    <CheckCircle2 className="h-3 w-3" /> Complete
                                  </span>
                                )}
                                {log.status === "ongoing" && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                    <Clock className="h-3 w-3" /> No Time-Out
                                  </span>
                                )}
                                {log.status !== "regular" && log.status !== "ongoing" && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Rest Day</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-border bg-muted/20">
                          <tr>
                            <td colSpan={4} className="py-2.5 px-5 text-xs font-semibold text-muted-foreground">Subtotal</td>
                            <td className="py-2.5 px-4 text-xs font-bold">
                              {filteredLogs.reduce((s, l) => s + l.hours, 0).toFixed(2)}h
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
