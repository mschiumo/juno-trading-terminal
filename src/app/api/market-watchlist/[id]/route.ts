/**
 * Market Watchlist Item API Routes
 * 
 * PUT /api/market-watchlist/[id] - Update a watchlist item
 * DELETE /api/market-watchlist/[id] - Remove an item from watchlist
 */

import { NextRequest, NextResponse } from 'next/server';
import type { MarketWatchlistItem, WatchlistApiResponse } from '@/types/market-watchlist';
import { 
  getMarketWatchlist, 
  saveMarketWatchlistItem, 
  deleteMarketWatchlistItem,
  updateMarketWatchlistItems
} from '@/lib/db/market-watchlist';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PUT /api/market-watchlist/:id
 * 
 * Update a watchlist item
 * Request body: Partial<MarketWatchlistItem>
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<WatchlistApiResponse<MarketWatchlistItem>>> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    
    const body = await request.json();
    
    // Get existing item
    const items = await getMarketWatchlist(userId);
    const existingItem = items.find(item => item.id === id);
    
    if (!existingItem) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Watchlist item not found' 
        },
        { status: 404 }
      );
    }
    
    // Update the item with new values
    const updatedItem: MarketWatchlistItem = {
      ...existingItem,
      ...body,
      id: existingItem.id, // Prevent ID change
      symbol: existingItem.symbol, // Prevent symbol change
      addedAt: existingItem.addedAt, // Prevent addedAt change
      // Only allow updating specific fields
      name: body.name ?? existingItem.name,
      displayName: body.displayName ?? existingItem.displayName,
      notes: body.notes !== undefined ? body.notes : existingItem.notes,
      order: body.order !== undefined ? body.order : existingItem.order,
      type: body.type ?? existingItem.type,
    };
    
    await saveMarketWatchlistItem(updatedItem, userId);
    
    return NextResponse.json({ 
      success: true, 
      data: updatedItem,
      message: 'Watchlist item updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating watchlist item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update watchlist item' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/market-watchlist/:id
 * 
 * Remove an item from the watchlist
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<WatchlistApiResponse<null>>> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    
    const deleted = await deleteMarketWatchlistItem(id, userId);
    
    if (!deleted) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Watchlist item not found' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Watchlist item removed successfully' 
    });
    
  } catch (error) {
    console.error('Error deleting watchlist item:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete watchlist item' 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/market-watchlist/:id
 * 
 * Partial update for specific operations like reordering
 * Request body: { reorder?: { targetOrder: number } }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<WatchlistApiResponse<MarketWatchlistItem[]>>> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';
    
    const body = await request.json();
    
    // Handle reorder operation
    if (body.reorder) {
      const { targetOrder } = body.reorder;
      
      const items = await getMarketWatchlist(userId);
      const itemIndex = items.findIndex(item => item.id === id);
      
      if (itemIndex === -1) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Watchlist item not found' 
          },
          { status: 404 }
        );
      }
      
      // Remove item from current position
      const [movedItem] = items.splice(itemIndex, 1);
      
      // Insert at new position
      items.splice(targetOrder, 0, movedItem);
      
      // Reassign order values
      items.forEach((item, index) => {
        item.order = index;
      });
      
      await updateMarketWatchlistItems(items, userId);
      
      return NextResponse.json({ 
        success: true, 
        data: items,
        message: 'Watchlist reordered successfully'
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid PATCH operation' 
      },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error patching watchlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update watchlist' 
      },
      { status: 500 }
    );
  }
}
