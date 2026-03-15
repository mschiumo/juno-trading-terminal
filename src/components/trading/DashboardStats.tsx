'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Target, Percent, Activity, BarChart3, Loader2, AlertCircle } from 'lucide-react';

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

interface DashboardStatsProps {
  onAddTrade: () => void;
}

export default function DashboardStats({ onAddTrade }: DashboardStatsProps) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchStats();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/overview?userId=default');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.error || 'Failed to fetch stats');
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        {/* Quick Add Button */}
        <div className="flex justify-end">
          <button
            onClick={onAddTrade}
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#ea580c] text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Trade
          </button>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#ff6b35] animate-spin" />
            <p className="text-[#8b949e]">Loading trading stats...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={onAddTrade}
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#ea580c] text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Trade
          </button>
        </div>

        <div className="flex flex-col items-center justify-center h-64 p-6 bg-[#161b22] border border-[#30363d] rounded-xl">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Stats</h3>
          <p className="text-[#8b949e] mb-4">{error}</p>
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-[#ff6b35] text-white rounded-lg hover:bg-[#ea580c] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#ff6b35]" />
          <h2 className="text-lg font-semibold text-white">Trading Overview</h2>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[#8b949e]">
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={onAddTrade}
            className="flex items-center gap-2 px-4 py-2 bg-[#F97316] hover:bg-[#ea580c] text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Trade
          </button>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total P&L"
          value={formatCurrency(stats.totalPnL)}
          subValue={formatPercent(stats.totalPnL > 0 ? stats.winRate : 0)}
          subLabel="Win Rate"
          icon={DollarSign}
          color={stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}
          bgColor={stats.totalPnL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
        />
        <StatCard
          title="Win Rate"
          value={formatPercent(stats.winRate)}
          subValue={`${stats.winningTrades}W / ${stats.losingTrades}L`}
          subLabel="Record"
          icon={Percent}
          color={stats.winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}
          bgColor={stats.winRate >= 50 ? 'bg-green-500/10' : 'bg-yellow-500/10'}
        />
        
        <StatCard
          title="Total Trades"
          value={stats.totalTrades.toString()}
          subValue={stats.activeTradesCount > 0 ? `${stats.activeTradesCount} active` : 'All closed'}
          subLabel={stats.activeTradesCount > 0 ? 'Positions' : 'Status'}
          icon={Target}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        
        <StatCard
          title="Profit Factor"
          value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          subValue={formatCurrency(stats.averageTrade)}
          subLabel="Avg Trade"
          icon={Activity}
          color={stats.profitFactor >= 1 ? 'text-green-400' : 'text-red-400'}
          bgColor={stats.profitFactor >= 1 ? 'bg-green-500/10' : 'bg-red-500/10'}
        />
      </div>

      {/* Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PeriodCard
          title="Today"
          trades={stats.todayTrades}
          pnl={stats.todayPnL}
          winRate={stats.todayWinRate}
        />
        <PeriodCard
          title="This Week"
          trades={stats.weeklyTrades}
          pnl={stats.weeklyPnL}
          winRate={stats.weeklyWinRate}
        />
        <PeriodCard
          title="This Month"
          trades={stats.monthlyTrades}
          pnl={stats.monthlyPnL}
          winRate={stats.monthlyWinRate}
        />
      </div>

      {/* Active Trades & Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Trades Panel */}
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#ff6b35]" />
            <h3 className="font-semibold text-white">Active Trades</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#8b949e]">Positions</p>
              <p className="text-2xl font-bold text-white">{stats.activeTradesCount}</p>
            </div>
            <div>
              <p className="text-sm text-[#8b949e]">Unrealized P&L</p>
              <p className={`text-2xl font-bold ${stats.activeTradesPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.activeTradesPnL)}
              </p>
            </div>
          </div>
          
          {stats.activeTradesCount > 0 && (
            <div className="mt-4 pt-4 border-t border-[#30363d]">
              <p className="text-xs text-[#8b949e]">
                Position Value: <span className="text-white">{formatCurrency(stats.activeTradesValue)}</span>
              </p>
            </div>
          )}
        </div>

        {/* Streaks Panel */}
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[#ff6b35]" />
            <h3 className="font-semibold text-white">Streaks</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#8b949e]">Current Win Streak</p>
              <p className="text-2xl font-bold text-green-400">{stats.currentWinStreak}</p>
            </div>
            <div>
              <p className="text-sm text-[#8b949e]">Current Loss Streak</p>
              <p className="text-2xl font-bold text-red-400">{stats.currentLossStreak}</p>
            </div>
            <div>
              <p className="text-sm text-[#8b949e]">Max Win Streak</p>
              <p className="text-xl font-semibold text-green-400">{stats.maxWinStreak}</p>
            </div>
            <div>
              <p className="text-sm text-[#8b949e]">Max Loss Streak</p>
              <p className="text-xl font-semibold text-red-400">{stats.maxLossStreak}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Best/Worst Trades */}
      {(stats.bestTrade || stats.worstTrade) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.bestTrade && (
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Best Trade</span>
                </div>
                <span className="text-lg font-bold text-green-400">+{formatCurrency(stats.bestTrade.pnl)}</span>
              </div>
              <p className="text-xs text-[#8b949e] mt-1">{stats.bestTrade.symbol}</p>
            </div>
          )}
          
          {stats.worstTrade && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-red-400">Worst Trade</span>
                </div>
                <span className="text-lg font-bold text-red-400">{formatCurrency(stats.worstTrade.pnl)}</span>
              </div>
              <p className="text-xs text-[#8b949e] mt-1">{stats.worstTrade.symbol}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  title, 
  value, 
  subValue, 
  subLabel,
  icon: Icon, 
  color,
  bgColor,
}: { 
  title: string; 
  value: string; 
  subValue?: string;
  subLabel?: string;
  icon: typeof TrendingUp; 
  color: string;
  bgColor: string;
}) {
  return (
    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-xs text-[#8b949e]">{title}</span>
      </div>
      
      <p className={`text-2xl font-bold text-white mb-1`}>{value}</p>
      
      {subValue && subLabel && (
        <p className="text-xs text-[#8b949e]">
          <span className="text-white">{subValue}</span> {subLabel}
        </p>
      )}
    </div>
  );
}

// Period Card Component
function PeriodCard({ 
  title, 
  trades, 
  pnl, 
  winRate 
}: { 
  title: string; 
  trades: number; 
  pnl: number; 
  winRate: number;
}) {
  return (
    <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl">
      <h4 className="text-sm font-medium text-[#8b949e] mb-3">{title}</h4>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#8b949e]">Trades</p>
          <p className="text-lg font-semibold text-white">{trades}</p>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-[#8b949e]">P&L</p>
          <p className={`text-lg font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnl >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(pnl)}
          </p>
        </div>
      </div>
      
      {trades > 0 && (
        <div className="mt-3 pt-3 border-t border-[#30363d]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#8b949e]">Win Rate</span>
            <span className={`text-xs font-medium ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {winRate.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-[#30363d] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${winRate >= 50 ? 'bg-green-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min(winRate, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
