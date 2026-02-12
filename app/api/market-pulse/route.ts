import { NextResponse } from 'next/server';

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

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'cvr8m1hr01qp88cp2740cvr8m1hr01qp88cp274g';

async function fetchFinnhubQuote(symbol: string) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`, {
      next: { revalidate: 60 } // Cache for 1 min
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    // Finnhub returns { c: current, d: change, dp: percent change, ... }
    // If symbol is invalid, it might return all 0s, but usually sectors are valid.
    
    return {
      symbol,
      price: data.c,
      change: data.dp, // This is the percent change (e.g., -1.5)
    };
  } catch (error) {
    console.error(`Finnhub fetch failed for ${symbol}`, error);
    return null;
  }
}

export async function GET() {
  try {
    const allSymbols = [...SECTORS.map(s => s.symbol), 'SPY'];
    
    // Fetch all 12 symbols in parallel (Finnhub handles this concurrency well)
    const results = await Promise.allSettled(allSymbols.map(s => fetchFinnhubQuote(s)));
    
    const quotes = results.map(r => r.status === 'fulfilled' ? r.value : null);
    
    const spyQuote = quotes.find(q => q?.symbol === 'SPY');
    const spyChange = spyQuote?.change || 0;

    const data = SECTORS.map(sector => {
      const quote = quotes.find(q => q?.symbol === sector.symbol);
      
      // If data is missing, we shouldn't break the chart, but 0 might be misleading.
      // However, Finnhub is reliable.
      const change = quote?.change || 0;
      const price = quote?.price || 0;
      
      return {
        ...sector,
        price,
        change,
        relativeStrength: change - spyChange,
        error: !quote // Flag if data missing
      };
    });

    // Filter out any where fetch failed completely (price 0) if necessary
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
