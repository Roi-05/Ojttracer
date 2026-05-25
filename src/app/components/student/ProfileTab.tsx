import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { User, Plus, X, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as api from "../../lib/api";
import { resolveUploadUrl } from "../../lib/uploads";
import { useAuth } from "../../contexts/AuthContext";

interface ProfileTabProps {
  studentProfile: {
    name: string;
    studentId: string;
    lastName?: string;
    firstName?: string;
    middleName?: string;
    course: string;
    year: string;
    section: string;
    dateOfBirth?: string | null;
    civilStatus?: string;
    sex?: string;
    email: string;
    phone: string;
    address: string;
    skills: string[];
    religion?: string;
    avatarUrl?: string | null;
    fatherName?: string;
    fatherOccupation?: string;
    fatherPhone?: string;
    motherName?: string;
    motherOccupation?: string;
    motherPhone?: string;
    guardianName?: string;
    guardianRelationship?: string;
    guardianPhone?: string;
  };
  updateProfileData: (data: any) => Promise<void>;
}

function computeAge(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return "—";
  const today = new Date();
  let a = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() || (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) a--;
  return String(a);
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export function ProfileTab({ studentProfile, updateProfileData }: ProfileTabProps) {
  const { refreshProfile, user } = useAuth();
  const [formData, setFormData] = useState(studentProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    resolveUploadUrl(user?.avatarUrl ?? studentProfile.avatarUrl)
  );

  useEffect(() => {
    setAvatarPreview(resolveUploadUrl(user?.avatarUrl ?? studentProfile.avatarUrl));
  }, [user?.avatarUrl, studentProfile.avatarUrl]);

  // Skills
  const [newSkill, setNewSkill] = useState("");

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dobDisplay = formData.dateOfBirth
    ? new Date(formData.dateOfBirth).toISOString().split("T")[0]
    : "";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfileData({ ...formData, skills: formData.skills });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only image files are allowed (JPG, PNG, WEBP, GIF).");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setIsUploadingPhoto(true);
    try {
      const res = await api.uploadAvatar(file);
      await refreshProfile();
      setAvatarPreview(resolveUploadUrl(res.avatarUrl));
      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error(`Failed to upload photo: ${err.message}`);
      setAvatarPreview(resolveUploadUrl(user?.avatarUrl ?? studentProfile.avatarUrl));
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleAddSkill = () => {
    const skill = newSkill.trim();
    if (!skill) return;
    if (formData.skills.includes(skill)) {
      toast.error("That skill is already in the list.");
      return;
    }
    setFormData({ ...formData, skills: [...formData.skills, skill] });
    setNewSkill("");
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const initials = (formData.firstName || formData.name).charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Your personal information on record</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-white gap-2"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handlePhotoChange}
            />

            {/* Avatar circle */}
            <div className="relative inline-block mb-4">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold mx-auto">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              {isUploadingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}
            </div>

            <h3 className="font-semibold text-lg">
              {formData.lastName && formData.firstName
                ? `${formData.firstName} ${formData.middleName ? formData.middleName.charAt(0) + ". " : ""}${formData.lastName}`
                : formData.name}
            </h3>
            <p className="text-muted-foreground text-sm">{formData.course}</p>
            <p className="text-muted-foreground text-sm">{formData.year} • {formData.section}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {formData.studentId}</p>

            <button
              onClick={handlePhotoClick}
              disabled={isUploadingPhoto}
              className="mt-4 flex items-center gap-1.5 text-sm text-primary hover:underline mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="h-3.5 w-3.5" />
              {isUploadingPhoto ? "Uploading..." : "Change Photo"}
            </button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP or GIF · max 5 MB</p>
          </CardContent>
        </Card>

        {/* Personal info */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Last Name</Label>
                <Input value={formData.lastName || ""} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">First Name</Label>
                <Input value={formData.firstName || ""} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Middle Name</Label>
                <Input value={formData.middleName || ""} onChange={e => setFormData({ ...formData, middleName: e.target.value })} className="mt-1.5" />
              </div>
            </div>

            {/* Course / Year / Section */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Course</Label>
                <Input value={formData.course} onChange={e => setFormData({ ...formData, course: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Year Level</Label>
                <Input value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Section</Label>
                <Input value={formData.section} onChange={e => setFormData({ ...formData, section: e.target.value })} className="mt-1.5" />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label className="text-sm text-muted-foreground">Address</Label>
              <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="mt-1.5" />
            </div>

            {/* DOB / Age */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Date of Birth</Label>
                <Input type="date" value={dobDisplay} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Age</Label>
                <Input value={computeAge(formData.dateOfBirth)} className="mt-1.5" readOnly />
              </div>
            </div>

            {/* Civil Status / Sex */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Civil Status</Label>
                <Input value={formData.civilStatus || ""} onChange={e => setFormData({ ...formData, civilStatus: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Sex</Label>
                <Input value={formData.sex || ""} onChange={e => setFormData({ ...formData, sex: e.target.value })} className="mt-1.5" />
              </div>
            </div>

            {/* Contact / Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Contact No.</Label>
                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">PSU Email</Label>
                <Input value={formData.email} className="mt-1.5" readOnly />
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Religion</Label>
              <Input value={formData.religion || ""} onChange={e => setFormData({ ...formData, religion: e.target.value })} className="mt-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Parent / Guardian Information */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parent / Guardian Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Father's Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-primary">Father's Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Father's Name</Label>
                  <Input value={formData.fatherName || ""} onChange={e => setFormData({ ...formData, fatherName: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Occupation</Label>
                  <Input value={formData.fatherOccupation || ""} onChange={e => setFormData({ ...formData, fatherOccupation: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact No.</Label>
                  <Input value={formData.fatherPhone || ""} onChange={e => setFormData({ ...formData, fatherPhone: e.target.value })} className="mt-1.5" />
                </div>
              </div>
            </div>

            {/* Mother's Info */}
            <div className="space-y-3 pt-3 border-t border-border">
              <h4 className="text-sm font-semibold text-primary">Mother's Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Mother's Name</Label>
                  <Input value={formData.motherName || ""} onChange={e => setFormData({ ...formData, motherName: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Occupation</Label>
                  <Input value={formData.motherOccupation || ""} onChange={e => setFormData({ ...formData, motherOccupation: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact No.</Label>
                  <Input value={formData.motherPhone || ""} onChange={e => setFormData({ ...formData, motherPhone: e.target.value })} className="mt-1.5" />
                </div>
              </div>
            </div>

            {/* Guardian's Info */}
            <div className="space-y-3 pt-3 border-t border-border">
              <h4 className="text-sm font-semibold text-primary">Guardian's Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Guardian's Name</Label>
                  <Input value={formData.guardianName || ""} onChange={e => setFormData({ ...formData, guardianName: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Relationship with Student Intern</Label>
                  <Input value={formData.guardianRelationship || ""} onChange={e => setFormData({ ...formData, guardianRelationship: e.target.value })} className="mt-1.5" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Contact Number/s</Label>
                  <Input value={formData.guardianPhone || ""} onChange={e => setFormData({ ...formData, guardianPhone: e.target.value })} className="mt-1.5" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Skills &amp; Competencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add skill input */}
            <div className="flex gap-2">
              <Input
                placeholder="Type a skill and press Add or Enter..."
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 px-4"
                onClick={handleAddSkill}
                disabled={!newSkill.trim()}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>

            {/* Skill tags */}
            <div className="flex flex-wrap gap-2">
              {formData.skills?.length > 0 ? (
                formData.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-blue-400 hover:text-blue-700 transition-colors ml-0.5"
                      title={`Remove ${skill}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills added yet. Type a skill above and press Add.</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Skills are saved when you click <strong>Save Changes</strong> above.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
