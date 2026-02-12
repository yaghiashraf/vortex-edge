// vortex-edge/lib/yahoo.ts

export async function fetchYahooData(symbol: string) {
  // Try query2 first, then query1
  const endpoints = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`, // Reduced range for speed
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`
  ];

  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
  ];

  for (const url of endpoints) {
    try {
      const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout

      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': '*/*',
          'Connection': 'keep-alive'
        },
        signal: controller.signal,
        next: { revalidate: 60 } // Lower cache time
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue; // Try next endpoint

      const json = await res.json();
      const result = json.chart?.result?.[0];

      if (!result) continue;

      const meta = result.meta;
      // Quote might be empty if market just opened or data delay
      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.chartPreviousClose;
      
      if (!currentPrice || !previousClose) continue;

      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;
      const volume = meta.regularMarketVolume || 0;

      // Ensure candles exist if we need them, but for Sector Pulse we just need price/change
      // For scanner we need candles.
      const timestamps = result.timestamp || [];
      const quote = result.indicators.quote[0] || {};
      
      const candles = timestamps.map((ts: number, i: number) => ({
        date: new Date(ts * 1000),
        open: quote.open?.[i] || 0,
        high: quote.high?.[i] || 0,
        low: quote.low?.[i] || 0,
        close: quote.close?.[i] || 0,
        volume: quote.volume?.[i] || 0,
      })).filter((c: any) => c.close > 0);

      return {
        symbol,
        price: currentPrice,
        change: changePercent,
        volume,
        candles
      };

    } catch (err) {
      continue;
    }
  }
  return null;
}
