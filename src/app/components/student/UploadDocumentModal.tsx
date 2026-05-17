import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { REQUIRED_DOC_NAMES } from "../../hooks/useStudentData";

interface UploadDocumentModalProps {
  open: boolean;
  defaultDocName?: string;
  onClose: () => void;
  onSubmit: (docName: string, file: File) => void;
}

export function UploadDocumentModal({ open, defaultDocName, onClose, onSubmit }: UploadDocumentModalProps) {
  const [docName, setDocName] = useState(defaultDocName || REQUIRED_DOC_NAMES[0]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setDocName(defaultDocName || REQUIRED_DOC_NAMES[0]);
      setFile(null);
    }
  }, [open, defaultDocName]);

  const handleSubmit = () => {
    if (file) {
      onSubmit(docName, file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Submit Document</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Document</Label>
            <select 
              className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" 
              value={docName} 
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
              onChange={e => setFile(e.target.files?.[0] || null)} 
            />
            {file && <p className="text-xs text-muted-foreground mt-1">{file.name} — {(file.size / 1024).toFixed(0)} KB</p>}
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
            Your submission will be reviewed by the OJT Coordinator. You can replace it before approval.
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" disabled={!file} onClick={handleSubmit}>Submit</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
