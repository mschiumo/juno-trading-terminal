import { NextResponse } from 'next/server';

interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  status: 'up' | 'down';
}

// Index name mappings
const indexNames: Record<string, string> = {
  'DIA': 'Dow Jones ETF',
  'SPY': 'S&P 500 ETF',
  'QQQ': 'NASDAQ ETF'
};

// In-memory cache
let cachedData: IndexData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds in milliseconds

/**
 * Fetches stock/ETF data from Polygon.io API
 * Requires POLYGON_API_KEY environment variable
 * Free tier: 5 calls/minute
 */
async function fetchPolygonSnapshot(symbol: string): Promise<IndexData | null> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    console.warn('POLYGON_API_KEY not set');
    return null;
  }

  try {
    const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apiKey=${apiKey}`;
    
    const response = await fetch(url, {
      next: { revalidate: 30 } // Cache for 30 seconds
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`Polygon rate limit exceeded for ${symbol}`);
      } else {
        console.warn(`Polygon error for ${symbol}: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();
    
    if (!data.ticker) {
      return null;
    }

    const ticker = data.ticker;
    const dayData = ticker.day;
    const prevDayData = ticker.prevDay;
    
    const price = dayData?.c || ticker.lastQuote?.P || 0;
    const prevClose = prevDayData?.c || ticker.prevDay?.c || price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    if (price > 0) {
      return {
        symbol: symbol,
        name: indexNames[symbol] || symbol,
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        status: change >= 0 ? 'up' : 'down'
      };
    }

    return null;
  } catch (error) {
    console.error(`Polygon error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches indices from Polygon with fallback to Finnhub
 */
async function fetchIndicesData(): Promise<IndexData[]> {
  const symbols = ['DIA', 'SPY', 'QQQ'];
  const results: IndexData[] = [];

  // Try Polygon first
  const hasPolygonKey = !!process.env.POLYGON_API_KEY;
  
  if (hasPolygonKey) {
    console.log('Using Polygon API for indices data');
    const polygonResults = await Promise.all(
      symbols.map(symbol => fetchPolygonSnapshot(symbol))
    );
    
    for (const result of polygonResults) {
      if (result) {
        results.push(result);
      }
    }
  }

  // Fallback to Finnhub if Polygon returns no data
  if (results.length === 0) {
    console.log('Falling back to Finnhub for indices data');
    const finnhubResults = await fetchFinnhubIndices(symbols);
    results.push(...finnhubResults);
  }

  return results;
}

/**
 * Fallback: Fetch from Finnhub API
 */
async function fetchFinnhubIndices(symbols: string[]): Promise<IndexData[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.warn('FINNHUB_API_KEY not set');
    return getFallbackIndices();
  }

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
          { next: { revalidate: 30 } }
        );

        if (!response.ok) {
          console.warn(`Finnhub error for ${symbol}: ${response.status}`);
          return null;
        }

        const data = await response.json();
        const price = data.c || 0;
        const change = data.d || 0;
        const changePercent = data.dp || 0;

        if (price > 0) {
          return {
            symbol: symbol,
            name: indexNames[symbol] || symbol,
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            status: change >= 0 ? 'up' : 'down'
          };
        }
        return null;
      })
    );

    const validResults = results.filter((item): item is IndexData => item !== null);
    
    // If we got no valid results, return fallback
    if (validResults.length === 0) {
      return getFallbackIndices();
    }
    
    return validResults;
  } catch (error) {
    console.error('Finnhub indices error:', error);
    return getFallbackIndices();
  }
}

/**
 * Fallback mock data when all APIs fail
 */
function getFallbackIndices(): IndexData[] {
  return [
    { symbol: 'DIA', name: 'Dow Jones ETF', price: 448.92, change: 1.87, changePercent: 0.42, status: 'up' },
    { symbol: 'SPY', name: 'S&P 500 ETF', price: 595.32, change: 2.15, changePercent: 0.36, status: 'up' },
    { symbol: 'QQQ', name: 'NASDAQ ETF', price: 518.47, change: 3.21, changePercent: 0.62, status: 'up' }
  ];
}

export async function GET() {
  const timestamp = new Date().toISOString();
  
  // Check cache
  const now = Date.now();
  if (cachedData && (now - cacheTimestamp) < CACHE_TTL) {
    console.log('Returning cached indices data');
    return NextResponse.json({
      success: true,
      data: cachedData,
      timestamp,
      source: 'cache',
      cached: true
    });
  }

  try {
    const indices = await fetchIndicesData();
    
    // Update cache
    cachedData = indices;
    cacheTimestamp = now;
    
    // Determine data source
    const hasRealData = indices.length > 0 && indices.some(i => i.price > 0);
    const source = hasRealData ? 'live' : 'fallback';
    const provider = process.env.POLYGON_API_KEY ? 'polygon' : process.env.FINNHUB_API_KEY ? 'finnhub' : 'fallback';
    
    console.log(`Indices data: source=${source}, provider=${provider}, count=${indices.length}`);
    
    return NextResponse.json({
      success: true,
      data: indices,
      timestamp,
      source,
      provider,
      cached: false
    });
    
  } catch (error) {
    console.error('Indices API error:', error);
    const fallback = getFallbackIndices();
    
    return NextResponse.json({
      success: true,
      data: fallback,
      timestamp,
      source: 'fallback',
      provider: 'fallback',
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
