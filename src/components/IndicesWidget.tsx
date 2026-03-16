'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, BarChart3 } from 'lucide-react';

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  status: 'up' | 'down';
}

interface IndicesData {
  data: IndexData[];
  timestamp: string;
  source: 'live' | 'fallback' | 'cache';
  provider: string;
  cached: boolean;
}

const REFRESH_INTERVAL = 60000; // 60 seconds to stay under Polygon's 5 calls/minute limit

export default function IndicesWidget() {
  const [data, setData] = useState<IndicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextRefresh, setNextRefresh] = useState(REFRESH_INTERVAL);
  const [error, setError] = useState<string | null>(null);

  const fetchIndices = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/indices');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setData(result);
        setLastUpdated(new Date());
        setNextRefresh(REFRESH_INTERVAL);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      console.error('Failed to fetch indices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchIndices();
  }, [fetchIndices]);

  // Auto-refresh interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchIndices();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchIndices]);

  // Countdown timer for next refresh
  useEffect(() => {
    const countdownId = setInterval(() => {
      setNextRefresh((prev) => {
        if (prev <= 1000) {
          return REFRESH_INTERVAL;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(countdownId);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCountdown = () => {
    const seconds = Math.ceil(nextRefresh / 1000);
    return `${seconds}s`;
  };

  // Skeleton loader
  if (loading && !data) {
    return (
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#0d1117]/50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#30363d] rounded animate-pulse"></div>
            <div className="w-32 h-5 bg-[#30363d] rounded animate-pulse"></div>
          </div>
          <div className="w-16 h-4 bg-[#30363d] rounded animate-pulse"></div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
                <div className="w-12 h-4 bg-[#30363d] rounded animate-pulse mb-2"></div>
                <div className="w-24 h-6 bg-[#30363d] rounded animate-pulse mb-2"></div>
                <div className="w-16 h-4 bg-[#30363d] rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const indices = data?.data || [];

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] bg-[#0d1117]/50">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-[#F97316]" />
          <h3 className="text-lg font-semibold text-white">Market Indices</h3>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-[#8b949e] hidden sm:inline">
              Next: {formatCountdown()}
            </span>
          )}
          <button
            onClick={fetchIndices}
            disabled={loading}
            className="p-2 hover:bg-[#30363d] rounded-lg transition-colors disabled:opacity-50"
            title="Refresh indices"
          >
            <RefreshCw className={`w-4 h-4 text-[#8b949e] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error ? (
          <div className="text-center py-4 text-[#da3633] text-sm">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {indices.map((index) => (
              <a
                key={index.symbol}
                href={`https://www.tradingview.com/chart/?symbol=${index.symbol}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[#0d1117] rounded-lg p-4 border border-[#30363d] hover:border-[#F97316]/50 transition-all"
              >
                {/* Symbol and Name */}
                <div className="flex items-center gap-2 mb-3">
                  {index.change >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-[#da3633] flex-shrink-0" />
                  )}
                  <span className="font-bold text-white group-hover:text-[#F97316] transition-colors">
                    {index.symbol}
                  </span>
                </div>

                {/* Price */}
                <div className="text-2xl font-bold text-white mb-2">
                  {formatPrice(index.price)}
                </div>

                {/* Change */}
                <div className="flex items-center gap-2"
                >
                  <span
                    className={`text-sm font-medium ${
                      index.change >= 0 ? 'text-[#22c55e]' : 'text-[#da3633]'
                    }`}
                  >
                    {index.change >= 0 ? '+' : ''}{index.change.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      index.changePercent >= 0
                        ? 'bg-[#22c55e]/20 text-[#22c55e]'
                        : 'bg-[#da3633]/20 text-[#da3633]'
                    }`}
                  >
                    {index.changePercent >= 0 ? '+' : ''}{index.changePercent.toFixed(2)}%
                  </span>
                </div>

                {/* Full name - visible on hover */}
                <div className="mt-2 text-xs text-[#8b949e] opacity-0 group-hover:opacity-100 transition-opacity">
                  {index.name}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-xs text-[#8b949e]">
          <span>
            {data?.source === 'live' && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
                Live data
              </span>
            )}
            {data?.source === 'fallback' && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d29922]"></span>
                Demo data
              </span>
            )}
            {data?.source === 'cache' && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]"></span>
                Cached
              </span>
            )}
          </span>
          <span>
            {lastUpdated && `Updated ${formatLastUpdated()}`}
          </span>
        </div>
      </div>
    </div>
  );
}
