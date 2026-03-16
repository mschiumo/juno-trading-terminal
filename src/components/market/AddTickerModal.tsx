'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, Bitcoin } from 'lucide-react';
import type { PolygonTickerResult } from '@/types/market-watchlist';

interface AddTickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (symbol: string, type?: string, displayName?: string) => Promise<void>;
  existingSymbols: string[];
}

export default function AddTickerModal({ 
  isOpen, 
  onClose, 
  onAdd,
  existingSymbols 
}: AddTickerModalProps) {
  const [symbol, setSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<PolygonTickerResult[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<PolygonTickerResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSymbol('');
      setError(null);
      setSearchResults([]);
      setSelectedTicker(null);
    }
  }, [isOpen]);

  // Debounced search function
  const searchTickers = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/market-watchlist/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSearchResults(data.data);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle input change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTickers(symbol.toUpperCase());
    }, 300);

    return () => clearTimeout(timer);
  }, [symbol, searchTickers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!symbol.trim()) {
      setError('Please enter a symbol');
      return;
    }

    const cleanSymbol = symbol.trim().toUpperCase();

    // Check for duplicates
    if (existingSymbols.includes(cleanSymbol)) {
      setError(`${cleanSymbol} is already in your watchlist`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onAdd(
        cleanSymbol, 
        selectedTicker ? getAssetType(selectedTicker) : undefined,
        selectedTicker?.name
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add symbol');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTicker = (ticker: PolygonTickerResult) => {
    setSelectedTicker(ticker);
    setSymbol(ticker.ticker);
    setSearchResults([]);
  };

  const getAssetType = (ticker: PolygonTickerResult): string => {
    const type = (ticker.type || '').toUpperCase();
    const name = (ticker.name || '').toLowerCase();
    
    if (type === 'ETF' || type === 'ETN') {
      if (name.includes('gold') || name.includes('silver') || 
          name.includes('commodity') || name.includes('oil')) {
        return 'commodity';
      }
      if (name.includes('s&p') || name.includes('nasdaq') || name.includes('dow')) {
        return 'index';
      }
    }
    
    if (type === 'CRYPTO') return 'crypto';
    if (type === 'INDEX') return 'index';
    
    return 'stock';
  };

  const getTypeIcon = (type?: string) => {
    switch (type?.toUpperCase()) {
      case 'CRYPTO':
        return <Bitcoin className="w-4 h-4 text-orange-400" />;
      case 'INDEX':
        return <BarChart3 className="w-4 h-4 text-blue-400" />;
      case 'ETF':
      case 'ETN':
        return <DollarSign className="w-4 h-4 text-green-400" />;
      default:
        return <TrendingUp className="w-4 h-4 text-[#ff6b35]" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div>
            <h2 className="text-lg font-semibold text-white">Add to Watchlist</h2>
            <p className="text-sm text-[#8b949e]">Search and add stocks, indices, crypto, or commodities</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#8b949e] hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-[#8b949e] mb-2">
                Ticker Symbol
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6e7681]" />
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL, BTC, SPY..."
                  className="w-full pl-10 pr-4 py-3 bg-[#161b22] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-colors uppercase"
                  autoFocus
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#ff6b35] animate-spin" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {searchResults.map((ticker) => (
                    <button
                      key={ticker.ticker}
                      type="button"
                      onClick={() => handleSelectTicker(ticker)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#262626] transition-colors text-left border-b border-[#30363d] last:border-0"
                    >
                      {getTypeIcon(ticker.type)}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white">{ticker.ticker}</div>
                        <div className="text-sm text-[#8b949e] truncate">{ticker.name}</div>
                      </div>
                      <span className="text-xs text-[#6e7681] uppercase">
                        {ticker.type || 'Stock'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Ticker Info */}
            {selectedTicker && (
              <div className="p-4 bg-[#ff6b35]/10 border border-[#ff6b35]/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#ff6b35]/20 rounded-lg">
                    {getTypeIcon(selectedTicker.type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white">{selectedTicker.ticker}</div>
                    <div className="text-sm text-[#8b949e]">{selectedTicker.name}</div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-[#262626] rounded-full text-[#8b949e]">
                    {selectedTicker.primary_exchange || selectedTicker.market}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !symbol.trim()}
              className="w-full py-3 bg-[#ff6b35] hover:bg-[#ea580c] disabled:bg-[#262626] disabled:text-[#6e7681] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  Add to Watchlist
                </>
              )}
            </button>
          </form>

          {/* Quick Add Suggestions */}
          <div className="mt-6 pt-6 border-t border-[#262626]">
            <p className="text-sm text-[#8b949e] mb-3">Popular symbols</p>
            <div className="flex flex-wrap gap-2">
              {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BTC', 'ETH'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    setSymbol(sym);
                    setSearchResults([]);
                  }}
                  disabled={existingSymbols.includes(sym)}
                  className="px-3 py-1.5 text-sm bg-[#161b22] border border-[#30363d] rounded-lg text-white hover:border-[#ff6b35] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sym}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
