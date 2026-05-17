import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { REQUIRED_DOC_NAMES } from "../../hooks/useStudentData";

interface UploadTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, file: File) => Promise<void>;
}

export function UploadTemplateModal({ open, onClose, onSave }: UploadTemplateModalProps) {
  const [templateForm, setTemplateForm] = useState<{ name: string; file: File | null }>({ name: REQUIRED_DOC_NAMES[0], file: null });

  const handleSave = async () => {
    if (templateForm.file) {
      await onSave(templateForm.name, templateForm.file);
      setTemplateForm({ name: REQUIRED_DOC_NAMES[0], file: null });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload Document Template</DialogTitle><DialogDescription>Upload a template file that students can download as reference.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Document</Label>
            <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}>
              {REQUIRED_DOC_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <Label>File (PDF, DOCX, JPG)</Label>
            <Input type="file" accept=".pdf,.docx,.doc,.jpg,.jpeg,.png" className="mt-1.5" onChange={e => setTemplateForm({ ...templateForm, file: e.target.files?.[0] ?? null })} />
            {templateForm.file && <p className="text-xs text-muted-foreground mt-1">{templateForm.file.name} — {(templateForm.file.size / 1024).toFixed(0)} KB</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={!templateForm.file} onClick={handleSave}>Save Template</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
