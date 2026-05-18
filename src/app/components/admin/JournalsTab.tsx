import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Search, BookOpen, CheckCircle2, XCircle, Eye } from "lucide-react";
import { JournalLog } from "../../hooks/useAdminData";

interface JournalsTabProps {
  journalLogs: JournalLog[];
}

export function JournalsTab({ journalLogs }: JournalsTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const submitted    = journalLogs.filter(j => j.status === "submitted").length;
  const notSubmitted = journalLogs.filter(j => j.status === "not_submitted").length;
  const submissionRate = journalLogs.length ? Math.round((submitted / journalLogs.length) * 100) : 0;

  const filtered = journalLogs.filter(j =>
    (statusFilter === "all" || j.status === statusFilter) &&
    (search === "" || j.student.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Journal Monitoring</h1>
        <p className="text-muted-foreground mt-1">Track weekly accomplishment submissions across all students</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{journalLogs.length}</p>
              <p className="text-xs text-muted-foreground">Total Entries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-100 text-green-600 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{submitted}</p>
              <p className="text-xs text-muted-foreground">Submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-100 text-red-600 shrink-0">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notSubmitted}</p>
              <p className="text-xs text-muted-foreground">Not Submitted</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submission rate */}
      {journalLogs.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium">Overall Submission Rate</span>
              <span className="font-bold text-green-600">{submissionRate}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${submissionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by student name…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-border rounded-lg px-3 text-sm bg-card" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="not_submitted">Not Submitted</option>
        </select>
      </div>

      {/* Journal list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Journal Entries ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12 px-4">
              {journalLogs.length === 0
                ? "No journal entries yet. Students submit accomplishments from their dashboard."
                : "No entries match your search."}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((j, i) => (
                <div key={i}>
                  <div
                    className={`flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer ${
                      j.status === "not_submitted" ? "bg-red-50/50" : ""
                    }`}
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      j.status === "submitted" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                    }`}>
                      {j.status === "submitted" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{j.student}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {j.week !== "—" ? j.week : "No date"}{j.title !== "—" ? ` — ${j.title}` : ""}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3">
                      <div>
                        <p className={`text-xs font-semibold ${j.status === "submitted" ? "text-green-600" : "text-red-500"}`}>
                          {j.status === "submitted" ? "Submitted" : "Not Submitted"}
                        </p>
                        <p className="text-xs text-muted-foreground">{j.submitted !== "—" ? j.submitted : "—"}</p>
                      </div>
                      {j.status === "submitted" && (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded content */}
                  {expanded === i && j.title !== "—" && (
                    <div className="px-16 pb-4 pt-1 bg-muted/10">
                      <p className="text-sm font-medium mb-1 text-muted-foreground">Journal Entry</p>
                      <p className="text-sm leading-relaxed">{j.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
