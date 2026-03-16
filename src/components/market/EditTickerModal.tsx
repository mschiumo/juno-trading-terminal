'use client';

import { useState, useEffect } from 'react';
import { X, Trash2, Save, TrendingUp, TrendingDown, FileText, Tag } from 'lucide-react';
import type { MarketWatchlistItem, WatchlistItemType } from '@/types/market-watchlist';

interface EditTickerModalProps {
  item: MarketWatchlistItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: MarketWatchlistItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const TYPE_OPTIONS: { value: WatchlistItemType; label: string; color: string }[] = [
  { value: 'stock', label: 'Stock', color: 'text-[#ff6b35]' },
  { value: 'index', label: 'Index', color: 'text-blue-400' },
  { value: 'crypto', label: 'Crypto', color: 'text-orange-400' },
  { value: 'commodity', label: 'Commodity', color: 'text-yellow-400' },
];

export default function EditTickerModal({ 
  item, 
  isOpen, 
  onClose, 
  onSave,
  onDelete 
}: EditTickerModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');
  const [type, setType] = useState<WatchlistItemType>('stock');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setDisplayName(item.displayName || item.name || '');
      setNotes(item.notes || '');
      setType(item.type);
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    setIsLoading(true);
    try {
      const updatedItem: MarketWatchlistItem = {
        ...item,
        displayName: displayName.trim() || undefined,
        notes: notes.trim() || undefined,
        type,
      };

      await onSave(updatedItem);
      onClose();
    } catch (err) {
      console.error('Error saving item:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    setIsLoading(true);
    try {
      await onDelete(item.id);
      onClose();
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Watchlist Item</h2>
            <p className="text-sm text-[#ff6b35] font-medium">{item.symbol}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#8b949e] hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Symbol Display */}
          <div className="p-4 bg-[#161b22] rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-[#ff6b35]/10 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold text-[#ff6b35]">{item.symbol.slice(0, 2)}</span>
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{item.symbol}</div>
              <div className="text-sm text-[#8b949e]">{item.name}</div>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-[#8b949e] mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Display Name (optional)
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={item.name}
              className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-colors"
            />
            <p className="mt-1 text-xs text-[#6e7681]">
              Customize how this symbol appears in your watchlist
            </p>
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-[#8b949e] mb-2">
              Asset Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  className={`p-3 rounded-lg border transition-colors text-left ${
                    type === option.value
                      ? 'border-[#ff6b35] bg-[#ff6b35]/10'
                      : 'border-[#30363d] hover:border-[#8b949e]'
                  }`}
                >
                  <span className={`text-sm font-medium ${option.color}`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#8b949e] mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes about this symbol..."
              rows={3}
              className="w-full px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-white placeholder-[#6e7681] focus:outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35] transition-colors resize-none"
            />
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400 mb-3">
                Are you sure you want to remove <strong>{item.symbol}</strong> from your watchlist?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 text-sm text-[#8b949e] hover:text-white hover:bg-[#262626] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>Removing...</>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 border border-dashed border-red-400/30 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Remove from Watchlist
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#262626] bg-[#161b22]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[#8b949e] hover:text-white hover:bg-[#262626] rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-[#ff6b35] hover:bg-[#ea580c] disabled:bg-[#262626] text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
          >
            {isLoading ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
