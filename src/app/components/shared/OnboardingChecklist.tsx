import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import {
  CheckCircle2, Circle, ArrowRight, ChevronDown, ChevronUp, Sparkles, HelpCircle, Lock
} from "lucide-react";
import { REQUIRED_DOC_NAMES, StudentDocument } from "../../hooks/useStudentData";

interface StudentJourneyChecklistProps {
  studentProfile: any;
  intendedCompanyId: string | null;
  intendedPosition: string;
  studentDocs: StudentDocument[];
  isDeployed: boolean;
  deployedCompany?: string;
  onNavigate: (section: string) => void;
  onOpenGuide?: () => void;
}

export function StudentJourneyChecklist({
  studentProfile,
  intendedCompanyId,
  intendedPosition,
  studentDocs,
  isDeployed,
  deployedCompany,
  onNavigate,
  onOpenGuide,
}: StudentJourneyChecklistProps) {
  const [collapsed, setCollapsed] = useState(isDeployed);

  const totalDocs = REQUIRED_DOC_NAMES.length;
  const uploadedDocs = studentDocs.filter(d => d.status && d.status !== "missing").length;
  const approvedDocs = studentDocs.filter(d => d.status === "approved").length;

  const step1Done = Boolean(studentProfile?.phone && studentProfile?.address && studentProfile?.signatureUrl);
  const step2Done = Boolean(intendedCompanyId) || isDeployed;
  const step3Done = approvedDocs === totalDocs || isDeployed;
  const step4Done = isDeployed;

  const steps = [
    {
      num: 1,
      title: "Complete Profile & E-Signature",
      desc: step1Done
        ? "Contact details and digital signature saved."
        : "Fill in your contact info and upload/draw your Digital Signature for reports.",
      done: step1Done,
      actionLabel: "My Profile",
      section: "profile",
    },
    {
      num: 2,
      title: "Select Target Company & Position",
      desc: step2Done
        ? `Target HTE selected${intendedPosition ? ` (${intendedPosition})` : ""}.`
        : "Coordinate with your company first. Once their account is verified by the Coordinator, select them in Documents.",
      done: step2Done,
      actionLabel: "Select Company",
      section: "documents",
    },
    {
      num: 3,
      title: "Submit 7 Required OJT Documents",
      desc: step3Done
        ? `All ${totalDocs}/${totalDocs} documents approved by Coordinator!`
        : `${uploadedDocs}/${totalDocs} uploaded • ${approvedDocs}/${totalDocs} approved by Coordinator.`,
      done: step3Done,
      actionLabel: "Upload Docs",
      section: "documents",
    },
    {
      num: 4,
      title: "Coordinator Deployment Approval",
      desc: step4Done
        ? `Officially deployed${deployedCompany ? ` to ${deployedCompany}` : ""}! DTR & Journal are unlocked.`
        : step3Done && step2Done
        ? "All requirements complete! Waiting for Coordinator to click 'Deploy'."
        : "Unlocks DTR & Daily Journal once your Coordinator deploys you.",
      done: step4Done,
      actionLabel: step4Done ? "Open DTR" : undefined,
      section: step4Done ? "attendance" : undefined,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;

  return (
    <Card className="border border-border bg-card shadow-sm mb-6 overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold text-xs">
              {completedCount}/4
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  {isDeployed
                    ? `OJT Deployment Active${deployedCompany ? ` — ${deployedCompany}` : ""}`
                    : "Your OJT Pre-Deployment Checklist"}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {isDeployed ? "Deployed & Unlocked" : `${completedCount} of 4 completed`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isDeployed
                  ? "Your Daily Time Record (DTR) and Daily Accomplishment Journal are unlocked."
                  : "Complete steps 1–3 below so your OJT Coordinator can deploy you and unlock your DTR & Journal."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenGuide && (
              <Button variant="outline" size="sm" onClick={onOpenGuide} className="h-8 text-xs gap-1.5 bg-white">
                <HelpCircle className="h-3.5 w-3.5 text-primary" /> How It Works
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 px-2 text-xs text-muted-foreground"
            >
              {collapsed ? (
                <>Show Steps <ChevronDown className="h-4 w-4 ml-1" /></>
              ) : (
                <>Hide <ChevronUp className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>

        {!collapsed && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border/60">
            {steps.map((s) => (
              <div
                key={s.num}
                className={`rounded-xl p-3.5 border flex flex-col justify-between transition-all ${
                  s.done
                    ? "bg-white/90 border-emerald-200"
                    : "bg-white border-border shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      s.done ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
                    }`}>
                      Step {s.num}
                    </span>
                    {s.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : s.num === 4 ? (
                      <Lock className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-primary/60 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                {s.actionLabel && s.section && (
                  <Button
                    variant={s.done ? "outline" : "default"}
                    size="sm"
                    onClick={() => onNavigate(s.section!)}
                    className={`mt-3 w-full h-7 text-xs gap-1 ${
                      s.done ? "" : "bg-primary hover:bg-primary/90 text-white"
                    }`}
                  >
                    {s.done ? `Review ${s.actionLabel}` : s.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CompanyJourneyChecklistProps {
  companyInfo: any;
  signedMoaUrl: string | null;
  internsCount: number;
  onNavigate: (section: string) => void;
  onOpenGuide?: () => void;
}

export function CompanyJourneyChecklist({
  companyInfo,
  signedMoaUrl,
  internsCount,
  onNavigate,
  onOpenGuide,
}: CompanyJourneyChecklistProps) {
  const step1Done = Boolean(companyInfo?.address && companyInfo?.hrContact && companyInfo?.signatureUrl);
  const step2Done = companyInfo?.moaStatus === "active";
  const step3Done = Boolean(
    (companyInfo?.latitude != null && companyInfo?.longitude != null) ||
    (Array.isArray(companyInfo?.geofencePolygon) && companyInfo.geofencePolygon.length >= 3)
  );
  const step4Done = internsCount > 0;

  const allSetupDone = step1Done && step2Done && step3Done;
  const [collapsed, setCollapsed] = useState(allSetupDone);

  const steps = [
    {
      num: 1,
      title: "Company Profile & E-Signature",
      desc: step1Done
        ? "Company details and supervisor signature saved."
        : "Add your workplace address, HR contact, and supervisor digital signature.",
      done: step1Done,
      actionLabel: "Company Profile",
      section: "profile",
    },
    {
      num: 2,
      title: "Upload MOA & Get Verified",
      desc: step2Done
        ? "MOA verified (Active)! Students can now select your company."
        : signedMoaUrl
        ? "Signed MOA uploaded — waiting for Coordinator verification."
        : "Upload your signed MOA so the Coordinator can activate your company.",
      done: step2Done,
      actionLabel: "Accreditation",
      section: "accreditation",
    },
    {
      num: 3,
      title: "Set Workplace Geofence",
      desc: step3Done
        ? "Workplace GPS boundary is active."
        : "Pin your office or draw a polygon boundary on the map for intern DTR.",
      done: step3Done,
      actionLabel: "Live Tracker",
      section: "tracker",
    },
    {
      num: 4,
      title: "Manage Interns, DTR & Journals",
      desc: step4Done
        ? `${internsCount} deployed intern${internsCount > 1 ? "s" : ""} linked to your company.`
        : "Once the Coordinator deploys students to you, manage their break time, DTR, and evaluations here.",
      done: step4Done,
      actionLabel: "My Interns",
      section: "interns",
    },
  ];

  const completedCount = steps.filter(s => s.done).length;

  return (
    <Card className="border border-border bg-card shadow-sm mb-6 overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold text-xs">
              {completedCount}/4
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  Company / HTE Onboarding & Setup Guide
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {completedCount} of 4 completed
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete these setup steps so students can select your company and clock in inside your workplace geofence.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenGuide && (
              <Button variant="outline" size="sm" onClick={onOpenGuide} className="h-8 text-xs gap-1.5 bg-white">
                <HelpCircle className="h-3.5 w-3.5 text-primary" /> How It Works
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 px-2 text-xs text-muted-foreground"
            >
              {collapsed ? (
                <>Show Steps <ChevronDown className="h-4 w-4 ml-1" /></>
              ) : (
                <>Hide <ChevronUp className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </div>

        {!collapsed && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border/60">
            {steps.map((s) => (
              <div
                key={s.num}
                className={`rounded-xl p-3.5 border flex flex-col justify-between ${
                  s.done ? "bg-white/90 border-emerald-200" : "bg-white border-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      s.done ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary"
                    }`}>
                      Step {s.num}
                    </span>
                    {s.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-primary/60 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <Button
                  variant={s.done ? "outline" : "default"}
                  size="sm"
                  onClick={() => onNavigate(s.section)}
                  className={`mt-3 w-full h-7 text-xs gap-1 ${
                    s.done ? "" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                >
                  {s.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
