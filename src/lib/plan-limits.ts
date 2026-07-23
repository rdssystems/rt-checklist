import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * Regra central de planos do RT Expert.
 * Níveis (planTier): 'free' | 'drive' | 'cloud' | 'enterprise'
 * Provedores de mídia (storageProvider): 'supabase' | 'google_drive'
 */

export type PlanTier = "free" | "drive" | "cloud" | "enterprise";
export type StorageProvider = "supabase" | "google_drive";

export interface PlanStatus {
  isPremium: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  planType: "free" | "premium" | "expert";
  planTier: PlanTier;
  storageProvider: StorageProvider;
  /** Dias restantes do trial ou do plano avulso (0 quando não se aplica/ilimitado) */
  daysLeft: number;
}

export const PLAN_LIMITS = {
  free: {
    checklistsPorMes: 5,
    fotosPorChecklist: 5,
    modelos: 2,
    clientes: 10,
    fotoMaxWidth: 800,
    fotoQuality: 0.6,
    storageMaxMb: 100,
    label: "Free",
  },
  drive: {
    checklistsPorMes: Infinity,
    fotosPorChecklist: Infinity,
    modelos: Infinity,
    clientes: Infinity,
    fotoMaxWidth: 1024,
    fotoQuality: 0.7,
    storageMaxMb: Infinity,
    label: "Expert DRIVE",
  },
  cloud: {
    checklistsPorMes: Infinity,
    fotosPorChecklist: 15,
    modelos: Infinity,
    clientes: Infinity,
    fotoMaxWidth: 1024,
    fotoQuality: 0.7,
    storageMaxMb: 15000,
    label: "Expert CLOUD",
  },
  enterprise: {
    checklistsPorMes: Infinity,
    fotosPorChecklist: Infinity,
    modelos: Infinity,
    clientes: Infinity,
    fotoMaxWidth: 1024,
    fotoQuality: 0.7,
    storageMaxMb: 50000,
    label: "Enterprise",
  },
} as const;

export const getLimitsFor = (status: PlanStatus) => {
  if (!status.isPremium) return PLAN_LIMITS.free;
  return PLAN_LIMITS[status.planTier] || PLAN_LIMITS.cloud;
};

interface PlanProfileFields {
  plan_type?: string | null;
  plan_tier?: string | null;
  storage_provider?: string | null;
  trial_ends_at?: string | null;
  plan_expires_at?: string | null;
}

/** Calcula o status do plano a partir dos campos do perfil (única fonte da regra). */
export const computePlanStatus = (profile: PlanProfileFields | null): PlanStatus => {
  if (!profile) {
    return {
      isPremium: false,
      trialActive: false,
      trialEndsAt: null,
      planType: "free",
      planTier: "free",
      storageProvider: "supabase",
      daysLeft: 0,
    };
  }

  const now = new Date();
  const msPorDia = 1000 * 60 * 60 * 24;

  const trialEnds = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialActive = trialEnds ? trialEnds > now : false;

  const rawType = profile.plan_type || "free";
  const isPaidType = rawType === "premium" || rawType === "expert" || rawType === "drive" || rawType === "cloud" || rawType === "enterprise";
  const planExpires = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const paidActive = isPaidType && (!planExpires || planExpires > now);

  const isPremium = paidActive || trialActive;

  // Determinar o tier do plano
  let planTier: PlanTier = "free";
  if (isPremium) {
    if (profile.plan_tier === "drive" || profile.plan_tier === "cloud" || profile.plan_tier === "enterprise") {
      planTier = profile.plan_tier;
    } else {
      // Fallback para assinantes antigos/existentes
      planTier = profile.storage_provider === "google_drive" ? "drive" : "cloud";
    }
  }

  const storageProvider: StorageProvider = profile.storage_provider === "google_drive" || planTier === "drive" ? "google_drive" : "supabase";

  let daysLeft = 0;
  if (paidActive && planExpires) {
    daysLeft = Math.max(0, Math.ceil((planExpires.getTime() - now.getTime()) / msPorDia));
  } else if (trialActive && trialEnds) {
    daysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - now.getTime()) / msPorDia));
  }

  return {
    isPremium,
    trialActive,
    trialEndsAt: profile.trial_ends_at || null,
    planType: (rawType as PlanStatus["planType"]) || "free",
    planTier,
    storageProvider,
    daysLeft,
  };
};

export const getPlanStatus = async (): Promise<PlanStatus> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return computePlanStatus(null);

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type, plan_tier, storage_provider, trial_ends_at, plan_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  return computePlanStatus(profile as PlanProfileFields | null);
};

export const checkChecklistLimit = async (): Promise<{ canCreate: boolean; total: number; limite: number }> => {
  const status = await getPlanStatus();
  const limite = getLimitsFor(status).checklistsPorMes;
  if (status.isPremium) return { canCreate: true, total: 0, limite };

  const start = startOfMonth(new Date()).toISOString();
  const end = endOfMonth(new Date()).toISOString();

  const { count } = await supabase
    .from("aplicacoes_checklist")
    .select("*", { count: "exact", head: true })
    .gte("created_at", start)
    .lte("created_at", end);

  return { canCreate: (count || 0) < limite, total: count || 0, limite };
};

export const checkModelosLimit = async (): Promise<{ canCreate: boolean; total: number; limite: number }> => {
  const status = await getPlanStatus();
  const limite = getLimitsFor(status).modelos;
  if (status.isPremium) return { canCreate: true, total: 0, limite };

  const { count } = await supabase
    .from("modelos_checklist")
    .select("*", { count: "exact", head: true });

  return { canCreate: (count || 0) < limite, total: count || 0, limite };
};

export const checkClientesLimit = async (): Promise<{ canCreate: boolean; total: number; limite: number }> => {
  const status = await getPlanStatus();
  const limite = getLimitsFor(status).clientes;
  if (status.isPremium) return { canCreate: true, total: 0, limite };

  const { count } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true });

  return { canCreate: (count || 0) < limite, total: count || 0, limite };
};
