import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Plus, Building2, MapPin, FileCheck, Edit, Trash2, AlertCircle } from "lucide-react";
import { AdminCompany } from "../../hooks/useAdminData";
import { StatusBadge } from "../student/shared";

interface CompaniesTabProps {
  companies: AdminCompany[];
  openAddModal: () => void;
  onManageMoa: (company: AdminCompany) => void;
  openUploadMoa: () => void;
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

export function CompaniesTab({ companies, openAddModal, onManageMoa, openUploadMoa }: CompaniesTabProps) {
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
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={openAddModal}>
            <Plus className="h-4 w-4" /> Add Company
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
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1"><Edit className="h-3.5 w-3.5" /> Edit</Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-red-500 border-red-200 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
