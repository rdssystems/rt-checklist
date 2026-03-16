import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";

export interface PlanStatus {
  isPremium: boolean;
  trialActive: boolean;
  trialEndsAt: string | null;
  planType: 'free' | 'premium';
}

export const getPlanStatus = async (): Promise<PlanStatus> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isPremium: false, trialActive: false, trialEndsAt: null, planType: 'free' };

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type, trial_ends_at")
    .eq("id", user.id)
    .single();

  if (!profile) return { isPremium: false, trialActive: false, trialEndsAt: null, planType: 'free' };

  const now = new Date();
  const trialEnds = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const trialActive = trialEnds ? trialEnds > now : false;
  const isPremium = profile.plan_type === 'premium' || trialActive;

  return {
    isPremium,
    trialActive,
    trialEndsAt: profile.trial_ends_at,
    planType: (profile.plan_type as any) || 'free'
  };
};

export const checkChecklistLimit = async (): Promise<{ canCreate: boolean; total: number }> => {
  const status = await getPlanStatus();
  if (status.isPremium) return { canCreate: true, total: 0 };

  const start = startOfMonth(new Date()).toISOString();
  const end = endOfMonth(new Date()).toISOString();

  const { count } = await supabase
    .from("aplicacoes_checklist")
    .select("*", { count: 'exact', head: true })
    .gte("created_at", start)
    .lte("created_at", end);

  return {
    canCreate: (count || 0) < 5,
    total: count || 0
  };
};
