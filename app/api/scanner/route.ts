// vortex-edge/app/api/scanner/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { fetchYahooData } from '@/lib/yahoo';
import { TICKERS } from '@/lib/tickers';
import { calculateRSI, calculateSMA, calculateATR, calculateZScore } from '@/lib/indicators';

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

/**
 * Returns the fraction of the regular US market session that has elapsed (0 to 1).
 * Returns 1 if market is closed (after hours / weekend), so no normalization is applied.
 */
function getMarketDayFraction(): number {
  const now = new Date();
  // Convert to ET (Eastern Time) - handle both EST and EDT
  const etString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etString);
  const hours = etDate.getHours();
  const minutes = etDate.getMinutes();
  const timeDecimal = hours + minutes / 60; // e.g., 11:30 = 11.5

  const marketOpen = 9.5;   // 9:30 AM ET
  const marketClose = 16.0; // 4:00 PM ET

  // Outside market hours — return 1 so RVOL uses raw value (full day volume)
  if (timeDecimal < marketOpen || timeDecimal >= marketClose) return 1;

  // During market hours — return fraction elapsed (min 0.05 to avoid division by near-zero)
  return Math.max(0.05, (timeDecimal - marketOpen) / (marketClose - marketOpen));
}

async function fetchInChunks(tickers: string[], chunkSize: number) {
  const results = [];
  const dayFraction = getMarketDayFraction();

  for (let i = 0; i < tickers.length; i += chunkSize) {
    const chunk = tickers.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(async (symbol) => {
      try {
        const data = await fetchYahooData(symbol);

        if (!data || !data.candles || data.candles.length < 5) return null;

        const history = data.candles;
        const lastCandle = history[history.length - 1];
        const prevCandle = history[history.length - 2];
        const closePrices = history.map((c: Candle) => c.close);
        const volumeArray = history.map((c: Candle) => c.volume);

        // Technical Indicators
        const rsi = calculateRSI(closePrices, 14);
        const atr = calculateATR(history, 14);
        const zScore = calculateZScore(closePrices, 20);

        // RVOL: Normalize by fraction of trading day elapsed
        // During market hours, today's volume is partial — divide by dayFraction to project full-day
        const avgVol = calculateSMA(volumeArray.slice(0, -1), 14);
        let rvol = 0;
        if (avgVol && avgVol > 0) {
          const projectedVolume = data.volume / dayFraction;
          rvol = projectedVolume / avgVol;
        }

        // ATR% — Expected daily range as percentage of price
        // THE key metric prop firms use for position sizing & volatility screening
        const atrPct = (atr && data.price > 0) ? (atr / data.price) * 100 : null;

        const insideBar = isInsideBar(lastCandle, prevCandle);
        const nr7 = isNR7(history);

        const trendLookback = Math.min(20, closePrices.length - 1);
        const trend = closePrices[closePrices.length - 1] > closePrices[closePrices.length - trendLookback] ? 'Up' : 'Down';

        if (data.price < 5) return null;

        return {
          symbol,
          price: data.price,
          change: data.change,
          date: lastCandle.date,
          isInsideBar: insideBar,
          isNR7: nr7,
          volume: data.volume,
          rsi: rsi ? parseFloat(rsi.toFixed(2)) : null,
          trend,
          rvol: parseFloat(rvol.toFixed(2)),
          atr: atr ? parseFloat(atr.toFixed(2)) : null,
          atrPct: atrPct ? parseFloat(atrPct.toFixed(2)) : null,
          zScore: zScore ? parseFloat(zScore.toFixed(2)) : null,
        };
      } catch {
        return null;
      }
    }));
    results.push(...chunkResults);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
}

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0', 10);
    let limit = parseInt(searchParams.get('limit') || '20', 10);

    if (limit > 50) limit = 50;

    const start = page * limit;
    const end = start + limit;

    if (start >= TICKERS.length) {
      return NextResponse.json({
        opportunities: [],
        scannedCount: 0,
        hasMore: false,
        timestamp: new Date().toISOString()
      });
    }

    const currentBatch = TICKERS.slice(start, end);
    const hasMore = end < TICKERS.length;

    const rawResults = await fetchInChunks(currentBatch, 5);
    const opportunities = rawResults.filter(r => r !== null);

    return NextResponse.json({
      opportunities,
      scannedCount: currentBatch.length,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in scanner:', error);
    return NextResponse.json({ error: 'Scanner failed' }, { status: 500 });
  }
}
