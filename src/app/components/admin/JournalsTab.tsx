import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Search, BookOpen, ChevronDown, ChevronUp, Users, FileText } from "lucide-react";
import { JournalLog } from "../../hooks/useAdminData";

interface JournalsTabProps {
  journalLogs: JournalLog[];
}

export function JournalsTab({ journalLogs }: JournalsTabProps) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Filter out any "not_submitted" and keep only valid entries
  const validLogs = journalLogs.filter(j => j.status !== "not_submitted");

  // Group by student
  const groupedLogs = validLogs.reduce((acc, log) => {
    if (!acc[log.student]) acc[log.student] = [];
    acc[log.student].push(log);
    return acc;
  }, {} as Record<string, JournalLog[]>);

  const uniqueSections = ["All", ...Array.from(new Set(validLogs.map(s => s.section))).filter(s => s && s !== "—").sort()];

  const filteredStudents = Object.keys(groupedLogs).filter(student => {
    const studentLogs = groupedLogs[student];
    const matchesSearch = search === "" || student.toLowerCase().includes(search.toLowerCase());
    const matchesSection = sectionFilter === "All" || studentLogs.some(l => l.section === sectionFilter);
    return matchesSearch && matchesSection;
  }).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Journal Monitoring</h1>
          <p className="text-muted-foreground mt-1">Track accomplishment submissions grouped by student</p>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Object.keys(groupedLogs).length}</p>
              <p className="text-xs text-muted-foreground">Students with Entries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-100 text-green-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{validLogs.length}</p>
              <p className="text-xs text-muted-foreground">Total Journal Entries</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by student name…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select 
          className="border border-border rounded-lg px-3 text-sm bg-card"
          value={sectionFilter}
          onChange={e => setSectionFilter(e.target.value)}
        >
          {uniqueSections.map(sec => (
            <option key={sec} value={sec}>{sec === "All" ? "All Sections" : `BSIT ${sec}`}</option>
          ))}
        </select>
      </div>

      {/* Journal list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {filteredStudents.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12 px-4">
              {Object.keys(groupedLogs).length === 0
                ? "No journal entries yet. Students submit accomplishments from their dashboard."
                : "No students match your search."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filteredStudents.map((student) => {
                const logs = groupedLogs[student];
                // Sort logs by newest first based on 'week' or 'submitted'
                const sortedLogs = [...logs].sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime());
                const isExpanded = expandedStudent === student;

                return (
                  <div key={student} className="overflow-hidden">
                    <div
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer ${
                        isExpanded ? "bg-muted/10" : ""
                      }`}
                      onClick={() => setExpandedStudent(isExpanded ? null : student)}
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold uppercase">
                        {student.charAt(0)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{student}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                          {logs.length} {logs.length === 1 ? "entry" : "entries"}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="bg-muted/10 px-5 pb-5 pt-2 border-t border-border">
                        <div className="space-y-3 pl-14">
                          {sortedLogs.map((j, idx) => (
                            <div key={idx} className="bg-background rounded-lg border border-border p-4 shadow-sm hover:border-blue-200 transition-colors">
                              <div className="flex justify-between items-start mb-2 gap-4">
                                <p className="text-sm font-semibold text-foreground">{j.week}</p>
                                <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0 ${
                                  j.status === "approved" ? "bg-green-100 text-green-700" :
                                  j.status === "rejected" ? "bg-red-100 text-red-700" :
                                  "bg-blue-100 text-blue-700"
                                }`}>
                                  {j.status}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                {j.title}
                              </p>
                              {j.submitted !== "—" && (
                                <p className="text-xs text-muted-foreground mt-4 text-right flex justify-end items-center gap-1.5">
                                  <BookOpen className="h-3 w-3" /> Submitted on {j.submitted}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
