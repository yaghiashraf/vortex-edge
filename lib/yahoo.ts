// vortex-edge/lib/yahoo.ts

export async function fetchYahooData(symbol: string) {
  try {
    // Attempt 1: Standard v8 chart
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=15d`;
    
    // Sometimes query2 works better
    // const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=15d`;

    // Headers mimicking a Chrome browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    const res = await fetch(url, { headers, next: { revalidate: 60 } });

    if (!res.ok) {
      console.warn(`Yahoo fetch failed for ${symbol} with status ${res.status}`);
      return null;
    }

    const json = await res.json();
    const result = json.chart?.result?.[0];

    if (!result) {
      console.warn(`Yahoo returned empty result for ${symbol}`);
      return null;
    }

    const meta = result.meta;
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];

    if (!timestamps || !quote || !quote.close) {
       console.warn(`Yahoo returned incomplete data for ${symbol}`);
       return null;
    }

    // Current Quote Data
    const currentPrice = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    const volume = meta.regularMarketVolume;

    // Daily Candles processing
    const candles = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000),
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i],
    })).filter((c: any) => c.close !== null && c.high !== null && c.low !== null); 

    // If candles array is empty
    if (candles.length === 0) return null;

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
