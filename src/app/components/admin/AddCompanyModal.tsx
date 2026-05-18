import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface AddCompanyModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddCompanyModal({ open, onClose }: AddCompanyModalProps) {
  const handleAdd = () => {
    toast.success("Company added!");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Company / HTE</DialogTitle>
          <DialogDescription>
            Add a new partner company or host training establishment.
            The company supervisor can set their GPS location from their own dashboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-sm">Company Name</Label><Input placeholder="Company Name" className="mt-1.5" /></div>
            <div><Label className="text-sm">Industry</Label><Input placeholder="e.g., IT, Healthcare" className="mt-1.5" /></div>
            <div><Label className="text-sm">Intern Capacity</Label><Input type="number" placeholder="e.g., 5" className="mt-1.5" /></div>
            <div className="col-span-2"><Label className="text-sm">Address</Label><Input placeholder="Full address" className="mt-1.5" /></div>
            <div><Label className="text-sm">Supervisor</Label><Input placeholder="Contact person" className="mt-1.5" /></div>
            <div><Label className="text-sm">Contact Email</Label><Input type="email" placeholder="supervisor@company.com" className="mt-1.5" /></div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleAdd}>Add Company</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
