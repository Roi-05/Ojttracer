import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Search, BookOpen, Eye } from "lucide-react";
import { JournalLog } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface JournalsTabProps {
  journalLogs: JournalLog[];
}

export function JournalsTab({ journalLogs }: JournalsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Journal Monitoring</h1>
        <p className="text-muted-foreground mt-1">Review student journal and accomplishment submissions</p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search student..." className="pl-9" /></div>
        <select className="border border-border rounded-lg px-3 text-sm bg-card"><option>All Status</option><option>Submitted</option><option>Not Submitted</option></select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Weekly Journal Submissions — Week 11</CardTitle>
          <CardDescription>April 14–18, 2026</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {journalLogs.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No journal entries yet. Student submissions will appear here once posted.</p>
          )}
          {journalLogs.map((j, i) => (
            <div key={i} className={`flex items-center gap-4 p-3 rounded-lg border ${j.status === "not_submitted" ? "border-red-100 bg-red-50" : "border-border bg-muted/20"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${j.status === "submitted" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-500"}`}>
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{j.student}</p>
                <p className="text-xs text-muted-foreground truncate">{j.week} {j.title !== "—" ? `— ${j.title}` : ""}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <StatusBadge status={j.status} />
                <p className="text-xs text-muted-foreground mt-0.5">{j.submitted !== "—" ? `Submitted ${j.submitted}` : "No submission"}</p>
              </div>
              {j.status === "submitted" && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 flex-shrink-0"><Eye className="h-3.5 w-3.5" /></Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
