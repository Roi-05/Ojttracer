import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { FileCheck, Eye, Download, CheckCircle, XCircle, Briefcase } from "lucide-react";
import { AdminSubmission } from "../../hooks/useAdminData";
import { DocumentViewerModal } from "../shared/DocumentViewerModal";

interface ViewSubmissionModalProps {
  viewSub: AdminSubmission | null;
  onClose: () => void;
  onApproveDoc: (subId: string | number, docName: string, status: "approved" | "rejected") => void;
  onRejectDoc: (subId: string | number, docName: string, status: "approved" | "rejected") => void;
  onOpenDeploy: (subId: string | number) => void;
  allDocsApproved: (subId: string | number) => boolean;
}

export function ViewSubmissionModal({ 
  viewSub, onClose, onApproveDoc, onRejectDoc, onOpenDeploy, allDocsApproved 
}: ViewSubmissionModalProps) {
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);

  if (!viewSub) return null;

  const isAllApproved = allDocsApproved(viewSub.studentId);

  return (
    <>
      <Dialog open={!!viewSub} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Documents — {viewSub.name}</DialogTitle>
            <DialogDescription>{viewSub.studentNo} • BSIT {viewSub.section} — Review and approve submitted OJT documents.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-2 space-y-2">
            {viewSub.docs.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  d.status === "approved" ? "bg-green-100 text-green-600" :
                  d.status === "pending" ? "bg-orange-100 text-orange-600" :
                  "bg-red-100 text-red-500"
                }`}><FileCheck className="h-4 w-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.file ? `Uploaded ${d.uploaded}` : "Not yet submitted"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  d.status === "approved" ? "bg-green-100 text-green-700 border-green-200" :
                  d.status === "pending" ? "bg-orange-100 text-orange-700 border-orange-200" :
                  "bg-red-100 text-red-700 border-red-200"
                }`}>{d.status === "missing" ? "Missing" : d.status.charAt(0).toUpperCase() + d.status.slice(1)}</span>
                {d.file && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setViewer({ url: d.file!, title: d.name })}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <a href={d.file} download><Download className="h-3.5 w-3.5" /></a>
                    </Button>
                  </div>
                )}
                {d.status === "pending" && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => onApproveDoc(viewSub.studentId, d.name, "approved")}><CheckCircle className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => onRejectDoc(viewSub.studentId, d.name, "rejected")}><XCircle className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-6 pt-2 flex gap-3 mt-auto border-t bg-muted/5">
            <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
            {!viewSub.deployed && (
              <Button disabled={!isAllApproved} className="flex-1 bg-primary hover:bg-primary/90 text-white disabled:opacity-50 gap-2" onClick={() => { onClose(); onOpenDeploy(viewSub.studentId); }}>
                <Briefcase className="h-4 w-4" /> Deploy Student
              </Button>
            )}
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
