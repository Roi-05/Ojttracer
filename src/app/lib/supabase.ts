import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "/utils/supabase/info";

// Persist the client across HMR reloads to avoid multiple instances
// fighting over the same auth lock in the browser tab.
const globalForSupabase = globalThis as unknown as {
  __psu_supabase__?: ReturnType<typeof createClient>;
};

export function getSupabaseClient() {
  if (!globalForSupabase.__psu_supabase__) {
    globalForSupabase.__psu_supabase__ = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          storageKey: `sb-${projectId}-auth-token`,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          // Disable the navigator lock — we only have a single client instance,
          // and the lock causes "lock was released because another request stole it"
          // errors during fast successive auth/session calls.
          lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
        },
      }
    );
  }
  return globalForSupabase.__psu_supabase__;
}

export const supabase = getSupabaseClient();
