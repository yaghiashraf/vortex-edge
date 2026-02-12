import { NextResponse } from 'next/server';
import { fetchYahooData } from '@/lib/yahoo';

// Keep the same list, just to be consistent
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
    const allSymbols = [...SECTORS.map(s => s.symbol), 'SPY'];
    const quotes = await Promise.all(allSymbols.map(s => fetchYahooData(s)));
    
    const spyQuote = quotes.find(q => q?.symbol === 'SPY');
    const spyChange = spyQuote?.change || 0;

    const data = SECTORS.map(sector => {
      const quote = quotes.find(q => q?.symbol === sector.symbol);
      const change = quote?.change || 0;
      
      return {
        ...sector,
        price: quote?.price || 0,
        change: change,
        relativeStrength: change - spyChange,
      };
    });

    data.sort((a, b) => b.relativeStrength - a.relativeStrength);

    return NextResponse.json({ 
      spyChange, 
      sectors: data,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching market pulse:', error);
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 });
  }
}
