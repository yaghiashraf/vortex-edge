import { NextResponse } from 'next/server';
import { differenceInDays, subDays } from 'date-fns';

const TICKERS = [
  'NVDA', 'TSLA', 'AMD', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX', 
  'SPY', 'QQQ', 'IWM', 'COIN', 'MSTR', 'PLTR', 'SOFI', 'MARA', 'GME', 'HOOD'
];

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'cvr8m1hr01qp88cp2740cvr8m1hr01qp88cp274g'; // Fallback

async function getDailyCandles(symbol: string) {
  try {
    const today = Math.floor(Date.now() / 1000);
    const tenDaysAgo = Math.floor(subDays(Date.now(), 15).getTime() / 1000);

    const res = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${tenDaysAgo}&to=${today}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 3600 } } // Cache heavily (1h) since this is EOD scan
    );
    
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    
    if (data.s !== 'ok' || !data.c) return null;

    // Transform Finnhub format {c: [], h: [], l: [], ...} to array of objects
    const candles = data.c.map((close: number, index: number) => ({
      date: new Date(data.t[index] * 1000),
      open: data.o[index],
      high: data.h[index],
      low: data.l[index],
      close: close,
      volume: data.v[index]
    }));

    return candles;
  } catch (err) {
    console.error(`Failed to fetch ${symbol} history:`, err);
    return null;
  }
}

function isInsideBar(current: any, previous: any) {
  if (!current || !previous) return false;
  return current.high < previous.high && current.low > previous.low;
}

function isNR7(candles: any[]) {
  if (candles.length < 8) return false;
  
  // We analyze the *latest completed* candle (yesterday's close)
  // or today's if the market is open. Let's assume the last candle in array is the target.
  const targetIndex = candles.length - 1;
  const targetRange = candles[targetIndex].high - candles[targetIndex].low;

  // Compare with previous 6 ranges
  for (let i = 1; i <= 6; i++) {
    const prevIndex = targetIndex - i;
    const range = candles[prevIndex].high - candles[prevIndex].low;
    if (targetRange >= range) return false; // Found a smaller range previously, so not NR7
  }
  return true;
}

export async function GET() {
  try {
    const results = await Promise.all(TICKERS.map(async (symbol) => {
      const candles = await getDailyCandles(symbol);
      
      if (!candles || candles.length < 2) return null;

      const lastCandle = candles[candles.length - 1];
      const prevCandle = candles[candles.length - 2];
      
      const insideBar = isInsideBar(lastCandle, prevCandle);
      const nr7 = isNR7(candles);

      if (insideBar || nr7) {
        return {
          symbol,
          price: lastCandle.close,
          date: lastCandle.date.toISOString(),
          isInsideBar: insideBar,
          isNR7: nr7,
          volume: lastCandle.volume
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
