'use client';

import { Activity } from 'lucide-react';

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
      <div className="w-full h-full flex flex-col justify-center items-center text-orange-500 font-mono text-sm tracking-wide bg-black/50 border border-orange-500/20 animate-pulse">
        <span>[+] SCANNING MARKET DATA...</span>
        <span className="text-[10px] text-zinc-600 mt-2">PROCESSING 100+ TICKERS</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-orange-500 border border-dashed border-zinc-800 bg-zinc-950/20 font-mono">
        <span className="text-xl font-bold mb-2">NO PATTERNS DETECTED</span>
        <span className="text-xs text-zinc-500">MARKET CONDITIONS QUIET. AWAITING VOLATILITY.</span>
      </div>
    );
  }

  return (
    // Crucial: Parent container must handle overflow correctly
    <div className="h-full w-full overflow-y-auto bg-black border-l border-r border-zinc-900 custom-scrollbar relative">
      <table className="w-full text-left text-xs font-mono tracking-tight border-collapse sticky top-0">
        <thead className="bg-zinc-900 text-orange-500 sticky top-0 z-20 border-b border-orange-500/30 shadow-md shadow-black/50">
          <tr>
            <th className="px-3 py-2 uppercase font-normal text-zinc-400">TICKER</th>
            <th className="px-3 py-2 uppercase font-normal text-right text-zinc-400">PRICE</th>
            <th className="px-3 py-2 uppercase font-normal text-center text-zinc-400">TREND</th>
            <th className="px-3 py-2 uppercase font-normal text-center text-zinc-400">RSI(14)</th>
            <th className="px-3 py-2 uppercase font-normal text-left text-zinc-400 pl-6">SETUP / SIGNAL</th>
            <th className="px-3 py-2 uppercase font-normal text-right text-zinc-400 pr-4">VOL (M)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/30 bg-black">
          {data.map((item, idx) => {
            const isRsiHigh = item.rsi && item.rsi > 70;
            const isRsiLow = item.rsi && item.rsi < 30;
            
            // Highlight Logic: If InsideBar or NR7, apply a stronger highlight
            const isSetup = item.isInsideBar || item.isNR7;
            const rowClass = isSetup 
              ? 'bg-orange-950/20 hover:bg-orange-900/30 border-l-2 border-orange-500' // Highlight active setup rows
              : idx % 2 === 0 ? 'bg-zinc-950/30 hover:bg-zinc-900' : 'bg-black hover:bg-zinc-900'; // Standard zebra

            return (
              <tr key={item.symbol} className={`${rowClass} transition-colors cursor-default group h-8`}>
                <td className={`px-3 py-1 font-bold ${isSetup ? 'text-white' : 'text-orange-400/80'} border-r border-zinc-900/50`}>
                  {item.symbol}
                </td>
                <td className="px-3 py-1 text-right border-r border-zinc-900/50 tabular-nums text-zinc-300">
                  {item.price.toFixed(2)}
                </td>
                <td className="px-3 py-1 text-center border-r border-zinc-900/50">
                  <span className={item.trend === 'Up' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {item.trend === 'Up' ? '▲' : '▼'}
                  </span>
                </td>
                <td className="px-3 py-1 text-center border-r border-zinc-900/50 tabular-nums">
                  <span className={`px-1 rounded-sm ${
                    isRsiHigh ? 'bg-red-900 text-red-100 font-bold' : 
                    isRsiLow ? 'bg-green-900 text-green-100 font-bold' : 
                    'text-zinc-500'
                  }`}>
                    {item.rsi?.toFixed(0) || '--'}
                  </span>
                </td>
                <td className="px-3 py-1 text-left border-r border-zinc-900/50 font-bold text-[10px] pl-6">
                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {item.isInsideBar && <span className="bg-yellow-600 text-black px-1.5 py-0.5 rounded-sm shadow-sm shadow-yellow-500/20">INSIDE</span>}
                    {item.isNR7 && <span className="bg-cyan-600 text-black px-1.5 py-0.5 rounded-sm shadow-sm shadow-cyan-500/20">NR7</span>}
                    
                    {/* Secondary Signals (Only show if no main setup to avoid clutter, or combine?) */}
                    {!item.isInsideBar && !item.isNR7 && isRsiHigh && <span className="text-red-500 flex items-center gap-1"><Activity className="w-3 h-3"/> O/BOUGHT</span>}
                    {!item.isInsideBar && !item.isNR7 && isRsiLow && <span className="text-green-500 flex items-center gap-1"><Activity className="w-3 h-3"/> O/SOLD</span>}
                  </div>
                </td>
                <td className="px-3 py-1 text-right border-r border-zinc-900/50 text-zinc-400 tabular-nums pr-4">
                  {(item.volume / 1000000).toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
