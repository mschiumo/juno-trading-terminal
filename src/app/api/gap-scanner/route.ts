import { NextResponse } from 'next/server';
import { getStockUniverse, getStockInfoMap, StockInfo } from '@/lib/stock-universe';
import { getRedisClient } from '@/lib/redis';

interface GapStock {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  gapPercent: number;
  volume: number;
  marketCap: number;
  status: 'gainer' | 'loser';
}

interface ScanResult {
  success: boolean;
  data: {
    gainers: GapStock[];
    losers: GapStock[];
  };
  timestamp: string;
  source: string;
  scanned: number;
  found: number;
  isWeekend: boolean;
  tradingDate: string;
  previousDate: string;
  marketSession: string;
  marketStatus: string;
  isPreMarket: boolean;
  durationMs: number;
  debug: {
    apiKeyPresent: boolean;
    apiKeyLength: number;
    universeSize: number;
    skippedETF: number;
    skippedGap: number;
    skippedVolume: number;
    skippedPrice: number;
    skippedMarketCap: number;
    apiFailures: number;
    errors: string[];
  };
  filters: {
    minGapPercent: number;
    minVolume: number;
    maxPrice: number;
    minMarketCap: number;
    excludeETFs: boolean;
    excludeWarrants: boolean;
  };
}

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;

// Lazy check for API key
function getPolygonApiKey(): string {
  if (!POLYGON_API_KEY) {
    throw new Error('POLYGON_API_KEY environment variable is required');
  }
  return POLYGON_API_KEY;
}

// US Market Holidays 2026
const MARKET_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day
  '2026-02-16', // Presidents' Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas Day
];

function isMarketHoliday(dateStr: string): boolean {
  return MARKET_HOLIDAYS_2026.includes(dateStr);
}

function getLastTradingDate(date: Date = new Date()): string {
  // Start with yesterday
  const prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  
  // Keep going back until we find a trading day (not weekend, not holiday)
  while (prevDate.getDay() === 0 || prevDate.getDay() === 6 || isMarketHoliday(prevDate.toISOString().split('T')[0])) {
    prevDate.setDate(prevDate.getDate() - 1);
  }
  
  return prevDate.toISOString().split('T')[0];
}

// Market hours in EST
function getMarketSession(): {
  session: 'pre-market' | 'market-open' | 'post-market' | 'closed';
  isPreMarket: boolean;
  marketStatus: 'open' | 'closed';
} {
  const now = new Date();
  // Convert to EST (Eastern Time)
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = estTime.getHours();
  const minute = estTime.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  
  // Pre-market: 4:00 AM (240 min) to 9:30 AM (570 min)
  if (timeInMinutes >= 240 && timeInMinutes < 570) {
    return { session: 'pre-market', isPreMarket: true, marketStatus: 'open' };
  }
  
  // Market hours: 9:30 AM (570 min) to 4:00 PM (960 min)
  if (timeInMinutes >= 570 && timeInMinutes < 960) {
    return { session: 'market-open', isPreMarket: false, marketStatus: 'open' };
  }
  
  // Post-market: 4:00 PM (960 min) to 8:00 PM (1200 min)
  if (timeInMinutes >= 960 && timeInMinutes < 1200) {
    return { session: 'post-market', isPreMarket: false, marketStatus: 'open' };
  }
  
  // Closed (outside market hours)
  return { session: 'closed', isPreMarket: false, marketStatus: 'closed' };
}

// ETF patterns to exclude
const ETF_PATTERNS = [
  'SPY', 'QQQ', 'IWM', 'VTI', 'VOO', 'IVV', 'VEA', 'VWO', 'BND', 'AGG',
  'GLD', 'SLV', 'USO', 'UNG', 'TLT', 'IEF', 'SHY', 'LQD', 'HYG', 'EMB',
  'VIX', 'UVXY', 'SVXY', 'SQQQ', 'TQQQ', 'UPRO', 'SPXU', 'FAZ', 'FAS',
];

// Warrant/Unit/Right suffixes
const EXCLUDED_SUFFIXES = ['.WS', '.WSA', '.WSB', '.WT', '+', '^', '=', '/WS', '/WT', '.U', '.UN', '.R', '.RT'];

function isETFOrDerivative(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase();
  if (ETF_PATTERNS.includes(upperSymbol)) return true;
  for (const suffix of EXCLUDED_SUFFIXES) {
    if (upperSymbol.endsWith(suffix)) return true;
  }
  if (/[\/\^\+\=]/.test(symbol)) return true;
  if (/\.PR[A-Z]?$/.test(upperSymbol) || /-P[ABCDEF]?$/.test(upperSymbol)) return true;
  if (/\.[BC]$/.test(upperSymbol) && upperSymbol !== 'BRK.B') return true;
  return false;
}

/**
 * Get cached scan results from Redis
 */
async function getCachedResults(date: string): Promise<ScanResult | null> {
  try {
    const redis = getRedisClient();
    const key = `gap_scanner:${date}`;
    const data = await redis.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('[GapScanner] Failed to get cached results:', error);
    return null;
  }
}

/**
 * Store scan results in Redis
 */
async function storeScanResults(results: ScanResult): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `gap_scanner:${results.tradingDate}`;
    await redis.set(key, JSON.stringify(results));
    console.log(`[GapScanner] Results stored in Redis: ${key}`);
  } catch (error) {
    console.error('[GapScanner] Failed to store results:', error);
  }
}

/**
 * Polygon.io Snapshot Data Types
 */
interface PolygonSnapshotTicker {
  ticker: string;
  todaysChangePerc: number;
  todaysChange: number;
  updated: number;
  day: {
    o: number;  // Open
    h: number;  // High
    l: number;  // Low
    c: number;  // Close
    v: number;  // Volume
    vw: number; // VWAP
  };
  min: {
    av: number; // Average volume
    c: number;  // Current price
    h: number;  // High
    l: number;  // Low
    o: number;  // Open
    v: number;  // Volume
    vw: number; // VWAP
  };
  prevDay: {
    o: number;
    h: number;
    l: number;
    c: number;  // Previous close
    v: number;
    vw: number;
  };
}

interface PolygonSnapshotResponse {
  status: string;
  tickers: PolygonSnapshotTicker[];
  count: number;
}

/**
 * Fetch stock snapshots from Polygon.io
 * Uses /v2/snapshot/locale/us/markets/stocks/tickers for batch data
 */
async function fetchPolygonSnapshots(
  symbols: string[]
): Promise<Map<string, PolygonSnapshotTicker>> {
  const apiKey = getPolygonApiKey();
  const snapshots = new Map<string, PolygonSnapshotTicker>();
  
  // Polygon allows up to 250 symbols per request in the tickers parameter
  const batchSize = 250;
  const errors: string[] = [];
  
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const tickersParam = batch.join(',');
    
    try {
      const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickersParam}&apiKey=${apiKey}`;
      
      const response = await fetch(url, { 
        next: { revalidate: 0 } // No cache - real-time data
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[GapScanner] Polygon API error: ${response.status}`, errorText);
        errors.push(`Batch ${i}-${i + batch.length}: ${response.status}`);
        continue;
      }
      
      const data: PolygonSnapshotResponse = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'DELAYED') {
        console.warn(`[GapScanner] Polygon API status: ${data.status}`);
        continue;
      }
      
      // Store valid snapshots
      for (const ticker of data.tickers || []) {
        if (ticker.prevDay?.c && ticker.day?.c) {
          snapshots.set(ticker.ticker, ticker);
        }
      }
      
      // Rate limiting - be nice to the API (5 calls per minute for free tier, more for paid)
      if (i + batchSize < symbols.length) {
        await new Promise(r => setTimeout(r, 200)); // Small delay between batches
      }
      
    } catch (error) {
      console.error(`[GapScanner] Error fetching batch ${i}:`, error);
      errors.push(`Batch ${i}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  if (errors.length > 0) {
    console.log(`[GapScanner] Completed with ${errors.length} batch errors`);
  }
  
  return snapshots;
}

/**
 * Main scan function using Polygon.io
 */
async function scanForGaps(
  symbols: string[],
  stockInfo: Map<string, StockInfo>,
  options: {
    minGapPercent?: number;
    minVolume?: number;
    maxPrice?: number;
    minMarketCap?: number;
    dryRun?: boolean;
  } = {}
): Promise<Omit<ScanResult, 'success' | 'source' | 'isWeekend' | 'marketSession' | 'marketStatus' | 'isPreMarket'>> {
  const startTime = Date.now();
  const {
    minGapPercent = 5,
    minVolume = 100000,
    maxPrice = 1000,
    minMarketCap = 100_000_000,
    dryRun = false
  } = options;
  
  const gainers: GapStock[] = [];
  const losers: GapStock[] = [];
  let scanned = 0;
  let apiFailures = 0;
  let skippedETF = 0;
  let skippedGap = 0;
  let skippedVolume = 0;
  let skippedPrice = 0;
  let skippedMarketCap = 0;
  const errors: string[] = [];
  
  if (dryRun) {
    console.log(`[GapScanner] Dry run - would scan ${symbols.length} stocks`);
    return {
      data: { gainers: [], losers: [] },
      timestamp: new Date().toISOString(),
      scanned: 0,
      found: 0,
      tradingDate: new Date().toISOString().split('T')[0],
      previousDate: getLastTradingDate(),
      durationMs: Date.now() - startTime,
      debug: {
        apiKeyPresent: !!getPolygonApiKey(),
        apiKeyLength: getPolygonApiKey()?.length || 0,
        universeSize: symbols.length,
        skippedETF: 0,
        skippedGap: 0,
        skippedVolume: 0,
        skippedPrice: 0,
        skippedMarketCap: 0,
        apiFailures: 0,
        errors: []
      },
      filters: {
        minGapPercent,
        minVolume,
        maxPrice,
        minMarketCap,
        excludeETFs: true,
        excludeWarrants: true
      }
    };
  }
  
  console.log(`[GapScanner] Fetching Polygon snapshots for ${symbols.length} stocks...`);
  
  // Filter out ETFs and derivatives first
  const filteredSymbols = symbols.filter(symbol => {
    if (isETFOrDerivative(symbol)) {
      skippedETF++;
      return false;
    }
    return true;
  });
  
  // Filter by market cap (from stock info)
  const symbolsWithMarketCap: string[] = [];
  for (const symbol of filteredSymbols) {
    const info = stockInfo.get(symbol);
    if (info && info.marketCap >= minMarketCap) {
      symbolsWithMarketCap.push(symbol);
    } else if (info && info.marketCap < minMarketCap) {
      skippedMarketCap++;
    }
  }
  
  console.log(`[GapScanner] Processing ${symbolsWithMarketCap.length} stocks after filtering (ETF: ${skippedETF}, MarketCap: ${skippedMarketCap})`);
  
  // Fetch snapshots from Polygon
  const snapshots = await fetchPolygonSnapshots(symbolsWithMarketCap);
  
  console.log(`[GapScanner] Received ${snapshots.size} snapshots from Polygon`);
  
  // Process snapshots
  for (const [symbol, snapshot] of snapshots) {
    const info = stockInfo.get(symbol);
    
    // Determine current price and previous close
    // In pre-market: use min.c (current) vs prevDay.c (previous close)
    // In regular hours: use day.c (current) vs prevDay.c (previous close)
    const currentPrice = snapshot.min?.c || snapshot.day?.c || 0;
    const previousClose = snapshot.prevDay?.c || 0;
    const volume = snapshot.day?.v || snapshot.min?.v || 0;
    
    if (!currentPrice || !previousClose) {
      apiFailures++;
      continue;
    }
    
    scanned++;
    
    // Calculate gap percentage
    const gapPercent = ((currentPrice - previousClose) / previousClose) * 100;
    
    // Apply filters
    if (Math.abs(gapPercent) < minGapPercent) {
      skippedGap++;
      continue;
    }
    if (volume < minVolume) {
      skippedVolume++;
      continue;
    }
    if (currentPrice > maxPrice) {
      skippedPrice++;
      continue;
    }
    
    const stock: GapStock = {
      symbol,
      name: info?.name || symbol,
      price: currentPrice,
      previousClose: previousClose,
      gapPercent: Number(gapPercent.toFixed(2)),
      volume: volume,
      marketCap: info?.marketCap || 0,
      status: gapPercent > 0 ? 'gainer' : 'loser'
    };
    
    if (gapPercent > 0) {
      gainers.push(stock);
    } else {
      losers.push(stock);
    }
  }
  
  // Sort by gap magnitude
  gainers.sort((a, b) => b.gapPercent - a.gapPercent);
  losers.sort((a, b) => a.gapPercent - b.gapPercent);
  
  const durationMs = Date.now() - startTime;
  
  console.log(`[GapScanner] Scan complete: ${gainers.length} gainers, ${losers.length} losers (${durationMs}ms)`);
  
  return {
    data: {
      gainers: gainers.slice(0, 20), // Top 20 gainers
      losers: losers.slice(0, 20)    // Top 20 losers
    },
    timestamp: new Date().toISOString(),
    scanned,
    found: gainers.length + losers.length,
    tradingDate: new Date().toISOString().split('T')[0],
    previousDate: getLastTradingDate(),
    durationMs,
    debug: {
      apiKeyPresent: !!getPolygonApiKey(),
      apiKeyLength: getPolygonApiKey()?.length || 0,
      universeSize: symbols.length,
      skippedETF,
      skippedGap,
      skippedVolume,
      skippedPrice,
      skippedMarketCap,
      apiFailures,
      errors
    },
    filters: {
      minGapPercent,
      minVolume,
      maxPrice,
      minMarketCap,
      excludeETFs: true,
      excludeWarrants: true
    }
  };
}

export async function GET(request: Request) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const { searchParams } = new URL(request.url);
  
  // Parse options from query params
  const dryRun = searchParams.get('dryRun') === 'true';
  const limit = parseInt(searchParams.get('limit') || '5000', 10);
  const forceRefresh = searchParams.get('refresh') === 'true';
  const useCache = searchParams.get('cache') !== 'false';
  const minGapPercent = parseFloat(searchParams.get('minGap') || '5');
  
  try {
    // Check API key
    const apiKey = getPolygonApiKey();
    console.log(`[GapScanner] Starting Polygon scan at ${timestamp}`);
    console.log(`[GapScanner] Options: dryRun=${dryRun}, limit=${limit}, forceRefresh=${forceRefresh}`);
    
    // Get stock universe
    let symbols: string[];
    let stockInfo: Map<string, StockInfo>;
    
    // Get cached universe
    symbols = await getStockUniverse();
    stockInfo = await getStockInfoMap();
    
    // Limit symbols if requested (for testing)
    if (limit < symbols.length) {
      console.log(`[GapScanner] Limiting scan to ${limit} stocks for testing`);
      symbols = symbols.slice(0, limit);
    }
    
    // Check for cached results today
    const today = new Date().toISOString().split('T')[0];
    if (useCache && !forceRefresh && !dryRun) {
      const cached = await getCachedResults(today);
      if (cached) {
        console.log('[GapScanner] Returning cached results');
        return NextResponse.json({
          ...cached,
          source: 'cache'
        });
      }
    }
    
    // Check market session
    const marketSession = getMarketSession();
    
    // Run the scan
    const scanResults = await scanForGaps(symbols, stockInfo, {
      minGapPercent,
      minVolume: 100000,
      maxPrice: 1000,
      minMarketCap: 100_000_000,
      dryRun
    });
    
    const totalDuration = Date.now() - startTime;
    
    // Build response
    const response: ScanResult = {
      success: true,
      ...scanResults,
      source: 'live',
      isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6,
      marketSession: marketSession.session,
      marketStatus: marketSession.marketStatus,
      isPreMarket: marketSession.isPreMarket
    };
    
    console.log(`[GapScanner] Completed in ${totalDuration}ms`);
    console.log(`[GapScanner] Results: ${response.data.gainers.length} gainers, ${response.data.losers.length} losers from ${response.scanned} stocks scanned`);
    
    // Log the full response for testing
    console.log('[GapScanner] API Response:', JSON.stringify(response, null, 2));
    
    // Store results if not dry run
    if (!dryRun) {
      await storeScanResults(response);
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[GapScanner] Error:', error);
    const totalDuration = Date.now() - startTime;
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch gap data',
      timestamp,
      durationMs: totalDuration,
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Also support POST for triggering scans with options
export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;
  
  if (action === 'refresh-universe') {
    // Import dynamically to avoid circular dependencies
    const { refreshStockUniverse } = await import('@/lib/stock-universe');
    const result = await refreshStockUniverse();
    return NextResponse.json(result);
  }
  
  return NextResponse.json({
    success: false,
    error: 'Unknown action'
  }, { status: 400 });
}
