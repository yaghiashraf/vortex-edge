import { NextResponse } from 'next/server';
import { subDays } from 'date-fns';

const TICKERS = [
  'NVDA', 'TSLA', 'AMD', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'NFLX', 
  'SPY', 'QQQ', 'IWM', 'COIN', 'MSTR', 'PLTR', 'SOFI', 'MARA', 'GME', 'HOOD'
];

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'cvr8m1hr01qp88cp2740cvr8m1hr01qp88cp274g';

// Mock data generator for fallback
const getMockData = () => {
  const mockTickers = ['NVDA', 'TSLA', 'AMD', 'COIN'];
  return mockTickers.map(symbol => ({
    symbol,
    price: Math.random() * 1000 + 100,
    date: new Date().toISOString(),
    isInsideBar: Math.random() > 0.5,
    isNR7: Math.random() > 0.7,
    volume: Math.floor(Math.random() * 50000000) + 1000000,
    isMock: true // Flag to indicate this is demo data
  })).filter(item => item.isInsideBar || item.isNR7);
};

async function getDailyCandles(symbol: string) {
  try {
    const today = Math.floor(Date.now() / 1000);
    const tenDaysAgo = Math.floor(subDays(Date.now(), 20).getTime() / 1000);

    const res = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${tenDaysAgo}&to=${today}&token=${FINNHUB_KEY}`,
      { next: { revalidate: 3600 } }
    );
    
    if (!res.ok) {
       // If 403/429/401, return specific error to trigger fallback
       if (res.status === 403 || res.status === 429 || res.status === 401) {
         throw new Error('API_LIMIT');
       }
       return null;
    }

    const data = await res.json();
    
    if (data.s === 'no_data') return null;
    if (data.s !== 'ok' || !data.c) return null;

    const candles = data.c.map((close: number, index: number) => ({
      date: new Date(data.t[index] * 1000),
      open: data.o[index],
      high: data.h[index],
      low: data.l[index],
      close: close,
      volume: data.v[index]
    }));

    return candles;
  } catch (err: any) {
    if (err.message === 'API_LIMIT') throw err; // Propagate up to trigger bulk fallback
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
  let useMock = false;

  try {
    const results = await Promise.all(TICKERS.map(async (symbol) => {
      try {
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
            volume: lastCandle.volume,
            isMock: false
          };
        }
        return null;
      } catch (err: any) {
        if (err.message === 'API_LIMIT') {
          useMock = true; // Trigger fallback for everyone
        }
        return null;
      }
    }));

    if (useMock) {
      console.warn('API Limit reached. Serving mock data.');
      return NextResponse.json({ 
        opportunities: getMockData(),
        scannedCount: TICKERS.length,
        timestamp: new Date().toISOString(),
        dataSource: 'DEMO (API Limit)'
      });
    }

    const opportunities = results.filter(r => r !== null);

    // If live scan found nothing, maybe return mock data just to show UI? 
    // Or just return empty array. Let's return empty array to be honest, 
    // but if API failed entirely, we fallback.
    
    // If opportunities are empty but NO error, it means no patterns found.
    // If opportunities are empty AND useMock is true (handled above).

    return NextResponse.json({ 
      opportunities,
      scannedCount: TICKERS.length,
      timestamp: new Date().toISOString(),
      dataSource: 'LIVE'
    });

  } catch (error) {
    console.error('Error in scanner:', error);
    // Ultimate fallback
    return NextResponse.json({ 
      opportunities: getMockData(),
      scannedCount: TICKERS.length,
      timestamp: new Date().toISOString(),
      dataSource: 'DEMO (Error)'
    });
  }
}
