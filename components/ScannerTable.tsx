'use client';

import { ArrowRight, Crosshair, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';

interface Opportunity {
  symbol: string;
  price: number;
  date: string;
  isInsideBar: boolean;
  isNR7: boolean;
  volume: number;
}

interface Props {
  data: Opportunity[];
  isLoading: boolean;
}

export default function ScannerTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-slate-500 animate-pulse">
        Scanning market data...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full h-[150px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-lg bg-slate-900/20">
        <Crosshair className="w-8 h-8 mb-2 opacity-50" />
        <p>No volatility patterns detected today.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/50">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-800/50 text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Symbol</th>
            <th className="px-4 py-3 font-medium">Price</th>
            <th className="px-4 py-3 font-medium">Setup</th>
            <th className="px-4 py-3 font-medium text-right">Volume</th>
            <th className="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {data.map((item) => (
            <tr key={item.symbol} className="hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3 font-bold text-slate-100">{item.symbol}</td>
              <td className="px-4 py-3 text-slate-300">${item.price.toFixed(2)}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {item.isInsideBar && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                      Inside Bar
                    </span>
                  )}
                  {item.isNR7 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      NR7
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right text-slate-400">
                {(item.volume / 1000000).toFixed(1)}M
              </td>
              <td className="px-4 py-3 text-right">
                <a 
                  href={`https://finance.yahoo.com/quote/${item.symbol}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline"
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
