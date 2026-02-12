// vortex-edge/lib/yahoo.ts

export async function fetchYahooData(symbol: string) {
  try {
    // 15 days of daily data is enough for our scanner
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=15d`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 60 } // Cache for 1 min
    });

    if (!res.ok) {
      console.error(`Yahoo fetch failed for ${symbol}: ${res.status}`);
      return null;
    }

    const json = await res.json();
    const result = json.chart?.result?.[0];

    if (!result) return null;

    const meta = result.meta;
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    // Current Quote Data
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    const volume = meta.regularMarketVolume;

    // Daily Candles
    const candles = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000),
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i],
    })).filter((c: any) => c.close !== null); // Filter out empty trading days/periods

    return {
      symbol,
      price: currentPrice,
      change: changePercent,
      volume,
      candles
    };
  } catch (err) {
    console.error(`Error fetching ${symbol}:`, err);
    return null;
  }
}
