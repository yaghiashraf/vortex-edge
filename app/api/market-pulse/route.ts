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

async function fetchWithRetry(symbol: string, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`, {
        next: { revalidate: 300 } // Cache for 5 min !! Important for rate limits
      });
      
      if (res.status === 429) {
        // Rate limit hit, wait and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      if (!res.ok) return null;
      
      const data = await res.json();
      return {
        symbol,
        price: data.c,
        change: data.dp,
      };
    } catch (e) {
      if (i === retries) return null;
    }
  }
  return null;
}

export async function GET() {
  try {
    const allSymbols = [...SECTORS.map(s => s.symbol), 'SPY'];
    const results = [];

    // STRICT Throttling: Finnhub Free Tier is sensitive.
    // Process 3 items at a time with delay.
    const CHUNK_SIZE = 3;
    for (let i = 0; i < allSymbols.length; i += CHUNK_SIZE) {
      const chunk = allSymbols.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.all(chunk.map(s => fetchWithRetry(s)));
      results.push(...chunkResults);
      // Wait 300ms between chunks
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const quotes = results.filter(q => q !== null);
    
    const spyQuote = quotes.find((q: any) => q.symbol === 'SPY');
    const spyChange = spyQuote?.change || 0;

    const data = SECTORS.map(sector => {
      const quote: any = quotes.find((q: any) => q.symbol === sector.symbol);
      
      return {
        ...sector,
        price: quote?.price || 0,
        change: quote?.change || 0,
        relativeStrength: (quote?.change || 0) - spyChange,
        error: !quote
      };
    });

    // If we have mostly errors, it's a systemic failure.
    // But we still return what we have.
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
