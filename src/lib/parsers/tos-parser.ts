/**
 * TOS (ThinkOrSwim) CSV Parser
 * Parses trade data from TOS CSV exports
 */

interface TOSRow {
  Symbol?: string;
  symbol?: string;
  Side?: string;
  side?: string;
  'Exec Time'?: string;
  execTime?: string;
  'Entry Price'?: string;
  entryPrice?: string;
  'Exit Price'?: string;
  exitPrice?: string;
  Qty?: string;
  qty?: string;
  Quantity?: string;
  quantity?: string;
  'P&L'?: string;
  pnl?: string;
  'P/L'?: string;
  pl?: string;
  Description?: string;
  description?: string;
  'Pos Effect'?: string;
  posEffect?: string;
  Price?: string;
  price?: string;
  [key: string]: string | undefined;
}

export interface TOSTrade {
  symbol: string;
  date: string;
  time: string;
  side: string;
  quantity: number;
  price: number;
  pnl?: number;
  posEffect?: string;
}

/**
 * Parse TOS CSV export
 */
export function parseTOSCSV(csvContent: string): TOSTrade[] {
  const trades: TOSTrade[] = [];
  
  try {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return [];
    }
    
    // Parse headers
    const headers = parseCSVLine(lines[0]);
    
    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: TOSRow = {};
        
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        
        const trade = parseTOSRow(row);
        if (trade) {
          trades.push(trade);
        }
      } catch (error) {
        console.warn(`Error parsing row ${i}:`, error);
      }
    }
    
    return trades;
  } catch (error) {
    console.error('Error parsing TOS CSV:', error);
    return [];
  }
}

/**
 * Parse a single CSV line
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/**
 * Parse a single TOS row into a trade object
 */
function parseTOSRow(row: TOSRow): TOSTrade | null {
  const symbol = row.Symbol || row.symbol;
  if (!symbol) return null;
  
  const sideStr = (row.Side || row.side || '').toUpperCase();
  const side = sideStr.includes('BUY') || sideStr.includes('LONG') || sideStr.includes('TO OPEN')
    ? 'BUY' 
    : 'SELL';
  
  const execTime = row['Exec Time'] || row.execTime || new Date().toISOString();
  const price = parseFloat(row.Price || row.price || row['Entry Price'] || row.entryPrice || '0');
  const qty = parseInt(row.Qty || row.qty || row.Quantity || row.quantity || '0', 10);
  const pnlStr = row['P&L'] || row.pnl || row['P/L'] || row.pl || '0';
  const pnl = parseFloat(pnlStr.replace(/[$,]/g, ''));
  const posEffect = row['Pos Effect'] || row.posEffect || '';
  
  // Parse date and time from execTime
  let date = '';
  let time = '';
  try {
    const dt = new Date(execTime);
    date = dt.toISOString().split('T')[0];
    time = dt.toISOString().split('T')[1].substring(0, 8);
  } catch {
    date = new Date().toISOString().split('T')[0];
    time = '00:00:00';
  }
  
  return {
    symbol: symbol.toUpperCase(),
    date,
    time,
    side,
    quantity: Math.abs(qty),
    price,
    pnl: isNaN(pnl) ? undefined : pnl,
    posEffect,
  };
}
