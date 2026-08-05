import { useState, useEffect, useRef } from "react";
import * as api from "../lib/api";
import { resolveUploadUrl } from "../lib/uploads";
import { useAuth } from "../contexts/AuthContext";
import { getOrCreateDeviceToken, getDeviceName } from "../lib/device";
import { toast } from "sonner";

export type DTRRecord = {
  date: string;
  day: string;
  timeIn: string | null;
  timeOut: string | null;
  timeInPhoto: string | null;
  timeOutPhoto: string | null;
  hours: number;
  remarks: string;
  status?: "pending" | "approved" | "rejected";
  reviewNote?: string;
};

export type DailyAccomplishment = {
  id: number | string;
  date: string;
  hours: number;
  details: string;
  picture: string | null;
  status: "pending" | "approved" | "rejected";
};

export type StudentDocument = {
  name: string;
  status: string;
  file: string | null;
  uploadedDate: string;
};

export type Template = {
  name: string;
  file: string | null;
  size: string;
  uploaded: string;
};

export type Announcement = {
  id: number | string;
  title: string;
  content: string;
  date: string;
  category: string;
  priority: string;
  read: boolean;
};

export const REQUIRED_DOC_NAMES = [
  "Parent Guardian Consent Form",
  "Certificate of Enrollment",
  "Certification Form",
  "Internship Endorsement Form",
  "1st Endorsement Form",
  "Internship Agreement Form",
  "Memorandum of Agreement",
];

export function useStudentData() {
  const { user, refreshProfile } = useAuth();
  
  const [dtrRecords, setDtrRecords] = useState<DTRRecord[]>([]);
  const [accomplishments, setAccomplishments] = useState<DailyAccomplishment[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>(
    REQUIRED_DOC_NAMES.map(name => ({ name, status: "missing", file: null, uploadedDate: "—" }))
  );
  const [deployment, setDeployment] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [templates, setTemplates] = useState<Template[]>(
    REQUIRED_DOC_NAMES.map(name => ({ name, file: null, size: "—", uploaded: "—" }))
  );
  const [activeCompanies, setActiveCompanies] = useState<any[]>([]);
  const [intendedCompanyId, setIntendedCompanyId] = useState<string | null>(null);
  const [intendedPosition, setIntendedPosition] = useState<string>("");
  const [evaluation, setEvaluation] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState<{
    registeredDeviceToken: string | null;
    registeredDeviceName: string | null;
    deviceRegisteredAt: string | null;
  }>({
    registeredDeviceToken: null,
    registeredDeviceName: null,
    deviceRegisteredAt: null,
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [dtrRes, accRes, docRes, depRes, annRes, tplRes, compRes, evalRes, deviceRes] = await Promise.all([
          api.getDTR().catch(() => []),
          api.getAccomplishments().catch(() => []),
          api.getDocuments().catch(() => []),
          api.getDeployment().catch(() => null),
          api.getAnnouncements().catch(() => []),
          api.getTemplates().catch(() => []),
          api.getCompanies().catch(() => []),
          api.getEvaluation((user as any)?.id).catch(() => null),
          api.getDeviceStatus().catch(() => null)
        ]);

        if (!isMounted) return;

        if (deviceRes) {
          setDeviceInfo({
            registeredDeviceToken: deviceRes.registeredDeviceToken || null,
            registeredDeviceName: deviceRes.registeredDeviceName || null,
            deviceRegisteredAt: deviceRes.deviceRegisteredAt || null,
          });
        }

        setIntendedCompanyId((user as any)?.intendedCompanyId || null);
        setIntendedPosition((user as any)?.intendedPosition || "");
        if (compRes) {
          setActiveCompanies(
            (compRes || [])
              .filter((c: { moaStatus?: string }) => c.moaStatus === "active")
              .map((c: { id: string; companyName?: string; name?: string; industry?: string; companyAddress?: string; description?: string; signedMoaUrl?: string | null }) => ({
                id: c.id,
                name: c.companyName || c.name || "",
                industry: c.industry || "",
                description: c.description || "",
                address: c.companyAddress || "",
                signedMoaUrl: c.signedMoaUrl || null,
              }))
          );
        }

        if (dtrRes?.length) {
          setDtrRecords(dtrRes.map((r: any) => ({
            date: r.date, day: r.day || "", timeIn: r.timeIn || null, timeOut: r.timeOut || null,
            timeInPhoto: resolveUploadUrl(r.timeInPhotoUrl),
            timeOutPhoto: resolveUploadUrl(r.timeOutPhotoUrl),
            hours: parseFloat(r.hours) || 0, remarks: r.remarks || "Regular",
            status: r.status || "pending",
            reviewNote: r.reviewNote || "",
          })));
        }

        if (accRes?.length) {
          setAccomplishments(accRes.map((r: any) => ({
            id: r.id, date: r.date, hours: parseFloat(r.hours) || 0, details: r.details,
            picture: resolveUploadUrl(r.photoUrl), status: r.status,
          })));
        }

        if (docRes !== null) {
          setDocuments(REQUIRED_DOC_NAMES.map((name) => {
            const found = (docRes || []).find((d: any) => d.name === name);
            return found ? { name, status: found.status, file: found.fileUrl || found.file || null, uploadedDate: found.uploadedDate || "—" }
              : { name, status: "missing", file: null, uploadedDate: "—" };
          }));
        }

        if (depRes) setDeployment(depRes);

        if (annRes?.length) {
          setAnnouncements(annRes.map((a: any) => ({
            id: a.id, title: a.title, content: a.content, date: a.date,
            category: a.category, priority: a.priority, read: false,
          })));
        }

        if (tplRes?.length) {
          setTemplates(REQUIRED_DOC_NAMES.map((name) => {
            const found = tplRes.find((t: any) => t.name === name);
            return found ? { name, file: found.fileUrl || name.replace(/\s+/g, "_") + "_Template.pdf", size: found.size || "—", uploaded: found.uploadedDate || "—" }
              : { name, file: null, size: "—", uploaded: "—" };
          }));
        }

        if (evalRes) {
          setEvaluation(evalRes);
        }

      } catch (err) {
        console.error("Error loading student data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllData();
    
    return () => { isMounted = false; };
  }, [user]);

  const registerCurrentDevice = async () => {
    try {
      const token = getOrCreateDeviceToken();
      const name = getDeviceName();
      const res = await api.registerDevice(token, name);
      setDeviceInfo({
        registeredDeviceToken: res.registeredDeviceToken,
        registeredDeviceName: res.registeredDeviceName,
        deviceRegisteredAt: res.deviceRegisteredAt,
      });
      toast.success(`Device registered: ${res.registeredDeviceName}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to register device");
      throw err;
    }
  };

  const clockIn = async (date: string, time: string, photo: string | null, day: string) => {
    try {
      const deviceToken = getOrCreateDeviceToken();
      await api.clockDTR({ date, mode: "in", time, photo, day, deviceToken });
      setDtrRecords(records => {
        const existing = records.find(r => r.date === date);
        if (existing) {
          return records.map(r => r.date === date
            ? { ...r, timeIn: time, timeInPhoto: photo, remarks: r.remarks || "Regular" }
            : r);
        }
        return [{
          date, day, timeIn: time, timeOut: null, timeInPhoto: photo, timeOutPhoto: null,
          hours: 0, remarks: "Regular",
        }, ...records];
      });
    } catch (err: any) {
      toast.error(err?.message || "Clock In failed.");
      throw err;
    }
  };

  const clockOut = async (date: string, time: string, photo: string | null, hours: number) => {
    try {
      const deviceToken = getOrCreateDeviceToken();
      await api.clockDTR({ date, mode: "out", time, photo, deviceToken });
      setDtrRecords(records => records.map(r => {
        if (r.date !== date || !r.timeIn) return r;
        return { ...r, timeOut: time, timeOutPhoto: photo, hours };
      }));
    } catch (err: any) {
      toast.error(err?.message || "Clock Out failed.");
      throw err;
    }
  };

  const submitDocument = async (docName: string, file: File | string, fileName?: string) => {
    try {
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const tempFileName = file instanceof File ? file.name : (fileName || "document");
      
      setDocuments(list => list.map(d => d.name === docName
        ? { ...d, status: "pending", file: tempFileName, uploadedDate: today }
        : d));
        
      const result = await api.submitDocument(docName, file as any, fileName);
      if (result?.fileUrl) {
        setDocuments(list => list.map(d => d.name === docName
          ? { ...d, file: result.fileUrl } : d));
      }
    } catch (err) {
      toast.error("Failed to submit document to server.");
      throw err;
    }
  };

  const submitAccomplishment = async (date: string, hours: number, details: string, photo: string | null) => {
    const tempId = Date.now();
    try {
      // Optimistic insert
      setAccomplishments(list => [
        { id: tempId, date, hours, details, picture: photo, status: "pending" },
        ...list,
      ]);
      const res = await api.createAccomplishment({ date, hours, details, photo });
      // Replace temp id with real one from server
      setAccomplishments(list => list.map(a => a.id === tempId
        ? { ...a, id: res.accomplishment?.id || tempId }
        : a));
    } catch (err: any) {
      // Roll back the optimistic insert
      setAccomplishments(list => list.filter(a => a.id !== tempId));
      toast.error(err?.message || "Failed to save journal entry.");
      throw err;
    }
  };

  const setTargetCompany = async (companyId: string, position: string) => {
    try {
      await api.setIntendedCompany(companyId, position.trim());
      setIntendedCompanyId(companyId);
      setIntendedPosition(position.trim());
      await refreshProfile();
      toast.success('Target company and job role saved.');
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
      throw err;
    }
  };

  const updateProfileData = async (data: any) => {
    try {
      await api.updateProfile(data);
      await refreshProfile();
      toast.success('Profile updated successfully.');
    } catch (err: any) {
      toast.error(`Failed to update profile: ${err.message}`);
      throw err;
    }
  };

  return {
    loading,
    dtrRecords,
    accomplishments,
    documents,
    deployment,
    announcements,
    templates,
    activeCompanies,
    intendedCompanyId,
    intendedPosition,
    evaluation,
    deviceInfo,
    registerCurrentDevice,
    clockIn,
    clockOut,
    submitDocument,
    submitAccomplishment,
    setTargetCompany,
    updateProfileData
  };
}
