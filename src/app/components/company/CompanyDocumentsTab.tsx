import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { FileText, Eye, CheckCircle2, Clock, AlertCircle, Search, Users, ShieldCheck, Download } from "lucide-react";
import { InternSubmission } from "../../hooks/useCompanyData";
import { InternDocumentsModal } from "./InternDocumentsModal";

interface CompanyDocumentsTabProps {
  internDocuments: InternSubmission[];
  loading?: boolean;
}

export function CompanyDocumentsTab({
  internDocuments,
  loading = false,
}: CompanyDocumentsTabProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");
  const [selectedIntern, setSelectedIntern] = useState<InternSubmission | null>(null);

  const filteredInterns = useMemo(() => {
    return internDocuments.filter((intern) => {
      const matchSearch =
        intern.studentName.toLowerCase().includes(search.toLowerCase()) ||
        intern.studentNo.toLowerCase().includes(search.toLowerCase()) ||
        intern.position.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      const totalDocs = intern.docs.length;
      const approvedDocs = intern.docs.filter((d) => d.status === "approved").length;
      const isComplete = totalDocs > 0 && approvedDocs === totalDocs;

      if (filter === "completed") return isComplete;
      if (filter === "pending") return !isComplete;
      return true;
    });
  }, [internDocuments, search, filter]);

  const totalInterns = internDocuments.length;
  const completeInterns = internDocuments.filter(
    (i) => i.docs.length > 0 && i.docs.filter((d) => d.status === "approved").length === i.docs.length
  ).length;
  const pendingInterns = totalInterns - completeInterns;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Intern Compliance Documents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and download institutional OJT compliance documents submitted by your assigned interns
          </p>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-2xs bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalInterns}</p>
              <p className="text-xs text-muted-foreground">Assigned Interns</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xs bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{completeInterns}</p>
              <p className="text-xs text-muted-foreground">Full Compliance Approved</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xs bg-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{pendingInterns}</p>
              <p className="text-xs text-muted-foreground">Incomplete / Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by intern name, student ID, or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setFilter("all")}
          >
            All ({totalInterns})
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setFilter("completed")}
          >
            Completed ({completeInterns})
          </Button>
          <Button
            variant={filter === "pending" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingInterns})
          </Button>
        </div>
      </div>

      {/* Interns Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/10">
          <CardTitle className="text-base">Intern Document Submissions</CardTitle>
          <CardDescription>
            Official clearance files including Parent Consent, Endorsement Letter, and Medical Clearances
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInterns.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {internDocuments.length === 0
                ? "No interns currently deployed to your company."
                : "No intern records match your search criteria."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Intern</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Course & Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Compliance Progress</th>
                    <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterns.map((intern, idx) => {
                    const totalDocs = intern.docs.length;
                    const approvedDocs = intern.docs.filter((d) => d.status === "approved").length;
                    const submittedDocs = intern.docs.filter((d) => !!d.fileUrl).length;
                    const pct = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;
                    const isComplete = totalDocs > 0 && approvedDocs === totalDocs;

                    return (
                      <tr
                        key={intern.studentId}
                        className={`border-b border-border last:border-0 hover:bg-muted/10 transition-colors ${
                          idx % 2 === 0 ? "bg-muted/5" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-foreground">{intern.studentName}</p>
                          <p className="text-xs text-muted-foreground">{intern.studentNo}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-foreground">{intern.position}</p>
                          <p className="text-xs text-muted-foreground">
                            {intern.course} {intern.section}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5 min-w-[140px] max-w-[200px]">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isComplete ? "bg-emerald-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                              {approvedDocs}/{totalDocs || 5}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {submittedDocs} uploaded • {approvedDocs} approved
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Fully Complied
                            </span>
                          ) : submittedDocs > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="h-3 w-3" /> Pending Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              <AlertCircle className="h-3 w-3" /> Missing Docs
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5 border-border hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                            onClick={() => setSelectedIntern(intern)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View Documents</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document modal */}
      <InternDocumentsModal
        intern={selectedIntern}
        open={!!selectedIntern}
        onClose={() => setSelectedIntern(null)}
      />
    </div>
  );
}
