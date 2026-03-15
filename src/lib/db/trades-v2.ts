/**
 * Trades v2 Database Layer
 * 
 * Redis-backed storage for trades with user isolation
 */

import { getRedisClient } from '@/lib/redis';
import type { Trade } from '@/types/trading';

const TRADES_KEY = 'juno:trades';

/**
 * Get all trades from Redis
 */
export async function getAllTrades(): Promise<Trade[]> {
  try {
    const redis = getRedisClient();
    const tradesJson = await redis.get(TRADES_KEY);
    if (!tradesJson) return [];
    const trades = JSON.parse(tradesJson as string);
    return Array.isArray(trades) ? trades : [];
  } catch (error) {
    console.error('Error fetching trades:', error);
    return [];
  }
}

/**
 * Get a single trade by ID
 */
export async function getTradeById(id: string): Promise<Trade | null> {
  try {
    const trades = await getAllTrades();
    return trades.find(t => t.id === id) || null;
  } catch (error) {
    console.error('Error fetching trade:', error);
    return null;
  }
}

/**
 * Save a trade (create or update)
 */
export async function saveTrade(trade: Trade): Promise<void> {
  try {
    const redis = getRedisClient();
    const trades = await getAllTrades();
    const existingIndex = trades.findIndex(t => t.id === trade.id);
    
    if (existingIndex >= 0) {
      trades[existingIndex] = trade;
    } else {
      trades.push(trade);
    }
    
    await redis.set(TRADES_KEY, JSON.stringify(trades));
  } catch (error) {
    console.error('Error saving trade:', error);
    throw error;
  }
}

/**
 * Save multiple trades at once
 */
export async function saveTrades(tradesToSave: Trade[]): Promise<void> {
  try {
    const redis = getRedisClient();
    const trades = await getAllTrades();
    
    for (const trade of tradesToSave) {
      const existingIndex = trades.findIndex(t => t.id === trade.id);
      if (existingIndex >= 0) {
        trades[existingIndex] = trade;
      } else {
        trades.push(trade);
      }
    }
    
    await redis.set(TRADES_KEY, JSON.stringify(trades));
  } catch (error) {
    console.error('Error saving trades:', error);
    throw error;
  }
}

/**
 * Update an existing trade
 */
export async function updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | null> {
  try {
    const trade = await getTradeById(id);
    if (!trade) return null;
    
    const updatedTrade = { ...trade, ...updates, updatedAt: new Date().toISOString() };
    await saveTrade(updatedTrade);
    return updatedTrade;
  } catch (error) {
    console.error('Error updating trade:', error);
    return null;
  }
}

/**
 * Delete a trade by ID
 */
export async function deleteTrade(id: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const trades = await getAllTrades();
    const filteredTrades = trades.filter(t => t.id !== id);
    
    if (filteredTrades.length === trades.length) {
      return false; // Trade not found
    }
    
    await redis.set(TRADES_KEY, JSON.stringify(filteredTrades));
    return true;
  } catch (error) {
    console.error('Error deleting trade:', error);
    return false;
  }
}

/**
 * Clear all trades (use with caution!)
 */
export async function clearAllTrades(): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.del(TRADES_KEY);
  } catch (error) {
    console.error('Error clearing trades:', error);
    throw error;
  }
}
