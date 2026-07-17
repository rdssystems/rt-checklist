import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PlanStatus } from "@/types";
import { computePlanStatus } from "@/lib/plan-limits";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  profile: {
    id: string;
    nome_rt: string;
    email: string;
    company_name: string | null;
    logo_url: string | null;
    avatar_url: string | null;
    plan_type: string;
    trial_ends_at: string | null;
    cpf_cnpj: string | null;
    nomination_limit: number | null;
  } | null;
  planStatus: PlanStatus | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextValue["profile"]>(null);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, nome_rt, email, company_name, logo_url, avatar_url, plan_type, trial_ends_at, plan_expires_at, cpf_cnpj, nomination_limit")
      .eq("id", userId)
      .maybeSingle();

    const profileData = data as Record<string, unknown> | null;

    if (profileData) {
      setProfile(profileData as AuthContextValue["profile"]);

      const status = computePlanStatus(profileData as Parameters<typeof computePlanStatus>[0]);
      setPlanStatus({
        isPremium: status.isPremium,
        planType: status.planType,
        daysLeft: status.daysLeft,
      });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setPlanStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, profile, planStatus, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
