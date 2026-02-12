'use client';

import { Activity, Zap, BarChart3, RefreshCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

interface Opportunity {
  symbol: string;
  price: number;
  date: string;
  isInsideBar: boolean;
  isNR7: boolean;
  volume: number;
  rsi: number | null;
  trend: 'Up' | 'Down';
}

interface Props {
  data: Opportunity[];
  isLoading: boolean;
}

export default function ScannerTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="w-full h-[300px] flex flex-col justify-center items-center text-orange-500 font-mono text-sm tracking-wide bg-black/50 border border-orange-500/20 animate-pulse">
        <span>> SCANNING MARKET DATA...</span>
        <span className="text-[10px] text-zinc-600 mt-2">PROCESSING 100+ TICKERS</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[150px] flex flex-col items-center justify-center text-orange-500 border border-dashed border-zinc-800 bg-zinc-950/20 font-mono">
        <span className="text-xl font-bold mb-2">NO PATTERNS DETECTED</span>
        <span className="text-xs text-zinc-500">MARKET CONDITIONS QUIET. AWAITING VOLATILITY.</span>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-black border-l border-r border-zinc-900 custom-scrollbar relative">
      <table className="w-full text-left text-xs font-mono tracking-tight border-collapse">
        <thead className="bg-zinc-900 text-orange-500 sticky top-0 z-10 border-b border-orange-500/30">
          <tr>
            <th className="px-2 py-1.5 uppercase font-normal">TICKER</th>
            <th className="px-2 py-1.5 uppercase font-normal text-right">PRICE</th>
            <th className="px-2 py-1.5 uppercase font-normal text-center">TREND</th>
            <th className="px-2 py-1.5 uppercase font-normal text-center">RSI(14)</th>
            <th className="px-2 py-1.5 uppercase font-normal text-center">SETUP</th>
            <th className="px-2 py-1.5 uppercase font-normal text-right">VOL (M)</th>
            <th className="px-2 py-1.5 text-right w-[60px]">CMD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/50 bg-black">
          {data.map((item, idx) => {
            const isRsiHigh = item.rsi && item.rsi > 70;
            const isRsiLow = item.rsi && item.rsi < 30;
            const rowClass = idx % 2 === 0 ? 'bg-zinc-950/30' : 'bg-black'; // Zebra striping

            return (
              <tr key={item.symbol} className={`${rowClass} hover:bg-zinc-900 transition-colors cursor-pointer group`}>
                <td className="px-2 py-1 font-bold text-orange-400 border-r border-zinc-900/50">{item.symbol}</td>
                <td className="px-2 py-1 text-right border-r border-zinc-900/50 tabular-nums text-zinc-300">
                  {item.price.toFixed(2)}
                </td>
                <td className="px-2 py-1 text-center border-r border-zinc-900/50">
                  <span className={item.trend === 'Up' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {item.trend === 'Up' ? '▲' : '▼'}
                  </span>
                </td>
                <td className="px-2 py-1 text-center border-r border-zinc-900/50 tabular-nums">
                  <span className={`px-1 ${
                    isRsiHigh ? 'bg-red-900 text-red-100 font-bold' : 
                    isRsiLow ? 'bg-green-900 text-green-100 font-bold' : 
                    'text-zinc-500'
                  }`}>
                    {item.rsi?.toFixed(0) || '--'}
                  </span>
                </td>
                <td className="px-2 py-1 text-center border-r border-zinc-900/50 font-bold text-[10px]">
                  {item.isInsideBar && <span className="bg-yellow-600 text-black px-1 mr-1">INSIDE</span>}
                  {item.isNR7 && <span className="bg-cyan-600 text-black px-1 mr-1">NR7</span>}
                  {isRsiHigh && !item.isInsideBar && !item.isNR7 && <span className="text-red-500">O/BOUGHT</span>}
                  {isRsiLow && !item.isInsideBar && !item.isNR7 && <span className="text-green-500">O/SOLD</span>}
                </td>
                <td className="px-2 py-1 text-right border-r border-zinc-900/50 text-zinc-400 tabular-nums">
                  {(item.volume / 1000000).toFixed(1)}
                </td>
                <td className="px-2 py-1 text-right">
                  <a 
                    href={`https://finance.yahoo.com/quote/${item.symbol}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 hover:text-blue-300 hover:underline uppercase"
                  >
                    [OPEN]
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
