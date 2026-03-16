/**
 * Market Watchlist Types
 * 
 * Type definitions for the Market tab watchlist management feature
 * This is separate from the trading watchlist used for potential trades
 */

export type WatchlistItemType = 'stock' | 'index' | 'crypto' | 'commodity';

export interface MarketWatchlistItem {
  id: string;
  symbol: string;
  name?: string;
  type: WatchlistItemType;
  addedAt: string;
  order: number;
  notes?: string;
  displayName?: string;
}

export interface MarketWatchlistData {
  items: MarketWatchlistItem[];
  lastUpdated: string;
}

// API Response types
export interface WatchlistApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Polygon API types for ticker validation
export interface PolygonTickerResult {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange?: string;
  type?: string;
  active?: boolean;
  currency_name?: string;
  cik?: string;
  composite_figi?: string;
  share_class_figi?: string;
  last_updated_utc?: string;
}

export interface PolygonTickersResponse {
  results?: PolygonTickerResult[];
  status: string;
  request_id: string;
  count?: number;
  next_url?: string;
}

export interface PolygonTickerDetails {
  ticker: string;
  name: string;
  description?: string;
  market: string;
  locale: string;
  primary_exchange?: string;
  type?: string;
  active?: boolean;
  currency_name?: string;
  cik?: string;
  composite_figi?: string;
  share_class_figi?: string;
  phone_number?: string;
  address?: {
    address1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  branding?: {
    logo_url?: string;
    icon_url?: string;
  };
  homepage_url?: string;
  total_employees?: number;
  list_date?: string;
  sic_code?: string;
  sic_description?: string;
  share_class_shares_outstanding?: number;
  weighted_shares_outstanding?: number;
  round_lot?: number;
}

export interface PolygonTickerDetailsResponse {
  results?: PolygonTickerDetails;
  status: string;
  request_id: string;
}
