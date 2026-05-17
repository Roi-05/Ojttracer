import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  sections: string[];
}

export function AddStudentModal({ open, onClose, sections }: AddStudentModalProps) {
  const handleAdd = () => {
    toast.success("Student added successfully!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Student</DialogTitle><DialogDescription>Register a new BSIT OJT student to the system.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-sm">Full Name</Label><Input placeholder="Juan dela Cruz" className="mt-1.5" /></div>
            <div><Label className="text-sm">Student ID</Label><Input placeholder="2022-IT-0001" className="mt-1.5" /></div>
            <div><Label className="text-sm">Course</Label><Input value="BSIT" readOnly className="mt-1.5" /></div>
            <div>
              <Label className="text-sm">Section</Label>
              <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card">
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2"><Label className="text-sm">Email</Label><Input type="email" placeholder="student@psu.edu.ph" className="mt-1.5" /></div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleAdd}>Add Student</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
