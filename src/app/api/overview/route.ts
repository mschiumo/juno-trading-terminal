/**
 * Overview API - Dashboard Statistics
 * 
 * GET /api/overview - Fetch comprehensive trading statistics for dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllTrades } from '@/lib/db/trades-v2';
import { getActiveTrades } from '@/lib/db/active-trades';
import { getClosedPositions } from '@/lib/db/closed-positions';
import { TradeStatus, TradeSide, Trade } from '@/types/trading';

interface OverviewStats {
  activeTradesCount: number;
  activeTradesValue: number;
  activeTradesPnL: number;
  totalTrades: number;
  totalClosedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  totalPnL: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  averageTrade: number;
  todayTrades: number;
  todayPnL: number;
  todayWinRate: number;
  weeklyTrades: number;
  weeklyPnL: number;
  weeklyWinRate: number;
  monthlyTrades: number;
  monthlyPnL: number;
  monthlyWinRate: number;
  currentWinStreak: number;
  currentLossStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
  lastTradeDate: string | null;
  lastTradePnL: number | null;
  bestTrade: { symbol: string; pnl: number } | null;
  worstTrade: { symbol: string; pnl: number } | null;
}

function getESTDate(date: Date): string {
  return date.toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

function getESTStartOfDay(date: Date): Date {
  const estDateStr = date.toLocaleDateString('en-US', { 
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = estDateStr.split('/');
  return new Date(`${year}-${month}-${day}T00:00:00-05:00`);
}

function getESTStartOfWeek(date: Date): Date {
  const est = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dayOfWeek = est.getDay();
  const diff = est.getDate() - dayOfWeek;
  const sunday = new Date(est);
  sunday.setDate(diff);
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

function getESTStartOfMonth(date: Date): Date {
  const est = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return new Date(est.getFullYear(), est.getMonth(), 1);
}

function calculateStreaks(trades: Trade[]): { currentWinStreak: number; currentLossStreak: number; maxWinStreak: number; maxLossStreak: number } {
  // Sort trades by exit date (most recent first)
  const sortedTrades = [...trades]
    .filter(t => t.status === TradeStatus.CLOSED && t.netPnL !== undefined)
    .sort((a, b) => new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime());

  if (sortedTrades.length === 0) {
    return { currentWinStreak: 0, currentLossStreak: 0, maxWinStreak: 0, maxLossStreak: 0 };
  }

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;
  let isFirst = true;

  for (const trade of sortedTrades) {
    const isWin = (trade.netPnL || 0) > 0;
    const isLoss = (trade.netPnL || 0) < 0;

    if (isWin) {
      tempWinStreak++;
      tempLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, tempWinStreak);
      if (isFirst) currentWinStreak = tempWinStreak;
    } else if (isLoss) {
      tempLossStreak++;
      tempWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, tempLossStreak);
      if (isFirst) currentLossStreak = tempLossStreak;
    }

    isFirst = false;
  }

  return { currentWinStreak, currentLossStreak, maxWinStreak, maxLossStreak };
}

/**
 * GET /api/overview
 * 
 * Query Parameters:
 * - userId: string (optional, defaults to 'default')
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default';

    // Fetch all data in parallel
    const [trades, activeTrades, closedPositions] = await Promise.all([
      getAllTrades(),
      getActiveTrades(userId),
      getClosedPositions(userId),
    ]);

    // Filter trades by userId
    const userTrades = trades.filter(t => t.userId === userId || !t.userId);
    
    const now = new Date();
    const todayStart = getESTStartOfDay(now);
    const weekStart = getESTStartOfWeek(now);
    const monthStart = getESTStartOfMonth(now);

    // Calculate active trades stats
    const activeTradesCount = activeTrades.length;
    const activeTradesValue = activeTrades.reduce((sum, t) => sum + (t.positionValue || 0), 0);
    const activeTradesPnL = activeTrades.reduce((sum, t) => sum + (t.unrealizedPnL || 0), 0);

    // Calculate closed trades stats
    const closedTrades = userTrades.filter(t => t.status === TradeStatus.CLOSED);
    const totalClosedTrades = closedTrades.length;

    // Calculate P&L stats
    const winningTrades = closedTrades.filter(t => (t.netPnL || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.netPnL || 0) < 0);
    const breakevenTrades = closedTrades.filter(t => (t.netPnL || 0) === 0);

    const grossProfit = winningTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0));
    const totalPnL = grossProfit - grossLoss;

    const winRate = totalClosedTrades > 0 ? (winningTrades.length / totalClosedTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const averageWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
    const averageTrade = totalClosedTrades > 0 ? totalPnL / totalClosedTrades : 0;

    // Calculate period stats (today, week, month)
    const isInPeriod = (trade: Trade, startDate: Date) => {
      const tradeDate = new Date(trade.exitDate || trade.entryDate);
      return tradeDate >= startDate;
    };

    const todayTrades = closedTrades.filter(t => isInPeriod(t, todayStart));
    const todayPnL = todayTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
    const todayWinRate = todayTrades.length > 0 
      ? (todayTrades.filter(t => (t.netPnL || 0) > 0).length / todayTrades.length) * 100 
      : 0;

    const weeklyTrades = closedTrades.filter(t => isInPeriod(t, weekStart));
    const weeklyPnL = weeklyTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
    const weeklyWinRate = weeklyTrades.length > 0 
      ? (weeklyTrades.filter(t => (t.netPnL || 0) > 0).length / weeklyTrades.length) * 100 
      : 0;

    const monthlyTrades = closedTrades.filter(t => isInPeriod(t, monthStart));
    const monthlyPnL = monthlyTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
    const monthlyWinRate = monthlyTrades.length > 0 
      ? (monthlyTrades.filter(t => (t.netPnL || 0) > 0).length / monthlyTrades.length) * 100 
      : 0;

    // Calculate streaks
    const { currentWinStreak, currentLossStreak, maxWinStreak, maxLossStreak } = calculateStreaks(userTrades);

    // Find best and worst trades
    const sortedByPnL = [...closedTrades].sort((a, b) => (b.netPnL || 0) - (a.netPnL || 0));
    const bestTrade = sortedByPnL.length > 0 && sortedByPnL[0].netPnL! > 0
      ? { symbol: sortedByPnL[0].symbol, pnl: sortedByPnL[0].netPnL! }
      : null;
    const worstTrade = sortedByPnL.length > 0 && sortedByPnL[sortedByPnL.length - 1].netPnL! < 0
      ? { symbol: sortedByPnL[sortedByPnL.length - 1].symbol, pnl: sortedByPnL[sortedByPnL.length - 1].netPnL! }
      : null;

    // Find last trade
    const lastTrade = [...closedTrades].sort((a, b) => 
      new Date(b.exitDate || b.entryDate).getTime() - new Date(a.exitDate || a.entryDate).getTime()
    )[0];
    const lastTradeDate = lastTrade ? (lastTrade.exitDate || lastTrade.entryDate) : null;
    const lastTradePnL = lastTrade ? lastTrade.netPnL || null : null;

    const stats: OverviewStats = {
      activeTradesCount,
      activeTradesValue,
      activeTradesPnL,
      totalTrades: userTrades.length,
      totalClosedTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      breakevenTrades: breakevenTrades.length,
      winRate,
      totalPnL,
      grossProfit,
      grossLoss,
      profitFactor,
      averageWin,
      averageLoss,
      averageTrade,
      todayTrades: todayTrades.length,
      todayPnL,
      todayWinRate,
      weeklyTrades: weeklyTrades.length,
      weeklyPnL,
      weeklyWinRate,
      monthlyTrades: monthlyTrades.length,
      monthlyPnL,
      monthlyWinRate,
      currentWinStreak,
      currentLossStreak,
      maxWinStreak,
      maxLossStreak,
      lastTradeDate,
      lastTradePnL,
      bestTrade,
      worstTrade,
    };

    return NextResponse.json({ success: true, data: stats });

  } catch (error) {
    console.error('Error fetching overview stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch overview stats' },
      { status: 500 }
    );
  }
}
