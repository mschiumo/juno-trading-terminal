import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { syncSubscriptionFromStripe } from '@/lib/subscription';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Invalid signature', details: errorMessage },
      { status: 400 }
    );
  }

  console.log(`Processing webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Only process if this is a subscription checkout
        if (session.mode === 'subscription' && session.subscription) {
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan as 'monthly' | 'annual' | 'lifetime';
          
          if (!userId || !plan) {
            console.error('Missing metadata in checkout session:', session.id);
            break;
          }

          // Retrieve the subscription details
          const subscriptionResponse = await stripe.subscriptions.retrieve(session.subscription as string);
          const subscription = subscriptionResponse as unknown as Record<string, unknown>;
          
          await syncSubscriptionFromStripe(
            userId,
            session.customer as string,
            subscription.id as string,
            subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive',
            plan,
            subscription.current_period_start as number,
            subscription.current_period_end as number,
            subscription.cancel_at_period_end as boolean,
            (subscription.trial_end as number) || undefined
          );
          
          console.log(`Subscription created for user ${userId}, plan: ${plan}`);
        }
        
        // Handle one-time payment (lifetime)
        if (session.mode === 'payment') {
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan as 'lifetime';
          
          if (!userId || !plan) {
            console.error('Missing metadata in payment session:', session.id);
            break;
          }

          // For lifetime subscriptions, create a synthetic subscription record
          await syncSubscriptionFromStripe(
            userId,
            session.customer as string,
            `lifetime_${session.id}`,
            'active',
            plan,
            Math.floor(Date.now() / 1000),
            Math.floor(Date.now() / 1000) + (100 * 365 * 24 * 60 * 60), // 100 years from now
            false
          );
          
          console.log(`Lifetime subscription created for user ${userId}`);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        
        if (invoice.subscription) {
          const subscriptionResponse = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const subscription = subscriptionResponse as unknown as Record<string, unknown>;
          const userId = (subscription.metadata as Record<string, string>)?.userId;
          const plan = (subscription.metadata as Record<string, string>)?.plan as 'monthly' | 'annual' | 'lifetime';
          
          if (!userId || !plan) {
            console.error('Missing metadata in subscription:', subscription.id);
            break;
          }

          await syncSubscriptionFromStripe(
            userId,
            subscription.customer as string,
            subscription.id as string,
            subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive',
            plan,
            subscription.current_period_start as number,
            subscription.current_period_end as number,
            subscription.cancel_at_period_end as boolean,
            (subscription.trial_end as number) || undefined
          );
          
          console.log(`Invoice paid for user ${userId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        
        if (invoice.subscription) {
          const subscriptionResponse = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const subscription = subscriptionResponse as unknown as Record<string, unknown>;
          const userId = (subscription.metadata as Record<string, string>)?.userId;
          const plan = (subscription.metadata as Record<string, string>)?.plan as 'monthly' | 'annual' | 'lifetime';
          
          if (!userId || !plan) {
            console.error('Missing metadata in subscription:', subscription.id);
            break;
          }

          await syncSubscriptionFromStripe(
            userId,
            subscription.customer as string,
            subscription.id as string,
            'past_due',
            plan,
            subscription.current_period_start as number,
            subscription.current_period_end as number,
            subscription.cancel_at_period_end as boolean,
            (subscription.trial_end as number) || undefined
          );
          
          console.log(`Payment failed for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as Record<string, unknown>;
        const userId = (subscription.metadata as Record<string, string>)?.userId;
        const plan = (subscription.metadata as Record<string, string>)?.plan as 'monthly' | 'annual' | 'lifetime';
        
        if (!userId || !plan) {
          console.error('Missing metadata in subscription:', subscription.id);
          break;
        }

        await syncSubscriptionFromStripe(
          userId,
          subscription.customer as string,
          subscription.id as string,
          subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'inactive',
          plan,
          subscription.current_period_start as number,
          subscription.current_period_end as number,
          subscription.cancel_at_period_end as boolean,
          (subscription.trial_end as number) || undefined
        );
        
        console.log(`Subscription updated for user ${userId}, status: ${subscription.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as unknown as Record<string, unknown>;
        const userId = (subscription.metadata as Record<string, string>)?.userId;
        const plan = (subscription.metadata as Record<string, string>)?.plan as 'monthly' | 'annual' | 'lifetime';
        
        if (!userId || !plan) {
          console.error('Missing metadata in subscription:', subscription.id);
          break;
        }

        await syncSubscriptionFromStripe(
          userId,
          subscription.customer as string,
          subscription.id as string,
          'canceled',
          plan,
          subscription.current_period_start as number,
          subscription.current_period_end as number,
          true,
          (subscription.trial_end as number) || undefined
        );
        
        console.log(`Subscription canceled for user ${userId}`);
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Webhook processing failed', details: errorMessage },
      { status: 500 }
    );
  }
}
