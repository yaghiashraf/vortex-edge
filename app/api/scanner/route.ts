import { NextResponse } from 'next/server';
import { fetchYahooData } from '@/lib/yahoo';

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
  if (!current || !previous) return false;
  return current.high < previous.high && current.low > previous.low;
}

function isNR7(candles: Candle[]): boolean {
  if (candles.length < 8) return false;
  
  // Last completed candle is at end-1 (today's candle is actively forming)
  // Or if market is closed, it's the last one.
  // Yahoo returns `regularMarketPrice` as live.
  // The `chart` endpoint returns historical candles.
  // Let's assume the last candle in the array is the one we analyze for "setup".
  
  const targetIndex = candles.length - 1;
  const targetRange = candles[targetIndex].high - candles[targetIndex].low;
  
  for (let i = 1; i <= 6; i++) {
    const prevIndex = targetIndex - i;
    const range = candles[prevIndex].high - candles[prevIndex].low;
    if (targetRange >= range) return false;
  }
  
  return true;
}

export async function GET() {
  try {
    const results = await Promise.all(TICKERS.map(async (symbol) => {
      const data = await fetchYahooData(symbol);
      
      if (!data || !data.candles || data.candles.length < 7) return null;

      const history = data.candles;
      const lastCandle = history[history.length - 1];
      const prevCandle = history[history.length - 2];

      const insideBar = isInsideBar(lastCandle, prevCandle);
      const nr7 = isNR7(history);

      if (insideBar || nr7) {
        return {
          symbol,
          price: data.price,
          date: lastCandle.date,
          isInsideBar: insideBar,
          isNR7: nr7,
          volume: data.volume
        };
      }
      return null;
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
