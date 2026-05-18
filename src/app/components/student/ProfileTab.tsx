import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { User, Plus } from "lucide-react";

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
    emergencyContact: string;
  };
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

export function ProfileTab({ studentProfile }: ProfileTabProps) {
  const dobDisplay = studentProfile.dateOfBirth
    ? new Date(studentProfile.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Your personal information on record</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
          <User className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="h-24 w-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
              {(studentProfile.firstName || studentProfile.name).charAt(0)}
            </div>
            <h3 className="font-semibold text-lg">
              {studentProfile.lastName && studentProfile.firstName
                ? `${studentProfile.firstName} ${studentProfile.middleName ? studentProfile.middleName.charAt(0) + ". " : ""}${studentProfile.lastName}`
                : studentProfile.name}
            </h3>
            <p className="text-muted-foreground text-sm">{studentProfile.course}</p>
            <p className="text-muted-foreground text-sm">{studentProfile.year} • {studentProfile.section}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {studentProfile.studentId}</p>
            <button className="mt-4 text-sm text-primary hover:underline">Change Photo</button>
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
                <Input defaultValue={studentProfile.lastName || ""} className="mt-1.5" readOnly />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">First Name</Label>
                <Input defaultValue={studentProfile.firstName || ""} className="mt-1.5" readOnly />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Middle Name</Label>
                <Input defaultValue={studentProfile.middleName || ""} className="mt-1.5" readOnly />
              </div>
            </div>

            {/* Course / Year / Section */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Course</Label>
                <Input defaultValue={studentProfile.course} className="mt-1.5" readOnly />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Year Level</Label>
                <Input defaultValue={studentProfile.year} className="mt-1.5" readOnly />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Section</Label>
                <Input defaultValue={studentProfile.section} className="mt-1.5" readOnly />
              </div>
            </div>

            {/* Address */}
            <div>
              <Label className="text-sm text-muted-foreground">Address</Label>
              <Input defaultValue={studentProfile.address} className="mt-1.5" />
            </div>

            {/* DOB / Age */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Date of Birth</Label>
                <Input defaultValue={dobDisplay} className="mt-1.5" readOnly />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Age</Label>
                <Input defaultValue={computeAge(studentProfile.dateOfBirth)} className="mt-1.5" readOnly />
              </div>
            </div>

            {/* Civil Status / Sex */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Civil Status</Label>
                <Input defaultValue={studentProfile.civilStatus || ""} className="mt-1.5" readOnly />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Sex</Label>
                <Input defaultValue={studentProfile.sex || ""} className="mt-1.5" readOnly />
              </div>
            </div>

            {/* Contact / Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Contact No.</Label>
                <Input defaultValue={studentProfile.phone} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">PSU Email</Label>
                <Input defaultValue={studentProfile.email} className="mt-1.5" readOnly />
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">Emergency Contact</Label>
              <Input defaultValue={studentProfile.emergencyContact} className="mt-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Skills & Competencies</CardTitle>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs"><Plus className="h-3.5 w-3.5" /> Add Skill</Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {studentProfile.skills?.map((skill, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {skill}
                  <button className="text-blue-400 hover:text-blue-600">×</button>
                </span>
              ))}
              {(!studentProfile.skills || studentProfile.skills.length === 0) && (
                <p className="text-sm text-muted-foreground">No skills added yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
