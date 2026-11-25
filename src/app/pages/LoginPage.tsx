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
import { ForgotPasswordModal } from "../components/auth/ForgotPasswordModal";

const COURSES = ["BSIT", "BEED", "BSBA", "BSSW"];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, signIn } = useAuth();
  
  const isAdminRoute = location.pathname === "/admin/login";
  const [selectedRole, setSelectedRole] = useState(isAdminRoute ? "admin" : "student");
  const [isRegistering, setIsRegistering] = useState(location.pathname === "/register");

  // Sync selectedRole with route path
  useEffect(() => {
    setSelectedRole(isAdminRoute ? "admin" : "student");
    if (isAdminRoute) {
      setIsRegistering(false);
    }
  }, [isAdminRoute]);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      const dest =
        user.role === "student" ? "/student/dashboard" :
        user.role === "company" ? "/company/dashboard" :
        user.role === "superadmin" ? "/superadmin/dashboard" :
        "/admin/dashboard";
      navigate(dest, { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = async (role: string, email: string, password: string, rememberMe: boolean) => {
    try {
      await signIn(email, password, rememberMe);
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
      if (role === "student") {
        toast.success("Account created & automatically deployed! Signing you in...");
        await signIn(payload.email, payload.password, true);
      } else {
        toast.success("Account created! Please sign in.");
        setIsRegistering(false);
      }
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
            <CardTitle>
              {isAdminRoute ? "Admin Portal" : isRegistering ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <CardDescription>
              {isAdminRoute
                ? "Sign in as an administrator to manage the system"
                : isRegistering
                ? "Select your role and register to get started"
                : "Select your role and login to continue"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdminRoute ? (
              <div className="space-y-4">
                <div className="mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                  <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    This is a restricted administration portal. Authorized access only.
                  </p>
                </div>
                <LoginForm
                  role="admin"
                  onLogin={handleLogin}
                  onRegister={handleRegister}
                  isRegistering={false}
                  setIsRegistering={() => {}}
                  hideRegisterLink
                />
              </div>
            ) : (
              <Tabs value={selectedRole} onValueChange={(val) => {
                setSelectedRole(val);
                if (val === 'admin') setIsRegistering(false);
              }} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="student" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>Student</span>
                  </TabsTrigger>
                  <TabsTrigger value="company" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Company</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="student">
                  <div className="mb-4 flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                    <GraduationCap className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 space-y-1">
                      <p className="font-semibold">Beta Testing Mode — Instant Deployment</p>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        {isRegistering
                          ? "Note: The pre-deployment process (uploading the 7 required documents and waiting for Coordinator deployment) is automatically skipped for this Beta Test. Registering will automatically assign you to your course Coordinator and deploy you to your course's partner company."
                          : "Note: For this Beta Test, the pre-deployment process is automatically skipped upon registration so you can immediately test Attendance (DTR) and the Daily Journal. Click 'Register here' below to create your student account."}
                      </p>
                    </div>
                  </div>
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
              </Tabs>
            )}
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
  hideRegisterLink,
}: {
  role: string;
  onLogin: (role: string, email: string, password: string, rememberMe: boolean) => Promise<void>;
  onRegister: (role: string, payload: any) => Promise<void>;
  isRegistering: boolean;
  setIsRegistering: (value: boolean) => void;
  hideRegisterLink?: boolean;
}) {
  const storageKey = `remembered_email_${role}`;
  const [email, setEmail] = useState(() => localStorage.getItem(storageKey) || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentIdField, setStudentIdField] = useState("");
  const [course, setCourse] = useState("BSIT");
  const [section, setSection] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(storageKey));
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`remembered_email_${role}`);
    setEmail(saved || "");
    setRememberMe(!!saved);
  }, [role]);

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
        const payload: any = { email: email.trim(), password, name: fullName };
        if (role === "student") {
          const cleanSid = studentIdField.trim();
          const cleanSec = section.trim().toUpperCase();
          if (!/^\d{10}$/.test(cleanSid)) {
            toast.error("Student Number must be exactly 10 digits.");
            return;
          }
          if (!cleanSec) {
            toast.error("Please enter your Section (e.g. 4A).");
            return;
          }
          const expectedEmail = `${cleanSid}@pampangastateu.edu.ph`;
          if (email.trim().toLowerCase() !== expectedEmail) {
            toast.error(`Student email must be your Student Number + @pampangastateu.edu.ph (${expectedEmail}).`);
            return;
          }
          payload.studentId = cleanSid;
          payload.course = course;
          payload.section = cleanSec;
        } else if (role === "company") {
          payload.companyName = companyName || fullName;
          payload.industry = industry;
        }
        await onRegister(role, payload);
      } else {
        if (rememberMe) {
          localStorage.setItem(storageKey, email.trim());
        } else {
          localStorage.removeItem(storageKey);
        }
        await onLogin(role, email, password, rememberMe);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`sid-${role}`}>Student Number (10 digits)</Label>
              <Input
                id={`sid-${role}`}
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 2023100001"
                value={studentIdField}
                onChange={(e) => setStudentIdField(e.target.value.replace(/\D/g, "").slice(0, 10))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`course-${role}`}>Course / Program</Label>
              <Select value={course} onValueChange={setCourse}>
                <SelectTrigger id={`course-${role}`}>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {COURSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`section-${role}`}>Section</Label>
              <Input
                id={`section-${role}`}
                type="text"
                placeholder="e.g. 4A"
                value={section}
                onChange={(e) => setSection(e.target.value.toUpperCase())}
                required
              />
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
          placeholder={
            isRegistering && role === "student"
              ? `${studentIdField || "2023100001"}@pampangastateu.edu.ph`
              : `Enter your ${role} email`
          }
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {isRegistering && role === "student" && (
          <p className="text-xs text-muted-foreground">
            Must match your 10-digit Student Number: <span className="font-mono font-medium">{studentIdField || "<10-digit-student-no>"}@pampangastateu.edu.ph</span>
          </p>
        )}
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
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-muted-foreground">Remember me</span>
          </label>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowForgotPassword(true);
            }}
            className="text-primary hover:underline font-medium text-xs sm:text-sm"
          >
            Forgot password?
          </button>
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
        ) : !isRegistering && role !== "admin" && !hideRegisterLink && (
          <>
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className="text-primary hover:underline font-medium"
            >
              Register here
            </button>
          </>
        )}
      </p>
    </form>

    <ForgotPasswordModal
      open={showForgotPassword}
      onClose={() => setShowForgotPassword(false)}
      initialEmail={email}
      role={role}
      onSuccess={(resetEmail) => {
        setEmail(resetEmail);
        setIsRegistering(false);
      }}
    />
  </>
  );
}
