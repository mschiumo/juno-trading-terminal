/**
 * Market Watchlist Database Layer
 * 
 * Redis-backed storage for market watchlist items
 * Separate from the trading watchlist used for potential trades
 */

import { getRedisClient } from '@/lib/redis';
import type { MarketWatchlistItem } from '@/types/market-watchlist';

const makeKey = (userId: string) => `juno:market-watchlist:${userId}`;

/**
 * Get all market watchlist items for a user
 * Returns items sorted by order field
 */
export async function getMarketWatchlist(userId: string = 'default'): Promise<MarketWatchlistItem[]> {
  try {
    const redis = getRedisClient();
    const itemsJson = await redis.get(makeKey(userId));
    if (!itemsJson) return [];
    
    const items: MarketWatchlistItem[] = JSON.parse(itemsJson as string);
    if (!Array.isArray(items)) return [];
    
    // Sort by order field
    return items.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Error fetching market watchlist:', error);
    return [];
  }
}

/**
 * Save a market watchlist item (create or update)
 */
export async function saveMarketWatchlistItem(
  item: MarketWatchlistItem, 
  userId: string = 'default'
): Promise<void> {
  try {
    const redis = getRedisClient();
    const items = await getMarketWatchlist(userId);
    const existingIndex = items.findIndex(i => i.id === item.id);
    
    if (existingIndex >= 0) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    
    await redis.set(makeKey(userId), JSON.stringify(items));
  } catch (error) {
    console.error('Error saving market watchlist item:', error);
    throw error;
  }
}

/**
 * Update multiple watchlist items (for reordering)
 */
export async function updateMarketWatchlistItems(
  items: MarketWatchlistItem[],
  userId: string = 'default'
): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.set(makeKey(userId), JSON.stringify(items));
  } catch (error) {
    console.error('Error updating market watchlist items:', error);
    throw error;
  }
}

/**
 * Delete a market watchlist item
 */
export async function deleteMarketWatchlistItem(
  id: string, 
  userId: string = 'default'
): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const items = await getMarketWatchlist(userId);
    const filteredItems = items.filter(i => i.id !== id);
    
    if (filteredItems.length === items.length) {
      return false; // Item not found
    }
    
    await redis.set(makeKey(userId), JSON.stringify(filteredItems));
    return true;
  } catch (error) {
    console.error('Error deleting market watchlist item:', error);
    return false;
  }
}

/**
 * Get the next order index for a new item
 */
export async function getNextOrderIndex(userId: string = 'default'): Promise<number> {
  try {
    const items = await getMarketWatchlist(userId);
    if (items.length === 0) return 0;
    return Math.max(...items.map(i => i.order)) + 1;
  } catch (error) {
    console.error('Error getting next order index:', error);
    return 0;
  }
}

/**
 * Check if a symbol already exists in the watchlist
 */
export async function symbolExistsInWatchlist(
  symbol: string, 
  userId: string = 'default'
): Promise<boolean> {
  try {
    const items = await getMarketWatchlist(userId);
    return items.some(
      item => item.symbol.toUpperCase() === symbol.toUpperCase()
    );
  } catch (error) {
    console.error('Error checking symbol existence:', error);
    return false;
  }
}
