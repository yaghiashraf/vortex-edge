import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

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
    const symbols = [...SECTORS.map(s => s.symbol), 'SPY'];
    
    // Fetch quotes for all sectors and SPY
    const quotes = await yahooFinance.quote(symbols) as any[];
    
    const spyQuote = quotes.find(q => q.symbol === 'SPY');
    const spyChange = spyQuote?.regularMarketChangePercent || 0;

    const data = SECTORS.map(sector => {
      const quote = quotes.find(q => q.symbol === sector.symbol);
      const change = quote?.regularMarketChangePercent || 0;
      const relativeStrength = change - spyChange;
      
      return {
        ...sector,
        price: quote?.regularMarketPrice,
        change: change,
        relativeStrength: relativeStrength,
        volume: quote?.regularMarketVolume,
      };
    });

    // Sort by Relative Strength (descending)
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
