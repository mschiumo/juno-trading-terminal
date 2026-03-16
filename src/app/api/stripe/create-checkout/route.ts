import { NextRequest, NextResponse } from 'next/server';
import { stripe, PRICING_TIERS } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, userId } = body;

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: priceId and userId' },
        { status: 400 }
      );
    }

    // Determine the mode based on the priceId
    const tier = Object.values(PRICING_TIERS).find((t) => t.priceId === priceId);
    
    if (!tier) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    const mode = tier.id === 'lifetime' ? 'payment' : 'subscription';

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: undefined, // Let Stripe handle this or lookup by customer ID
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode as 'subscription' | 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      metadata: {
        userId: userId,
        plan: tier.id,
      },
      subscription_data: mode === 'subscription' ? {
        trial_period_days: 14,
        metadata: {
          userId: userId,
          plan: tier.id,
        },
      } : undefined,
      payment_intent_data: mode === 'payment' ? {
        metadata: {
          userId: userId,
          plan: tier.id,
        },
      } : undefined,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: errorMessage },
      { status: 500 }
    );
  }
}
