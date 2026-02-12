// vortex-edge/lib/yahoo.ts

export async function fetchYahooData(symbol: string) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=20d`;
    
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
    ];
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];

    // Add a 3-second timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': '*/*',
          'Connection': 'keep-alive'
        },
        signal: controller.signal,
        next: { revalidate: 300 } 
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;

      const json = await res.json();
      const result = json.chart?.result?.[0];

      if (!result) return null;

      const meta = result.meta;
      const timestamps = result.timestamp;
      const quote = result.indicators.quote[0];

      if (!timestamps || !quote || !quote.close) return null;

          const currentPrice = meta.regularMarketPrice;
          const previousClose = meta.chartPreviousClose;
          
          if (!previousClose) return null; // Safety check
      
          const change = currentPrice - previousClose;
          const changePercent = (change / previousClose) * 100;
          const volume = meta.regularMarketVolume;
      const candles = timestamps.map((ts: number, i: number) => ({
        date: new Date(ts * 1000),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i],
      })).filter((c: any) => c.close !== null);

      if (candles.length === 0) return null;

      return {
        symbol,
        price: currentPrice,
        change: changePercent,
        volume,
        candles
      };
    } catch (err) {
      clearTimeout(timeoutId);
      return null;
    }
  } catch (err) {
    return null;
  }
}
