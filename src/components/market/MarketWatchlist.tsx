'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  GripVertical, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  Bitcoin,
  DollarSign,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Search
} from 'lucide-react';
import type { MarketWatchlistItem } from '@/types/market-watchlist';
import AddTickerModal from './AddTickerModal';
import EditTickerModal from './EditTickerModal';

// Default user ID (can be made dynamic with auth later)
const DEFAULT_USER_ID = 'default';

interface MarketWatchlistProps {
  className?: string;
}

export default function MarketWatchlist({ className = '' }: MarketWatchlistProps) {
  const [watchlist, setWatchlist] = useState<MarketWatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketWatchlistItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<MarketWatchlistItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch watchlist
  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/market-watchlist?userId=${DEFAULT_USER_ID}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setWatchlist(result.data);
      } else {
        setError(result.error || 'Failed to fetch watchlist');
      }
    } catch (err) {
      setError('Failed to fetch watchlist');
      console.error('Error fetching watchlist:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Add new ticker
  const handleAddTicker = async (symbol: string, type?: string, displayName?: string) => {
    try {
      const response = await fetch(`/api/market-watchlist?userId=${DEFAULT_USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol, 
          type,
          displayName 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add ticker');
      }

      if (result.success) {
        setWatchlist(prev => [...prev, result.data]);
      }
    } catch (err) {
      throw err;
    }
  };

  // Update ticker
  const handleUpdateTicker = async (updatedItem: MarketWatchlistItem) => {
    try {
      const response = await fetch(`/api/market-watchlist/${updatedItem.id}?userId=${DEFAULT_USER_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update ticker');
      }

      if (result.success) {
        setWatchlist(prev => 
          prev.map(item => item.id === updatedItem.id ? result.data : item)
        );
      }
    } catch (err) {
      console.error('Error updating ticker:', err);
      throw err;
    }
  };

  // Delete ticker
  const handleDeleteTicker = async (id: string) => {
    try {
      const response = await fetch(`/api/market-watchlist/${id}?userId=${DEFAULT_USER_ID}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete ticker');
      }

      if (result.success) {
        setWatchlist(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error('Error deleting ticker:', err);
      throw err;
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, item: MarketWatchlistItem, index: number) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    // Set drag image offset for better UX
    e.dataTransfer.setData('text/plain', index.toString());
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedItem) return;

    const sourceIndex = watchlist.findIndex(item => item.id === draggedItem.id);
    if (sourceIndex === -1 || sourceIndex === targetIndex) {
      setDraggedItem(null);
      return;
    }

    // Optimistically update UI
    const newWatchlist = [...watchlist];
    const [movedItem] = newWatchlist.splice(sourceIndex, 1);
    newWatchlist.splice(targetIndex, 0, movedItem);
    
    // Update order values
    newWatchlist.forEach((item, index) => {
      item.order = index;
    });
    
    setWatchlist(newWatchlist);

    // Send to API
    try {
      const response = await fetch(`/api/market-watchlist/reorder?userId=${DEFAULT_USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          itemId: draggedItem.id, 
          newIndex: targetIndex 
        }),
      });

      if (!response.ok) {
        // Revert on error
        fetchWatchlist();
      }
    } catch (err) {
      console.error('Error reordering:', err);
      // Revert on error
      fetchWatchlist();
    } finally {
      setDraggedItem(null);
    }
  };

  // Handle edit click
  const handleEditClick = (item: MarketWatchlistItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'crypto':
        return <Bitcoin className="w-4 h-4 text-orange-400" />;
      case 'index':
        return <BarChart3 className="w-4 h-4 text-blue-400" />;
      case 'commodity':
        return <DollarSign className="w-4 h-4 text-yellow-400" />;
      default:
        return <TrendingUp className="w-4 h-4 text-[#ff6b35]" />;
    }
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'crypto':
        return 'Crypto';
      case 'index':
        return 'Index';
      case 'commodity':
        return 'Commodity';
      default:
        return 'Stock';
    }
  };

  // Format date
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const existingSymbols = watchlist.map(item => item.symbol.toUpperCase());

  return (
    <>
      <div className={`bg-[#0d1117] rounded-xl border border-[#30363d] ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-[#ff6b35]/10 rounded-lg">
              <BarChart3 className="w-4 h-4 text-[#ff6b35]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">My Watchlist</h3>
              <p className="text-xs text-[#8b949e]">{watchlist.length} symbols</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchWatchlist}
              disabled={loading}
              className="p-2 text-[#8b949e] hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6b35] hover:bg-[#ea580c] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 bg-red-500/10 border-b border-red-500/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs text-red-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Watchlist Items */}
        <div className="divide-y divide-[#30363d]">
          {watchlist.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[#262626] flex items-center justify-center">
                <Search className="w-6 h-6 text-[#6e7681]" />
              </div>
              <h4 className="text-white font-medium mb-2">No symbols in watchlist</h4>
              <p className="text-sm text-[#8b949e] mb-4">
                Add stocks, indices, crypto, or commodities to track
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-[#ff6b35] hover:bg-[#ea580c] text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Your First Symbol
              </button>
            </div>
          ) : (
            watchlist.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`group flex items-center gap-3 px-4 py-3 hover:bg-[#161b22] transition-colors ${
                  dragOverIndex === index ? 'bg-[#ff6b35]/10 border-y border-[#ff6b35]/30' : ''
                } ${draggedItem?.id === item.id ? 'opacity-50' : ''}`}
              >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-[#6e7681] hover:text-[#8b949e]">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Icon */}
                <div className="p-1.5 bg-[#0d1117] rounded-lg">
                  {getTypeIcon(item.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{item.symbol}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#262626] rounded text-[#8b949e]">
                      {getTypeLabel(item.type)}
                    </span>
                  </div>
                  <div className="text-sm text-[#8b949e] truncate">
                    {item.displayName || item.name || item.symbol}
                  </div>
                  {item.notes && (
                    <div className="text-xs text-[#6e7681] mt-0.5 truncate">
                      {item.notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <a
                    href={`https://www.tradingview.com/chart/?symbol=${item.symbol}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#8b949e] hover:text-[#ff6b35] hover:bg-[#ff6b35]/10 rounded-lg transition-colors"
                    title="View on TradingView"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleEditClick(item)}
                    className="p-2 text-[#8b949e] hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTicker(item.id)}
                    className="p-2 text-[#8b949e] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {watchlist.length > 0 && (
          <div className="px-4 py-2 border-t border-[#30363d] text-xs text-[#6e7681] text-center">
            Drag items to reorder • Click edit to add notes
          </div>
        )}
      </div>

      {/* Modals */}
      <AddTickerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddTicker}
        existingSymbols={existingSymbols}
      />

      <EditTickerModal
        item={editingItem}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleUpdateTicker}
        onDelete={handleDeleteTicker}
      />
    </>
  );
}
