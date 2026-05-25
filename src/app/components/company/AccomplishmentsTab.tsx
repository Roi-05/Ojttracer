import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { InternAccomplishment } from "../../hooks/useCompanyData";
import { StatusBadge } from "../student/shared";
import { resolveUploadUrl } from "../../lib/uploads";

interface AccomplishmentsTabProps {
  accomplishments: InternAccomplishment[];
  filterStatus: "all" | "pending" | "approved" | "rejected";
  setFilterStatus: (s: "all" | "pending" | "approved" | "rejected") => void;
  onApprove: (id: string | number) => void;
  onReject: (id: string | number) => void;
}

const fmtDate = (iso: string) =>
  new Date(iso.includes("T") ? iso : iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric"
  });

export function AccomplishmentsTab({ accomplishments, filterStatus, setFilterStatus, onApprove, onReject }: AccomplishmentsTabProps) {
  const filtered = filterStatus === "all" ? accomplishments : accomplishments.filter(a => a.status === filterStatus);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  const pendingCount = accomplishments.filter(a => a.status === "pending").length;
  const approvedCount = accomplishments.filter(a => a.status === "approved").length;
  const rejectedCount = accomplishments.filter(a => a.status === "rejected").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intern Journal Entries</h1>
        <p className="text-muted-foreground mt-1">Review and approve daily journal entries posted by your interns</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm border-l-4 border-l-orange-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-orange-600">{pendingCount}</p></CardContent></Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-green-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-2xl font-bold text-green-600">{approvedCount}</p></CardContent></Card>
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-2xl font-bold text-red-600">{rejectedCount}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map(s => (
          <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} className={`h-8 text-xs capitalize ${filterStatus === s ? "bg-primary text-white" : ""}`} onClick={() => setFilterStatus(s)}>
            {s}
          </Button>
        ))}
      </div>

      <div className="grid gap-4">
        {sorted.length === 0 && (
          <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center text-sm text-muted-foreground">No accomplishments to show.</CardContent></Card>
        )}
        {sorted.map(a => (
          <Card key={a.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                  {a.internName.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold">{a.internName}</h3>
                    <span className="text-xs text-muted-foreground">{fmtDate(a.date)}</span>
                    <span className="text-xs text-muted-foreground">• {a.hours} hrs</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{a.details}</p>
                  {a.picture && <img src={resolveUploadUrl(a.picture)!} alt="evidence" className="mt-3 rounded-lg border border-border max-h-56 object-cover" />}
                </div>
                {a.status === "pending" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => onApprove(a.id)}>
                      <CheckCircle className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => onReject(a.id)}>
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
