import { getRedisClient } from './redis';

export interface UserSubscription {
  userId: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive';
  plan: 'monthly' | 'annual' | 'lifetime';
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  createdAt: string;
  updatedAt: string;
}

const TRIAL_DAYS = 14;
const SUBSCRIPTION_KEY_PREFIX = 'subscription:';
const USER_TRIAL_KEY_PREFIX = 'user_trial:';

/**
 * Get a user's subscription from Redis
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const redis = getRedisClient();
  const data = await redis.get(`${SUBSCRIPTION_KEY_PREFIX}${userId}`);
  
  if (!data) {
    return null;
  }
  
  try {
    return JSON.parse(data) as UserSubscription;
  } catch {
    return null;
  }
}

/**
 * Save a user's subscription to Redis
 */
export async function saveUserSubscription(subscription: UserSubscription): Promise<void> {
  const redis = getRedisClient();
  const updatedSubscription = {
    ...subscription,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(
    `${SUBSCRIPTION_KEY_PREFIX}${subscription.userId}`,
    JSON.stringify(updatedSubscription)
  );
}

/**
 * Check if a user has an active subscription
 */
export async function isSubscribed(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  
  if (!subscription) {
    return false;
  }
  
  // Lifetime subscriptions are always active
  if (subscription.plan === 'lifetime') {
    return true;
  }
  
  // Check if subscription is active or trialing
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    // Check if period hasn't ended
    const periodEnd = new Date(subscription.currentPeriodEnd);
    if (periodEnd > new Date()) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get trial start date for a user
 */
export async function getTrialStartDate(userId: string): Promise<Date | null> {
  const redis = getRedisClient();
  const data = await redis.get(`${USER_TRIAL_KEY_PREFIX}${userId}`);
  
  if (!data) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(data);
    return new Date(parsed.startedAt);
  } catch {
    return null;
  }
}

/**
 * Start a trial for a user
 */
export async function startTrial(userId: string): Promise<void> {
  const redis = getRedisClient();
  const trialData = {
    startedAt: new Date().toISOString(),
    trialDays: TRIAL_DAYS,
  };
  await redis.set(`${USER_TRIAL_KEY_PREFIX}${userId}`, JSON.stringify(trialData));
}

/**
 * Check if a user's trial is active
 */
export async function isTrialActive(userId: string): Promise<boolean> {
  // First check if they have an active subscription (trial or paid)
  const subscription = await getUserSubscription(userId);
  
  if (subscription?.status === 'trialing') {
    const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null;
    if (trialEnd && trialEnd > new Date()) {
      return true;
    }
  }
  
  // Check local trial tracking
  const trialStart = await getTrialStartDate(userId);
  
  if (!trialStart) {
    return false;
  }
  
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  
  return trialEnd > new Date();
}

/**
 * Get days remaining in trial
 */
export async function getDaysRemaining(userId: string): Promise<number> {
  const subscription = await getUserSubscription(userId);
  
  // If they have a Stripe trial, use that
  if (subscription?.status === 'trialing' && subscription.trialEnd) {
    const trialEnd = new Date(subscription.trialEnd);
    const now = new Date();
    const diffMs = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
  
  // Otherwise check local trial
  const trialStart = await getTrialStartDate(userId);
  
  if (!trialStart) {
    return 0;
  }
  
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  
  const now = new Date();
  const diffMs = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Check if a user has access (active subscription or trial)
 */
export async function hasAccess(userId: string): Promise<boolean> {
  const isSub = await isSubscribed(userId);
  const isTrial = await isTrialActive(userId);
  
  return isSub || isTrial;
}

/**
 * Create or update subscription from Stripe webhook data
 */
export async function syncSubscriptionFromStripe(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  status: UserSubscription['status'],
  plan: UserSubscription['plan'],
  currentPeriodStart: number,
  currentPeriodEnd: number,
  cancelAtPeriodEnd: boolean,
  trialEnd?: number
): Promise<void> {
  const subscription: UserSubscription = {
    userId,
    status,
    plan,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodStart: new Date(currentPeriodStart * 1000).toISOString(),
    currentPeriodEnd: new Date(currentPeriodEnd * 1000).toISOString(),
    cancelAtPeriodEnd,
    trialEnd: trialEnd ? new Date(trialEnd * 1000).toISOString() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await saveUserSubscription(subscription);
}

/**
 * Cancel a subscription (mark as canceled, actual cancellation happens at period end)
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const subscription = await getUserSubscription(userId);
  
  if (!subscription) {
    throw new Error('No subscription found');
  }
  
  subscription.status = 'canceled';
  subscription.cancelAtPeriodEnd = true;
  subscription.updatedAt = new Date().toISOString();
  
  await saveUserSubscription(subscription);
}

/**
 * Get subscription status with details
 */
export async function getSubscriptionStatus(userId: string): Promise<{
  hasAccess: boolean;
  isSubscribed: boolean;
  isTrial: boolean;
  daysRemaining: number;
  subscription: UserSubscription | null;
  plan: string | null;
}> {
  const [access, subscribed, trial, days, sub] = await Promise.all([
    hasAccess(userId),
    isSubscribed(userId),
    isTrialActive(userId),
    getDaysRemaining(userId),
    getUserSubscription(userId),
  ]);
  
  return {
    hasAccess: access,
    isSubscribed: subscribed,
    isTrial: trial,
    daysRemaining: days,
    subscription: sub,
    plan: sub?.plan || null,
  };
}
