import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { User, Plus } from "lucide-react";

interface ProfileTabProps {
  studentProfile: {
    name: string;
    studentId: string;
    course: string;
    year: string;
    section: string;
    email: string;
    phone: string;
    address: string;
    skills: string[];
    emergencyContact: string;
  };
}

export function ProfileTab({ studentProfile }: ProfileTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information and skills</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
          <User className="h-4 w-4" /> Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="h-24 w-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold mx-auto mb-4">
              {studentProfile.name.charAt(0)}
            </div>
            <h3 className="font-semibold text-lg">{studentProfile.name}</h3>
            <p className="text-muted-foreground text-sm">{studentProfile.course}</p>
            <p className="text-muted-foreground text-sm">{studentProfile.year} • {studentProfile.section}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {studentProfile.studentId}</p>
            <button className="mt-4 text-sm text-primary hover:underline">Change Photo</button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-sm text-muted-foreground">Full Name</Label><Input defaultValue={studentProfile.name} className="mt-1.5" /></div>
              <div><Label className="text-sm text-muted-foreground">Student ID</Label><Input defaultValue={studentProfile.studentId} className="mt-1.5" readOnly /></div>
              <div><Label className="text-sm text-muted-foreground">Email</Label><Input defaultValue={studentProfile.email} className="mt-1.5" /></div>
              <div><Label className="text-sm text-muted-foreground">Phone</Label><Input defaultValue={studentProfile.phone} className="mt-1.5" /></div>
              <div><Label className="text-sm text-muted-foreground">Course</Label><Input defaultValue={studentProfile.course} className="mt-1.5" readOnly /></div>
              <div><Label className="text-sm text-muted-foreground">Year & Section</Label><Input defaultValue={`${studentProfile.year} — ${studentProfile.section}`} className="mt-1.5" readOnly /></div>
              <div className="col-span-2"><Label className="text-sm text-muted-foreground">Home Address</Label><Input defaultValue={studentProfile.address} className="mt-1.5" /></div>
              <div className="col-span-2"><Label className="text-sm text-muted-foreground">Emergency Contact</Label><Input defaultValue={studentProfile.emergencyContact} className="mt-1.5" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Skills & Competencies</CardTitle>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs"><Plus className="h-3.5 w-3.5" /> Add Skill</Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {studentProfile.skills.map((skill, i) => (
                <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {skill}
                  <button className="text-blue-400 hover:text-blue-600">×</button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
