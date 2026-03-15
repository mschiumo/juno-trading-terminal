/**
 * Active Trades Database Layer
 * 
 * Redis-backed storage for active positions
 */

import { getRedisClient } from '@/lib/redis';
import type { ActiveTrade, ActiveTradeWithPnL } from '@/types/active-trade';

const makeKey = (userId: string) => `juno:active-trades:${userId}`;

/**
 * Get all active trades for a user
 */
export async function getActiveTrades(userId: string = 'default'): Promise<ActiveTrade[]> {
  try {
    const redis = getRedisClient();
    const tradesJson = await redis.get(makeKey(userId));
    if (!tradesJson) return [];
    const trades = JSON.parse(tradesJson as string);
    return Array.isArray(trades) ? trades : [];
  } catch (error) {
    console.error('Error fetching active trades:', error);
    return [];
  }
}

/**
 * Save an active trade (create or update)
 */
export async function saveActiveTrade(trade: ActiveTrade, userId: string = 'default'): Promise<void> {
  try {
    const redis = getRedisClient();
    const trades = await getActiveTrades(userId);
    const existingIndex = trades.findIndex(t => t.id === trade.id);
    
    if (existingIndex >= 0) {
      trades[existingIndex] = trade;
    } else {
      trades.push(trade);
    }
    
    await redis.set(makeKey(userId), JSON.stringify(trades));
  } catch (error) {
    console.error('Error saving active trade:', error);
    throw error;
  }
}

/**
 * Update an active trade
 */
export async function updateActiveTrade(id: string, updates: Partial<ActiveTrade>, userId: string = 'default'): Promise<ActiveTrade | null> {
  try {
    const trades = await getActiveTrades(userId);
    const index = trades.findIndex(t => t.id === id);
    if (index < 0) return null;
    
    trades[index] = { ...trades[index], ...updates };
    const redis = getRedisClient();
    await redis.set(makeKey(userId), JSON.stringify(trades));
    return trades[index];
  } catch (error) {
    console.error('Error updating active trade:', error);
    return null;
  }
}

/**
 * Delete an active trade
 */
export async function deleteActiveTrade(id: string, userId: string = 'default'): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const trades = await getActiveTrades(userId);
    const filteredTrades = trades.filter(t => t.id !== id);
    
    if (filteredTrades.length === trades.length) {
      return false;
    }
    
    await redis.set(makeKey(userId), JSON.stringify(filteredTrades));
    return true;
  } catch (error) {
    console.error('Error deleting active trade:', error);
    return false;
  }
}
