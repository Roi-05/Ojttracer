import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { FileCheck, FileText, Eye, Download, CheckCircle2, Clock, AlertCircle, ShieldCheck } from "lucide-react";
import { InternSubmission } from "../../hooks/useCompanyData";
import { DocumentViewerModal } from "../shared/DocumentViewerModal";
import { resolveUploadUrl } from "../../lib/uploads";

interface InternDocumentsModalProps {
  intern: InternSubmission | null;
  open: boolean;
  onClose: () => void;
}

export function InternDocumentsModal({
  intern,
  open,
  onClose,
}: InternDocumentsModalProps) {
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);

  if (!intern) return null;

  const totalDocs = intern.docs.length;
  const approvedDocs = intern.docs.filter((d) => d.status === "approved").length;
  const submittedDocs = intern.docs.filter((d) => !!d.fileUrl).length;

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Compliance Documents — {intern.studentName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  {intern.studentNo} • {intern.course} {intern.section} • Position: {intern.position}
                </DialogDescription>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border shrink-0 ${
                approvedDocs === totalDocs && totalDocs > 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}>
                {approvedDocs}/{totalDocs} Approved
              </span>
            </div>
          </DialogHeader>

          {/* Quick Notice Banner */}
          <div className="px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-900">
            <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              Official pre-deployment clearance. As the Host Training Establishment, you may view and download these verified records.
            </span>
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5">
            {intern.docs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No documents uploaded yet by this intern.
              </div>
            ) : (
              intern.docs.map((d, i) => {
                const resolvedUrl = d.fileUrl ? resolveUploadUrl(d.fileUrl) : null;
                const isApproved = d.status === "approved";
                const isPending = d.status === "pending";

                return (
                  <div
                    key={d.id || i}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors shadow-2xs"
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-600"
                          : isPending
                          ? "bg-amber-100 text-amber-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <FileCheck className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {d.uploadedDate ? (
                          <span>Uploaded: {d.uploadedDate}</span>
                        ) : (
                          <span className="italic">Not yet submitted</span>
                        )}
                        {d.reviewNote && (
                          <span className="text-amber-700 truncate" title={d.reviewNote}>
                            • Note: {d.reviewNote}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border shrink-0 ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isPending
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {isApproved ? "Approved by Coordinator" : isPending ? "Pending Review" : "Missing"}
                    </span>

                    {/* Actions */}
                    {resolvedUrl ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setViewer({ url: resolvedUrl, title: d.name })}
                          title="Preview document in browser"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          asChild
                          title="Download document file"
                        >
                          <a href={resolvedUrl} download target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic shrink-0 px-2">—</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="p-4 border-t bg-muted/5 flex justify-end">
            <Button variant="outline" className="px-6" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DocumentViewerModal
        open={!!viewer}
        onClose={() => setViewer(null)}
        fileUrl={viewer?.url ?? null}
        title={viewer?.title}
      />
    </>
  );
}
