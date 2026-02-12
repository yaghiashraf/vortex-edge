'use client';

import { ArrowRight, Crosshair, TrendingUp, TrendingDown, Activity } from 'lucide-react';

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
      <div className="w-full h-[300px] flex items-center justify-center text-slate-500 animate-pulse">
        Scanning 100+ assets for volatility & momentum...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[150px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-lg bg-slate-900/20">
        <Crosshair className="w-8 h-8 mb-2 opacity-50" />
        <p>No high-probability setups detected today.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
      <table className="w-full text-left text-sm min-w-[600px]">
        <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 font-medium">Symbol</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Trend</th>
            <th className="px-4 py-3 font-medium">RSI (14)</th>
            <th className="px-4 py-3 font-medium">Setup</th>
            <th className="px-4 py-3 font-medium text-right">Volume</th>
            <th className="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {data.map((item) => (
            <tr key={item.symbol} className="hover:bg-slate-800/30 transition-colors group">
              <td className="px-4 py-3 font-bold text-slate-100">{item.symbol}</td>
              <td className="px-4 py-3 text-slate-300 font-mono">${item.price.toFixed(2)}</td>
              <td className="px-4 py-3">
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full w-fit text-xs font-medium ${
                  item.trend === 'Up' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {item.trend === 'Up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {item.trend}
                </div>
              </td>
              <td className="px-4 py-3 font-mono">
                <span className={`px-2 py-0.5 rounded ${
                  item.rsi && item.rsi > 70 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                  item.rsi && item.rsi < 30 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  'text-slate-400'
                }`}>
                  {item.rsi?.toFixed(1) || '--'}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2 flex-wrap">
                  {item.isInsideBar && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_10px_-3px_rgba(234,179,8,0.3)]">
                      Inside Bar
                    </span>
                  )}
                  {item.isNR7 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_-3px_rgba(34,211,238,0.3)]">
                      NR7
                    </span>
                  )}
                  {/* If no specific bar pattern but extreme RSI */}
                  {!item.isInsideBar && !item.isNR7 && item.rsi && item.rsi > 70 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/30 text-red-300 border border-red-800/50">
                      <Activity className="w-3 h-3" /> Overbought
                    </span>
                  )}
                  {!item.isInsideBar && !item.isNR7 && item.rsi && item.rsi < 30 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
                      <Activity className="w-3 h-3" /> Oversold
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right text-slate-400 font-mono text-xs">
                {(item.volume / 1000000).toFixed(1)}M
              </td>
              <td className="px-4 py-3 text-right">
                <a 
                  href={`https://finance.yahoo.com/quote/${item.symbol}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Analyze <ArrowRight className="w-3 h-3" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
