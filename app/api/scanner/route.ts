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

function getMarketDayFraction(): number {
  const now = new Date();
  const etString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etString);
  const hours = etDate.getHours();
  const minutes = etDate.getMinutes();
  const timeDecimal = hours + minutes / 60;
  const marketOpen = 9.5;
  const marketClose = 16.0;
  if (timeDecimal < marketOpen || timeDecimal >= marketClose) return 1;
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

        const rsi = calculateRSI(closePrices, 14);
        const atr = calculateATR(history, 14);
        const zScore = calculateZScore(closePrices, 20);

        // RVOL: time-of-day normalized
        const avgVol = calculateSMA(volumeArray.slice(0, -1), 14);
        let rvol = 0;
        if (avgVol && avgVol > 0) {
          rvol = (data.volume / dayFraction) / avgVol;
        }

        // ATR% — expected daily range as % of price
        const atrPct = (atr && data.price > 0) ? (atr / data.price) * 100 : null;

        // Gap% — overnight gap: (today's open - yesterday's close) / yesterday's close * 100
        let gapPct: number | null = null;
        if (lastCandle.open > 0 && prevCandle && prevCandle.close > 0) {
          gapPct = ((lastCandle.open - prevCandle.close) / prevCandle.close) * 100;
        }

        // Dollar Volume — Price * Volume (in millions)
        const dollarVol = (data.price * data.volume) / 1_000_000;

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
          gapPct: gapPct ? parseFloat(gapPct.toFixed(2)) : null,
          dollarVol: parseFloat(dollarVol.toFixed(1)),
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
        opportunities: [], scannedCount: 0, hasMore: false,
        timestamp: new Date().toISOString()
      });
    }

    const currentBatch = TICKERS.slice(start, end);
    const hasMore = end < TICKERS.length;
    const rawResults = await fetchInChunks(currentBatch, 5);
    const opportunities = rawResults.filter(r => r !== null);

    return NextResponse.json({
      opportunities, scannedCount: currentBatch.length, hasMore,
      nextPage: hasMore ? page + 1 : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in scanner:', error);
    return NextResponse.json({ error: 'Scanner failed' }, { status: 500 });
  }
}
