import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import * as api from "../../lib/api";
import { Announcement } from "../../hooks/useAdminData";

interface AddAnnouncementModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (announcement: Announcement) => void;
}

export function AddAnnouncementModal({ open, onClose, onAdded }: AddAnnouncementModalProps) {
  const [annForm, setAnnForm] = useState({ title: "", content: "", category: "update", priority: "normal" });

  const handleAdd = async () => {
    if (!annForm.title || !annForm.content) { toast.error("Title and message are required"); return; }
    try {
      const result = await api.createAnnouncement(annForm);
      const saved = result.announcement;
      onAdded({
        id: saved.id, title: saved.title, content: saved.content, date: saved.date,
        category: saved.category, priority: saved.priority
      });
      toast.success("Announcement posted.");
      setAnnForm({ title: "", content: "", category: "update", priority: "normal" });
      onClose();
    } catch (e: any) {
      toast.error(`Failed to post announcement: ${e.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Create Announcement</DialogTitle><DialogDescription>Post a new announcement visible to all students and companies.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div><Label>Title</Label><Input placeholder="Announcement title..." className="mt-1.5" value={annForm.title} onChange={e => setAnnForm({...annForm, title: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" value={annForm.category} onChange={e => setAnnForm({...annForm, category: e.target.value})}>
                <option value="update">Update</option><option value="seminar">Seminar</option><option value="deadline">Deadline</option><option value="evaluation">Evaluation</option>
              </select>
            </div>
            <div><Label>Priority</Label>
              <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" value={annForm.priority} onChange={e => setAnnForm({...annForm, priority: e.target.value})}>
                <option value="normal">Normal</option><option value="high">High</option>
              </select>
            </div>
          </div>
          <div><Label>Message</Label>
            <textarea rows={4} placeholder="Write your announcement..." className="w-full mt-1.5 border border-border rounded-lg p-3 text-sm bg-card resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" value={annForm.content} onChange={e => setAnnForm({...annForm, content: e.target.value})} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleAdd}>Post Announcement</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
