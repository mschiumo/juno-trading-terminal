'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  interval: string;
  description: string;
  popular: boolean;
  features: string[];
}

interface PricingCardProps {
  tier: PricingTier;
  isLoading?: boolean;
  onSubscribe: () => void;
  currentPlan?: string | null;
}

export function PricingCard({ tier, isLoading, onSubscribe, currentPlan }: PricingCardProps) {
  const isCurrentPlan = currentPlan === tier.id;
  const buttonText = isCurrentPlan ? 'Current Plan' : `Get ${tier.name}`;
  
  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-[#161b22] p-6 transition-all duration-200',
        tier.popular
          ? 'border-[#3fb950] shadow-lg shadow-[#3fb950]/10'
          : 'border-[#30363d] hover:border-[#484f58]'
      )}
    >
      {tier.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#3fb950] px-3 py-1 text-xs font-medium text-black">
          Most Popular
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#e6edf3]">{tier.name}</h3>
        <p className="mt-1 text-sm text-[#8b949e]">{tier.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline">
          <span className="text-4xl font-bold text-[#e6edf3]">${tier.price}</span>
          <span className="ml-2 text-[#8b949e]">
            {tier.interval === 'one-time' ? 'one-time' : `/${tier.interval}`}
          </span>
        </div>
      </div>

      <ul className="mb-6 space-y-3">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#238636]/20">
              <Check className="h-3 w-3 text-[#3fb950]" />
            </div>
            <span className="text-sm text-[#c9d1d9]">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSubscribe}
        disabled={isLoading || isCurrentPlan}
        className={cn(
          'w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
          isCurrentPlan
            ? 'cursor-not-allowed bg-[#30363d] text-[#8b949e]'
            : tier.popular
            ? 'bg-[#238636] text-white hover:bg-[#2ea043]'
            : 'bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]'
        )}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
}
