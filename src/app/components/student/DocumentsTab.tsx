import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { FileText, FileCheck, Eye, Download, Upload, Building2 } from "lucide-react";
import * as api from "../../lib/api";
import { StudentDocument, Template } from "../../hooks/useStudentData";
import { StatusBadge } from "./shared";
import { DocumentViewerModal } from "../shared/DocumentViewerModal";

interface ActiveCompany {
  id: string;
  name: string;
  industry?: string;
  signedMoaUrl?: string | null;
}

interface DocumentsTabProps {
  studentDocs: StudentDocument[];
  templateData: Template[];
  activeCompanies: ActiveCompany[];
  intendedCompanyId: string | null;
  intendedPosition: string;
  setTargetCompany: (companyId: string, position: string) => Promise<void>;
  openDocUpload: (docName: string) => void;
}

export function DocumentsTab({ studentDocs, templateData, activeCompanies, intendedCompanyId, intendedPosition, setTargetCompany, openDocUpload }: DocumentsTabProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(intendedCompanyId || "");
  const [jobRole, setJobRole] = useState(intendedPosition || "");
  const [savingCompany, setSavingCompany] = useState(false);
  const [signedMoaUrl, setSignedMoaUrl] = useState<string | null>(null);
  const [loadingMoa, setLoadingMoa] = useState(false);
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    setSelectedCompanyId(intendedCompanyId || "");
    setJobRole(intendedPosition || "");
  }, [intendedCompanyId, intendedPosition]);

  const selectedCompany = activeCompanies.find(c => String(c.id) === String(selectedCompanyId));

  useEffect(() => {
    if (!selectedCompanyId) {
      setSignedMoaUrl(null);
      return;
    }
    const fromList = activeCompanies.find(c => String(c.id) === String(selectedCompanyId));
    if (fromList?.signedMoaUrl) {
      setSignedMoaUrl(fromList.signedMoaUrl);
      return;
    }
    let cancelled = false;
    setLoadingMoa(true);
    api.getActiveCompanyMoa(selectedCompanyId)
      .then((res) => { if (!cancelled) setSignedMoaUrl(res?.signedMoaUrl || null); })
      .catch(() => { if (!cancelled) setSignedMoaUrl(null); })
      .finally(() => { if (!cancelled) setLoadingMoa(false); });
    return () => { cancelled = true; };
  }, [selectedCompanyId, activeCompanies]);

  const hasUnsavedChanges =
    selectedCompanyId !== (intendedCompanyId || "") ||
    jobRole.trim() !== (intendedPosition || "").trim();

  const handleSaveCompany = async () => {
    if (!selectedCompanyId || !jobRole.trim()) return;
    setSavingCompany(true);
    try {
      await setTargetCompany(selectedCompanyId, jobRole.trim());
    } finally {
      setSavingCompany(false);
    }
  };
  const submittedCount = studentDocs.filter(d => d.status !== "missing").length;
  const approvedCount = studentDocs.filter(d => d.status === "approved").length;
  const total = studentDocs.length;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground mt-1">Download templates and submit your OJT-required documents</p>
      </div>

      <Card className="border-0 shadow-sm bg-primary/5">
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-muted-foreground">Submission Progress</p>
            <p className="text-2xl font-bold">{approvedCount}/{total} <span className="text-sm font-normal text-muted-foreground">approved</span></p>
            <p className="text-xs text-muted-foreground mt-1">{submittedCount} submitted • {total - submittedCount} not yet submitted</p>
          </div>
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="h-2 bg-white rounded-full overflow-hidden border border-border">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.round((approvedCount / total) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Once all documents are approved, your coordinator will deploy you to a partner company.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Target Partner Company
          </CardTitle>
          <CardDescription>Select the accredited partner company you intend to deploy to.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <select 
              className="flex-1 min-w-[200px] border border-border rounded-lg p-2 text-sm bg-card"
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
            >
              <option value="">Select a company...</option>
              {activeCompanies.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.industry ? `— ${c.industry}` : ''}</option>
              ))}
            </select>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white" 
              disabled={!selectedCompanyId || !jobRole.trim() || !hasUnsavedChanges || savingCompany}
              onClick={handleSaveCompany}
            >
              {savingCompany ? "Saving..." : "Save Selection"}
            </Button>
          </div>

          <div>
            <Label htmlFor="intended-job-role">Intended Job Role</Label>
            <Input
              id="intended-job-role"
              className="mt-1.5"
              placeholder="e.g. Web Developer Intern, QA Intern"
              value={jobRole}
              onChange={e => setJobRole(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Enter the position or role you expect to hold at your target company.</p>
          </div>

          {selectedCompanyId && signedMoaUrl ? (
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="min-w-0">
                <p className="text-sm font-medium">Signed MOA — {selectedCompany?.name || "Selected company"}</p>
                <p className="text-xs text-muted-foreground">Download the accredited company&apos;s signed memorandum of agreement.</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => setViewer({ url: signedMoaUrl!, title: `Signed MOA — ${selectedCompany?.name || "Company"}` })}>
                  <Eye className="h-3.5 w-3.5" /> View
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
                  <a href={signedMoaUrl!} download>
                    <Download className="h-3.5 w-3.5" /> Download MOA
                  </a>
                </Button>
              </div>
            </div>
          ) : selectedCompanyId && loadingMoa ? (
            <p className="text-xs text-muted-foreground">Loading signed MOA…</p>
          ) : selectedCompanyId ? (
            <p className="text-xs text-muted-foreground">No signed MOA is available for this company yet.</p>
          ) : null}

          {intendedCompanyId && (
            <p className="text-xs text-green-700 flex items-center gap-1">
              <FileCheck className="h-3.5 w-3.5" />
              Target company{intendedPosition ? ` and role (${intendedPosition})` : ""} saved. Coordinator will be notified upon document completion.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Templates</CardTitle>
          <CardDescription>Reference templates uploaded by the OJT Coordinator. Download, fill out, and submit below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {templateData.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${t.file ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}>
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.file ? `${t.size} • ${t.uploaded}` : "Not uploaded yet"}</p>
                </div>
                {t.file ? (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewer({ url: t.file!, title: t.name })}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <a href={t.file} download><Download className="h-3.5 w-3.5" /></a>
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Coming soon</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My Submissions</CardTitle>
          <CardDescription>Upload each required document. Your coordinator will review and approve them.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {studentDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-muted/30">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  doc.status === "approved" ? "bg-green-100 text-green-600" :
                  doc.status === "pending" ? "bg-orange-100 text-orange-600" :
                  "bg-red-100 text-red-500"
                }`}>
                  <FileCheck className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.file ? `${doc.file} • Uploaded ${doc.uploadedDate}` : "Not yet submitted"}
                  </p>
                </div>
                <StatusBadge status={doc.status} />
                {doc.file && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewer({ url: doc.file!, title: doc.name })}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <a href={doc.file} download><Download className="h-3.5 w-3.5" /></a>
                    </Button>
                  </div>
                )}
                {doc.status === "missing" ? (
                  <Button size="sm" className="h-8 text-xs gap-1 bg-primary hover:bg-primary/90 text-white" onClick={() => openDocUpload(doc.name)}>
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </Button>
                ) : doc.status !== "approved" ? (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => openDocUpload(doc.name)}>
                    <Upload className="h-3.5 w-3.5" /> Replace
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <DocumentViewerModal
        open={!!viewer}
        onClose={() => setViewer(null)}
        fileUrl={viewer?.url ?? null}
        title={viewer?.title}
      />
    </div>
  );
}
