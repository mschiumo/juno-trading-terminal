/**
 * Market Watchlist API Routes
 * 
 * GET /api/market-watchlist - Get all watchlist items
 * POST /api/market-watchlist - Add new ticker to watchlist
 */

import { NextRequest, NextResponse } from 'next/server';
import type { MarketWatchlistItem, WatchlistApiResponse } from '@/types/market-watchlist';
import { 
  getMarketWatchlist, 
  saveMarketWatchlistItem, 
  getNextOrderIndex,
  symbolExistsInWatchlist
} from '@/lib/db/market-watchlist';
import { validateTicker, determineAssetType } from '@/lib/polygon-api';

// Helper to generate UUID
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * GET /api/market-watchlist
 * 
 * Query Parameters:
 * - userId: string (optional, defaults to 'default')
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<WatchlistApiResponse<MarketWatchlistItem[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    
    const items = await getMarketWatchlist(userId);
    
    return NextResponse.json({ 
      success: true, 
      data: items 
    });
    
  } catch (error) {
    console.error('Error fetching market watchlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch watchlist' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/market-watchlist
 * 
 * Add a new ticker to the watchlist
 * Request body: { symbol: string, type?: 'stock' | 'index' | 'crypto' | 'commodity', notes?: string }
 * Query Parameters:
 * - userId: string (optional, defaults to 'default')
 * - validate: boolean (optional, defaults to true - validate ticker with Polygon)
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<WatchlistApiResponse<MarketWatchlistItem>>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    const shouldValidate = searchParams.get('validate') !== 'false';
    
    const body = await request.json();
    
    // Validation
    if (!body.symbol || typeof body.symbol !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Symbol is required' 
        },
        { status: 400 }
      );
    }
    
    const symbol = body.symbol.trim().toUpperCase();
    
    // Check for duplicate
    const exists = await symbolExistsInWatchlist(symbol, userId);
    if (exists) {
      return NextResponse.json(
        { 
          success: false, 
          error: `${symbol} is already in your watchlist` 
        },
        { status: 409 }
      );
    }
    
    // Validate ticker with Polygon API if enabled
    let tickerInfo = null;
    let assetType = body.type || 'stock';
    let displayName = body.displayName;
    
    if (shouldValidate) {
      const validation = await validateTicker(symbol);
      
      if (!validation.valid) {
        return NextResponse.json(
          { 
            success: false, 
            error: validation.error || 'Invalid symbol' 
          },
          { status: 400 }
        );
      }
      
      tickerInfo = validation.ticker;
      
      // Auto-determine type if not provided
      if (!body.type && tickerInfo) {
        assetType = determineAssetType(tickerInfo);
      }
      
      // Use official name from Polygon if not provided
      if (!displayName && tickerInfo) {
        displayName = tickerInfo.name;
      }
    }
    
    // Get next order index
    const order = await getNextOrderIndex(userId);
    
    // Create watchlist item
    const item: MarketWatchlistItem = {
      id: generateId(),
      symbol: symbol,
      name: tickerInfo?.name || displayName || symbol,
      type: assetType as 'stock' | 'index' | 'crypto' | 'commodity',
      addedAt: new Date().toISOString(),
      order: order,
      notes: body.notes || undefined,
      displayName: displayName,
    };
    
    await saveMarketWatchlistItem(item, userId);
    
    return NextResponse.json(
      { 
        success: true, 
        data: item,
        message: `${symbol} added to watchlist` 
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add symbol to watchlist' 
      },
      { status: 500 }
    );
  }
}
