/**
 * Market Watchlist Search API Route
 * 
 * GET /api/market-watchlist/search?q={query} - Search for tickers using Polygon API
 */

import { NextRequest, NextResponse } from 'next/server';
import type { WatchlistApiResponse, PolygonTickerResult } from '@/types/market-watchlist';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const POLYGON_BASE_URL = 'https://api.polygon.io';

/**
 * GET /api/market-watchlist/search?q={query}
 * 
 * Search for tickers using Polygon API
 * Query Parameters:
 * - q: string (search query - required)
 * - limit: number (optional, default 10, max 20)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<WatchlistApiResponse<PolygonTickerResult[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Query parameter "q" is required' 
        },
        { status: 400 }
      );
    }

    if (!POLYGON_API_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Polygon API key not configured' 
        },
        { status: 503 }
      );
    }

    // Clean the query - remove any special characters
    const cleanQuery = query.trim().toUpperCase();

    // Build the URL
    const url = new URL(`${POLYGON_BASE_URL}/v3/reference/tickers`);
    url.searchParams.append('search', cleanQuery);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('apiKey', POLYGON_API_KEY);
    url.searchParams.append('active', 'true');
    // Only search for stocks, ETFs, and indices
    url.searchParams.append('market', 'stocks');

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.' 
          },
          { status: 429 }
        );
      }

      const errorData = await response.json().catch(() => ({}));
      console.error('Polygon API error:', response.status, errorData);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Polygon API error: ${response.status}` 
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const results: PolygonTickerResult[] = data.results || [];

    // Filter out OTC and low-quality listings
    const filteredResults = results.filter((ticker) => {
      // Exclude OTC markets
      if (ticker.market === 'otc') return false;
      // Exclude test/invalid tickers
      if (ticker.ticker?.includes('.')) return false;
      // Must have a name
      if (!ticker.name || ticker.name.length === 0) return false;
      return true;
    });

    return NextResponse.json({ 
      success: true, 
      data: filteredResults.slice(0, limit)
    });

  } catch (error) {
    console.error('Error searching tickers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search tickers' 
      },
      { status: 500 }
    );
  }
}
