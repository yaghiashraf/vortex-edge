import { NextResponse } from 'next/server';
import { fetchYahooData } from '@/lib/yahoo';

const SECTORS = [
  { symbol: 'XLK', name: 'Technology' },
  { symbol: 'XLF', name: 'Financials' },
  { symbol: 'XLV', name: 'Healthcare' },
  { symbol: 'XLY', name: 'Discretionary' },
  { symbol: 'XLP', name: 'Staples' },
  { symbol: 'XLE', name: 'Energy' },
  { symbol: 'XLU', name: 'Utilities' },
  { symbol: 'XLI', name: 'Industrials' },
  { symbol: 'XLB', name: 'Materials' },
  { symbol: 'XLRE', name: 'Real Estate' },
  { symbol: 'XLC', name: 'Communication' },
];

export const maxDuration = 30;

export async function GET() {
  try {
    // Fetch SPY first to get baseline — use 1mo for reliable candle data
    let spyChange = 0;
    const spyData = await fetchYahooData('SPY', '1mo');
    if (spyData && Math.abs(spyData.change) > 0.0001) {
      spyChange = spyData.change;
    } else if (spyData?.candles?.length >= 2) {
      // Explicit fallback: compute from candle data directly
      const c = spyData.candles;
      const prevClose = c[c.length - 2].close;
      if (prevClose > 0) {
        spyChange = ((spyData.price - prevClose) / prevClose) * 100;
      }
    }

    // Fetch sectors sequentially to avoid Yahoo rate limits on Vercel IPs
    const allResults: { sector: typeof SECTORS[0]; data: any }[] = [];

    for (const sector of SECTORS) {
      const data = await fetchYahooData(sector.symbol, '1mo');
      allResults.push({ sector, data });
      // Delay between each fetch to stay under rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    // Retry any that failed
    const failed = allResults.filter(r => !r.data);
    if (failed.length > 0) {
      await new Promise(r => setTimeout(r, 1000));
      for (const item of failed) {
        const data = await fetchYahooData(item.sector.symbol, '1mo');
        if (data) item.data = data;
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const sectors = allResults
      .map(({ sector, data }) => {
        let change = data?.change || 0;
        // Explicit candle fallback if change is suspiciously 0
        if (Math.abs(change) < 0.0001 && data?.candles?.length >= 2) {
          const c = data.candles;
          const prevClose = c[c.length - 2].close;
          if (prevClose > 0) {
            change = ((data.price - prevClose) / prevClose) * 100;
          }
        }
        return {
          ...sector,
          price: data?.price || 0,
          change,
          relativeStrength: change - spyChange,
          error: !data,
        };
      })
      .filter(d => !d.error && d.price > 0);

    sectors.sort((a, b) => b.relativeStrength - a.relativeStrength);

    return NextResponse.json({
      spyChange,
      sectors,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching market pulse:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
