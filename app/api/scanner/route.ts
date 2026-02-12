import { NextResponse } from 'next/server';
import { fetchYahooData } from '@/lib/yahoo';
import { TICKERS } from '@/lib/tickers';

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
  
  // Last COMPLETED candle is typically used for setup (Yesterday).
  // But if market is OPEN, the last candle is TODAY (forming).
  // We want to find stocks that *finished* yesterday in a setup, ready for today.
  // OR stocks that are currently forming a setup intraday (less reliable).
  // Let's assume we want to scan the LAST AVAILABLE candle against previous.
  
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
          price: data.price, // Live price
          date: lastCandle.date,
          isInsideBar: insideBar,
          isNR7: nr7,
          volume: data.volume
        };
      }
      return null;
    }));

    const opportunities = results.filter(r => r !== null);

    // If still empty after checking 50+ tickers, maybe fallback to a "Top Gainers" list?
    // No, stick to the strategy. If no setups, then no setups.
    
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
