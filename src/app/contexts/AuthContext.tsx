import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { getMe } from "../lib/api";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "student" | "company" | "admin";
  // Student fields
  studentId?: string;
  section?: string;
  phone?: string;
  address?: string;
  skills?: string[];
  emergencyContact?: string;
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
    }
  };

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        loadProfile(session.access_token).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.access_token) {
        await loadProfile(session.access_token);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setAccessToken(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (data.session?.access_token) {
      await loadProfile(data.session.access_token);
    }
  };

  const signOut = async () => {
    // Clear React state immediately so the UI reflects signed-out status
    // before any async work, preventing ProtectedRoute from redirecting back.
    setUser(null);
    setAccessToken(null);

    try {
      // Attempt a full global signout (invalidates the token server-side).
      await supabase.auth.signOut();
    } catch (_err) {
      // If the server call fails (network error, 403, etc.) the local
      // localStorage token would NOT have been cleared by the global call.
      // Force-clear it with scope:'local' so getSession() returns null on
      // the next page load and the user cannot be bounced back to the dashboard.
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Last resort: manually evict every supabase auth key from storage.
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => localStorage.removeItem(k));
      }
    }
  };

  const refreshProfile = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      await loadProfile(data.session.access_token);
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