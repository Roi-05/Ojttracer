import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { AdminStudent, AdminCompany } from "../../hooks/useAdminData";
import { toast } from "sonner";

interface GenerateReportsModalProps {
  open: boolean;
  onClose: () => void;
  students: AdminStudent[];
  companies: AdminCompany[];
}

export function GenerateReportsModal({ open, onClose, students, companies }: GenerateReportsModalProps) {
  const [reportType, setReportType] = useState<"evaluations" | "deployment" | "dtr">("evaluations");
  const [sectionFilter, setSectionFilter] = useState("All");

  const generateReport = () => {
    try {
      // Filter students by section if needed
      const targetStudents = sectionFilter === "All" 
        ? students 
        : students.filter(s => s.section === sectionFilter);

      let data: any[] = [];
      let filename = "";

      if (reportType === "evaluations") {
        filename = `Student_Evaluations_Masterlist_${sectionFilter}.xlsx`;
        data = targetStudents.map(s => ({
          "Student ID": s.studentId,
          "Last Name": s.lastName,
          "First Name": s.firstName,
          "Middle Name": s.middleName,
          "Course & Section": `${s.course} ${s.section}`,
          "Company": s.company,
          "Position": s.position,
          "Hours Rendered": s.hoursCompleted,
          "Required Hours": s.requiredHours,
          "Evaluation Score": s.performance > 0 ? s.performance : "Not Evaluated",
          "Status": s.status.toUpperCase()
        }));
      } 
      else if (reportType === "deployment") {
        filename = `Deployment_Masterlist_${sectionFilter}.xlsx`;
        data = targetStudents.map(s => {
          // Find company to get contact details if available
          const comp = companies.find(c => c.name === s.company);
          return {
            "Student ID": s.studentId,
            "Last Name": s.lastName,
            "First Name": s.firstName,
            "Course & Section": `${s.course} ${s.section}`,
            "Deployed Company": s.company,
            "Position/Department": s.position,
            "Company Contact Person": comp?.contactPerson || "—",
            "Company Contact Info": comp?.hrEmail || comp?.hrContact || "—",
            "Deployment Status": s.status.toUpperCase()
          };
        });
      }
      else if (reportType === "dtr") {
        filename = `Hours_Summary_${sectionFilter}.xlsx`;
        data = targetStudents.map(s => {
          const remaining = Math.max(0, s.requiredHours - s.hoursCompleted);
          const pct = s.requiredHours > 0 ? Math.round((s.hoursCompleted / s.requiredHours) * 100) : 0;
          return {
            "Student ID": s.studentId,
            "Last Name": s.lastName,
            "First Name": s.firstName,
            "Course & Section": `${s.course} ${s.section}`,
            "Company": s.company,
            "Required Hours": s.requiredHours,
            "Hours Rendered": s.hoursCompleted,
            "Remaining Hours": remaining,
            "% Completed": `${pct}%`,
            "Status": s.status.toUpperCase()
          };
        });
      }

      if (data.length === 0) {
        toast.error("No data available for the selected filters.");
        return;
      }

      // Create a new workbook and add the data
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      // Generate buffer and trigger download
      XLSX.writeFile(workbook, filename);
      toast.success(`${filename} generated successfully!`);
      onClose();
    } catch (err: any) {
      toast.error(`Failed to generate report: ${err.message}`);
    }
  };

  // Get unique sections from students
  const uniqueSections = ["All", ...Array.from(new Set(students.map(s => s.section))).filter(s => s !== "—").sort()];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Generate Reports
          </DialogTitle>
          <DialogDescription>
            Download automated Excel (.xlsx) reports based on real-time data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label>Select Report Type</Label>
            <div className="grid gap-2">
              {[
                { id: "evaluations", title: "1. Student Evaluations Masterlist", desc: "Grades, scores, and completion status" },
                { id: "deployment", title: "2. Official Deployment Directory", desc: "Company assignments and supervisor contacts" },
                { id: "dtr", title: "3. DTR & Hours Summary", desc: "Rendered hours vs required hours" }
              ].map(type => (
                <div 
                  key={type.id}
                  className={`relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    reportType === type.id ? "bg-green-50 border-green-200" : "bg-card border-border hover:bg-muted/50"
                  }`}
                  onClick={() => setReportType(type.id as any)}
                >
                  <div className="mt-0.5">
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                      reportType === type.id ? "border-green-600 bg-green-600" : "border-input"
                    }`}>
                      {reportType === type.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${reportType === type.id ? "text-green-800" : ""}`}>{type.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <Label>Filter by Section</Label>
            <select 
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
            >
              {uniqueSections.map(sec => (
                <option key={sec} value={sec}>{sec === "All" ? "All Sections" : `BSIT ${sec}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={generateReport}>
            <Download className="h-4 w-4" /> Download Excel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
