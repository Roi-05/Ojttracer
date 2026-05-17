import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { FileCheck, Download, Upload, CheckCircle2, Clock, AlertCircle, ShieldCheck } from "lucide-react";

interface MoaTabProps {
  moaStatus: string;
  moaExpiry: string;
  signedMoaUrl: string | null;
  moaTemplateUrl: string | null;
  onUploadSigned: (file: File) => Promise<void>;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: JSX.Element; description: string }> = {
  pending: {
    label: "Pending",
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    icon: <Clock className="h-5 w-5 text-orange-500" />,
    description: "Your MOA has not yet been submitted. Please download the template, have it signed by your representative, and upload it below.",
  },
  submitted: {
    label: "Under Review",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    icon: <FileCheck className="h-5 w-5 text-blue-500" />,
    description: "Your signed MOA has been received and is currently under review by the OJT Coordinator. You will be notified once it is approved.",
  },
  active: {
    label: "Active / Accredited",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    description: "Your MOA is active. You are an accredited partner institution.",
  },
  expired: {
    label: "Expired",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    icon: <AlertCircle className="h-5 w-5 text-red-500" />,
    description: "Your MOA has expired. Please contact the OJT Coordinator to initiate the renewal process.",
  },
};

export function MoaTab({ moaStatus, moaExpiry, signedMoaUrl, moaTemplateUrl, onUploadSigned }: MoaTabProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cfg = statusConfig[moaStatus] || statusConfig["pending"];

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await onUploadSigned(selectedFile);
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accreditation & MOA</h1>
        <p className="text-muted-foreground mt-1">
          Memorandum of Agreement with Pampanga State University — required before any intern can be assigned.
        </p>
      </div>

      {/* Status Card */}
      <Card className={`border ${cfg.bg}`}>
        <CardContent className="p-5 flex items-start gap-4">
          <div className="flex-shrink-0 mt-0.5">{cfg.icon}</div>
          <div className="flex-1">
            <p className={`font-semibold ${cfg.color}`}>MOA Status: {cfg.label}</p>
            <p className="text-sm text-muted-foreground mt-1">{cfg.description}</p>
            {moaStatus === "active" && moaExpiry && moaExpiry !== "—" && (
              <p className="text-xs text-green-700 mt-2 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 inline mr-1" />
                Accredited until: {moaExpiry}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Download Template */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</span>
            Download MOA Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          {moaTemplateUrl ? (
            <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/10">
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Official MOA Template</p>
                <p className="text-xs text-muted-foreground">Download, print, fill out, and have it signed by your company representative.</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" asChild>
                <a href={moaTemplateUrl} target="_blank" rel="noreferrer" download>
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-border text-center">
              <p className="text-sm text-muted-foreground">The MOA template has not been uploaded by the coordinator yet. Please check back later or contact them directly.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Upload Signed MOA */}
      {(moaStatus === "pending" || moaStatus === "expired") && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
              Upload Signed MOA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Once both the School Dean and your Company Representative have signed the document, upload the scanned copy here.
            </p>
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">{selectedFile ? selectedFile.name : "Click to select signed MOA"}</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX — max 20 MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                className="hidden"
                onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white gap-2"
              disabled={!selectedFile || uploading}
              onClick={handleUpload}
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading…" : "Submit Signed MOA"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Already submitted */}
      {moaStatus === "submitted" && signedMoaUrl && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Submitted Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/10">
              <FileCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm flex-1">Signed MOA submitted and awaiting coordinator review.</p>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" asChild>
                <a href={signedMoaUrl} target="_blank" rel="noreferrer">
                  <Download className="h-3.5 w-3.5" /> View
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
