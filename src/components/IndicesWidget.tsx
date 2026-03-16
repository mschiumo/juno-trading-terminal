'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface IndexData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

interface IndicesData {
  data: IndexData[];
  timestamp: string;
  source: 'live' | 'fallback' | 'cache';
}

const REFRESH_INTERVAL = 60000; // 60 seconds
const INDICES = ['DIA', 'SPY', 'QQQ'];

export default function IndicesWidget() {
  const [data, setData] = useState<IndicesData | null>(null);
  const [loading, setLoading] = useState(true);
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

  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // Get indices data or empty array
  const indices = data?.data || [];
  
  // Create a map for quick lookup
  const indexMap = new Map(indices.map(i => [i.symbol, i]));

  return (
    <div className="flex items-center gap-2 py-1.5 px-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
      {/* Label */}
      <span className="text-[10px] uppercase tracking-wider text-[#8b949e] font-medium mr-1 hidden sm:inline">
        Indices
      </span>

      {/* Index Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {INDICES.map((symbol) => {
          const index = indexMap.get(symbol);
          
          if (loading && !index) {
            return (
              <div 
                key={symbol} 
                className="flex items-center gap-1.5 px-2 py-0.5 bg-[#161b22] rounded text-xs animate-pulse"
              >
                <span className="text-[#8b949e]">{symbol}</span>
                <span className="w-10 h-3 bg-[#30363d] rounded"></span>
              </div>
            );
          }
          
          if (!index) return null;
          
          const isPositive = index.changePercent >= 0;
          
          return (
            <a
              key={symbol}
              href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 bg-[#161b22] hover:bg-[#1f2937] rounded border border-[#30363d] hover:border-[#484f58] transition-colors text-xs"
            >
              {/* Symbol */}
              <span className="font-semibold text-white">{symbol}</span>
              
              {/* Divider */}
              <span className="text-[#484f58]">|</span>
              
              {/* Price */}
              <span className="text-[#c9d1d9] tabular-nums">
                ${formatPrice(index.price)}
              </span>
              
              {/* Change % with color */}
              <span 
                className={`tabular-nums font-medium ${
                  isPositive ? 'text-[#22c55e]' : 'text-[#da3633]'
                }`}
              >
                {isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%
              </span>
              
              {/* Trend icon */}
              {isPositive ? (
                <TrendingUp className="w-3 h-3 text-[#22c55e]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-[#da3633]" />
              )}
            </a>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-[#30363d] mx-1"></div>

      {/* Refresh button */}
      <button
        onClick={fetchIndices}
        disabled={loading}
        className="p-1 hover:bg-[#30363d] rounded transition-colors disabled:opacity-50"
        title="Refresh indices"
      >
        <RefreshCw className={`w-3 h-3 text-[#8b949e] ${loading ? 'animate-spin' : ''}`} />
      </button>

      {/* Source indicator dot */}
      {!error && data && (
        <div 
          className={`w-1.5 h-1.5 rounded-full ${
            data.source === 'live' ? 'bg-[#22c55e]' : 
            data.source === 'cache' ? 'bg-[#58a6ff]' : 'bg-[#d29922]'
          }`}
          title={data.source === 'live' ? 'Live data' : data.source === 'cache' ? 'Cached' : 'Demo data'}
        />
      )}
    </div>
  );
}
