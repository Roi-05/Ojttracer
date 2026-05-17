import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface UploadMoaTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, file: File) => Promise<void>;
}

export function UploadMoaTemplateModal({ open, onClose, onSave }: UploadMoaTemplateModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSave = async () => {
    if (file) {
      setUploading(true);
      try {
        await onSave("moa_template", file);
        setFile(null);
        onClose();
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload MOA Template</DialogTitle>
          <DialogDescription>
            Upload the official school Memorandum of Agreement template. Companies will download this, sign it, and return it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>File (PDF, DOCX)</Label>
            <Input 
              type="file" 
              accept=".pdf,.docx,.doc" 
              className="mt-1.5" 
              onChange={e => setFile(e.target.files?.[0] ?? null)} 
            />
            {file && <p className="text-xs text-muted-foreground mt-1">{file.name} — {(file.size / 1024).toFixed(0)} KB</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={uploading}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={!file || uploading} onClick={handleSave}>
              {uploading ? "Uploading..." : "Save Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
