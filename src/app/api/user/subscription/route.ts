import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionStatus, startTrial } from '@/lib/subscription';

export async function GET(request: NextRequest) {
  try {
    // Get userId from query parameter or header
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    // Check if user needs a trial started
    const status = await getSubscriptionStatus(userId);
    
    // If no subscription and no trial, start a trial automatically
    if (!status.subscription && !status.isTrial && status.daysRemaining === 0) {
      await startTrial(userId);
      // Re-fetch status after starting trial
      const updatedStatus = await getSubscriptionStatus(userId);
      return NextResponse.json(updatedStatus);
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting subscription status:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: 'Failed to get subscription status', details: errorMessage },
      { status: 500 }
    );
  }
}
