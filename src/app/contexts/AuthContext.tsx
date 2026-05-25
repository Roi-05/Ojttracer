import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getMe, login } from "../lib/api";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "student" | "company" | "admin";
  avatarUrl?: string | null;
  // Student fields
  studentId?: string;
  section?: string;
  phone?: string;
  address?: string;
  skills?: string[];
  emergencyContact?: string;
  intendedCompanyId?: string;
  intendedPosition?: string;
  // Company fields
  companyName?: string;
  industry?: string;
  companyAddress?: string;
  website?: string;
  hrContact?: string;
  hrEmail?: string;
  description?: string;
  moaStatus?: string;
  accreditedUntil?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  accessToken: null,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const loadProfile = async (token: string) => {
    try {
      const profile = await getMe();
      setUser(profile as UserProfile);
      setAccessToken(token);
    } catch (err) {
      console.log("Failed to load profile:", err);
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem("custom_auth_token");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("custom_auth_token");
    if (token) {
      loadProfile(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await login({ email, password });
      if (data.token) {
        localStorage.setItem("custom_auth_token", data.token);
        await loadProfile(data.token);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      throw new Error(err.message || "Login failed");
    }
  };

  const signOut = async () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem("custom_auth_token");
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem("custom_auth_token");
    if (token) {
      await loadProfile(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, accessToken, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}