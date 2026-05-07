import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

app.use("*", logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ─── Storage Bucket Init ───────────────────────────────────────────────────
const BUCKETS = ["make-09490c03-dtr", "make-09490c03-documents", "make-09490c03-templates", "make-09490c03-accphotos"];
(async () => {
  const { data: existing } = await supabase.storage.listBuckets();
  for (const name of BUCKETS) {
    if (!existing?.some((b: any) => b.name === name)) {
      await supabase.storage.createBucket(name);
      console.log(`Created bucket: ${name}`);
    }
  }
})();

// ─── Auth Helpers ──────────────────────────────────────────────────────────
async function getAuthUser(c: any) {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// ─── File Upload Helper ────────────────────────────────────────────────────
async function uploadBase64(bucket: string, path: string, dataUrl: string, contentType: string) {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 86400);
  return data?.signedUrl ?? null;
}

// ─── Profile assembly (joins profiles + students/companies) ────────────────
async function loadProfile(userId: string): Promise<any | null> {
  const { data: base } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!base) return null;
  const out: any = {
    id: base.id, email: base.email, name: base.name, role: base.role,
    createdAt: base.created_at,
  };
  if (base.role === "student") {
    const { data: s } = await supabase.from("students").select("*").eq("user_id", userId).maybeSingle();
    if (s) Object.assign(out, {
      studentId: s.student_id, section: s.section, phone: s.phone, address: s.address,
      skills: s.skills || [], emergencyContact: s.emergency_contact,
    });
  } else if (base.role === "company") {
    const { data: cmp } = await supabase.from("companies").select("*").eq("user_id", userId).maybeSingle();
    if (cmp) Object.assign(out, {
      companyName: cmp.company_name, industry: cmp.industry, companyAddress: cmp.company_address,
      website: cmp.website, hrContact: cmp.hr_contact, hrEmail: cmp.hr_email, phone: cmp.phone,
      description: cmp.description, moaStatus: cmp.moa_status, accreditedUntil: cmp.accredited_until,
    });
  }
  return out;
}

const todayLabel = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ─── Health ───────────────────────────────────────────────────────────────
app.get("/make-server-09490c03/health", (c) => c.json({ status: "ok" }));

// ─── AUTH: Signup ─────────────────────────────────────────────────────────
app.post("/make-server-09490c03/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role, studentId, section, companyName, industry } = body;
    if (!email || !password || !name || !role) return c.json({ error: "Missing required fields" }, 400);

    const { data, error } = await supabase.auth.admin.createUser({
      email, password, user_metadata: { name, role }, email_confirm: true,
    });
    if (error) return c.json({ error: `Signup error: ${error.message}` }, 400);

    const userId = data.user.id;

    // Use upsert (not insert) so this is idempotent: the DB trigger
    // handle_new_user() may have already inserted the profile row before
    // this line runs.  Upserting with onConflict:"id" is a no-op if the
    // trigger already created an identical row, and overwrites it with the
    // exact same values otherwise — safe either way.
    const { error: pErr } = await supabase
      .from("profiles")
      .upsert({ id: userId, email, name, role }, { onConflict: "id" });
    if (pErr) return c.json({ error: `Profile upsert: ${pErr.message}` }, 500);

    if (role === "student") {
      await supabase
        .from("students")
        .upsert(
          { user_id: userId, student_id: studentId || "", section: section || "" },
          { onConflict: "user_id" }
        );
    } else if (role === "company") {
      await supabase
        .from("companies")
        .upsert(
          {
            user_id: userId, company_name: companyName || name, industry: industry || "",
            hr_contact: name, hr_email: email,
          },
          { onConflict: "user_id" }
        );
    }
    return c.json({ success: true, userId });
  } catch (err) {
    console.log("Signup error:", err);
    return c.json({ error: `Server error during signup: ${err}` }, 500);
  }
});

// ─── AUTH: Get current user profile ──────────────────────────────────────
app.get("/make-server-09490c03/auth/me", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    let profile = await loadProfile(user.id);
    if (!profile) {
      // Self-heal: create from auth metadata
      const meta: any = user.user_metadata || {};
      const role = meta.role || "student";
      await supabase.from("profiles").insert({ id: user.id, email: user.email, name: meta.name || user.email, role });
      if (role === "student") await supabase.from("students").insert({ user_id: user.id });
      else if (role === "company") await supabase.from("companies").insert({ user_id: user.id, hr_email: user.email });
      profile = await loadProfile(user.id);
    }
    return c.json(profile);
  } catch (err) {
    console.log("Auth/me error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── PROFILE: Update ─────────────────────────────────────────────────────
app.put("/make-server-09490c03/profile", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json();

    if (body.name) await supabase.from("profiles").update({ name: body.name }).eq("id", user.id);

    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (prof?.role === "student") {
      const upd: any = {};
      if (body.studentId !== undefined) upd.student_id = body.studentId;
      if (body.section !== undefined) upd.section = body.section;
      if (body.phone !== undefined) upd.phone = body.phone;
      if (body.address !== undefined) upd.address = body.address;
      if (body.skills !== undefined) upd.skills = body.skills;
      if (body.emergencyContact !== undefined) upd.emergency_contact = body.emergencyContact;
      if (Object.keys(upd).length) await supabase.from("students").update(upd).eq("user_id", user.id);
    } else if (prof?.role === "company") {
      const upd: any = {};
      if (body.companyName !== undefined) upd.company_name = body.companyName;
      if (body.industry !== undefined) upd.industry = body.industry;
      if (body.companyAddress !== undefined) upd.company_address = body.companyAddress;
      if (body.website !== undefined) upd.website = body.website;
      if (body.hrContact !== undefined) upd.hr_contact = body.hrContact;
      if (body.hrEmail !== undefined) upd.hr_email = body.hrEmail;
      if (body.phone !== undefined) upd.phone = body.phone;
      if (body.description !== undefined) upd.description = body.description;
      if (body.moaStatus !== undefined) upd.moa_status = body.moaStatus;
      if (body.accreditedUntil !== undefined) upd.accredited_until = body.accreditedUntil;
      if (Object.keys(upd).length) await supabase.from("companies").update(upd).eq("user_id", user.id);
    }

    const profile = await loadProfile(user.id);
    return c.json({ success: true, profile });
  } catch (err) {
    console.log("Profile update error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── DTR: helpers ────────────────────────────────────────────────────────
function rowToDTR(r: any) {
  return {
    date: r.date, day: r.day, timeIn: r.time_in, timeOut: r.time_out,
    timeInPhotoUrl: r.time_in_photo_url, timeOutPhotoUrl: r.time_out_photo_url,
    hours: Number(r.hours), remarks: r.remarks,
  };
}

// ─── DTR: Admin get ALL students' records ─────────────────────────────────
app.get("/make-server-09490c03/admin/dtr", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    // Fetch all DTR records joined with profile names
    const { data: records } = await supabase
      .from("dtr_records")
      .select("*, profiles:student_id(name)")
      .order("date", { ascending: false });
    const out = (records || []).map((r: any) => ({
      ...rowToDTR(r),
      studentId: r.student_id,
      studentName: r.profiles?.name || r.student_id,
    }));
    return c.json(out);
  } catch (err) {
    console.log("Admin DTR get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── DTR: Get student's own records ──────────────────────────────────────
app.get("/make-server-09490c03/dtr", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { data } = await supabase.from("dtr_records").select("*").eq("student_id", user.id).order("date", { ascending: false });
    return c.json((data || []).map(rowToDTR));
  } catch (err) {
    console.log("DTR get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── DTR: Admin/Company get by student ───────────────────────────────────
app.get("/make-server-09490c03/dtr/:studentId", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const studentId = c.req.param("studentId");
    const { data } = await supabase.from("dtr_records").select("*").eq("student_id", studentId).order("date", { ascending: false });
    return c.json((data || []).map(rowToDTR));
  } catch (err) {
    console.log("DTR get by student error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── DTR: Clock in/out ────────────────────────────────────────────────────
app.post("/make-server-09490c03/dtr/clock", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { date, mode, time, photo, day } = await c.req.json();
    if (!date || !mode || !time) return c.json({ error: "Missing fields" }, 400);

    const { data: existing } = await supabase.from("dtr_records").select("*")
      .eq("student_id", user.id).eq("date", date).maybeSingle();

    if (mode === "in") {
      if (existing?.time_in) return c.json({ error: "Already timed in today" }, 400);
      let photoUrl: string | null = null;
      if (photo) {
        try { photoUrl = await uploadBase64("make-09490c03-dtr", `${user.id}/${date}/in.jpg`, photo, "image/jpeg"); }
        catch (e) { console.log("Photo upload error:", e); }
      }
      const row = {
        student_id: user.id, date, day: day || existing?.day || "",
        time_in: time, time_in_photo_url: photoUrl,
        time_out: existing?.time_out ?? null, time_out_photo_url: existing?.time_out_photo_url ?? null,
        hours: existing?.hours ?? 0, remarks: "Regular",
      };
      const { data: saved } = await supabase.from("dtr_records").upsert(row, { onConflict: "student_id,date" }).select().single();
      return c.json({ success: true, record: saved && rowToDTR(saved) });
    } else {
      if (!existing?.time_in) return c.json({ error: "Must time in first" }, 400);
      if (existing.time_out) return c.json({ error: "Already timed out today" }, 400);
      let photoUrl: string | null = null;
      if (photo) {
        try { photoUrl = await uploadBase64("make-09490c03-dtr", `${user.id}/${date}/out.jpg`, photo, "image/jpeg"); }
        catch (e) { console.log("Photo upload error:", e); }
      }
      const parse = (s: string) => {
        const m = s.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!m) return 0;
        let h = parseInt(m[1]); const min = parseInt(m[2]); const p = m[3].toUpperCase();
        if (p === "PM" && h !== 12) h += 12;
        if (p === "AM" && h === 12) h = 0;
        return h + min / 60;
      };
      const hours = Math.max(0, Math.round((parse(time) - parse(existing.time_in)) * 100) / 100);
      const { data: saved } = await supabase.from("dtr_records")
        .update({ time_out: time, time_out_photo_url: photoUrl, hours })
        .eq("student_id", user.id).eq("date", date).select().single();
      return c.json({ success: true, record: saved && rowToDTR(saved) });
    }
  } catch (err) {
    console.log("DTR clock error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── ACCOMPLISHMENTS: helpers ────────────────────────────────────────────
function rowToAcc(r: any, extra: any = {}) {
  return {
    id: r.id, studentId: r.student_id, date: r.date, hours: Number(r.hours),
    details: r.details, photoUrl: r.photo_url, status: r.status,
    reviewNote: r.review_note, createdAt: r.created_at, ...extra,
  };
}

// ─── ACCOMPLISHMENTS: Get ────────────────────────────────────────────────
app.get("/make-server-09490c03/accomplishments", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = prof?.role || user.user_metadata?.role || "student";

    if (role === "student") {
      const { data } = await supabase.from("accomplishments").select("*").eq("student_id", user.id).order("date", { ascending: false });
      return c.json((data || []).map((r: any) => rowToAcc(r)));
    }
    if (role === "company") {
      const { data: deps } = await supabase.from("deployments").select("student_id").eq("company_id", user.id);
      const ids = (deps || []).map((d: any) => d.student_id);
      if (ids.length === 0) return c.json([]);
      const { data: accs } = await supabase.from("accomplishments")
        .select("*, profiles:student_id(name)").in("student_id", ids).order("date", { ascending: false });
      return c.json((accs || []).map((r: any) => rowToAcc(r, { internName: r.profiles?.name, internId: r.student_id })));
    }
    // admin
    const studentId = c.req.query("studentId");
    if (studentId) {
      const { data } = await supabase.from("accomplishments").select("*").eq("student_id", studentId).order("date", { ascending: false });
      return c.json((data || []).map((r: any) => rowToAcc(r)));
    }
    const { data: accs } = await supabase.from("accomplishments")
      .select("*, profiles:student_id(name)").order("date", { ascending: false });
    return c.json((accs || []).map((r: any) => rowToAcc(r, { studentName: r.profiles?.name })));
  } catch (err) {
    console.log("Accomplishments get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── ACCOMPLISHMENTS: Create ─────────────────────────────────────────────
app.post("/make-server-09490c03/accomplishments", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { date, hours, details, photo } = await c.req.json();
    if (!date || !hours || !details) return c.json({ error: "Missing required fields" }, 400);

    const id = `${Date.now()}`;
    let photoUrl: string | null = null;
    if (photo) {
      try { photoUrl = await uploadBase64("make-09490c03-accphotos", `${user.id}/${id}.jpg`, photo, "image/jpeg"); }
      catch (e) { console.log("Accomplishment photo upload error:", e); }
    }
    const { data, error } = await supabase.from("accomplishments").insert({
      id, student_id: user.id, date, hours: parseFloat(hours), details, photo_url: photoUrl, status: "pending",
    }).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, accomplishment: rowToAcc(data) });
  } catch (err) {
    console.log("Accomplishment create error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── ACCOMPLISHMENTS: Review ─────────────────────────────────────────────
app.put("/make-server-09490c03/accomplishments/:studentId/:id/review", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { studentId, id } = c.req.param();
    const { status, note } = await c.req.json();
    if (!["approved", "rejected"].includes(status)) return c.json({ error: "Invalid status" }, 400);

    const { data, error } = await supabase.from("accomplishments")
      .update({ status, review_note: note || "" })
      .eq("id", id).eq("student_id", studentId).select().maybeSingle();
    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: "Accomplishment not found" }, 404);
    return c.json({ success: true, accomplishment: rowToAcc(data) });
  } catch (err) {
    console.log("Accomplishment review error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── DOCUMENTS: helpers ──────────────────────────────────────────────────
function rowToDoc(r: any) {
  return { name: r.name, status: r.status, fileUrl: r.file_url, uploadedDate: r.uploaded_date, reviewNote: r.review_note };
}

// ─── DOCUMENTS: Get ──────────────────────────────────────────────────────
app.get("/make-server-09490c03/documents", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const role = prof?.role || user.user_metadata?.role || "student";

    if (role === "student") {
      const { data } = await supabase.from("documents").select("*").eq("student_id", user.id);
      return c.json((data || []).map(rowToDoc));
    }
    const studentId = c.req.query("studentId");
    if (studentId) {
      const { data } = await supabase.from("documents").select("*").eq("student_id", studentId);
      return c.json((data || []).map(rowToDoc));
    }
    // All students with their docs
    const { data: students } = await supabase.from("profiles")
      .select("id, name, students(student_id, section)").eq("role", "student");
    const result: any[] = [];
    for (const s of students || []) {
      const { data: docs } = await supabase.from("documents").select("*").eq("student_id", s.id);
      result.push({
        studentId: s.id, studentName: s.name,
        studentNo: (s as any).students?.student_id, section: (s as any).students?.section,
        docs: (docs || []).map(rowToDoc),
      });
    }
    return c.json(result);
  } catch (err) {
    console.log("Documents get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── DOCUMENTS: Submit ───────────────────────────────────────────────────
app.post("/make-server-09490c03/documents/submit", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { docName, fileData } = await c.req.json();
    if (!docName || !fileData) return c.json({ error: "Missing required fields" }, 400);

    const docSlug = docName.replace(/\s+/g, "_");
    let fileUrl: string | null = null;
    try { fileUrl = await uploadBase64("make-09490c03-documents", `${user.id}/${docSlug}.pdf`, fileData, "application/pdf"); }
    catch (e) { console.log("Document upload error:", e); }

    const row = { student_id: user.id, name: docName, status: "pending", file_url: fileUrl, uploaded_date: todayLabel(), review_note: "" };
    const { data, error } = await supabase.from("documents").upsert(row, { onConflict: "student_id,name" }).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, doc: rowToDoc(data) });
  } catch (err) {
    console.log("Document submit error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── DOCUMENTS: Review ───────────────────────────────────────────────────
app.put("/make-server-09490c03/documents/review", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { studentId, docName, status, note } = await c.req.json();
    const { data, error } = await supabase.from("documents")
      .update({ status, review_note: note || "" })
      .eq("student_id", studentId).eq("name", docName).select().maybeSingle();
    if (error) return c.json({ error: error.message }, 500);
    if (!data) return c.json({ error: "Document not found" }, 404);
    return c.json({ success: true });
  } catch (err) {
    console.log("Document review error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── TEMPLATES: Get ──────────────────────────────────────────────────────
app.get("/make-server-09490c03/templates", async (c) => {
  try {
    const { data } = await supabase.from("templates").select("*");
    return c.json((data || []).map((t: any) => ({
      name: t.name, docSlug: t.doc_slug, fileUrl: t.file_url, size: t.size, uploadedDate: t.uploaded_date,
    })));
  } catch (err) {
    console.log("Templates get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── TEMPLATES: Upload ────────────────────────────────────────────────────
app.post("/make-server-09490c03/templates", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { docName, fileData, fileSize } = await c.req.json();
    if (!docName || !fileData) return c.json({ error: "Missing required fields" }, 400);

    const docSlug = docName.replace(/\s+/g, "_");
    let fileUrl: string | null = null;
    try { fileUrl = await uploadBase64("make-09490c03-templates", `${docSlug}.pdf`, fileData, "application/pdf"); }
    catch (e) { console.log("Template upload error:", e); }

    const row = { doc_slug: docSlug, name: docName, file_url: fileUrl, size: fileSize || "—", uploaded_date: todayLabel() };
    const { data, error } = await supabase.from("templates").upsert(row, { onConflict: "doc_slug" }).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, template: { name: data.name, docSlug: data.doc_slug, fileUrl: data.file_url, size: data.size, uploadedDate: data.uploaded_date } });
  } catch (err) {
    console.log("Template upload error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────
app.get("/make-server-09490c03/announcements", async (c) => {
  try {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    return c.json(data || []);
  } catch (err) {
    console.log("Announcements get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

app.post("/make-server-09490c03/announcements", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { title, content, category, priority } = await c.req.json();
    if (!title || !content) return c.json({ error: "Missing required fields" }, 400);
    const id = `${Date.now()}`;
    const row = { id, title, content, category: category || "update", priority: priority || "normal", date: todayLabel() };
    const { data, error } = await supabase.from("announcements").insert(row).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, announcement: data });
  } catch (err) {
    console.log("Announcement create error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

app.delete("/make-server-09490c03/announcements/:id", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    await supabase.from("announcements").delete().eq("id", c.req.param("id"));
    return c.json({ success: true });
  } catch (err) {
    console.log("Announcement delete error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── DEPLOYMENT: helpers ─────────────────────────────────────────────────
function rowToDeployment(r: any) {
  if (!r) return null;
  return {
    studentId: r.student_id, companyId: r.company_id, company: r.company_name,
    supervisor: r.supervisor, supervisorEmail: r.supervisor_email, address: r.address,
    startDate: r.start_date, endDate: r.end_date, requiredHours: r.required_hours,
    position: r.position, status: r.status, deployedAt: r.deployed_at,
  };
}

app.get("/make-server-09490c03/deployment", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { data } = await supabase.from("deployments").select("*").eq("student_id", user.id).maybeSingle();
    return c.json(rowToDeployment(data));
  } catch (err) {
    console.log("Deployment get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── STUDENTS: Get all ───────────────────────────────────────────────────
app.get("/make-server-09490c03/students", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { data: profiles } = await supabase.from("profiles")
      .select("id, email, name, role, created_at, students(*), deployments(*)").eq("role", "student");
    const enriched = (profiles || []).map((p: any) => ({
      id: p.id, email: p.email, name: p.name, role: p.role, createdAt: p.created_at,
      studentId: p.students?.student_id, section: p.students?.section, phone: p.students?.phone,
      address: p.students?.address, skills: p.students?.skills || [],
      emergencyContact: p.students?.emergency_contact,
      deployment: rowToDeployment(p.deployments),
    }));
    return c.json(enriched);
  } catch (err) {
    console.log("Students get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── COMPANIES: Get all ──────────────────────────────────────────────────
app.get("/make-server-09490c03/companies", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { data: profiles } = await supabase.from("profiles")
      .select("id, email, name, role, created_at, companies(*)").eq("role", "company");
    const enriched = (profiles || []).map((p: any) => ({
      id: p.id, email: p.email, name: p.name, role: p.role, createdAt: p.created_at,
      companyName: p.companies?.company_name, industry: p.companies?.industry,
      companyAddress: p.companies?.company_address, website: p.companies?.website,
      hrContact: p.companies?.hr_contact, hrEmail: p.companies?.hr_email,
      phone: p.companies?.phone, description: p.companies?.description,
      moaStatus: p.companies?.moa_status, accreditedUntil: p.companies?.accredited_until,
    }));
    return c.json(enriched);
  } catch (err) {
    console.log("Companies get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── DEPLOY: Assign student to company ───────────────────────────────────
app.put("/make-server-09490c03/students/:id/deploy", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const studentId = c.req.param("id");
    const { companyId, companyName, position, startDate, endDate, requiredHours, supervisorName, supervisorEmail, address } = await c.req.json();

    const row = {
      student_id: studentId, company_id: companyId, company_name: companyName,
      supervisor: supervisorName || "", supervisor_email: supervisorEmail || "",
      address: address || "", start_date: startDate, end_date: endDate,
      required_hours: parseInt(requiredHours) || 486, position, status: "ongoing",
    };
    const { data, error } = await supabase.from("deployments").upsert(row, { onConflict: "student_id" }).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, deployment: rowToDeployment(data) });
  } catch (err) {
    console.log("Deploy error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── INTERNS: Get company's interns ─────────────────────────────────────
app.get("/make-server-09490c03/interns", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { data: deps } = await supabase.from("deployments").select("*").eq("company_id", user.id);
    if (!deps?.length) return c.json([]);

    const ids = deps.map((d: any) => d.student_id);
    const { data: profiles } = await supabase.from("profiles")
      .select("id, email, name, students(*)").in("id", ids);
    const { data: dtr } = await supabase.from("dtr_records").select("student_id, hours").in("student_id", ids);

    const hoursByStudent: Record<string, number> = {};
    for (const r of dtr || []) hoursByStudent[r.student_id] = (hoursByStudent[r.student_id] || 0) + Number(r.hours || 0);

    const result = (profiles || []).map((p: any) => {
      const dep = deps.find((d: any) => d.student_id === p.id);
      return {
        id: p.id, email: p.email, name: p.name,
        studentId: p.students?.student_id, section: p.students?.section,
        phone: p.students?.phone, address: p.students?.address,
        deployment: rowToDeployment(dep),
        completedHours: Math.round((hoursByStudent[p.id] || 0) * 10) / 10,
      };
    });
    return c.json(result);
  } catch (err) {
    console.log("Interns get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

// ─── EVALUATIONS ─────────────────────────────────────────────────────────
function rowToEval(r: any) {
  if (!r) return null;
  return {
    studentId: r.student_id, studentName: r.student_name, companyId: r.company_id,
    scores: r.scores, overallScore: Number(r.overall_score), comments: r.comments,
    submittedAt: r.submitted_at,
  };
}

app.get("/make-server-09490c03/evaluations/:studentId", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { data } = await supabase.from("evaluations").select("*").eq("student_id", c.req.param("studentId")).maybeSingle();
    return c.json(rowToEval(data));
  } catch (err) {
    console.log("Evaluation get error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

app.post("/make-server-09490c03/evaluations", async (c) => {
  try {
    const user = await getAuthUser(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { studentId, studentName, scores, comments } = await c.req.json();
    const vals = Object.values(scores || {}) as number[];
    const overall = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : 0;
    const row = {
      student_id: studentId, student_name: studentName, company_id: user.id,
      scores: scores || {}, overall_score: overall, comments: comments || "",
    };
    const { data, error } = await supabase.from("evaluations").upsert(row, { onConflict: "student_id" }).select().single();
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ success: true, evaluation: rowToEval(data) });
  } catch (err) {
    console.log("Evaluation submit error:", err);
    return c.json({ error: `Server error: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);