import { useState, useEffect, useRef } from "react";
import * as api from "../lib/api";
import { resolveUploadUrl } from "../lib/uploads";
import { useAuth } from "../contexts/AuthContext";
import { getOrCreateDeviceToken, getDeviceName } from "../lib/device";
import { getCurrentPosition } from "../lib/geolocation";
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
    deviceResetRequested?: boolean;
  }>({
    registeredDeviceToken: null,
    registeredDeviceName: null,
    deviceRegisteredAt: null,
    deviceResetRequested: false,
  });
  
  const [loading, setLoading] = useState(true);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const isTrackingRef = useRef(false);
  const lastPingAtRef = useRef(0);

  // ── Location tracker helpers ───────────────────────────────────────────────
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator && document.visibilityState === "visible" && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        wakeLockRef.current?.addEventListener?.("release", () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      // Ignore if browser/OS declines wake lock
    }
  };

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch {
      wakeLockRef.current = null;
    }
  };

  const sendLocationPing = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastPingAtRef.current < 5_000) return;
    lastPingAtRef.current = now;
    try {
      const pos = await getCurrentPosition();
      await api.pingLocation(pos.latitude, pos.longitude, pos.accuracy);
    } catch {
      // Silently swallow — network hiccup or GPS unavailable; will retry next interval
    }
  };

  const startLocationTracking = () => {
    isTrackingRef.current = true;
    requestWakeLock();
    if (!locationIntervalRef.current) {
      sendLocationPing(true); // send immediately on start
      locationIntervalRef.current = setInterval(() => sendLocationPing(false), 30_000);
    }
    if (locationWatchIdRef.current === null && typeof navigator !== "undefined" && "geolocation" in navigator) {
      try {
        locationWatchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const now = Date.now();
            if (now - lastPingAtRef.current >= 15_000) {
              lastPingAtRef.current = now;
              api.pingLocation(
                position.coords.latitude,
                position.coords.longitude,
                position.coords.accuracy
              ).catch(() => {});
            }
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 }
        );
      } catch {
        // Ignore watchPosition setup error
      }
    }
  };

  const stopLocationTracking = () => {
    isTrackingRef.current = false;
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    if (locationWatchIdRef.current !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
      try {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      } catch {
        // Ignore clearWatch error
      }
      locationWatchIdRef.current = null;
    }
    releaseWakeLock();
  };

  useEffect(() => {
    if (!user) return;
    
    let isMounted = true;
    let isFetching = false;
    
    const loadAllData = async (silent = false) => {
      if (isFetching) return;
      isFetching = true;
      try {
        if (!silent) setLoading(true);
        const [dtrRes, accRes, docRes, depRes, annRes, tplRes, compRes, evalRes, deviceRes] = await Promise.all([
          api.getDTR().catch(() => null),
          api.getAccomplishments().catch(() => null),
          api.getDocuments().catch(() => null),
          api.getDeployment().catch(() => null),
          api.getAnnouncements().catch(() => null),
          api.getTemplates().catch(() => null),
          api.getCompanies().catch(() => null),
          api.getEvaluation((user as any)?.id).catch(() => null),
          api.getDeviceStatus().catch(() => null)
        ]);

        if (!isMounted) return;

        if (deviceRes) {
          setDeviceInfo({
            registeredDeviceToken: deviceRes.registeredDeviceToken || null,
            registeredDeviceName: deviceRes.registeredDeviceName || null,
            deviceRegisteredAt: deviceRes.deviceRegisteredAt || null,
            deviceResetRequested: deviceRes.deviceResetRequested || false,
          });
        }

        if (!silent) {
          setIntendedCompanyId((user as any)?.intendedCompanyId || null);
          setIntendedPosition((user as any)?.intendedPosition || "");
        }
        if (Array.isArray(compRes)) {
          setActiveCompanies(
            compRes
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

        if (Array.isArray(dtrRes)) {
          setDtrRecords(dtrRes.map((r: any) => ({
            date: r.date, day: r.day || "", timeIn: r.timeIn || null, timeOut: r.timeOut || null,
            timeInPhoto: resolveUploadUrl(r.timeInPhotoUrl),
            timeOutPhoto: resolveUploadUrl(r.timeOutPhotoUrl),
            hours: parseFloat(r.hours) || 0, remarks: r.remarks || "Regular",
            status: r.status || "pending",
            reviewNote: r.reviewNote || "",
          })));
        }

        if (Array.isArray(accRes)) {
          setAccomplishments(accRes.map((r: any) => ({
            id: r.id, date: r.date, hours: parseFloat(r.hours) || 0, details: r.details,
            picture: resolveUploadUrl(r.photoUrl), status: r.status,
          })));
        }

        if (Array.isArray(docRes)) {
          setDocuments(REQUIRED_DOC_NAMES.map((name) => {
            const found = docRes.find((d: any) => d.name === name);
            return found ? { name, status: found.status, file: found.fileUrl || found.file || null, uploadedDate: found.uploadedDate || "—" }
              : { name, status: "missing", file: null, uploadedDate: "—" };
          }));
        }

        if (depRes) setDeployment(depRes);

        if (Array.isArray(annRes)) {
          setAnnouncements(prev => {
            const readIds = new Set(prev.filter(p => p.read).map(p => String(p.id)));
            return annRes.map((a: any) => ({
              id: a.id, title: a.title, content: a.content, date: a.date,
              category: a.category, priority: a.priority, read: readIds.has(String(a.id)),
            }));
          });
        }

        if (Array.isArray(tplRes)) {
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
        isFetching = false;
        if (isMounted && !silent) setLoading(false);
      }
    };

    loadAllData(false);

    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadAllData(true);
      }
    }, 15_000);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        loadAllData(true);
        if (isTrackingRef.current) {
          sendLocationPing(true);
          requestWakeLock();
        }
      }
    };
    const handleOnline = () => {
      loadAllData(true);
      if (isTrackingRef.current) {
        sendLocationPing(true);
      }
    };
    window.addEventListener("focus", handleVisibilityOrFocus);
    window.addEventListener("pageshow", handleVisibilityOrFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      window.removeEventListener("pageshow", handleVisibilityOrFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      stopLocationTracking();
    };
  }, [user]);

  // Auto-resume tracking if already clocked in (page reload / tab switch)
  useEffect(() => {
    if (!dtrRecords.length) return;
    const localToday = new Date().toLocaleDateString("en-CA");
    const utcToday = new Date().toISOString().slice(0, 10);
    const todayRecord = dtrRecords.find(r => r.date === localToday || r.date === utcToday);
    if (todayRecord?.timeIn && !todayRecord?.timeOut) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [dtrRecords]);

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

  const requestDeviceReset = async () => {
    try {
      await api.requestDeviceReset();
      setDeviceInfo(prev => ({
        ...prev,
        deviceResetRequested: true,
      }));
      toast.success("Device reset request sent to your supervisor for approval.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to request device reset");
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
      startLocationTracking(); // Begin live tracking
    } catch (err: any) {
      toast.error(err?.message || "Clock In failed.");
      throw err;
    }
  };

  const clockOut = async (date: string, time: string, photo: string | null, hours: number) => {
    try {
      const deviceToken = getOrCreateDeviceToken();
      const remarks = hours < 8 ? "Undertime" : "Completed";
      await api.clockDTR({ date, mode: "out", time, photo, deviceToken });
      setDtrRecords(records => records.map(r => {
        if (r.date !== date || !r.timeIn) return r;
        return { ...r, timeOut: time, timeOutPhoto: photo, hours, remarks };
      }));
      stopLocationTracking(); // End live tracking
    } catch (err: any) {
      toast.error(err?.message || "Clock Out failed.");
      throw err;
    }
  };

  const submitDocument = async (docName: string, file: File | string, fileName?: string) => {
    try {
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const tempFileName = file instanceof File ? file.name : (fileName || "document");

      const result = await api.submitDocument(docName, file as any, fileName);
      const uploadedUrl = result?.fileUrl || tempFileName;

      setDocuments(list => list.map(d => d.name === docName
        ? { ...d, status: "pending", file: uploadedUrl, uploadedDate: today }
        : d));
      toast.success(`${docName} uploaded successfully!`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit document to server.");
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
    requestDeviceReset,
    clockIn,
    clockOut,
    submitDocument,
    submitAccomplishment,
    setTargetCompany,
    updateProfileData
  };
}
