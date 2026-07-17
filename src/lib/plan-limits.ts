import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

/**
 * Regra central de planos. "Expert" é o nome comercial do plan_type 'premium'.
 * Premium ativo = plan_type premium/expert E (sem plan_expires_at OU expiração futura), OU trial ativo.
 */

export interface PlanStatus {
  isPremium: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  planType: "free" | "premium" | "expert";
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
  },
  premium: {
    checklistsPorMes: Infinity,
    fotosPorChecklist: 10,
    modelos: Infinity,
    clientes: Infinity,
    fotoMaxWidth: 1024,
    fotoQuality: 0.7,
  },
} as const;

export const getLimitsFor = (status: PlanStatus) =>
  status.isPremium ? PLAN_LIMITS.premium : PLAN_LIMITS.free;

interface PlanProfileFields {
  plan_type?: string | null;
  trial_ends_at?: string | null;
  plan_expires_at?: string | null;
}

/** Calcula o status do plano a partir dos campos do perfil (única fonte da regra). */
export const computePlanStatus = (profile: PlanProfileFields | null): PlanStatus => {
  if (!profile) {
    return { isPremium: false, trialActive: false, trialEndsAt: null, planType: "free", daysLeft: 0 };
  }

  const now = new Date();
  const msPorDia = 1000 * 60 * 60 * 24;

  const trialEnds = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialActive = trialEnds ? trialEnds > now : false;

  const isPaidType = profile.plan_type === "premium" || profile.plan_type === "expert";
  const planExpires = profile.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const paidActive = isPaidType && (!planExpires || planExpires > now);

  const isPremium = paidActive || trialActive;

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
    planType: (profile.plan_type as PlanStatus["planType"]) || "free",
    daysLeft,
  };
};

export const getPlanStatus = async (): Promise<PlanStatus> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return computePlanStatus(null);

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type, trial_ends_at, plan_expires_at")
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
