import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { hasAccess, isTrialActive, startTrial } from '@/lib/subscription';

// Simple user ID extraction (in production, use proper auth)
function getUserId(request: NextRequest): string {
  // Try to get from cookie first
  const userId = request.cookies.get('trading_terminal_user_id')?.value;
  if (userId) return userId;
  
  // Generate a new user ID
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Routes that don't require subscription
const publicRoutes = [
  '/',
  '/pricing',
  '/api/stripe/create-checkout',
  '/api/stripe/webhook',
  '/api/user/subscription',
  '/_next',
  '/favicon',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Allow static files
  if (pathname.startsWith('/_next/') || pathname.includes('.')) {
    return NextResponse.next();
  }
  
  // Get or create user ID
  const userId = getUserId(request);
  
  // Set user ID cookie if not present
  const response = NextResponse.next();
  if (!request.cookies.get('trading_terminal_user_id')) {
    response.cookies.set('trading_terminal_user_id', userId, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });
  }
  
  // Check if user has access (subscription or trial)
  const hasUserAccess = await hasAccess(userId);
  
  if (!hasUserAccess) {
    // Check if we should auto-start a trial
    const trialActive = await isTrialActive(userId);
    
    if (!trialActive) {
      // Start a trial for new users
      await startTrial(userId);
      
      // Check again after starting trial
      const trialNowActive = await isTrialActive(userId);
      
      if (!trialNowActive) {
        // Redirect to pricing if no access and no trial
        const pricingUrl = new URL('/pricing', request.url);
        pricingUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(pricingUrl);
      }
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
