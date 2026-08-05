import { useState, useEffect } from "react";
import * as api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { REQUIRED_DOC_NAMES } from "./useStudentData";

export type AdminStudent = {
  id: string | number; name: string; studentId: string;
  lastName: string; firstName: string; middleName: string;
  course: string; yearLevel: string; section: string;
  dateOfBirth: string | null; civilStatus: string; sex: string;
  email: string; phone: string; address: string;
  company: string; position: string; hoursCompleted: number; requiredHours: number;
  status: string; intendedCompanyId?: string | null; intendedPosition?: string; performance: number;
  registeredDeviceName?: string | null; deviceRegisteredAt?: string | null;
};
export type AdminCompany = { id: string | number; name: string; industry: string; location: string; activeInterns: number; totalCapacity: number; moaStatus: string; moaExpiry: string; contactPerson: string; verified: boolean; hrContact?: string; hrEmail?: string; signedMoaUrl?: string | null; latitude?: number | null; longitude?: number | null; geofenceRadius?: number };
export type DTRLog = {
  id?: string | number;
  student: string;
  studentId: string | number;
  studentNumber: string;
  section: string;
  date: string;
  day: string;
  timeIn: string;
  timeOut: string;
  timeInPhotoUrl?: string;
  timeOutPhotoUrl?: string;
  hours: number;
  status: string;
  verificationStatus?: "pending" | "approved" | "rejected";
  reviewNote?: string;
};
export type JournalLog = { student: string; section: string; week: string; title: string; submitted: string; status: string };
export type Announcement = { id: string | number; title: string; content: string; date: string; category: string; priority: string };
export type CompanyLocation = { name: string; address: string; lat: number; lng: number; industry: string; interns: number; x: number; y: number; geofenceRadius?: number };
export type AdminTemplate = { name: string; file: string | null; size: string; uploaded: string; docSlug: string | null };
export type AdminDocEntry = { name: string; status: string; file: string | null; uploaded: string };
export type AdminSubmission = { studentId: string | number; name: string; studentNo: string; course: string; section: string; deployed: boolean; assignedCompany: string | null; docs: AdminDocEntry[] };
export type EvaluationRecord = { studentId: string; studentName: string; studentNumber: string; section: string; companyName: string; scores: Record<string, number>; overallScore: number; comments: string; submittedAt: string; };

export function useAdminData() {
  const { user } = useAuth();
  
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [dtrLogs, setDtrLogs] = useState<DTRLog[]>([]);
  const [journalLogs, setJournalLogs] = useState<JournalLog[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [templates, setTemplates] = useState<AdminTemplate[]>(
    REQUIRED_DOC_NAMES.map(name => ({ name, file: null, size: "—", uploaded: "—", docSlug: null }))
  );
  const [studentSubmissions, setStudentSubmissions] = useState<AdminSubmission[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stuRes, compRes, annRes, dtrRes, jrnRes, docRes, tplRes, evalRes] = await Promise.all([
        api.getStudents().catch(() => []),
        api.getCompanies().catch(() => []),
        api.getAnnouncements().catch(() => []),
        api.getAdminDTR().catch(() => []),
        api.getAccomplishments().catch(() => []),
        api.getDocuments().catch(() => []),
        api.getTemplates().catch(() => []),
        api.getAllEvaluations().catch(() => [])
      ]);

      if (stuRes) {
        setStudents((stuRes || []).map((s: any) => ({
          id: s.id, name: s.name, email: s.email || '',
          studentId: s.studentId || '—',
          lastName: s.lastName || '', firstName: s.firstName || '', middleName: s.middleName || '',
          course: s.course || 'BSIT', yearLevel: s.yearLevel || '4th Year',
          section: s.section || '—',
          dateOfBirth: s.dateOfBirth || null, civilStatus: s.civilStatus || '', sex: s.sex || '',
          phone: s.phone || '', address: s.address || '',
          company: s.deployment?.company || '—', position: s.deployment?.position || '—',
          hoursCompleted: s.completedHours || 0, requiredHours: s.deployment?.requiredHours || 486,
          status: s.deployment ? (s.deployment.status || 'ongoing') : 'pending',
          intendedCompanyId: s.intendedCompanyId || null,
          intendedPosition: s.intendedPosition || '',
          registeredDeviceName: s.registeredDeviceName || null,
          deviceRegisteredAt: s.deviceRegisteredAt || null,
          performance: parseFloat(s.performance) || 0,
        })));
      }

      if (compRes) {
        setCompanies((compRes || []).map((c: any) => {
          const compName = c.companyName || c.name;
          const internsCount = (stuRes || []).filter((s: any) => s.deployment?.company === compName).length;
          return {
            id: c.id,
            name: compName,
            industry: c.industry || "—",
            location: c.companyAddress || "—",
            activeInterns: internsCount,
            totalCapacity: 0,
            moaStatus: c.moaStatus || "pending",
            moaExpiry: c.accreditedUntil || "—",
            contactPerson: c.hrContact || c.name,
            verified: c.moaStatus === "active",
            hrContact: c.hrContact,
            hrEmail: c.hrEmail,
            signedMoaUrl: c.signedMoaUrl || null,
            latitude: c.latitude != null ? parseFloat(c.latitude) : null,
            longitude: c.longitude != null ? parseFloat(c.longitude) : null,
            geofenceRadius: c.geofenceRadius || 200
          };
        }));
      }

      if (annRes) {
        setAnnouncements((annRes || []).map((a: any) => ({
          id: a.id, title: a.title, content: a.content, date: a.date,
          category: a.category, priority: a.priority,
        })));
      }

      if (dtrRes) {
        setDtrLogs((dtrRes || []).map((r: any) => ({
          id: r.id,
          student: r.studentName || '—',
          studentId: r.studentId,
          studentNumber: r.studentNumber || '—',
          section: r.section || '—',
          date: r.date || '—',
          day: r.day || '—',
          timeIn: r.timeIn || '—',
          timeOut: r.timeOut || '—',
          timeInPhotoUrl: r.timeInPhotoUrl,
          timeOutPhotoUrl: r.timeOutPhotoUrl,
          hours: Number(r.hours) || 0,
          status: r.timeOut ? 'regular' : r.timeIn ? 'ongoing' : 'rest',
          verificationStatus: r.verificationStatus || 'pending',
          reviewNote: r.reviewNote || '',
        })));
      }

      if (jrnRes) {
        setJournalLogs((jrnRes || []).map((a: any) => {
          const matchedStudent = (stuRes || []).find((s: any) => s.id === a.studentId);
          return {
            student: a.studentName || a.studentId || "—",
            section: matchedStudent?.section || "—",
          week: a.date ? new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
          title: a.details ? (a.details.length > 60 ? a.details.substring(0, 60) + "…" : a.details) : "—",
          submitted: a.createdAt
            ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : "—",
          status: a.status === "rejected" ? "not_submitted" : "submitted",
          };
        }));
      }

      if (docRes) {
        setStudentSubmissions((docRes || []).map((s: any) => ({
          studentId: s.studentId,
          name: s.studentName || "—",
          studentNo: s.studentNo || "—",
          course: "BSIT",
          section: s.section || "—",
          deployed: s.isDeployed || false,
          assignedCompany: s.assignedCompany || null,
          docs: REQUIRED_DOC_NAMES.map((docName) => {
            const found = (s.docs || []).find((d: any) => d.name === docName);
            return found
              ? { name: docName, status: found.status || "missing", file: found.fileUrl || null, uploaded: found.uploadedDate || "—" }
              : { name: docName, status: "missing", file: null, uploaded: "—" };
          }),
        })));
      }

      if (tplRes) {
        setTemplates(REQUIRED_DOC_NAMES.map((name) => {
          const found = (tplRes || []).find((t: any) => t.name === name);
          return found
            ? { name, file: found.fileUrl || null, size: found.size || "—", uploaded: found.uploadedDate || "—", docSlug: found.docSlug || null }
            : { name, file: null, size: "—", uploaded: "—", docSlug: null };
        }));
      }

      if (evalRes) {
        setEvaluations(evalRes || []);
      }

    } catch (err) {
      console.error("Failed to load admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const verifyCompany = async (id: string | number, name: string) => {
    try {
      setCompanies(list => list.map(c => c.id === id ? { ...c, verified: true, moaStatus: 'active' } : c));
      await api.verifyCompany(id, 'active');
      toast.success(`${name} has been verified and approved.`);
    } catch (err: any) {
      setCompanies(list => list.map(c => c.id === id ? { ...c, verified: false, moaStatus: 'pending' } : c));
      toast.error(`Verification failed: ${err.message}`);
      throw err;
    }
  };

  const updateMoaStatus = async (id: string | number, status: string, expiry: string) => {
    try {
      setCompanies(list => list.map(c => c.id === id
        ? { ...c, moaStatus: status, moaExpiry: expiry || '—', verified: status === 'active' }
        : c));
      await api.updateMoa(id, status, expiry || undefined);
      toast.success('MOA status updated successfully.');
    } catch (err: any) {
      toast.error(`Failed to update MOA: ${err.message}`);
      throw err;
    }
  };

  const uploadTemplate = async (name: string, file: File) => {
    try {
      setTemplates(list => list.map(t => t.name === name ? { ...t, uploaded: "Uploading…" } : t));
      const result = await api.uploadTemplate(name, file);
      const slug = name.replace(/\s+/g, "_").toLowerCase();
      setTemplates(list => list.map(t => t.name === name
        ? { ...t, file: result.fileUrl || t.file, size: result.fileSize || "—", uploaded: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), docSlug: slug }
        : t));
      toast.success(`${name} template uploaded.`);
    } catch (err: any) {
      setTemplates(list => list.map(t => t.name === name ? { ...t, file: null, size: "—", uploaded: "—" } : t));
      toast.error(`Upload failed: ${err.message}`);
      throw err;
    }
  };

  const reviewDocument = async (subId: string | number, docName: string, status: "approved" | "rejected") => {
    try {
      setStudentSubmissions(list => list.map(s => s.studentId === subId
        ? { ...s, docs: s.docs.map(d => d.name === docName ? { ...d, status, file: status === "rejected" ? null : d.file, uploaded: status === "rejected" ? "—" : d.uploaded } : d) }
        : s));
      await api.reviewDocument(String(subId), docName, status);
      if (status === "approved") {
        toast.success(`${docName} approved.`);
      } else {
        toast.error(`${docName} rejected — student must resubmit.`);
      }
    } catch (err: any) {
      toast.error(`Failed to save review: ${err.message}`);
      setStudentSubmissions(list => list.map(s => s.studentId === subId
        ? { ...s, docs: s.docs.map(d => d.name === docName ? { ...d, status: "pending" } : d) }
        : s));
      throw err;
    }
  };

  const deployStudent = async (studentId: string | number, payload: any) => {
    try {
      await api.deployStudent(String(studentId), payload);
      setStudentSubmissions(list => list.map(s => s.studentId === studentId
        ? { ...s, deployed: true, assignedCompany: payload.companyName } : s));
      setStudents(list => list.map(s => String(s.id) === String(studentId)
        ? { ...s, company: payload.companyName, position: payload.position, status: "ongoing" } : s));
      toast.success("Student deployed and linked to company.");
    } catch (err: any) {
      toast.error(`Deployment failed: ${err.message}`);
      throw err;
    }
  };

  const deleteAnnouncement = async (id: string | number) => {
    try {
      await api.deleteAnnouncement(String(id));
      setAnnouncements(list => list.filter(a => String(a.id) !== String(id)));
      toast.success("Announcement deleted successfully.");
    } catch (err: any) {
      toast.error(`Deletion failed: ${err.message}`);
      throw err;
    }
  };

  const deleteCompany = async (id: string | number) => {
    try {
      await api.deleteCompany(id);
      setCompanies(list => list.filter(c => String(c.id) !== String(id)));
      toast.success("Company deleted successfully.");
    } catch (err: any) {
      toast.error(`Deletion failed: ${err.message}`);
      throw err;
    }
  };

  const deleteTemplate = async (name: string, docSlug: string | null) => {
    const slug = docSlug ?? name.replace(/\s+/g, "_").toLowerCase();
    const prev = templates.find(t => t.name === name);
    try {
      setTemplates(list => list.map(t => t.name === name
        ? { ...t, file: null, size: "—", uploaded: "—", docSlug: null }
        : t));
      await api.deleteTemplate(slug);
      toast.success(`${name} template removed.`);
    } catch (err: any) {
      if (prev) {
        setTemplates(list => list.map(t => t.name === name ? prev : t));
      }
      toast.error(`Deletion failed: ${err.message}`);
      throw err;
    }
  };

  const resetStudentDevice = async (studentId: string | number, name: string) => {
    try {
      await api.resetStudentDevice(String(studentId));
      setStudents(list => list.map(s => String(s.id) === String(studentId)
        ? { ...s, registeredDeviceName: null, deviceRegisteredAt: null }
        : s));
      toast.success(`Registered device for ${name} has been reset.`);
    } catch (err: any) {
      toast.error(`Reset failed: ${err.message}`);
      throw err;
    }
  };

  return {
    loading,
    students,
    companies,
    evaluations,
    dtrLogs,
    journalLogs,
    announcements,
    templates,
    studentSubmissions,
    verifyCompany,
    updateMoaStatus,
    uploadTemplate,
    reviewDocument,
    deployStudent,
    resetStudentDevice,
    deleteAnnouncement,
    deleteCompany,
    deleteTemplate,
    reload: loadData
  };
}
