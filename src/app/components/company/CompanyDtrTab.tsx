import { useState, useMemo } from "react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import {
  Search, Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays,
  ChevronDown, ChevronRight, UserCheck, Timer, ShieldAlert,
  ThumbsUp, ThumbsDown, Camera, Image, Eye
} from "lucide-react";
import { DTRLog } from "../../hooks/useAdminData";

interface CompanyDtrTabProps {
  dtrLogs: DTRLog[];
  interns?: any[];
  onReviewDtr?: (id: string | number, status: "approved" | "rejected", note?: string) => Promise<void>;
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

export function CompanyDtrTab({ dtrLogs, interns = [], onReviewDtr }: CompanyDtrTabProps) {
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">("all");
  
  // Selfie Modal Preview State
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  
  // Reject Modal State
  const [rejectingLog, setRejectingLog] = useState<DTRLog | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().slice(0, 10);
  })();

  // Group logs by intern (calculate verified hours separately from total hours!)
  const internGroups = useMemo(() => {
    const map = new Map<string | number, {
      studentId: string | number;
      name: string;
      verifiedHours: number;
      pendingHours: number;
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
          verifiedHours: 0,
          pendingHours: 0,
          lastActive: "",
          clockedInToday: false,
          pendingTimeout: false,
          logs: [],
        });
      }
      const g = map.get(key)!;
      if (log.verificationStatus === "approved") {
        g.verifiedHours += log.hours;
      } else if (log.verificationStatus === "pending") {
        g.pendingHours += log.hours;
      }
      
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

  // Compute stats
  const todayLogs = useMemo(() =>
    dtrLogs.filter(l => l.date === today),
    [dtrLogs, today]
  );
  const uniqueTodayStudents = new Set(todayLogs.map(l => l.studentId)).size;
  const pendingTimeouts = todayLogs.filter(l => l.status === "ongoing").length;
  const totalInternsWithDtr = internGroups.length;

  const totalAwaitingVerification = useMemo(() =>
    dtrLogs.filter(l => l.verificationStatus === "pending" && l.timeOut && l.timeOut !== "—").length,
    [dtrLogs]
  );

  const toggleExpand = (id: string | number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getFilteredLogs = (logs: DTRLog[]) => {
    let sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
    if (dateFilter === "today") return sorted.filter(l => l.date === today);
    if (dateFilter === "week") return sorted.filter(l => l.date >= weekStart);
    return sorted;
  };

  const handleApprove = async (log: DTRLog) => {
    if (!onReviewDtr || !log.id) return;
    await onReviewDtr(log.id, "approved");
  };

  const openRejectModal = (log: DTRLog) => {
    setRejectingLog(log);
    setRejectNote("");
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onReviewDtr || !rejectingLog || !rejectingLog.id) return;
    try {
      setSubmittingReject(true);
      await onReviewDtr(rejectingLog.id, "rejected", rejectNote);
      setRejectingLog(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReject(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Intern Attendance</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and verify daily time records and selfie uploads for OJT interns.
        </p>
      </div>

      {/* 4-Column Stats Summary Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 bg-white/70 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100/80 rounded-xl flex items-center justify-center flex-shrink-0">
              <UserCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Present Today</p>
              <p className="text-xl font-bold mt-0.5">{uniqueTodayStudents}</p>
              <p className="text-[10px] text-muted-foreground">of {totalInternsWithDtr} deployed</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-border/80 bg-white/70 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-100/80 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pending Timeout</p>
              <p className="text-xl font-bold text-amber-600 mt-0.5">{pendingTimeouts}</p>
              <p className="text-[10px] text-muted-foreground">interns currently active</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-white/70 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-100/80 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Review Awaiting</p>
              <p className="text-xl font-bold text-rose-600 mt-0.5">{totalAwaitingVerification}</p>
              <p className="text-[10px] text-muted-foreground">records to verify</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-white/70 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100/80 rounded-xl flex items-center justify-center flex-shrink-0">
              <Timer className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Verified Hours</p>
              <p className="text-xl font-bold text-green-600 mt-0.5">
                {internGroups.reduce((s, g) => s + g.verifiedHours, 0).toFixed(0)}h
              </p>
              <p className="text-[10px] text-muted-foreground">approved OJT credit</p>
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

      {/* Intern lists */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border border-border/80 bg-white/70 shadow-sm">
            <CardContent className="py-16 text-center text-muted-foreground text-sm">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No attendance records found</p>
            </CardContent>
          </Card>
        ) : filtered.map(g => {
          const isOpen = expandedIds.has(g.studentId);
          const pct = Math.min(100, (g.verifiedHours / REQUIRED_HOURS) * 100);
          const filteredLogs = getFilteredLogs(g.logs);
          const completeToday = todayLogs.filter(l => l.studentId === g.studentId && l.status === "regular").length > 0;
          const missingTimeout = g.pendingTimeout;
          
          const awaitingCount = g.logs.filter(l => l.verificationStatus === "pending" && l.timeOut && l.timeOut !== "—").length;

          return (
            <Card key={g.studentId} className="border border-border/60 bg-white shadow-sm overflow-hidden transition-all duration-300">
              {/* Intern Row Header */}
              <button
                className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/20 transition-colors"
                onClick={() => toggleExpand(g.studentId)}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors ${
                  g.clockedInToday ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                }`}>
                  {g.name.charAt(0).toUpperCase()}
                </div>

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
                    {awaitingCount > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse">
                        {awaitingCount} review{awaitingCount > 1 ? "s" : ""} pending
                      </span>
                    )}
                  </div>

                  {/* Verified Hours Progress bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-semibold flex-shrink-0 ${progressTextColor(pct)}`}>
                      {g.verifiedHours.toFixed(0)}h / {REQUIRED_HOURS}h
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      ({pct.toFixed(0)}% verified)
                    </span>
                    {g.pendingHours > 0 && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                        +{g.pendingHours.toFixed(1)}h pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
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

                <div className="text-muted-foreground flex-shrink-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
              </button>

              {/* Expanded DTR Log & Verification interface */}
              {isOpen && (
                <div className="border-t border-border/60 bg-muted/5">
                  {filteredLogs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No records for the selected period.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="text-left py-2.5 px-5 font-medium text-muted-foreground text-xs">Date</th>
                            <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Time In Selfie</th>
                            <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Time Out Selfie</th>
                            <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Worked</th>
                            <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Remarks</th>
                            <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Verification status</th>
                            <th className="text-center py-2.5 px-5 font-medium text-muted-foreground text-xs w-[180px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLogs.map((log, i) => {
                            const isPendingReview = log.verificationStatus === "pending" && log.timeOut && log.timeOut !== "—";
                            
                            return (
                              <tr key={i} className="border-t border-border/40 hover:bg-muted/10 transition-colors">
                                <td className="py-3 px-5 whitespace-nowrap">
                                  <div className="font-semibold text-xs text-foreground">{formatDate(log.date)}</div>
                                  <div className="text-[10px] text-muted-foreground capitalize">{log.day}</div>
                                </td>
                                
                                {/* Time-In selfie thumbnail */}
                                <td className="py-3 px-4">
                                  {log.timeIn !== "—" ? (
                                    <div className="flex items-center gap-2">
                                      {log.timeInPhotoUrl ? (
                                        <button 
                                          onClick={() => setPreviewPhoto({ url: log.timeInPhotoUrl!, title: `Time-In Selfie - ${formatDate(log.date)} (${formatTime(log.timeIn)})` })}
                                          className="relative group h-9 w-9 rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-primary flex-shrink-0"
                                        >
                                          <img src={log.timeInPhotoUrl} alt="in" className="h-full w-full object-cover" />
                                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Eye className="h-3 w-3 text-white" />
                                          </div>
                                        </button>
                                      ) : (
                                        <div className="h-9 w-9 rounded-lg border border-border/50 bg-muted/40 flex items-center justify-center text-muted-foreground flex-shrink-0">
                                          <Camera className="h-4 w-4 opacity-30" />
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-mono text-xs font-semibold text-foreground">{formatTime(log.timeIn)}</span>
                                      </div>
                                    </div>
                                  ) : "—"}
                                </td>

                                {/* Time-Out selfie thumbnail */}
                                <td className="py-3 px-4">
                                  {log.timeOut !== "—" ? (
                                    <div className="flex items-center gap-2">
                                      {log.timeOutPhotoUrl ? (
                                        <button 
                                          onClick={() => setPreviewPhoto({ url: log.timeOutPhotoUrl!, title: `Time-Out Selfie - ${formatDate(log.date)} (${formatTime(log.timeOut)})` })}
                                          className="relative group h-9 w-9 rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-primary flex-shrink-0"
                                        >
                                          <img src={log.timeOutPhotoUrl} alt="out" className="h-full w-full object-cover" />
                                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <Eye className="h-3 w-3 text-white" />
                                          </div>
                                        </button>
                                      ) : (
                                        <div className="h-9 w-9 rounded-lg border border-border/50 bg-muted/40 flex items-center justify-center text-muted-foreground flex-shrink-0">
                                          <Camera className="h-4 w-4 opacity-30" />
                                        </div>
                                      )}
                                      <div>
                                        <span className="font-mono text-xs font-semibold text-foreground">{formatTime(log.timeOut)}</span>
                                      </div>
                                    </div>
                                  ) : "—"}
                                </td>

                                <td className="py-3 px-4 font-semibold text-xs text-foreground whitespace-nowrap">
                                  {log.hours > 0 ? `${log.hours.toFixed(2)}h` : "—"}
                                </td>

                                <td className="py-3 px-4 text-xs text-muted-foreground">{log.remarks || "Regular"}</td>

                                {/* Verification Status badge */}
                                <td className="py-3 px-4">
                                  {log.verificationStatus === "approved" && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                                    </span>
                                  )}
                                  {log.verificationStatus === "rejected" && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200" title={log.reviewNote}>
                                      <XCircle className="h-3.5 w-3.5" /> Rejected
                                    </span>
                                  )}
                                  {log.verificationStatus === "pending" && (
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${
                                      log.timeOut && log.timeOut !== "—" 
                                        ? "bg-rose-50 text-rose-600 border border-rose-200/60 animate-pulse" 
                                        : "bg-amber-50 text-amber-600 border border-amber-200/60"
                                    }`}>
                                      <Clock className="h-3.5 w-3.5" /> {log.timeOut && log.timeOut !== "—" ? "Pending Review" : "Active / Rest"}
                                    </span>
                                  )}
                                </td>

                                {/* Interactive Action Buttons */}
                                <td className="py-3 px-5 text-center">
                                  {isPendingReview ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => handleApprove(log)}
                                        className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                                        title="Approve & verified DTR hours"
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5" /> Approve
                                      </button>
                                      <button
                                        onClick={() => openRejectModal(log)}
                                        className="h-7 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                                        title="Reject DTR hours"
                                      >
                                        <ThumbsDown className="h-3.5 w-3.5" /> Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground">
                                      {log.verificationStatus === "rejected" && log.reviewNote 
                                        ? `Note: "${log.reviewNote}"` 
                                        : "No actions needed"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Selfie Photo Preview Lightbox Dialog */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <div 
            className="bg-white rounded-xl overflow-hidden shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-sm text-foreground">{previewPhoto.title}</h3>
              <button onClick={() => setPreviewPhoto(null)} className="text-muted-foreground hover:text-foreground text-xl font-bold">×</button>
            </div>
            <div className="flex-1 bg-muted p-6 flex items-center justify-center overflow-hidden">
              <img src={previewPhoto.url} alt="selfie big" className="max-h-[50vh] w-auto object-contain rounded-lg shadow-md border border-border" />
            </div>
            <div className="px-5 py-4 bg-muted/30 border-t border-border flex justify-end">
              <button 
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-2 bg-foreground text-background rounded-lg font-semibold text-xs hover:opacity-90"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Verification Dialog Modal */}
      {rejectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-rose-50">
              <h3 className="font-bold text-rose-700 text-sm flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" /> Reject Attendance Record
              </h3>
              <button onClick={() => setRejectingLog(null)} className="text-rose-700/60 hover:text-rose-700 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleRejectSubmit}>
              <div className="p-5 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Specify the reason for rejecting <strong>{rejectingLog.student}</strong>'s attendance on <strong>{formatDate(rejectingLog.date)}</strong>. This note will be visible to the student.
                </p>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Rejection Reason / Comments</label>
                  <textarea
                    required
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="e.g. Photo upload is blurry / Selfies do not match / Clocked out too early"
                    className="w-full h-24 p-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="px-5 py-4 bg-muted/40 border-t border-border flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingLog(null)}
                  className="px-4 py-2 border border-border hover:bg-muted text-foreground font-semibold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-xs disabled:opacity-55 flex items-center gap-1.5"
                >
                  {submittingReject ? "Saving..." : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
