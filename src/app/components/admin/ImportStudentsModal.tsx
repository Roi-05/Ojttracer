import { useState, useRef, useCallback } from "react";
import { Button } from "../ui/button";
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, Download } from "lucide-react";
import * as api from "../../lib/api";
import { toast } from "sonner";

interface ImportStudentsModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const EXPECTED_COLUMNS = ["Last Name", "First Name", "Middle Name", "Student No", "Section", "Course", "Year Level", "Date of Birth", "Sex", "Civil Status", "Address", "Email"];

export function ImportStudentsModal({ open, onClose, onImported }: ImportStudentsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [totalRows, setTotalRows] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setTotalRows(0);
    setResult(null);
    setIsPreviewing(false);
    setIsImporting(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Please upload an Excel file (.xlsx, .xls) or CSV.");
      return;
    }
    setFile(f);
    setResult(null);
    setPreview(null);
    setIsPreviewing(true);
    try {
      const res = await api.previewImport(f);
      setPreview(res.rows || []);
      setTotalRows(res.total || 0);
    } catch (err: any) {
      toast.error(`Could not read file: ${err.message}`);
      setFile(null);
    } finally {
      setIsPreviewing(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const res = await api.importStudents(file);
      setResult(res);
      toast.success(res.summary || "Import complete!");
      onImported();
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = EXPECTED_COLUMNS.join(",");
    const example = ["Dela Cruz", "Juan", "Santos", "2021-00001", "4A", "BSIT", "4th Year", "2002-05-15", "Male", "Single", "Sto. Tomas Pampanga", "jdsdelacruz@psu.edu.ph"].join(",");
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Import Students</h2>
              <p className="text-xs text-muted-foreground">Upload an Excel or CSV file to bulk-create student accounts</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Result view */}
          {result ? (
            <div className="space-y-4">
              <div className={`rounded-xl p-5 border ${result.errors?.length ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
                <div className="flex items-center gap-2 mb-3">
                  {result.errors?.length ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
                  <h3 className="font-semibold">{result.errors?.length ? "Import completed with warnings" : "Import Successful!"}</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: "Accounts Created", value: result.created, color: "text-green-700" },
                    { label: "Accounts Updated", value: result.updated, color: "text-blue-700" },
                    { label: "Rows Skipped", value: result.skipped, color: "text-yellow-700" },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-lg p-3 border border-border/50">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                {result.emailsSent > 0 && (
                  <p className="text-sm text-green-700 mt-3 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {result.emailsSent} credential email{result.emailsSent > 1 ? "s" : ""} sent to students.
                  </p>
                )}
              </div>
              {result.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-red-700 mb-2">Rows with errors ({result.errors.length})</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((e: any, i: number) => (
                      <p key={i} className="text-xs text-red-600">{e.reason}</p>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={reset} variant="outline" className="w-full">Import Another File</Button>
            </div>
          ) : (
            <>
              {/* Template download */}
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div>
                  <p className="text-sm font-medium text-blue-800">Need a template?</p>
                  <p className="text-xs text-blue-600 mt-0.5">Download the CSV template with the correct column format.</p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-100">
                  <Download className="h-3.5 w-3.5" /> Template
                </Button>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
              >
                <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                {isPreviewing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">Reading file…</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-10 w-10 text-green-500" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{totalRows} rows found — click to replace file</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground/40" />
                    <p className="font-medium">Drag & drop your Excel file here</p>
                    <p className="text-xs text-muted-foreground">or click to browse — .xlsx, .xls, .csv supported</p>
                  </div>
                )}
              </div>

              {/* Expected columns */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Expected Columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXPECTED_COLUMNS.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-muted text-xs rounded-md font-mono">{c}</span>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              {preview && preview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Preview (first {preview.length} of {totalRows} rows)
                  </p>
                  <div className="overflow-x-auto border border-border rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          {Object.keys(preview[0]).slice(0, 8).map(h => (
                            <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                          {Object.keys(preview[0]).length > 8 && <th className="text-left px-3 py-2 font-medium text-muted-foreground">…</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 8).map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            {Object.values(row).slice(0, 8).map((v: any, j) => (
                              <td key={j} className="px-3 py-2 truncate max-w-[120px]">{String(v)}</td>
                            ))}
                            {Object.keys(preview[0]).length > 8 && <td className="px-3 py-2 text-muted-foreground">…</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="flex justify-end gap-3 p-5 border-t border-border shrink-0">
            <Button variant="outline" onClick={handleClose} disabled={isImporting}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={!preview || isImporting}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              {isImporting ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : <><Upload className="h-4 w-4" /> Import {totalRows > 0 ? `${totalRows} Students` : "Students"}</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
