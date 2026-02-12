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
    // Fetch SPY first to get baseline
    const spyData = await fetchYahooData('SPY', '5d');
    const spyChange = spyData?.change || 0;

    // Fetch sectors in small batches of 3 to avoid Yahoo rate limits
    const allResults: { sector: typeof SECTORS[0]; data: any }[] = [];

    for (let i = 0; i < SECTORS.length; i += 3) {
      const batch = SECTORS.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map(async (sector) => {
          const data = await fetchYahooData(sector.symbol, '5d');
          return { sector, data };
        })
      );
      allResults.push(...batchResults);

      // Delay between batches to avoid rate limiting
      if (i + 3 < SECTORS.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const sectors = allResults
      .map(({ sector, data }) => ({
        ...sector,
        price: data?.price || 0,
        change: data?.change || 0,
        relativeStrength: (data?.change || 0) - spyChange,
        error: !data,
      }))
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
