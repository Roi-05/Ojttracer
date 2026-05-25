import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { CheckCircle } from "lucide-react";
import { AdminCompany } from "../../hooks/useAdminData";
import { toast } from "sonner";

interface DeployStudentModalProps {
  open: boolean;
  studentId: string | number;
  companyList: AdminCompany[];
  intendedCompanyId?: string | null;
  intendedPosition?: string;
  onClose: () => void;
  onDeploy: (studentId: string | number, payload: any) => Promise<void>;
}

export function DeployStudentModal({ open, studentId, companyList, intendedCompanyId, intendedPosition, onClose, onDeploy }: DeployStudentModalProps) {
  const [deployForm, setDeployForm] = useState({
    company: "", position: "", startDate: "", endDate: "",
    requiredHours: 486
  });

  useEffect(() => {
    if (open) {
      // Find the intended company if it exists
      const intended = intendedCompanyId ? companyList.find(c => c.id === intendedCompanyId) : null;
      setDeployForm({
        company: intended ? intended.name : "", 
        position: intendedPosition || "", startDate: "", endDate: "",
        requiredHours: 486
      });
    }
  }, [open, intendedCompanyId, intendedPosition, companyList]);

  const selectedCompany = companyList.find(c => c.name === deployForm.company);

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDeployForm({
      ...deployForm,
      company: e.target.value,
    });
  };

  const handleConfirm = async () => {
    if (!deployForm.company || !deployForm.position) {
      toast.error("Company and position required");
      return;
    }
    const selectedCompany = companyList.find(c => c.name === deployForm.company);
    await onDeploy(studentId, {
      companyId: selectedCompany ? String(selectedCompany.id) : "",
      companyName: deployForm.company,
      position: deployForm.position,
      startDate: deployForm.startDate,
      endDate: deployForm.endDate,
      requiredHours: deployForm.requiredHours,
      supervisor: selectedCompany?.hrContact || "",
      supervisorEmail: selectedCompany?.hrEmail || "",
      address: selectedCompany?.location || ""
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Deploy Student to Company</DialogTitle><DialogDescription>Assign the student to a verified partner company to begin their OJT.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> All required documents are approved.
          </div>
          <div>
            <Label>Assign to Company</Label>
            <select className="w-full mt-1.5 border border-border rounded-lg p-2 text-sm bg-card" value={deployForm.company} onChange={handleCompanyChange}>
              <option value="">Select a partner company...</option>
              {companyList.filter(c => c.moaStatus === "active").map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Position / Role</Label>
              <Input className="mt-1.5" placeholder="e.g. Web Dev Intern" value={deployForm.position} onChange={e => setDeployForm({ ...deployForm, position: e.target.value })} />
            </div>
            <div>
              <Label>Required Hours</Label>
              <Input type="number" className="mt-1.5" value={deployForm.requiredHours} onChange={e => setDeployForm({ ...deployForm, requiredHours: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          
          {selectedCompany && (
            <div className="p-3 bg-muted/20 border border-border rounded-lg text-sm">
              <p className="font-medium mb-2 text-primary flex items-center gap-1">Company Details (Read-only)</p>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div><span className="font-medium text-foreground">Supervisor:</span><br/> {selectedCompany.hrContact || "N/A"}</div>
                <div><span className="font-medium text-foreground">Email:</span><br/> {selectedCompany.hrEmail || "N/A"}</div>
                <div className="col-span-2"><span className="font-medium text-foreground">Address:</span><br/> {selectedCompany.location || "N/A"}</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input type="date" className="mt-1.5" value={deployForm.startDate} onChange={e => setDeployForm({ ...deployForm, startDate: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" className="mt-1.5" value={deployForm.endDate} onChange={e => setDeployForm({ ...deployForm, endDate: e.target.value })} /></div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={handleConfirm}>Confirm Deployment</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
