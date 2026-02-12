// vortex-edge/lib/yahoo.ts

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
];

async function tryFetchYahoo(symbol: string, range: string): Promise<any> {
  const endpoints = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`,
  ];

  for (const url of endpoints) {
    try {
      const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
        next: { revalidate: 60 },
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (!result) continue;

      const meta = result.meta;
      const currentPrice = meta.regularMarketPrice;
      // previousClose = yesterday's close (always daily, regardless of chart range)
      // chartPreviousClose = close before the chart range starts (depends on range param)
      const prevClose = meta.previousClose || meta.chartPreviousClose;

      if (!currentPrice || !prevClose) continue;

      const dailyChange = ((currentPrice - prevClose) / prevClose) * 100;
      const volume = meta.regularMarketVolume || 0;

      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};

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
        change: dailyChange,
        volume,
        candles,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchYahooData(symbol: string, range: string = '1mo') {
  // First attempt
  const result = await tryFetchYahoo(symbol, range);
  if (result) return result;

  // Retry once after a short delay
  await new Promise(r => setTimeout(r, 500));
  return tryFetchYahoo(symbol, range);
}
