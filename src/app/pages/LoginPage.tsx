import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { GraduationCap, Building2, Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { signUp } from "../lib/api";

const SECTIONS = ["4A", "4B", "4C", "4D"];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signIn } = useAuth();
  const [selectedRole, setSelectedRole] = useState("student");
  const [isRegistering, setIsRegistering] = useState(location.pathname === "/register");

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const dest =
        user.role === "student" ? "/student/dashboard" :
        user.role === "company" ? "/company/dashboard" :
        "/admin/dashboard";
      navigate(dest, { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = async (role: string, email: string, password: string) => {
    try {
      await signIn(email, password);
      // Navigation handled by useEffect above after profile loads
    } catch (err: any) {
      const msg = err?.message || "";
      if (/invalid login credentials/i.test(msg)) {
        toast.error("Incorrect email or password. If you haven't registered, click 'Register here' below.");
      } else {
        toast.error(`Login failed: ${msg || "Unknown error"}`);
      }
    }
  };

  const handleRegister = async (role: string, payload: any) => {
    try {
      await signUp({ ...payload, role });
      toast.success("Account created! Please sign in.");
      setIsRegistering(false);
    } catch (err: any) {
      toast.error(`Registration failed: ${err?.message || "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/10 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
            <GraduationCap className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold text-primary">PampangaStateU-Link</span>
          </Link>
          <p className="text-muted-foreground">Sign in to access your dashboard</p>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle>{isRegistering ? "Create Account" : "Welcome Back"}</CardTitle>
            <CardDescription>
              {isRegistering
                ? "Select your role and register to get started"
                : "Select your role and login to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedRole} onValueChange={(val) => {
              setSelectedRole(val);
              if (val === 'admin') setIsRegistering(false);
            }} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span className="hidden sm:inline">Student</span>
                </TabsTrigger>
                <TabsTrigger value="company" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Company</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="student">
                <LoginForm
                  role="student"
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  isRegistering={isRegistering}
                  setIsRegistering={setIsRegistering}
                />
              </TabsContent>
              <TabsContent value="company">
                <LoginForm
                  role="company"
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  isRegistering={isRegistering}
                  setIsRegistering={setIsRegistering}
                />
              </TabsContent>
              <TabsContent value="admin">
                <LoginForm
                  role="admin"
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  isRegistering={isRegistering}
                  setIsRegistering={setIsRegistering}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link to="/" className="text-primary hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoginForm({
  role,
  onLogin,
  onRegister,
  isRegistering,
  setIsRegistering,
}: {
  role: string;
  onLogin: (role: string, email: string, password: string) => Promise<void>;
  onRegister: (role: string, payload: any) => Promise<void>;
  isRegistering: boolean;
  setIsRegistering: (value: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentIdField, setStudentIdField] = useState("");
  const [section, setSection] = useState("4A");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      if (isRegistering) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match!");
          return;
        }
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters.");
          return;
        }
        if (role === "student" && !email.toLowerCase().endsWith("@pampangastateu.edu.ph")) {
          toast.error("Students must register with a @pampangastateu.edu.ph email address.");
          return;
        }
        const payload: any = { email, password, name: fullName };
        if (role === "student") {
          payload.studentId = studentIdField;
          payload.section = section;
        } else if (role === "company") {
          payload.companyName = companyName || fullName;
          payload.industry = industry;
        }
        await onRegister(role, payload);
      } else {
        await onLogin(role, email, password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isRegistering && (
        <div className="space-y-2">
          <Label htmlFor={`name-${role}`}>
            {role === "company" ? "Contact Person / HR Name" : "Full Name"}
          </Label>
          <Input
            id={`name-${role}`}
            type="text"
            placeholder={role === "company" ? "HR Contact name" : "Enter your full name"}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
      )}

      {isRegistering && role === "student" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`sid-${role}`}>Student ID</Label>
              <Input
                id={`sid-${role}`}
                type="text"
                placeholder="e.g. 2022-IT-0042"
                value={studentIdField}
                onChange={(e) => setStudentIdField(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`section-${role}`}>Section (BSIT)</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger id={`section-${role}`}>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>BSIT {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {isRegistering && role === "company" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={`cname-${role}`}>Company Name</Label>
            <Input
              id={`cname-${role}`}
              type="text"
              placeholder="e.g. Tech Solutions Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`ind-${role}`}>Industry</Label>
            <Input
              id={`ind-${role}`}
              type="text"
              placeholder="e.g. Information Technology"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`email-${role}`}>Email Address</Label>
        <Input
          id={`email-${role}`}
          type="email"
          placeholder={`Enter your ${role} email`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`password-${role}`}>Password</Label>
        <div className="relative">
          <Input
            id={`password-${role}`}
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {isRegistering && (
        <div className="space-y-2">
          <Label htmlFor={`confirm-password-${role}`}>Confirm Password</Label>
          <div className="relative">
            <Input
              id={`confirm-password-${role}`}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
      {!isRegistering && (
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded border-border" />
            <span className="text-muted-foreground">Remember me</span>
          </label>
          <a href="#" className="text-primary hover:underline">
            Forgot password?
          </a>
        </div>
      )}
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={submitting}
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Please wait...</>
        ) : isRegistering
          ? `Register as ${role.charAt(0).toUpperCase() + role.slice(1)}`
          : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {isRegistering ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className="text-primary hover:underline"
            >
              Login here
            </button>
          </>
        ) : role !== "admin" && (
          <>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className="text-primary hover:underline"
            >
              Register here
            </button>
          </>
        )}
      </p>
    </form>
  );
}
