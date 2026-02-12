// vortex-edge/lib/indicators.ts

export function calculateRSI(closePrices: number[], period: number = 14): number | null {
  if (closePrices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closePrices[i] - closePrices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

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

export function calculateSMA(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return sum / period;
}

export function calculateATR(candles: any[], period: number = 14): number | null {
  if (candles.length < period + 1) return null;

  const trueRange = (i: number) => {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  };

  let trSum = 0;
  for (let i = 1; i <= period; i++) {
    trSum += trueRange(i);
  }

  let atr = trSum / period;

  for (let i = period + 1; i < candles.length; i++) {
    atr = ((atr * (period - 1)) + trueRange(i)) / period;
  }

  return atr;
}

/**
 * Calculates the Standard Deviation of an array.
 */
export function calculateStdDev(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const squareDiffs = slice.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / period;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculates Z-Score: (Current Price - SMA) / StdDev
 * Measures how many standard deviations the price is from the mean.
 */
export function calculateZScore(closePrices: number[], period: number = 20): number | null {
  if (closePrices.length < period) return null;
  
  const currentPrice = closePrices[closePrices.length - 1];
  const sma = calculateSMA(closePrices, period);
  const stdDev = calculateStdDev(closePrices, period);

  if (sma === null || stdDev === null || stdDev === 0) return null;

  return (currentPrice - sma) / stdDev;
}
