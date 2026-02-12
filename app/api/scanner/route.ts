// vortex-edge/app/api/scanner/route.ts
import { NextResponse } from 'next/server';
import { fetchYahooData } from '@/lib/yahoo';
import { TICKERS } from '@/lib/tickers';
import { calculateRSI } from '@/lib/indicators';

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
  
  const targetIndex = candles.length - 1;
  const targetRange = candles[targetIndex].high - candles[targetIndex].low;
  
  for (let i = 1; i <= 6; i++) {
    const prevIndex = targetIndex - i;
    const range = candles[prevIndex].high - candles[prevIndex].low;
    if (targetRange >= range) return false;
  }
  
  return true;
}

// Function to fetch in chunks
async function fetchInChunks(tickers: string[], chunkSize: number) {
  const results = [];
  for (let i = 0; i < tickers.length; i += chunkSize) {
    const chunk = tickers.slice(i, i + chunkSize);
    // Process chunk concurrently
    const chunkResults = await Promise.all(chunk.map(async (symbol) => {
      try {
        const data = await fetchYahooData(symbol);
        
        if (!data || !data.candles || data.candles.length < 15) return null; // Need 15 for RSI calculation

        const history = data.candles;
        const lastCandle = history[history.length - 1];
        const prevCandle = history[history.length - 2];
        const closePrices = history.map((c: Candle) => c.close);
        
        const rsi = calculateRSI(closePrices, 14); // Calculate RSI (14)
        
        const insideBar = isInsideBar(lastCandle, prevCandle);
        const nr7 = isNR7(history);

        // Filter: Only return if there is a Setup OR if RSI is Extreme
        const isRSIHigh = rsi && rsi > 70;
        const isRSILow = rsi && rsi < 30;

        if (insideBar || nr7 || isRSIHigh || isRSILow) {
          return {
            symbol,
            price: data.price,
            date: lastCandle.date,
            isInsideBar: insideBar,
            isNR7: nr7,
            volume: data.volume,
            rsi: rsi ? parseFloat(rsi.toFixed(2)) : null,
            trend: closePrices[closePrices.length - 1] > closePrices[closePrices.length - 20] ? 'Up' : 'Down' // Simple Trend Check (Price > 20d ago)
          };
        }
        return null;
      } catch (err) {
        console.error(`Failed to scan ${symbol}`, err);
        return null;
      }
    }));
    results.push(...chunkResults);
    // Tiny delay to be nice to API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
}

export async function GET() {
  try {
    // Process 100 tickers in chunks of 10 to avoid 429 errors
    const rawResults = await fetchInChunks(TICKERS, 10);
    const opportunities = rawResults.filter(r => r !== null);

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
