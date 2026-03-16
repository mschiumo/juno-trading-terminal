/**
 * Polygon API Utilities
 * 
 * Functions for validating tickers and fetching ticker details from Polygon.io
 */

import type { 
  PolygonTickersResponse, 
  PolygonTickerDetailsResponse,
  PolygonTickerResult 
} from '@/types/market-watchlist';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const POLYGON_BASE_URL = 'https://api.polygon.io';

/**
 * Validate that a Polygon API key is configured
 */
export function hasPolygonApiKey(): boolean {
  return !!POLYGON_API_KEY;
}

/**
 * Search for tickers by symbol prefix
 * Used for autocomplete/typeahead functionality
 */
export async function searchTickers(
  query: string, 
  limit: number = 10
): Promise<PolygonTickerResult[]> {
  if (!POLYGON_API_KEY) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  try {
    const url = new URL(`${POLYGON_BASE_URL}/v3/reference/tickers`);
    url.searchParams.append('search', query);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('apiKey', POLYGON_API_KEY);
    // Only active tickers
    url.searchParams.append('active', 'true');
    
    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Polygon API rate limit exceeded');
      }
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data: PolygonTickersResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching tickers:', error);
    throw error;
  }
}

/**
 * Get detailed information about a specific ticker
 */
export async function getTickerDetails(
  symbol: string
): Promise<PolygonTickerResult | null> {
  if (!POLYGON_API_KEY) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  try {
    const url = `${POLYGON_BASE_URL}/v3/reference/tickers/${symbol.toUpperCase()}?apiKey=${POLYGON_API_KEY}`;
    
    const response = await fetch(url, {
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (response.status === 404) {
      return null; // Ticker not found
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Polygon API rate limit exceeded');
      }
      throw new Error(`Polygon API error: ${response.status}`);
    }

    const data: PolygonTickerDetailsResponse = await response.json();
    
    if (!data.results) {
      return null;
    }

    // Convert to PolygonTickerResult format
    return {
      ticker: data.results.ticker,
      name: data.results.name,
      market: data.results.market,
      locale: data.results.locale,
      primary_exchange: data.results.primary_exchange,
      type: data.results.type,
      active: data.results.active,
      currency_name: data.results.currency_name,
      cik: data.results.cik,
      composite_figi: data.results.composite_figi,
      share_class_figi: data.results.share_class_figi,
      last_updated_utc: data.results.list_date,
    };
  } catch (error) {
    console.error('Error fetching ticker details:', error);
    throw error;
  }
}

/**
 * Validate if a ticker symbol exists
 * Returns the ticker info if valid, null if not found
 */
export async function validateTicker(
  symbol: string
): Promise<{ valid: boolean; ticker?: PolygonTickerResult; error?: string }> {
  if (!POLYGON_API_KEY) {
    return { 
      valid: false, 
      error: 'Polygon API key not configured' 
    };
  }

  // Basic validation
  if (!symbol || symbol.trim().length === 0) {
    return { 
      valid: false, 
      error: 'Symbol is required' 
    };
  }

  // Remove any whitespace and convert to uppercase
  const cleanSymbol = symbol.trim().toUpperCase();

  // Check for invalid characters
  if (!/^[A-Z0-9.-]+$/.test(cleanSymbol)) {
    return { 
      valid: false, 
      error: 'Symbol contains invalid characters' 
    };
  }

  try {
    const tickerInfo = await getTickerDetails(cleanSymbol);
    
    if (!tickerInfo) {
      return { 
        valid: false, 
        error: `Symbol '${cleanSymbol}' not found` 
      };
    }

    if (!tickerInfo.active) {
      return { 
        valid: false, 
        error: `Symbol '${cleanSymbol}' is not active` 
      };
    }

    return { 
      valid: true, 
      ticker: tickerInfo 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { 
      valid: false, 
      error: `Failed to validate symbol: ${errorMessage}` 
    };
  }
}

/**
 * Determine the type of asset based on ticker info
 */
export function determineAssetType(
  tickerInfo: PolygonTickerResult
): 'stock' | 'index' | 'crypto' | 'commodity' {
  const type = (tickerInfo.type || '').toUpperCase();
  const name = (tickerInfo.name || '').toLowerCase();
  
  // Check for ETFs that track commodities
  if (type === 'ETF' || type === 'ETN') {
    if (name.includes('gold') || name.includes('silver') || 
        name.includes('commodity') || name.includes('oil') ||
        name.includes('gas') || name.includes('copper') ||
        name.includes('palladium') || name.includes('platinum')) {
      return 'commodity';
    }
    // Index ETFs
    if (name.includes('s&p') || name.includes('nasdaq') || 
        name.includes('dow') || name.includes('index')) {
      return 'index';
    }
  }
  
  // Crypto
  if (type === 'CRYPTO' || tickerInfo.market === 'crypto') {
    return 'crypto';
  }
  
  // Index
  if (type === 'INDEX' || tickerInfo.market === 'indices') {
    return 'index';
  }
  
  // Default to stock
  return 'stock';
}
