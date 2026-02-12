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

async function fetchWithConcurrency(symbols: string[], concurrency: number) {
  const results: any[] = [];
  for (let i = 0; i < symbols.length; i += concurrency) {
    const chunk = symbols.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(chunk.map(s => fetchYahooData(s)));
    results.push(...chunkResults.map(r => r.status === 'fulfilled' ? r.value : null));
    // Small delay between chunks
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return results;
}

export async function GET() {
  try {
    const allSymbols = [...SECTORS.map(s => s.symbol), 'SPY'];
    
    // Fetch with limited concurrency (4) to avoid triggering rate limiters on the burst
    const quotes = await fetchWithConcurrency(allSymbols, 4);
    
    const spyQuote = quotes.find(q => q?.symbol === 'SPY');
    const spyChange = spyQuote?.change || 0;

    // Log for debugging (visible in Vercel logs)
    if (!spyQuote) {
      console.warn('SPY quote failed to load');
    }

    const data = SECTORS.map(sector => {
      const quote = quotes.find(q => q?.symbol === sector.symbol);
      
      if (!quote) {
        // Fallback or mark as error
        return {
          ...sector,
          price: 0,
          change: 0,
          relativeStrength: 0,
          error: true
        };
      }

      const change = quote.change || 0;
      
      return {
        ...sector,
        price: quote.price,
        change: change,
        relativeStrength: change - spyChange,
      };
    });

    // Remove errored sectors from the visualization to avoid confusion?
    // Or keep them as 0? Let's keep them but sorted at the bottom if 0.
    // Better to filter out completely failed ones so they don't show misleading "0%"
    // Actually, showing 0% RS is confusing.
    
    const validData = data.filter(d => !d.error);

    validData.sort((a, b) => b.relativeStrength - a.relativeStrength);

    return NextResponse.json({ 
      spyChange, 
      sectors: validData,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching market pulse:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
