'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PricingCard, PricingTier } from '@/components/PricingCard';
import { PRICING_TIERS } from '@/lib/stripe';
import { AlertCircle, CheckCircle } from 'lucide-react';

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

export default function PricingPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCanceled, setShowCanceled] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const userId = getUserId();

  useEffect(() => {
    // Check for canceled or success states from Stripe redirect
    if (searchParams.get('canceled') === 'true') {
      setShowCanceled(true);
      setTimeout(() => setShowCanceled(false), 5000);
    }

    // Fetch current subscription status
    fetchSubscriptionStatus();
  }, [searchParams]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch(`/api/user/subscription?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.plan) {
          setCurrentPlan(data.plan);
        }
      }
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    }
  };

  const handleSubscribe = async (tierId: string, priceId: string) => {
    setIsLoading(tierId);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsLoading(null);
    }
  };

  const tiers: PricingTier[] = Object.values(PRICING_TIERS).map((tier) => ({
    id: tier.id,
    name: tier.name,
    price: tier.price,
    interval: tier.interval,
    description: tier.description,
    popular: tier.popular,
    features: tier.features,
  }));

  return (
    <div className="min-h-screen bg-[#0d1117] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#e6edf3] mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-[#8b949e] max-w-2xl mx-auto">
            Choose the plan that fits your trading style. All plans include a{' '}
            <span className="text-[#3fb950] font-medium">14-day free trial</span>. No
            credit card required to start.
          </p>
        </div>

        {/* Alerts */}
        {showCanceled && (
          <div className="max-w-md mx-auto mb-8 rounded-lg border border-[#f85149]/30 bg-[#f85149]/10 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[#f85149] shrink-0" />
            <p className="text-sm text-[#f85149]">Checkout canceled. You can try again when you're ready.</p>
          </div>
        )}

        {showSuccess && (
          <div className="max-w-md mx-auto mb-8 rounded-lg border border-[#3fb950]/30 bg-[#3fb950]/10 p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-[#3fb950] shrink-0" />
            <p className="text-sm text-[#3fb950]">Welcome! Your subscription is now active.</p>
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto mb-8 rounded-lg border border-[#f85149]/30 bg-[#f85149]/10 p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-[#f85149] shrink-0" />
            <p className="text-sm text-[#f85149]">{error}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {tiers.map((tier) => (
            <PricingCard
              key={tier.id}
              tier={tier}
              isLoading={isLoading === tier.id}
              onSubscribe={() => handleSubscribe(tier.id, PRICING_TIERS[tier.id as keyof typeof PRICING_TIERS].priceId)}
              currentPlan={currentPlan}
            />
          ))}
        </div>

        {/* FAQ / Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-6 text-sm text-[#8b949e]">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[#3fb950]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Secure Payment via Stripe
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[#3fb950]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cancel Anytime
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[#3fb950]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              14-Day Free Trial
            </div>
          </div>
        </div>

        {/* Back to Terminal Link */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm text-[#58a6ff] hover:text-[#79c0ff] transition-colors"
          >
            &larr; Back to Trading Terminal
          </a>
        </div>
      </div>
    </div>
  );
}
