const BASE = `http://localhost:3000`;

function getToken(): string {
  return localStorage.getItem("custom_auth_token") || "";
}

async function apiFetch(path: string, options: RequestInit = {}, timeoutMs = 15_000) {
  const token = getToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Don't set Content-Type for FormData — browser sets it with boundary
  const isFormData = options.body instanceof FormData;

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: isFormData
        ? { Authorization: `Bearer ${token}`, ...(options.headers || {}) }
        : { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });

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
      throw new Error("Request timed out — the server is taking too long to respond.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export async function login(payload: { email: string; password: string }) {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify(payload) });
}

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

export async function submitDocument(docName: string, file: File): Promise<any>;
export async function submitDocument(docName: string, fileData: string, fileName?: string): Promise<any>;
export async function submitDocument(docName: string, fileOrData: File | string, fileName?: string) {
  if (fileOrData instanceof File) {
    const fd = new FormData();
    fd.append("docName", docName);
    fd.append("file", fileOrData, fileOrData.name);
    return apiFetch("/documents/submit", { method: "POST", body: fd });
  }
  return apiFetch("/documents/submit", { method: "POST", body: JSON.stringify({ docName, fileData: fileOrData, fileName }) });
}

export async function reviewDocument(studentId: string, docName: string, status: string, note?: string) {
  return apiFetch("/documents/review", { method: "PUT", body: JSON.stringify({ studentId, docName, status, note }) });
}

// ─── Templates ─────────────────────────────────────────────────────────
export async function getTemplates() {
  return apiFetch("/templates");
}

export async function uploadTemplate(docName: string, file: File): Promise<any>;
export async function uploadTemplate(docName: string, fileData: string, fileName?: string, fileSize?: string): Promise<any>;
export async function uploadTemplate(docName: string, fileOrData: File | string, fileName?: string, _fileSize?: string) {
  if (fileOrData instanceof File) {
    const fd = new FormData();
    fd.append("docName", docName);
    fd.append("file", fileOrData, fileOrData.name);
    return apiFetch("/templates", { method: "POST", body: fd });
  }
  return apiFetch("/templates", { method: "POST", body: JSON.stringify({ docName, fileData: fileOrData, fileName }) });
}

export async function deleteTemplate(slug: string) {
  return apiFetch(`/templates/${slug}`, { method: "DELETE" });
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

export async function getActiveCompanies() {
  return apiFetch("/students/active-companies");
}

export async function setIntendedCompany(companyId: string | null) {
  return apiFetch("/students/intended-company", { method: "PUT", body: JSON.stringify({ companyId }) });
}

export async function deployStudent(studentId: string, payload: {
  companyId: string; companyName: string; position: string; startDate: string; endDate: string;
  requiredHours: number; supervisor?: string; supervisorEmail?: string; address?: string;
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

export async function verifyCompany(id: string | number, status: string = "active") {
  return apiFetch(`/companies/${id}/verify`, { method: "PUT", body: JSON.stringify({ status }) });
}

export async function updateMoa(id: string | number, status: string, expiryDate?: string) {
  return apiFetch(`/companies/${id}/moa`, { method: "PUT", body: JSON.stringify({ status, expiryDate }) });
}

export async function uploadSignedMoa(file: File) {
  return new Promise<any>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = await apiFetch("/companies/signed-moa", {
          method: "POST",
          body: JSON.stringify({ fileData: reader.result as string, fileName: file.name }),
        });
        resolve(result);
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function getMoaTemplate() {
  return apiFetch("/companies/moa-template");
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