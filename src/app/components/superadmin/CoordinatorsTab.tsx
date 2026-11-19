import { useState, useEffect } from "react";
import { 
  Users, UserPlus, Pencil, Trash2, Shield, Mail, CheckCircle2, 
  AlertCircle, Loader2, RefreshCw 
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { toast } from "sonner";
import { 
  getCoordinators, createCoordinator, updateCoordinator, deleteCoordinator, 
  CoordinatorItem 
} from "../../lib/api";

const VALID_COURSES = ["BSIT", "BEED", "BSSW", "BSBA"] as const;

const courseBadgeColors: Record<string, string> = {
  BSIT: "bg-blue-100 text-blue-800 border-blue-200",
  BEED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  BSSW: "bg-amber-100 text-amber-800 border-amber-200",
  BSBA: "bg-purple-100 text-purple-800 border-purple-200",
};

export function CoordinatorsTab() {
  const [coordinators, setCoordinators] = useState<CoordinatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CoordinatorItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoordinatorItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [course, setCourse] = useState<string>("BSIT");

  const fetchCoordinators = async () => {
    try {
      setLoading(true);
      const data = await getCoordinators();
      setCoordinators(data);
    } catch (err: any) {
      toast.error(`Failed to load coordinators: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordinators();
  }, []);

  const openAdd = () => {
    setName("");
    setEmail("");
    setPassword("");
    setCourse("BSIT");
    setIsAddOpen(true);
  };

  const openEdit = (c: CoordinatorItem) => {
    setEditTarget(c);
    setName(c.name);
    setEmail(c.email);
    setPassword("");
    setCourse(c.coordinatorCourse || "BSIT");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await createCoordinator({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        coordinatorCourse: course,
      });
      toast.success(`Coordinator for ${course} created successfully!`);
      setIsAddOpen(false);
      fetchCoordinators();
    } catch (err: any) {
      toast.error(err.message || "Failed to create coordinator account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      setSubmitting(true);
      await updateCoordinator(editTarget.id, {
        name: name.trim(),
        email: email.trim(),
        coordinatorCourse: course,
        ...(password.trim() ? { password: password.trim() } : {}),
      });
      toast.success("Coordinator updated successfully!");
      setEditTarget(null);
      fetchCoordinators();
    } catch (err: any) {
      toast.error(err.message || "Failed to update coordinator");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSubmitting(true);
      await deleteCoordinator(deleteTarget.id);
      toast.success("Coordinator account removed.");
      setDeleteTarget(null);
      fetchCoordinators();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove coordinator");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/70 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Program Coordinators</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assign and manage OJT coordinators for BSIT, BEED, BSSW, and BSBA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCoordinators}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={openAdd}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            Add Coordinator
          </Button>
        </div>
      </div>

      {/* Coordinators Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs">Loading coordinators...</p>
          </div>
        ) : coordinators.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-semibold text-sm text-foreground">No coordinators found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click &quot;Add Coordinator&quot; above to create accounts for department heads.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Coordinator</th>
                  <th className="py-3 px-4">Department / Program</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {coordinators.map((c) => {
                  const badgeColor = courseBadgeColors[c.coordinatorCourse] || "bg-gray-100 text-gray-800 border-gray-200";
                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm leading-tight">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground">OJT Coordinator</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${badgeColor}`}>
                          {c.coordinatorCourse || "Unassigned"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground/60" />
                          <span>{c.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(c)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit Coordinator"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(c)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete Coordinator"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Department Coordinator</DialogTitle>
            <DialogDescription>
              Create an account for the faculty member managing OJT for a specific course.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Department / Program</Label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full mt-1.5 border border-border bg-background rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                {VALID_COURSES.map((crs) => (
                  <option key={crs} value={crs}>
                    {crs} — {
                      crs === "BSIT" ? "Bachelor of Science in Information Technology" :
                      crs === "BEED" ? "Bachelor of Elementary Education" :
                      crs === "BSSW" ? "Bachelor of Science in Social Work" :
                      "Bachelor of Science in Business Administration"
                    }
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Full Name</Label>
              <Input
                placeholder="e.g., Prof. Maria Santos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">PSU Email Address</Label>
              <Input
                type="email"
                placeholder="coordinator@pampangastateu.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Initial Password</Label>
              <Input
                type="password"
                placeholder="Temporary login password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 text-xs"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                The coordinator will use this password to sign in to the restricted admin portal.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setIsAddOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Create Account
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Coordinator Account</DialogTitle>
            <DialogDescription>
              Update coordinator profile details, department assignment, or reset password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Department / Program</Label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full mt-1.5 border border-border bg-background rounded-lg p-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                {VALID_COURSES.map((crs) => (
                  <option key={crs} value={crs}>{crs}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 text-xs"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">New Password (leave blank to keep current)</Label>
              <Input
                type="password"
                placeholder="Optional new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 text-xs"
              />
            </div>
            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => setEditTarget(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Remove Coordinator
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.name}</strong> as the {deleteTarget?.coordinatorCourse} Coordinator? They will no longer be able to log in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2.5 pt-3">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => setDeleteTarget(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : "Confirm Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

