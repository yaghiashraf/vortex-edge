'use client';

import { Activity, ArrowUpDown, ChevronUp, ChevronDown, BarChart2 } from 'lucide-react';
import { useState, useMemo } from 'react';

interface Opportunity {
  symbol: string;
  price: number;
  date: string;
  isInsideBar: boolean;
  isNR7: boolean;
  volume: number;
  rsi: number | null;
  trend: 'Up' | 'Down';
  rvol?: number;
  atr?: number;
}

interface Props {
  data: Opportunity[];
  isLoading: boolean;
}

type SortKey = 'symbol' | 'price' | 'trend' | 'rsi' | 'rvol' | 'atr' | 'setup';
type SortDirection = 'asc' | 'desc';

export default function ScannerTable({ data, isLoading }: Props) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'setup',
    direction: 'desc'
  });

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'desc'; // Default to Descending for numbers
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!data) return [];
    
    return [...data].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortConfig.key === 'setup') {
        const score = (item: Opportunity) => {
          let s = 0;
          if (item.isInsideBar) s += 3;
          if (item.isNR7) s += 2;
          if (item.rvol && item.rvol > 2.0) s += 1.5; // High RVOL boosts rank
          if (item.rsi && (item.rsi > 70 || item.rsi < 30)) s += 1;
          return s;
        };
        aVal = score(a);
        bVal = score(b);
      } else {
        const propKey = keyToProp(sortConfig.key);
        aVal = a[propKey as keyof Opportunity];
        bVal = b[propKey as keyof Opportunity];
      }

      if (aVal === undefined || aVal === null) aVal = -Infinity;
      if (bVal === undefined || bVal === null) bVal = -Infinity;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center text-orange-500 font-mono text-sm tracking-wide bg-black/50 border border-orange-500/20 animate-pulse">
        <span>[+] SCANNING MARKET DATA...</span>
        <span className="text-[10px] text-zinc-600 mt-2">PROCESSING 200+ TICKERS</span>
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
    <div className="h-full w-full overflow-y-auto bg-black border-l border-r border-zinc-900 custom-scrollbar relative">
      <table className="w-full text-left text-xs font-mono tracking-tight border-separate border-spacing-0">
        <thead className="bg-zinc-900 text-orange-500 sticky top-0 z-20 shadow-md shadow-black/50">
          <tr>
            <SortHeader label="TICKER" sortKey="symbol" currentSort={sortConfig} onSort={handleSort} align="left" />
            <SortHeader label="PRICE" sortKey="price" currentSort={sortConfig} onSort={handleSort} align="right" />
            <SortHeader label="TREND" sortKey="trend" currentSort={sortConfig} onSort={handleSort} align="center" />
            <SortHeader label="RSI(14)" sortKey="rsi" currentSort={sortConfig} onSort={handleSort} align="center" />
            
            {/* New Columns */}
            <SortHeader label="RVOL" sortKey="rvol" currentSort={sortConfig} onSort={handleSort} align="center" />
            <SortHeader label="ATR(14)" sortKey="atr" currentSort={sortConfig} onSort={handleSort} align="center" />
            
            <SortHeader label="SETUP / SIGNAL" sortKey="setup" currentSort={sortConfig} onSort={handleSort} align="left" paddingLeft="pl-4" />
            <th className="px-3 py-2 uppercase font-normal text-right text-zinc-400 border-b border-orange-500/30 pr-4 cursor-default">VOL (M)</th>
          </tr>
        </thead>
        <tbody className="bg-black">
          {sortedData.map((item, idx) => {
            const isRsiHigh = item.rsi && item.rsi > 70;
            const isRsiLow = item.rsi && item.rsi < 30;
            const isHighRvol = item.rvol && item.rvol > 1.5;
            
            const isSetup = item.isInsideBar || item.isNR7;
            
            let bgClass = idx % 2 === 0 ? 'bg-zinc-950/30' : 'bg-black';
            let borderClass = 'border-b border-zinc-900/30';
            
            if (isSetup) {
              bgClass = 'bg-orange-950/30';
            } else if (isHighRvol) {
               bgClass = 'bg-blue-950/20'; // Distinct color for high volume plays
            }

            return (
              <tr key={item.symbol} className={`${bgClass} hover:bg-zinc-900 transition-colors cursor-default group h-8 relative`}>
                {/* Ticker Cell */}
                <td className={`px-3 py-1 font-bold ${isSetup ? 'text-white' : 'text-orange-400/80'} border-r border-zinc-900/50 ${borderClass} relative`}>
                  {isSetup && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
                  {!isSetup && isHighRvol && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                  {item.symbol}
                </td>
                
                <td className={`px-3 py-1 text-right border-r border-zinc-900/50 tabular-nums text-zinc-300 ${borderClass}`}>
                  {item.price.toFixed(2)}
                </td>
                
                <td className={`px-3 py-1 text-center border-r border-zinc-900/50 ${borderClass}`}>
                  <span className={item.trend === 'Up' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {item.trend === 'Up' ? '▲' : '▼'}
                  </span>
                </td>
                
                <td className={`px-3 py-1 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                  <span className={`px-1 rounded-sm ${
                    isRsiHigh ? 'bg-red-900 text-red-100 font-bold' : 
                    isRsiLow ? 'bg-green-900 text-green-100 font-bold' : 
                    'text-zinc-500'
                  }`}>
                    {item.rsi?.toFixed(0) || '--'}
                  </span>
                </td>

                {/* RVOL Column */}
                <td className={`px-3 py-1 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                  <span className={`font-bold ${item.rvol && item.rvol > 2.0 ? 'text-blue-400' : item.rvol && item.rvol > 1.2 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                     {item.rvol ? item.rvol.toFixed(1) + 'x' : '-'}
                  </span>
                </td>

                {/* ATR Column */}
                <td className={`px-3 py-1 text-center border-r border-zinc-900/50 tabular-nums text-zinc-500 ${borderClass}`}>
                   {item.atr ? item.atr.toFixed(2) : '-'}
                </td>
                
                <td className={`px-3 py-1 text-left border-r border-zinc-900/50 font-bold text-[10px] pl-4 ${borderClass}`}>
                  <div className="flex items-center gap-2">
                    {item.isInsideBar && <span className="bg-yellow-600 text-black px-1.5 py-0.5 rounded-sm shadow-sm shadow-yellow-500/20">INSIDE</span>}
                    {item.isNR7 && <span className="bg-cyan-600 text-black px-1.5 py-0.5 rounded-sm shadow-sm shadow-cyan-500/20">NR7</span>}
                    
                    {!item.isInsideBar && !item.isNR7 && isRsiHigh && <span className="text-red-500 flex items-center gap-1"><Activity className="w-3 h-3"/> O/BOUGHT</span>}
                    {!item.isInsideBar && !item.isNR7 && isRsiLow && <span className="text-green-500 flex items-center gap-1"><Activity className="w-3 h-3"/> O/SOLD</span>}
                    {!item.isInsideBar && !item.isNR7 && isHighRvol && <span className="text-blue-500 flex items-center gap-1"><BarChart2 className="w-3 h-3"/> VOL_SPIKE</span>}
                  </div>
                </td>
                
                <td className={`px-3 py-1 text-right border-r border-zinc-900/50 text-zinc-400 tabular-nums pr-4 ${borderClass}`}>
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

function keyToProp(key: SortKey): keyof Opportunity | 'setup' {
  if (key === 'setup') return 'setup';
  return key;
}

function SortHeader({ label, sortKey, currentSort, onSort, align = 'left', paddingLeft = '' }: any) {
  const isActive = currentSort.key === sortKey;
  
  return (
    <th 
      className={`px-3 py-2 uppercase font-normal text-zinc-400 border-b border-orange-500/30 cursor-pointer hover:text-orange-400 select-none text-${align} ${paddingLeft}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {label}
        <span className="w-3 h-3 flex items-center justify-center">
          {isActive ? (
            currentSort.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-orange-500" /> : <ChevronDown className="w-3 h-3 text-orange-500" />
          ) : (
            <ArrowUpDown className="w-2 h-2 text-zinc-600 opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
}
