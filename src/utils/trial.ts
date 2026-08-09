export interface TrialStatus {
  daysElapsed: number;
  daysRemaining: number;
  trialExpired: boolean;
  isGated: boolean;
  badgeLabel: string;
}

export function calculateTrialStatus(
  createdAtStr?: string | null,
  statusStr?: string | null,
  planStr?: string | null,
  trialEndDateStr?: string | null
): TrialStatus {
  // Check if company has an active paid subscription
  const isPaid = (statusStr === "Active" || statusStr === "Subscription Active" || statusStr === "active") &&
                 Boolean(planStr && planStr !== "Free Trial" && planStr !== "Starter");

  if (isPaid) {
    return {
      daysElapsed: 0,
      daysRemaining: 30,
      trialExpired: false,
      isGated: false,
      badgeLabel: planStr ? `${planStr} Plan` : "Active Plan"
    };
  }

  const nowMs = Date.now();

  if (trialEndDateStr) {
    const endMs = new Date(trialEndDateStr).getTime();
    const validEndMs = isNaN(endMs) ? nowMs : endMs;
    const diffMs = validEndMs - nowMs;
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const trialExpired = statusStr === "Trial Expired" || daysRemaining <= 0;

    return {
      daysElapsed: 0,
      daysRemaining,
      trialExpired,
      isGated: trialExpired,
      badgeLabel: trialExpired ? "Trial Expired" : `Trial: ${daysRemaining}d`
    };
  }

  // Use database created_at timestamp (5 days trial default)
  const regDate = createdAtStr || new Date().toISOString();
  const startMs = new Date(regDate).getTime();
  const validStartMs = isNaN(startMs) ? nowMs : startMs;
  const diffMs = Math.max(0, nowMs - validStartMs);

  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, 5 - daysElapsed);
  const trialExpired = statusStr === "Trial Expired" || daysRemaining <= 0 || daysElapsed >= 5;

  return {
    daysElapsed,
    daysRemaining,
    trialExpired,
    isGated: trialExpired,
    badgeLabel: trialExpired ? "Trial Expired" : `Trial: ${daysRemaining}d`
  };
}
