import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { FileCheck, Download, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface UpdateMoaModalProps {
  open: boolean;
  company: { id: string | number; name: string; moaStatus: string; moaExpiry: string; signedMoaUrl?: string | null } | null;
  onClose: () => void;
  onSave: (id: string | number, status: string, expiry: string) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: "pending",   label: "Pending",   color: "text-orange-600", icon: <Clock className="h-4 w-4" /> },
  { value: "submitted", label: "Submitted (Awaiting Review)", color: "text-blue-600", icon: <FileCheck className="h-4 w-4" /> },
  { value: "active",    label: "Active / Accredited", color: "text-green-600", icon: <CheckCircle2 className="h-4 w-4" /> },
  { value: "expired",   label: "Expired",   color: "text-red-600", icon: <AlertCircle className="h-4 w-4" /> },
];

export function UpdateMoaModal({ open, company, onClose, onSave }: UpdateMoaModalProps) {
  const [status, setStatus] = useState(company?.moaStatus || "pending");
  const [expiry, setExpiry] = useState(company?.moaExpiry && company.moaExpiry !== "—" ? company.moaExpiry : "");
  const [saving, setSaving] = useState(false);

  // Sync local state when company changes
  const currentStatus = company?.moaStatus || "pending";
  const currentExpiry = company?.moaExpiry && company.moaExpiry !== "—" ? company.moaExpiry : "";
  if (open && (status !== currentStatus || expiry !== currentExpiry)) {
    // Only initialise once per open
  }

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && company) {
      setStatus(company.moaStatus || "pending");
      setExpiry(company.moaExpiry && company.moaExpiry !== "—" ? company.moaExpiry : "");
    }
    if (!isOpen) onClose();
  };

  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      await onSave(company.id, status, expiry);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const selected = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage MOA — {company?.name}</DialogTitle>
          <DialogDescription>
            Update the Memorandum of Agreement status and accreditation details for this company.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Signed MOA uploaded by company */}
          {company?.signedMoaUrl ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <FileCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-700">Signed MOA uploaded by company</p>
                <p className="text-xs text-blue-500">Review the document before activating.</p>
              </div>
              <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 gap-1.5 h-8 text-xs flex-shrink-0" asChild>
                <a href={company.signedMoaUrl} target="_blank" rel="noreferrer">
                  <Download className="h-3.5 w-3.5" /> View
                </a>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
              <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">No signed MOA has been uploaded by the company yet.</p>
            </div>
          )}

          {/* Status */}
          <div>
            <Label className="text-sm font-medium">MOA Status</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatus(opt.value)}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                    status === opt.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <span className={status === opt.value ? "text-primary" : opt.color}>{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expiry date — only show when active */}
          {status === "active" && (
            <div>
              <Label className="text-sm font-medium">MOA Expiration Date</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">CHED requires MOAs to be periodically renewed.</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save MOA Status"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
