import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

// List of high-interest tickers
const TICKERS = [
  'NVDA', 'TSLA', 'AMD', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX', 
  'SPY', 'QQQ', 'IWM', 'COIN', 'MSTR', 'PLTR', 'SOFI', 'MARA', 'GME', 'HOOD', 'ROKU'
];

interface Candle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function isInsideBar(current: Candle, previous: Candle): boolean {
  return current.high < previous.high && current.low > previous.low;
}

function isNR7(candles: Candle[]): boolean {
  // We need at least 7 candles
  if (candles.length < 7) return false;
  
  // Get the last 7 candles (most recent is at index length-1)
  const relevantCandles = candles.slice(-7);
  const currentRange = relevantCandles[6].high - relevantCandles[6].low;
  
  // Check if current range is smaller than all previous 6 ranges
  for (let i = 0; i < 6; i++) {
    const range = relevantCandles[i].high - relevantCandles[i].low;
    if (currentRange >= range) return false;
  }
  
  return true;
}

export async function GET() {
  try {
    const today = new Date();
    const tenDaysAgo = new Date(today);
    tenDaysAgo.setDate(today.getDate() - 15); // Buffer for weekends

    const period1 = tenDaysAgo.toISOString().split('T')[0];

    const results = await Promise.all(TICKERS.map(async (symbol) => {
      try {
        const history = await yahooFinance.historical(symbol, {
          period1: period1,
          interval: '1d',
        }) as any[];

        if (history.length < 7) return null;

        const lastCandle = history[history.length - 1];
        const prevCandle = history[history.length - 2];

        // Ensure we are looking at a completed day or current active day
        // For scan, usually looking for setup from YESTERDAY for TODAY's open
        // OR Today's forming bar for tomorrow.
        // Let's assume we want to find patterns in the *latest available candle*.
        
        const insideBar = isInsideBar(lastCandle, prevCandle);
        const nr7 = isNR7(history);

        if (insideBar || nr7) {
          return {
            symbol,
            price: lastCandle.close,
            date: lastCandle.date,
            isInsideBar: insideBar,
            isNR7: nr7,
            volume: lastCandle.volume
          };
        }
        return null;
      } catch (err) {
        console.error(`Failed to fetch ${symbol}`, err);
        return null;
      }
    }));

    const opportunities = results.filter(r => r !== null);

    return NextResponse.json({ 
      opportunities,
      scannedCount: TICKERS.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in scanner:', error);
    return NextResponse.json({ error: 'Scanner failed' }, { status: 500 });
  }
}
