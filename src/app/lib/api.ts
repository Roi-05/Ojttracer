import { projectId, publicAnonKey } from "/utils/supabase/info";
import { supabase } from "./supabase";

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-09490c03`;

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || publicAnonKey;
}

async function apiFetch(path: string, options: RequestInit = {}, timeoutMs = 15_000) {
  const token = await getToken();

  // Abort the fetch if the server doesn't respond within timeoutMs.
  // Without this, a cold-start / unreachable edge function hangs the UI forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    // Guard against non-JSON responses (e.g. an HTML 403 gateway page from
    // Supabase when the edge function isn't deployed).  Calling res.json()
    // unconditionally on such a response throws a SyntaxError that swallows
    // the real HTTP status code.
    let json: any;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      json = await res.json();
    } else {
      const text = await res.text();
      json = { error: text.trim() || `HTTP ${res.status}` };
    }

    if (!res.ok) throw new Error(json.error || `API error ${res.status}`);
    return json;
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error(
        "Request timed out — the server is taking too long to respond. " +
        "Check that the Supabase edge function is deployed and try again."
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export async function signUp(payload: {
  email: string; password: string; name: string; role: string;
  studentId?: string; section?: string; companyName?: string; industry?: string;
}) {
  return apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(payload) });
}

export async function getMe() {
  return apiFetch("/auth/me");
}

export async function updateProfile(data: Record<string, unknown>) {
  return apiFetch("/profile", { method: "PUT", body: JSON.stringify(data) });
}

// ─── DTR ──────────────────────────────────────────────────────────────────
export async function getDTR() {
  return apiFetch("/dtr");
}

export async function getAdminDTR() {
  return apiFetch("/admin/dtr");
}

export async function getDTRByStudent(studentId: string) {
  return apiFetch(`/dtr/${studentId}`);
}

export async function clockDTR(payload: { date: string; mode: "in" | "out"; time: string; photo?: string | null; day?: string }) {
  return apiFetch("/dtr/clock", { method: "POST", body: JSON.stringify(payload) });
}

// ─── Accomplishments ────────────────────────────────────────────────────
export async function getAccomplishments(studentId?: string) {
  const q = studentId ? `?studentId=${studentId}` : "";
  return apiFetch(`/accomplishments${q}`);
}

export async function createAccomplishment(payload: { date: string; hours: number; details: string; photo?: string | null }) {
  return apiFetch("/accomplishments", { method: "POST", body: JSON.stringify(payload) });
}

export async function reviewAccomplishment(studentId: string, id: string, status: "approved" | "rejected", note?: string) {
  return apiFetch(`/accomplishments/${studentId}/${id}/review`, { method: "PUT", body: JSON.stringify({ status, note }) });
}

// ─── Documents ─────────────────────────────────────────────────────────
export async function getDocuments(studentId?: string) {
  const q = studentId ? `?studentId=${studentId}` : "";
  return apiFetch(`/documents${q}`);
}

export async function submitDocument(docName: string, fileData: string, fileName?: string) {
  return apiFetch("/documents/submit", { method: "POST", body: JSON.stringify({ docName, fileData, fileName }) });
}

export async function reviewDocument(studentId: string, docName: string, status: string, note?: string) {
  return apiFetch("/documents/review", { method: "PUT", body: JSON.stringify({ studentId, docName, status, note }) });
}

// ─── Templates ─────────────────────────────────────────────────────────
export async function getTemplates() {
  return apiFetch("/templates");
}

export async function uploadTemplate(docName: string, fileData: string, fileName?: string, fileSize?: string) {
  return apiFetch("/templates", { method: "POST", body: JSON.stringify({ docName, fileData, fileName, fileSize }) });
}

// ─── Announcements ─────────────────────────────────────────────────────
export async function getAnnouncements() {
  return apiFetch("/announcements");
}

export async function createAnnouncement(payload: { title: string; content: string; category: string; priority: string }) {
  return apiFetch("/announcements", { method: "POST", body: JSON.stringify(payload) });
}

export async function deleteAnnouncement(id: string) {
  return apiFetch(`/announcements/${id}`, { method: "DELETE" });
}

// ─── Deployment ─────────────────────────────────────────────────────────
export async function getDeployment() {
  return apiFetch("/deployment");
}

export async function deployStudent(studentId: string, payload: {
  companyId: string; companyName: string; position: string; startDate: string; endDate: string;
  requiredHours: number; supervisorName?: string; supervisorEmail?: string; address?: string;
}) {
  return apiFetch(`/students/${studentId}/deploy`, { method: "PUT", body: JSON.stringify(payload) });
}

// ─── Students / Companies ───────────────────────────────────────────────
export async function getStudents() {
  return apiFetch("/students");
}

export async function getCompanies() {
  return apiFetch("/companies");
}

export async function getInterns() {
  return apiFetch("/interns");
}

// ─── Evaluations ────────────────────────────────────────────────────────
export async function getEvaluation(studentId: string) {
  return apiFetch(`/evaluations/${studentId}`);
}

export async function submitEvaluation(payload: {
  studentId: string; studentName: string; scores: Record<string, number>; comments?: string;
}) {
  return apiFetch("/evaluations", { method: "POST", body: JSON.stringify(payload) });
}