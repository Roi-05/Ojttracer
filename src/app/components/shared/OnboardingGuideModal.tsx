import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import {
  GraduationCap, Building2, ShieldCheck, Upload, MapPin, Clock,
  BookOpen, Star, CheckCircle2, ArrowRight, ChevronLeft, ChevronRight, Sparkles
} from "lucide-react";

interface OnboardingGuideModalProps {
  open: boolean;
  onClose: () => void;
  role: string;
  onNavigate?: (section: string) => void;
}

type GuideStep = {
  badge: string;
  title: string;
  subtitle: string;
  icon: JSX.Element;
  color: string;
  bullets: string[];
  actionLabel?: string;
  actionSection?: string;
};

const STUDENT_STEPS: GuideStep[] = [
  {
    badge: "Step 1 of 4 • Profile & Signature",
    title: "Complete Your Profile & Digital Signature",
    subtitle: "Set up your personal info and e-signature first so your generated OJT reports and DTRs are pre-signed.",
    icon: <GraduationCap className="h-6 w-6 text-blue-600" />,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    bullets: [
      "Open 'My Profile' and fill in your contact details, parent/guardian info, and 2x2 photo.",
      "Upload or draw your Digital Signature — this will automatically appear on your generated DTR and OJT Journal PDF.",
    ],
    actionLabel: "Go to My Profile",
    actionSection: "profile",
  },
  {
    badge: "Step 2 of 4 • Company Coordination",
    title: "Coordinate with Your HTE & Select Target Company",
    subtitle: "Before you can be deployed, your Host Training Establishment (Company) must have a verified account.",
    icon: <Building2 className="h-6 w-6 text-emerald-600" />,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    bullets: [
      "Make sure your company/supervisor has registered a Company Account and been verified (Active MOA) by your OJT Coordinator.",
      "Go to the 'Documents' tab → under 'Target OJT Company', select your accredited company and type your intended position/role.",
    ],
    actionLabel: "Select Target Company",
    actionSection: "documents",
  },
  {
    badge: "Step 3 of 4 • Required Documents",
    title: "Download Templates & Upload All 7 OJT Documents",
    subtitle: "Your OJT Coordinator must review and approve all 7 pre-deployment documents.",
    icon: <Upload className="h-6 w-6 text-purple-600" />,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    bullets: [
      "In the 'Documents' tab, download the official templates uploaded by your Coordinator.",
      "Submit all 7 required forms (Consent Form, Enrollment Certificate, Endorsements, MOA, etc.).",
      "Track each document's status badge (Pending → Approved). If rejected, re-upload the corrected file.",
    ],
    actionLabel: "Go to Documents",
    actionSection: "documents",
  },
  {
    badge: "Step 4 of 4 • Deployment, DTR & Journal",
    title: "Get Deployed & Start Logging DTR + Daily Journal",
    subtitle: "Once all 7 documents are approved, your Coordinator deploys you — unlocking Attendance and Journal!",
    icon: <Clock className="h-6 w-6 text-orange-600" />,
    color: "bg-orange-50 border-orange-200 text-orange-700",
    bullets: [
      "Once deployed by your Coordinator, 'Attendance (DTR)' and 'Journal' automatically unlock.",
      "Register your mobile device in 'Attendance (DTR)' and Time-In / Time-Out inside your company's GPS geofence with a live selfie.",
      "Log your daily accomplishments in 'Journal' and export your formatted Word (.docx) or PDF report anytime!",
    ],
    actionLabel: "View My Deployment",
    actionSection: "deployment",
  },
];

const COMPANY_STEPS: GuideStep[] = [
  {
    badge: "Step 1 of 4 • Company Profile",
    title: "Complete Company Profile & Supervisor Signature",
    subtitle: "Provide your company details and supervisor signature for intern DTR verification.",
    icon: <Building2 className="h-6 w-6 text-emerald-600" />,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    bullets: [
      "Fill out your company address, industry, and HR/Supervisor contact information in 'Company Profile'.",
      "Upload the supervisor's digital signature so approved student DTR exports carry your official signature.",
    ],
    actionLabel: "Go to Company Profile",
    actionSection: "profile",
  },
  {
    badge: "Step 2 of 4 • MOA & Accreditation",
    title: "Upload Signed MOA for Coordinator Verification",
    subtitle: "Your company becomes selectable by students once the OJT Coordinator verifies your MOA.",
    icon: <ShieldCheck className="h-6 w-6 text-blue-600" />,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    bullets: [
      "Open the 'Accreditation' tab to download the university MOA template and upload your signed MOA.",
      "Once the OJT Coordinator approves your accreditation (Status: Active), students can select your company and be deployed to you.",
    ],
    actionLabel: "Go to Accreditation",
    actionSection: "accreditation",
  },
  {
    badge: "Step 3 of 4 • Workplace Geofence",
    title: "Set Your Workplace Geofence on the Map",
    subtitle: "Ensure interns can only Time-In and Time-Out when physically present at your workplace.",
    icon: <MapPin className="h-6 w-6 text-purple-600" />,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    bullets: [
      "Open 'Live Tracker' → click 'Edit Geofence' to place a circular pin/radius or draw a custom polygon around your building.",
      "In 'My Interns', you can also configure each intern's daily Break Schedule (e.g., 12:00 PM – 1:00 PM) for automatic hour deduction.",
    ],
    actionLabel: "Open Live Tracker",
    actionSection: "tracker",
  },
  {
    badge: "Step 4 of 4 • DTR, Journals & Evaluation",
    title: "Approve Intern Attendance, Journals & Final Evaluation",
    subtitle: "Review daily logs submitted by your interns and grade them upon completion.",
    icon: <Star className="h-6 w-6 text-orange-600" />,
    color: "bg-orange-50 border-orange-200 text-orange-700",
    bullets: [
      "In 'Attendance (DTR)', verify intern Time-In/Out photos and approve their daily hours.",
      "In 'Accomplishments', review and approve their daily work journal entries.",
      "Once an intern completes their required OJT hours, submit their final Performance Evaluation in 'Evaluations'.",
    ],
    actionLabel: "View My Interns",
    actionSection: "interns",
  },
];

const COORDINATOR_STEPS: GuideStep[] = [
  {
    badge: "Step 1 of 4 • Cohort & Templates",
    title: "Import Students (Excel/CSV) & Upload Templates",
    subtitle: "Onboard your academic cohort and provide the 7 required OJT document templates.",
    icon: <GraduationCap className="h-6 w-6 text-purple-600" />,
    color: "bg-purple-50 border-purple-200 text-purple-700",
    bullets: [
      "In 'Students', click 'Import Students (Excel)', enter the Target School Year (e.g. 2026-2027), and upload your class list — login credentials are emailed automatically.",
      "In 'Documents', upload the reference templates for the 7 required pre-deployment forms.",
    ],
    actionLabel: "Go to Students",
    actionSection: "students",
  },
  {
    badge: "Step 2 of 4 • HTE Verification",
    title: "Verify Partner Companies & MOAs",
    subtitle: "Approve registered Host Training Establishments so students can select them.",
    icon: <Building2 className="h-6 w-6 text-emerald-600" />,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    bullets: [
      "When a company registers, review their details and signed MOA in 'Companies / HTEs'.",
      "Click 'Verify' or set their MOA status to 'Active' — this unlocks the company in the students' Target Company dropdown.",
    ],
    actionLabel: "Go to Companies",
    actionSection: "companies",
  },
  {
    badge: "Step 3 of 4 • Document Review & Deployment",
    title: "Approve Student Documents & Click 'Deploy'",
    subtitle: "Once all 7 documents are approved, deploy the student to unlock their DTR & Journal.",
    icon: <CheckCircle2 className="h-6 w-6 text-blue-600" />,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    bullets: [
      "In 'Documents' → 'Student Submissions', click 'Review' to inspect and approve each student's 7 uploaded forms.",
      "Once a student reaches 7/7 Approved ('Ready to Deploy'), click 'Deploy' — their pre-selected company and position will auto-fill!",
    ],
    actionLabel: "Review Submissions",
    actionSection: "documents",
  },
  {
    badge: "Step 4 of 4 • Monitoring & Reports",
    title: "Monitor Cohort Progress & Export Excel Masterlists",
    subtitle: "Track attendance, journals, and evaluations filtered by School Year and Section.",
    icon: <BookOpen className="h-6 w-6 text-orange-600" />,
    color: "bg-orange-50 border-orange-200 text-orange-700",
    bullets: [
      "Use the top 'Cohort (S.Y.)' filter to switch between academic years across all tabs.",
      "Monitor verified DTR hours, journal submissions, and company evaluations, or click 'Generate Reports' on Overview to export Excel masterlists.",
    ],
    actionLabel: "Go to Overview",
    actionSection: "dashboard",
  },
];

export function OnboardingGuideModal({ open, onClose, role, onNavigate }: OnboardingGuideModalProps) {
  const normalizedRole = role.toLowerCase().includes("company")
    ? "company"
    : role.toLowerCase().includes("student")
    ? "student"
    : "coordinator";

  const steps =
    normalizedRole === "company"
      ? COMPANY_STEPS
      : normalizedRole === "student"
      ? STUDENT_STEPS
      : COORDINATOR_STEPS;

  const [stepIdx, setStepIdx] = useState(0);
  const current = steps[stepIdx] || steps[0];

  const handleAction = (section?: string) => {
    onClose();
    if (section && onNavigate) {
      onNavigate(section);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-border">
        {/* Top gradient header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-5 sm:p-6">
          <DialogHeader className="text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full w-fit mb-2">
              <Sparkles className="h-3.5 w-3.5" /> System Workflow Guide
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              How OJT Deployment & Monitoring Works
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-xs sm:text-sm mt-1">
              OJT Tracer connects Companies, Students, and the OJT Coordinator in 4 sequential steps:
            </DialogDescription>
          </DialogHeader>

          {/* 4-Stage Visual Pipeline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {[
              { num: "1", actor: "Company / HTE", task: "Registers & gets MOA verified" },
              { num: "2", actor: "Student", task: "Selects Company & uploads 7 docs" },
              { num: "3", actor: "Coordinator", task: "Approves 7 docs & clicks Deploy" },
              { num: "4", actor: "Active OJT", task: "Geofenced DTR & Journal unlock" },
            ].map((item, idx) => (
              <div
                key={item.num}
                onClick={() => setStepIdx(idx)}
                className={`rounded-xl p-2.5 cursor-pointer transition-all border text-left ${
                  stepIdx === idx
                    ? "bg-white text-slate-900 border-white shadow-md scale-[1.02]"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      stepIdx === idx ? "bg-blue-600 text-white" : "bg-white/20 text-white"
                    }`}
                  >
                    Stage {item.num}
                  </span>
                  {idx < 3 && <ArrowRight className="h-3 w-3 opacity-60 hidden sm:block" />}
                </div>
                <p className="text-xs font-bold leading-tight">{item.actor}</p>
                <p className={`text-[11px] leading-snug mt-0.5 ${stepIdx === idx ? "text-slate-600" : "text-blue-100"}`}>
                  {item.task}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Active Step Body */}
        <div className="p-5 sm:p-6 space-y-4 bg-card">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-xl border shrink-0 ${current.color}`}>
              {current.icon}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {current.badge}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                {current.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {current.subtitle}
              </p>
            </div>
          </div>

          <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2.5">
            {current.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{b}</span>
              </div>
            ))}
          </div>

          {/* Step Dots + Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-border gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStepIdx(i)}
                  className={`h-2 rounded-full transition-all ${
                    stepIdx === i ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {stepIdx > 0 && (
                <Button variant="outline" size="sm" onClick={() => setStepIdx(stepIdx - 1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
              {current.actionLabel && current.actionSection && onNavigate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(current.actionSection)}
                  className="text-primary border-primary/30 hover:bg-primary/5"
                >
                  {current.actionLabel}
                </Button>
              )}
              {stepIdx < steps.length - 1 ? (
                <Button size="sm" onClick={() => setStepIdx(stepIdx + 1)} className="gap-1 bg-primary text-white">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Got It!
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
