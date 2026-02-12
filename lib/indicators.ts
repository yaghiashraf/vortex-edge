// vortex-edge/lib/indicators.ts

/**
 * Calculates the Relative Strength Index (RSI).
 * @param closePrices Array of closing prices.
 * @param period Lookback period (default 14).
 */
export function calculateRSI(closePrices: number[], period: number = 14): number | null {
  if (closePrices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  // First RSI calculation
  for (let i = 1; i <= period; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Subsequent calculations (Wilder's Smoothing)
  for (let i = period + 1; i < closePrices.length; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    let gain = 0;
    let loss = 0;
    if (change > 0) gain = change;
    else loss = -change;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculates the Simple Moving Average (SMA).
 * @param closePrices Array of closing prices.
 * @param period Lookback period (default 20).
 */
export function calculateSMA(closePrices: number[], period: number = 20): number | null {
  if (closePrices.length < period) return null;

  // We analyze the END of the array (most recent)
  const slice = closePrices.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

/**
 * Calculates the Average True Range (ATR).
 * @param candles OHLC candles array.
 * @param period Lookback period (default 14).
 */
export function calculateATR(candles: any[], period: number = 14): number | null {
  if (candles.length < period + 1) return null;

  // Function to calculate True Range
  const trueRange = (i: number) => {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  };

  let trSum = 0;
  // First TR sum
  for (let i = 1; i <= period; i++) {
    trSum += trueRange(i);
  }

  let atr = trSum / period;

  // Wilder's Smoothing
  for (let i = period + 1; i < candles.length; i++) {
    atr = ((atr * (period - 1)) + trueRange(i)) / period;
  }

  return atr;
}
