import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Plus, Building2, MapPin, FileCheck, Edit, Trash2, AlertCircle } from "lucide-react";
import { AdminCompany } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface CompaniesTabProps {
  companies: AdminCompany[];
  onManageMoa: (company: AdminCompany) => void;
  openUploadMoa: () => void;
  onDelete: (id: string | number) => void;
}

const moaBadge: Record<string, string> = {
  pending:   "text-orange-600 bg-orange-50 border-orange-200",
  submitted: "text-blue-600 bg-blue-50 border-blue-200",
  active:    "text-green-600 bg-green-50 border-green-200",
  expired:   "text-red-600 bg-red-50 border-red-200",
};

const moaLabel: Record<string, string> = {
  pending: "Pending", submitted: "Submitted", active: "Active", expired: "Expired",
};

export function CompaniesTab({ companies, onManageMoa, openUploadMoa, onDelete }: CompaniesTabProps) {
  const [deleteTarget, setDeleteTarget] = useState<AdminCompany | null>(null);
  const [errorModalCompany, setErrorModalCompany] = useState<AdminCompany | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company / HTE Management</h1>
          <p className="text-muted-foreground mt-1">Manage partner companies and host training establishments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={openUploadMoa}>
            <FileCheck className="h-4 w-4" /> Upload MOA Template
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {companies.map(c => (
          <Card key={c.id} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-11 w-11 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{c.name}</h3>
                      <StatusBadge status={c.verified ? "active" : "pending"} />
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.industry}</span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{c.location}</p>
                    <div className="flex gap-3 mt-2 flex-wrap items-center">
                      <span className="text-xs text-muted-foreground">Contact: <strong className="text-foreground">{c.contactPerson}</strong></span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${moaBadge[c.moaStatus] || moaBadge.pending}`}>
                        MOA: {moaLabel[c.moaStatus] || c.moaStatus}
                      </span>
                      {c.moaExpiry !== "—" && <span className="text-xs text-muted-foreground">Expires: {c.moaExpiry}</span>}
                      {c.signedMoaUrl && (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                           <FileCheck className="h-3 w-3" /> Signed MOA submitted
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white gap-1.5 h-8 text-xs"
                    size="sm"
                    onClick={() => onManageMoa(c)}
                  >
                    {c.signedMoaUrl && c.moaStatus === "submitted"
                      ? <AlertCircle className="h-3.5 w-3.5" />
                      : <FileCheck className="h-3.5 w-3.5" />
                    }
                    Manage MOA
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      if (c.moaStatus === "active") {
                        setErrorModalCompany(c);
                      } else {
                        setDeleteTarget(c);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center text-lg font-semibold">Delete Company Profile?</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground mt-2">
              Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong>? This action cannot be undone and will permanently remove all associated company records and intern deployments.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-red-600 hover:bg-red-700 text-white" 
              onClick={() => {
                if (deleteTarget) {
                  onDelete(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Confirm Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Blocked Delete Modal */}
      <Dialog open={!!errorModalCompany} onOpenChange={(o) => { if (!o) setErrorModalCompany(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 mb-4">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <DialogTitle className="text-center text-lg font-semibold">Deletion Blocked</DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground mt-2">
              The company <strong className="text-foreground">{errorModalCompany?.name}</strong> has an active, unexpired MOA agreement. 
              Active contract partners cannot be deleted from the system.
              <br /><br />
              Please update their MOA status to <strong className="text-foreground">pending</strong> or <strong className="text-foreground">expired</strong> first before trying to delete this company.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-center">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white" onClick={() => setErrorModalCompany(null)}>
              Understood
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
