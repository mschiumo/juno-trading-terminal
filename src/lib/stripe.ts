import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  typescript: true,
} as any);

export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY || '';
export const STRIPE_PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL || '';
export const STRIPE_PRICE_LIFETIME = process.env.STRIPE_PRICE_LIFETIME || '';

export interface PricingTierData {
  id: 'monthly' | 'annual' | 'lifetime';
  name: string;
  price: number;
  priceId: string;
  interval: string;
  description: string;
  popular: boolean;
  features: string[];
}

export const PRICING_TIERS: Record<string, PricingTierData> = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    price: 19,
    priceId: STRIPE_PRICE_MONTHLY,
    interval: 'month',
    description: 'Perfect for active traders',
    popular: false,
    features: [
      'Unlimited trade entries',
      'Advanced analytics & reporting',
      'Real-time P&L tracking',
      'Journal with AI insights',
      'Export to CSV/PDF',
      'Email support',
    ],
  },
  annual: {
    id: 'annual',
    name: 'Annual',
    price: 190,
    priceId: STRIPE_PRICE_ANNUAL,
    interval: 'year',
    description: 'Best value for serious traders',
    popular: true,
    features: [
      'Everything in Monthly',
      '2 months FREE',
      'Priority support',
      'Advanced risk metrics',
      'Custom trade tags',
      'API access (coming soon)',
    ],
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime',
    price: 499,
    priceId: STRIPE_PRICE_LIFETIME,
    interval: 'one-time',
    description: 'One-time payment, forever access',
    popular: false,
    features: [
      'Everything in Annual',
      'Pay once, use forever',
      'All future updates',
      'VIP support',
      'Early access to new features',
      'Exclusive trading community access',
    ],
  },
};

export type PricingTier = keyof typeof PRICING_TIERS;
