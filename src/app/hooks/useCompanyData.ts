import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

export type Intern = {
  id: string | number;
  name: string;
  course: string;
  position: string;
  supervisor: string;
  startDate: string;
  endDate: string;
  hoursCompleted: number;
  requiredHours: number;
  performance: number;
  status: string;
};

export type InternAccomplishment = {
  id: string | number;
  internId: string | number;
  internName: string;
  date: string;
  hours: number;
  details: string;
  picture: string | null;
  status: "pending" | "approved" | "rejected";
};

export const emptyCompanyInfo = {
  name: "",
  industry: "",
  address: "",
  email: "",
  phone: "",
  website: "",
  hrContact: "",
  hrEmail: "",
  description: "",
  moaStatus: "pending",
  accreditedUntil: "",
};

export function useCompanyData() {
  const { user, refreshProfile } = useAuth();
  
  const [interns, setInterns] = useState<Intern[]>([]);
  const [accomplishments, setAccomplishments] = useState<InternAccomplishment[]>([]);
  const [moaTemplateUrl, setMoaTemplateUrl] = useState<string | null>(null);
  const [signedMoaUrl, setSignedMoaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const companyInfo = {
    name: (user as any)?.companyName || user?.name || emptyCompanyInfo.name,
    industry: (user as any)?.industry || emptyCompanyInfo.industry,
    address: (user as any)?.companyAddress || emptyCompanyInfo.address,
    email: user?.email || emptyCompanyInfo.email,
    phone: (user as any)?.phone || emptyCompanyInfo.phone,
    website: (user as any)?.website || emptyCompanyInfo.website,
    hrContact: (user as any)?.hrContact || user?.name || emptyCompanyInfo.hrContact,
    hrEmail: (user as any)?.hrEmail || user?.email || emptyCompanyInfo.hrEmail,
    description: (user as any)?.description || emptyCompanyInfo.description,
    moaStatus: (user as any)?.moaStatus || emptyCompanyInfo.moaStatus,
    accreditedUntil: (user as any)?.accreditedUntil || emptyCompanyInfo.accreditedUntil,
  };

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const [internsRes, accRes, moaTplRes] = await Promise.all([
          api.getInterns().catch(() => []),
          api.getAccomplishments().catch(() => []),
          api.getMoaTemplate().catch(() => ({ fileUrl: null }))
        ]);

        if (!isMounted) return;

        if (moaTplRes) setMoaTemplateUrl(moaTplRes.fileUrl || null);
        // Signed MOA url comes from the company profile
        setSignedMoaUrl((user as any)?.signedMoaUrl || null);

        if (internsRes) {
          setInterns((internsRes || []).map((i: any) => ({
            id: i.id, name: i.name, course: "BSIT",
            position: i.deployment?.position || "—",
            supervisor: i.deployment?.supervisor || "—",
            startDate: i.deployment?.startDate || "—",
            endDate: i.deployment?.endDate || "—",
            hoursCompleted: i.completedHours || 0,
            requiredHours: i.deployment?.requiredHours || 486,
            performance: i.performance ? parseFloat(i.performance) : 0,
            status: i.deployment?.status || "ongoing",
          })));
        }

        if (accRes) {
          setAccomplishments((accRes || []).map((a: any) => ({
            id: a.id, internId: a.internId || a.studentId, internName: a.internName || a.studentName || "—",
            date: a.date, hours: a.hours, details: a.details, picture: a.photoUrl || null, status: a.status,
          })));
        }

      } catch (err) {
        console.error("Failed to load company data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [user]);

  const updateCompanyProfile = async (profileData: any) => {
    try {
      await api.updateProfile(profileData);
      await refreshProfile();
    } catch (err: any) {
      throw err;
    }
  };

  const uploadSignedMoa = async (file: File) => {
    try {
      const res = await api.uploadSignedMoa(file);
      setSignedMoaUrl(res.fileUrl || null);
      toast.success('Signed MOA submitted! The coordinator will review it shortly.');
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
      throw err;
    }
  };

  const approveAccomplishment = async (id: string | number) => {
    const acc = accomplishments.find(a => a.id === id);
    if (!acc) return;
    setAccomplishments(list => list.map(a => a.id === id ? { ...a, status: "approved" } : a));
    try {
      await api.reviewAccomplishment(String(acc.internId), String(id), "approved");
      toast.success("Accomplishment approved.");
    } catch (e: any) {
      setAccomplishments(list => list.map(a => a.id === id ? { ...a, status: "pending" } : a));
      toast.error(`Save failed: ${e.message}`);
      throw e;
    }
  };

  const rejectAccomplishment = async (id: string | number) => {
    const acc = accomplishments.find(a => a.id === id);
    if (!acc) return;
    setAccomplishments(list => list.map(a => a.id === id ? { ...a, status: "rejected" } : a));
    try {
      await api.reviewAccomplishment(String(acc.internId), String(id), "rejected");
      toast.error("Accomplishment rejected.");
    } catch (e: any) {
      setAccomplishments(list => list.map(a => a.id === id ? { ...a, status: "pending" } : a));
      toast.error(`Save failed: ${e.message}`);
      throw e;
    }
  };

  const submitEvaluation = async (internId: string | number, internName: string, scores: Record<string, number>, comments: string) => {
    try {
      const res = await api.submitEvaluation({ studentId: String(internId), studentName: internName, scores, comments });
      
      if (res && res.evaluation && res.evaluation.overall_score !== undefined) {
        setInterns(list => list.map(i => i.id === internId ? { ...i, performance: parseFloat(res.evaluation.overall_score) } : i));
      }

      toast.success("Evaluation submitted successfully to the OJT Coordinator.");
    } catch (e: any) {
      toast.error(`Failed to submit evaluation: ${e.message}`);
      throw e;
    }
  };

  const getEvaluation = async (internId: string | number) => {
    try {
      const res = await api.getEvaluation(String(internId));
      return res;
    } catch (e: any) {
      return null;
    }
  };

  return {
    loading,
    companyInfo,
    interns,
    accomplishments,
    moaTemplateUrl,
    signedMoaUrl,
    updateCompanyProfile,
    uploadSignedMoa,
    approveAccomplishment,
    rejectAccomplishment,
    submitEvaluation,
    getEvaluation
  };
}
