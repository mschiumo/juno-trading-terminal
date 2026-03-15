/**
 * Watchlist Database Layer
 * 
 * Redis-backed storage for watchlist items
 */

import { getRedisClient } from '@/lib/redis';
import type { WatchlistItem } from '@/types/watchlist';

const makeKey = (userId: string) => `juno:trade-watchlist:${userId}`;

/**
 * Get all watchlist items for a user
 */
export async function getWatchlist(userId: string = 'default'): Promise<WatchlistItem[]> {
  try {
    const redis = getRedisClient();
    const itemsJson = await redis.get(makeKey(userId));
    if (!itemsJson) return [];
    const items = JSON.parse(itemsJson as string);
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    return [];
  }
}

/**
 * Save a watchlist item (create or update)
 */
export async function saveWatchlistItem(item: WatchlistItem, userId: string = 'default'): Promise<void> {
  try {
    const redis = getRedisClient();
    const items = await getWatchlist(userId);
    const existingIndex = items.findIndex(i => i.id === item.id);
    
    if (existingIndex >= 0) {
      items[existingIndex] = item;
    } else {
      items.push(item);
    }
    
    await redis.set(makeKey(userId), JSON.stringify(items));
  } catch (error) {
    console.error('Error saving watchlist item:', error);
    throw error;
  }
}

/**
 * Delete a watchlist item
 */
export async function deleteWatchlistItem(id: string, userId: string = 'default'): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const items = await getWatchlist(userId);
    const filteredItems = items.filter(i => i.id !== id);
    
    if (filteredItems.length === items.length) {
      return false;
    }
    
    await redis.set(makeKey(userId), JSON.stringify(filteredItems));
    return true;
  } catch (error) {
    console.error('Error deleting watchlist item:', error);
    return false;
  }
}
