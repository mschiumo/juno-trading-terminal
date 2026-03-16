/**
 * Market Watchlist Reorder API Route
 * 
 * POST /api/market-watchlist/reorder - Reorder watchlist items
 */

import { NextRequest, NextResponse } from 'next/server';
import type { WatchlistApiResponse, MarketWatchlistItem } from '@/types/market-watchlist';
import { getMarketWatchlist, updateMarketWatchlistItems } from '@/lib/db/market-watchlist';

interface ReorderRequest {
  itemId: string;
  newIndex: number;
}

/**
 * POST /api/market-watchlist/reorder
 * 
 * Reorder watchlist items
 * Request body: { itemId: string, newIndex: number }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<WatchlistApiResponse<MarketWatchlistItem[]>>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';

    const body: ReorderRequest = await request.json();

    if (!body.itemId || typeof body.newIndex !== 'number') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request. Required: itemId (string), newIndex (number)' 
        },
        { status: 400 }
      );
    }

    const { itemId, newIndex } = body;

    // Get current watchlist
    const items = await getMarketWatchlist(userId);

    // Find the item to move
    const currentIndex = items.findIndex(item => item.id === itemId);
    
    if (currentIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Item not found' 
        },
        { status: 404 }
      );
    }

    // Clamp newIndex to valid range
    const clampedNewIndex = Math.max(0, Math.min(newIndex, items.length - 1));

    // Remove item from current position
    const [movedItem] = items.splice(currentIndex, 1);

    // Insert at new position
    items.splice(clampedNewIndex, 0, movedItem);

    // Reassign order values
    items.forEach((item, index) => {
      item.order = index;
    });

    // Save updated order
    await updateMarketWatchlistItems(items, userId);

    return NextResponse.json({ 
      success: true, 
      data: items,
      message: 'Watchlist reordered successfully'
    });

  } catch (error) {
    console.error('Error reordering watchlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reorder watchlist' 
      },
      { status: 500 }
    );
  }
}
