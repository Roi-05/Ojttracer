import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Loader2 } from "lucide-react";
import { REQUIRED_DOC_NAMES } from "../../hooks/useStudentData";

interface UploadDocumentModalProps {
  open: boolean;
  defaultDocName?: string;
  onClose: () => void;
  onSubmit: (docName: string, file: File) => Promise<void> | void;
}

export function UploadDocumentModal({ open, defaultDocName, onClose, onSubmit }: UploadDocumentModalProps) {
  const [docName, setDocName] = useState(defaultDocName || REQUIRED_DOC_NAMES[0]);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDocName(defaultDocName || REQUIRED_DOC_NAMES[0]);
      setFile(null);
      setSubmitting(false);
    }
  }, [open, defaultDocName]);

  const handleSubmit = async () => {
    if (!file || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(docName, file);
    } catch {
      // Error toast is already handled by submitDocument
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !submitting) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Submit Document</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Document</Label>
            <select 
              className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" 
              value={docName} 
              disabled={submitting}
              onChange={e => setDocName(e.target.value)}
            >
              {REQUIRED_DOC_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <Label>File (PDF, JPG, PNG up to 20MB)</Label>
            <Input 
              type="file" 
              className="mt-1.5" 
              accept=".pdf,.jpg,.jpeg,.png,.docx,.doc" 
              disabled={submitting}
              onChange={e => setFile(e.target.files?.[0] || null)} 
            />
            {file && <p className="text-xs text-muted-foreground mt-1">{file.name} — {(file.size / 1024).toFixed(0)} KB</p>}
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
            Your submission will be reviewed by the OJT Coordinator. You can replace it before approval.
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" disabled={submitting} onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2" disabled={!file || submitting} onClick={handleSubmit}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Uploading..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
