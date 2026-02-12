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

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'cvr8m1hr01qp88cp2740cvr8m1hr01qp88cp274g'; // Fallback for local testing

async function getQuote(symbol: string) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`, {
      next: { revalidate: 60 } // Cache for 1 min to stay within rate limits
    });
    
    if (!res.ok) throw new Error(`Finnhub API error: ${res.status}`);
    const data = await res.json();
    return {
      symbol,
      price: data.c,
      change: data.dp, // percent change
      volume: 0 // Finnhub quote doesn't always return volume in free tier consistently, but let's check documentation.
      // Actually 'v' field is sometimes 0. We'll ignore volume for this chart.
    };
  } catch (err) {
    console.error(`Failed to fetch ${symbol}:`, err);
    return null;
  }
}

export async function GET() {
  try {
    // Parallel fetch all sectors + SPY
    const allSymbols = [...SECTORS.map(s => s.symbol), 'SPY'];
    const quotes = await Promise.all(allSymbols.map(s => getQuote(s)));
    
    const validQuotes = quotes.filter(q => q !== null);
    const spyQuote = validQuotes.find(q => q?.symbol === 'SPY');
    const spyChange = spyQuote?.change || 0;

    const data = SECTORS.map(sector => {
      const quote = validQuotes.find(q => q?.symbol === sector.symbol);
      const change = quote?.change || 0;
      
      // Relative Strength Calculation: Sector Change - SPY Change
      // If Tech is +2% and SPY is +1%, RS is +1% (Outperforming)
      const relativeStrength = change - spyChange;
      
      return {
        ...sector,
        price: quote?.price || 0,
        change: change,
        relativeStrength: relativeStrength,
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
    return NextResponse.json({ error: 'Failed to fetch market data', details: String(error) }, { status: 500 });
  }
}
