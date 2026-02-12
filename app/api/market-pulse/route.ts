import { NextResponse } from 'next/server';
import { fetchCompositeQuote } from '@/lib/providers';

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

export async function GET() {
  try {
    // Prioritize SPY first to ensure we have a baseline
    const allSymbols = ['SPY', ...SECTORS.map(s => s.symbol)];
    
    const results = [];
    for (const symbol of allSymbols) {
      const data = await fetchCompositeQuote(symbol);
      results.push(data);
      // 100ms delay to balance speed vs rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const quotes = results.filter(q => q !== null);
    
    const spyQuote: any = quotes.find((q: any) => q.symbol === 'SPY');
    const spyChange = spyQuote?.change || 0;

    const data = SECTORS.map(sector => {
      const quote: any = quotes.find((q: any) => q.symbol === sector.symbol);
      
      const change = quote?.change || 0;
      const price = quote?.price || 0;
      
      return {
        ...sector,
        price,
        change,
        relativeStrength: change - spyChange,
        error: !quote
      };
    });

    const validData = data.filter(d => !d.error && d.price > 0);
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
