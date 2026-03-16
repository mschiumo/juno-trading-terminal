'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  CreditCard, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionStatus {
  hasAccess: boolean;
  isSubscribed: boolean;
  isTrial: boolean;
  daysRemaining: number;
  subscription: {
    status: string;
    plan: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  plan: string | null;
}

// Generate a simple user ID (in production, this would come from auth)
function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  
  let userId = localStorage.getItem('trading_terminal_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('trading_terminal_user_id', userId);
  }
  return userId;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const userId = getUserId();

  useEffect(() => {
    // Check for success from Stripe redirect
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }

    fetchSubscriptionStatus();
  }, [searchParams]);

  const fetchSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/user/subscription?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsPortalLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!status) return null;

    if (status.isSubscribed && status.subscription?.status === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#238636]/20 px-3 py-1 text-sm font-medium text-[#3fb950]">
          <CheckCircle className="h-4 w-4" />
          Active
        </span>
      );
    }

    if (status.isTrial) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#a371f7]/20 px-3 py-1 text-sm font-medium text-[#a371f7]">
          <Sparkles className="h-4 w-4" />
          Trial ({status.daysRemaining} days left)
        </span>
      );
    }

    if (status.subscription?.status === 'canceled') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8b949e]/20 px-3 py-1 text-sm font-medium text-[#8b949e]">
          <AlertCircle className="h-4 w-4" />
          Canceled
        </span>
      );
    }

    if (status.subscription?.status === 'past_due') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f85149]/20 px-3 py-1 text-sm font-medium text-[#f85149]">
          <AlertCircle className="h-4 w-4" />
          Past Due
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8b949e]/20 px-3 py-1 text-sm font-medium text-[#8b949e]">
        <AlertCircle className="h-4 w-4" />
        Inactive
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#8b949e]">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading your subscription...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[#8b949e] hover:text-[#c9d1d9] transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trading Terminal
          </a>
          <h1 className="text-3xl font-bold text-[#e6edf3]">Billing &amp; Subscription</h1>
        </div>

        {/* Success Alert */}
        {showSuccess && (
          <div className="mb-6 rounded-lg border border-[#3fb950]/30 bg-[#3fb950]/10 p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-[#3fb950] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#3fb950]">Welcome aboard!</p>
              <p className="text-sm text-[#3fb950]/80">Your subscription is now active. Enjoy Trading Terminal!</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg border border-[#f85149]/30 bg-[#f85149]/10 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[#f85149] shrink-0" />
            <p className="text-sm text-[#f85149]">{error}</p>
          </div>
        )}

        {/* Subscription Card */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] overflow-hidden">
          <div className="border-b border-[#30363d] bg-[#21262d] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#e6edf3]">Current Plan</h2>
          </div>

          <div className="p-6">
            {status?.hasAccess ? (
              <div className="space-y-6">
                {/* Plan Details */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-[#e6edf3] capitalize">
                        {status.plan || 'Free'} Plan
                      </h3>
                      {getStatusBadge()}
                    </div>
                    <p className="text-[#8b949e]">
                      {status.isTrial 
                        ? 'You\'re currently on a free trial. Upgrade anytime to continue using all features.'
                        : status.subscription?.cancelAtPeriodEnd
                        ? 'Your subscription will end at the end of the billing period.'
                        : 'Your subscription is active and will renew automatically.'
                      }
                    </p>
                  </div>
                </div>

                {/* Billing Details */}
                {status.subscription && status.plan !== 'lifetime' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {status.subscription.currentPeriodEnd && (
                      <div className="flex items-center gap-3 rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#21262d]">
                          <Calendar className="h-5 w-5 text-[#58a6ff]" />
                        </div>
                        <div>
                          <p className="text-sm text-[#8b949e]">{status.isSubscribed ? 'Next billing date' : 'Trial ends'}</p>
                          <p className="font-medium text-[#e6edf3]">
                            {formatDate(status.subscription.currentPeriodEnd)}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 rounded-lg border border-[#30363d] bg-[#0d1117] p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#21262d]">
                        <CreditCard className="h-5 w-5 text-[#58a6ff]" />
                      </div>
                      <div>
                        <p className="text-sm text-[#8b949e]">Payment method</p>
                        <p className="font-medium text-[#e6edf3]">Manage in Stripe</p>
                      </div>
                    </div>
                  </div>
                )}

                {status.plan === 'lifetime' && (
                  <div className="rounded-lg border border-[#3fb950]/30 bg-[#3fb950]/10 p-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-[#3fb950]" />
                      <div>
                        <p className="font-medium text-[#3fb950]">Lifetime Access</p>
                        <p className="text-sm text-[#3fb950]/80">You have unlimited access forever. No renewal needed!</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-[#30363d]">
                  {status.isSubscribed && status.plan !== 'lifetime' ? (
                    <>
                      <button
                        onClick={handleManageSubscription}
                        disabled={isPortalLoading}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#21262d] px-4 py-2 text-sm font-medium text-[#c9d1d9] hover:bg-[#30363d] transition-colors disabled:opacity-50"
                      >
                        {isPortalLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          'Manage Subscription'
                        )}
                      </button>
                      
                      <a
                        href="/pricing"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#30363d] px-4 py-2 text-sm font-medium text-[#8b949e] hover:bg-[#21262d] transition-colors"
                      >
                        Change Plan
                      </a>
                    </>
                  ) : status.isTrial ? (
                    <>
                      <a
                        href="/pricing"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#238636] px-4 py-2 text-sm font-medium text-white hover:bg-[#2ea043] transition-colors"
                      >
                        Upgrade Now
                      </a>
                      <button
                        onClick={handleManageSubscription}
                        disabled={isPortalLoading}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#30363d] px-4 py-2 text-sm font-medium text-[#8b949e] hover:bg-[#21262d] transition-colors disabled:opacity-50"
                      >
                        {isPortalLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Opening...
                          </>
                        ) : (
                          'Manage Trial'
                        )}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#21262d]">
                    <CreditCard className="h-8 w-8 text-[#8b949e]" />
                  </div>
                </div>
                <h3 className="text-lg font-medium text-[#e6edf3] mb-2">No Active Subscription</h3>
                <p className="text-[#8b949e] mb-6 max-w-md mx-auto">
                  Start your 14-day free trial or choose a plan to unlock all features of Trading Terminal.
                </p>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#238636] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#2ea043] transition-colors"
                >
                  View Plans
                </a>
              </div>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 rounded-xl border border-[#30363d] bg-[#161b22] p-6">
          <h3 className="text-lg font-semibold text-[#e6edf3] mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-[#c9d1d9] mb-1">Can I cancel anytime?</h4>
              <p className="text-sm text-[#8b949e]">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-[#c9d1d9] mb-1">What happens after my trial?</h4>
              <p className="text-sm text-[#8b949e]">
                After your 14-day trial, you'll need to choose a plan to continue using all features. No charges until you upgrade.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-[#c9d1d9] mb-1">Is my payment information secure?</h4>
              <p className="text-sm text-[#8b949e]">
                Yes, we use Stripe for secure payment processing. We never store your credit card information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
