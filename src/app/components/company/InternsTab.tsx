import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { MapPin, Smartphone, ShieldAlert, Check, X, FileText } from "lucide-react";
import { Intern, InternSubmission } from "../../hooks/useCompanyData";
import { StatusBadge } from "../student/shared";
import { InternDocumentsModal } from "./InternDocumentsModal";

interface InternsTabProps {
  interns: Intern[];
  internDocuments?: InternSubmission[];
  onResetDevice?: (studentId: string | number, name: string) => Promise<void>;
  onRejectDevice?: (studentId: string | number, name: string) => Promise<void>;
}

export function InternsTab({
  interns,
  internDocuments = [],
  onResetDevice,
  onRejectDevice,
}: InternsTabProps) {
  const [selectedInternDocs, setSelectedInternDocs] = useState<InternSubmission | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Interns</h1>
        <p className="text-muted-foreground mt-1">Monitor assigned interns, their progress, and device registrations</p>
      </div>

      <div className="grid gap-4">
        {interns.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No interns assigned yet. Check back when students have been deployed.
            </CardContent>
          </Card>
        )}
        {interns.map(intern => {
          const pct = intern.requiredHours > 0
            ? Math.min(100, Math.round((intern.hoursCompleted / intern.requiredHours) * 100))
            : 0;

          const matchedDocs = internDocuments.find((d) => String(d.studentId) === String(intern.id));

          return (
            <Card key={intern.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center flex-shrink-0">
                    {intern.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold">{intern.name}</h3>
                          <StatusBadge status={intern.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {intern.course}{intern.section ? ` • ${intern.section}` : ""}{intern.schoolYear ? ` (S.Y. ${intern.schoolYear})` : ""} — {intern.position}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Supervisor: {intern.supervisor}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-green-600">{intern.performance}%</div>
                        <p className="text-xs text-muted-foreground">Performance</p>
                      </div>
                    </div>

                    {/* Pending Device Reset Banner */}
                    {intern.deviceResetRequested && (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-900">
                          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Student requested to reset registered device (<strong className="font-semibold">{intern.registeredDeviceName || "Registered Phone"}</strong>)</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {onResetDevice && (
                            <Button
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                              onClick={() => onResetDevice(intern.id, intern.name)}
                            >
                              <Check className="h-3.5 w-3.5" /> Approve Reset
                            </Button>
                          )}
                          {onRejectDevice && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs gap-1.5"
                              onClick={() => onRejectDevice(intern.id, intern.name)}
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">OJT Period</p>
                        <p className="text-xs font-medium mt-0.5">{intern.startDate} — {intern.endDate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Registered Device</p>
                        <p className="text-xs font-medium mt-0.5 flex items-center gap-1">
                          <Smartphone className="h-3 w-3 text-muted-foreground" />
                          {intern.registeredDeviceName || <span className="text-muted-foreground italic">None</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Hours Completed</p>
                        <p className="text-xs font-medium mt-0.5">{intern.hoursCompleted}/{intern.requiredHours} hrs</p>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Complied Documents Action Bar */}
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>
                          {matchedDocs && matchedDocs.docs.length > 0
                            ? `${matchedDocs.docs.filter((d) => d.status === "approved").length} of ${matchedDocs.docs.length} compliance docs approved`
                            : "Pre-deployment clearance & compliance"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs gap-1.5 border-border hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                        onClick={() => {
                          setSelectedInternDocs(
                            matchedDocs || {
                              studentId: intern.id,
                              studentName: intern.name,
                              studentNo: "—",
                              course: intern.course,
                              section: "—",
                              position: intern.position,
                              supervisor: intern.supervisor,
                              deploymentStatus: intern.status,
                              docs: [],
                            }
                          );
                        }}
                      >
                        <FileText className="h-3 w-3" />
                        <span>View Complied Documents</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <InternDocumentsModal
        intern={selectedInternDocs}
        open={!!selectedInternDocs}
        onClose={() => setSelectedInternDocs(null)}
      />
    </div>
  );
}
