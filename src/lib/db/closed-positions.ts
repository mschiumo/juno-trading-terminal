/**
 * Closed Positions Database Operations
 * Redis-based storage for closed positions
 */

import { getRedisClient } from '@/lib/redis';

export interface ClosedPosition {
  id: string;
  ticker: string;
  plannedEntry: number;
  plannedStop: number;
  plannedTarget: number;
  actualEntry: number;
  actualShares: number;
  exitPrice?: number;
  exitDate?: string;
  pnl?: number;
  openedAt: string;
  closedAt: string;
  notes?: string;
}

function getKey(userId: string): string {
  return `juno:closed-positions:${userId}`;
}

/**
 * Get all closed positions for a user
 */
export async function getClosedPositions(userId: string = 'default'): Promise<ClosedPosition[]> {
  const redis = getRedisClient();
  const data = await redis.get(getKey(userId));
  if (!data) return [];
  try {
    return JSON.parse(data as string) as ClosedPosition[];
  } catch {
    return [];
  }
}

/**
 * Save a closed position
 */
export async function saveClosedPosition(position: ClosedPosition, userId: string = 'default'): Promise<ClosedPosition> {
  const redis = getRedisClient();
  const positions = await getClosedPositions(userId);
  const existingIndex = positions.findIndex(p => p.id === position.id);
  
  if (existingIndex >= 0) {
    positions[existingIndex] = position;
  } else {
    positions.push(position);
  }
  
  await redis.set(getKey(userId), JSON.stringify(positions));
  return position;
}

/**
 * Update a closed position
 */
export async function updateClosedPosition(id: string, updates: Partial<ClosedPosition>, userId: string = 'default'): Promise<ClosedPosition | null> {
  const redis = getRedisClient();
  const positions = await getClosedPositions(userId);
  const index = positions.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  positions[index] = { ...positions[index], ...updates };
  await redis.set(getKey(userId), JSON.stringify(positions));
  return positions[index];
}

/**
 * Delete a closed position
 */
export async function deleteClosedPosition(id: string, userId: string = 'default'): Promise<boolean> {
  const redis = getRedisClient();
  const positions = await getClosedPositions(userId);
  const filtered = positions.filter(p => p.id !== id);
  
  if (filtered.length === positions.length) return false;
  
  await redis.set(getKey(userId), JSON.stringify(filtered));
  return true;
}
