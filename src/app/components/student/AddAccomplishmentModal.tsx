import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface AddAccomplishmentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (date: string, hours: number, details: string, picture: string | null) => void;
}

const TODAY_ISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

export function AddAccomplishmentModal({ open, onClose, onSubmit }: AddAccomplishmentModalProps) {
  const [form, setForm] = useState({
    date: TODAY_ISO,
    hours: "",
    details: "",
    picture: null as string | null
  });

  useEffect(() => {
    if (open) {
      setForm({
        date: TODAY_ISO,
        hours: "",
        details: "",
        picture: null
      });
    }
  }, [open]);

  const handlePictureChange = (file: File | undefined) => {
    if (!file) {
      setForm(f => ({ ...f, picture: null }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, picture: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.hours || !form.details) return;
    if (form.date > TODAY_ISO) {
      toast.error("You cannot post a journal entry for a future date.");
      return;
    }
    onSubmit(form.date, parseFloat(form.hours), form.details, form.picture);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Post Daily Journal Entry</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input 
                type="date" 
                className="mt-1.5" 
                value={form.date} 
                max={TODAY_ISO}
                onChange={e => setForm({ ...form, date: e.target.value })} 
                required 
              />
            </div>
            <div>
              <Label>Total Hours</Label>
              <Input 
                type="number" 
                step="0.25" 
                placeholder="e.g., 8" 
                className="mt-1.5" 
                value={form.hours} 
                onChange={e => setForm({ ...form, hours: e.target.value })} 
                required 
              />
            </div>
          </div>
          <div>
            <Label>Daily Accomplishment</Label>
            <textarea 
              rows={5} 
              placeholder="Describe what you did today..." 
              className="w-full mt-1.5 border border-border rounded-lg p-3 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" 
              value={form.details} 
              onChange={e => setForm({ ...form, details: e.target.value })} 
              required 
            />
          </div>
          <div>
            <Label>Picture (evidence)</Label>
            <Input 
              type="file" 
              accept="image/*" 
              className="mt-1.5" 
              onChange={e => handlePictureChange(e.target.files?.[0])} 
            />
            {form.picture && <img src={form.picture} alt="preview" className="mt-2 rounded-lg border border-border max-h-40 object-cover" />}
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
            Your supervisor will be notified to review and approve this journal entry.
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-white" disabled={!form.date || !form.hours || !form.details}>Post</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
