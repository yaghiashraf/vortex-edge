// vortex-edge/lib/providers.ts
import { fetchYahooData } from './yahoo';

const AV_KEY = 'WX5AYS32SEE7DE6K';

export async function fetchAlphaVantageQuote(symbol: string) {
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${AV_KEY}`,
      { next: { revalidate: 300 } }
    );
    
    if (!res.ok) return null;
    
    const data = await res.json();
    const quote = data['Global Quote'];
    
    if (!quote || !quote['05. price']) return null;

    // Parse "0.45%" to 0.45
    const changeStr = quote['10. change percent']?.replace('%', '') || '0';
    
    return {
      symbol,
      price: parseFloat(quote['05. price']),
      change: parseFloat(changeStr),
      source: 'AV'
    };
  } catch (err) {
    return null;
  }
}

export async function fetchCompositeQuote(symbol: string) {
  // 1. Try Alpha Vantage first (User Request)
  const av = await fetchAlphaVantageQuote(symbol);
  if (av) return av;

  // 2. Fallback to Yahoo Finance (Robust scraper)
  const yahoo = await fetchYahooData(symbol);
  if (yahoo) {
    return {
      symbol,
      price: yahoo.price,
      change: yahoo.change,
      source: 'YF'
    };
  }

  return null;
}
