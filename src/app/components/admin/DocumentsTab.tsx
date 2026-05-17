import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Upload, FileText, Eye, Download, Trash2, Briefcase } from "lucide-react";
import { AdminTemplate, AdminSubmission } from "../../hooks/useAdminData";
import { REQUIRED_DOC_NAMES } from "../../hooks/useStudentData";
import { StatusBadge } from "../student/shared";

interface DocumentsTabProps {
  templates: AdminTemplate[];
  studentSubmissions: AdminSubmission[];
  openTemplateUpload: (templateName: string) => void;
  deleteTemplate: (name: string, docSlug: string | null) => void;
  openReviewSubmission: (studentId: string | number) => void;
  openDeployModal: (studentId: string | number) => void;
}

export function DocumentsTab({
  templates,
  studentSubmissions,
  openTemplateUpload,
  deleteTemplate,
  openReviewSubmission,
  openDeployModal
}: DocumentsTabProps) {
  const totalDocs = REQUIRED_DOC_NAMES.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-muted-foreground mt-1">Upload templates and review student-submitted OJT documents</p>
        </div>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={() => openTemplateUpload(REQUIRED_DOC_NAMES[0])}>
          <Upload className="h-4 w-4" /> Upload Template
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Templates</CardTitle>
          <CardDescription>Templates students can view and download as reference for their submissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {templates.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${t.file ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.file ? `${t.size} • ${t.uploaded}` : "No template uploaded"}</p>
                </div>
                {t.file ? (
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <a href={t.file} target="_blank" rel="noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <a href={t.file} download><Download className="h-3.5 w-3.5" /></a>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => openTemplateUpload(t.name)}>Replace</Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => deleteTemplate(t.name, t.docSlug)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : (
                  <Button size="sm" className="h-7 text-xs gap-1 bg-primary hover:bg-primary/90 text-white" onClick={() => openTemplateUpload(t.name)}>
                    <Upload className="h-3 w-3" /> Upload
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Student Submissions</CardTitle>
          <CardDescription>Review documents submitted by students and deploy them once complete</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Student</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Section</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Documents</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentSubmissions.map((s, i) => {
                  const approved = s.docs.filter(d => d.status === "approved").length;
                  const pct = Math.round((approved / totalDocs) * 100);
                  const complete = approved === totalDocs;
                  return (
                    <tr key={s.studentId} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "bg-muted/10" : ""}`}>
                      <td className="py-3 px-4">
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.studentNo}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">BSIT {s.section}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${complete ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs whitespace-nowrap">{approved}/{totalDocs}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {s.deployed ? (
                          <StatusBadge status="ongoing" />
                        ) : complete ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-100 text-green-700 border-green-200">Ready to Deploy</span>
                        ) : (
                          <StatusBadge status="pending" />
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => openReviewSubmission(s.studentId)}>
                            <Eye className="h-3.5 w-3.5" /> Review
                          </Button>
                          {!s.deployed && (
                            <Button size="sm" disabled={!complete} className="h-7 px-2 text-xs gap-1 bg-primary hover:bg-primary/90 text-white disabled:opacity-50" onClick={() => openDeployModal(s.studentId)}>
                              <Briefcase className="h-3.5 w-3.5" /> Deploy
                            </Button>
                          )}
                          {s.deployed && (
                            <span className="text-xs text-muted-foreground self-center">→ {s.assignedCompany}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
