'use client';

import { Activity, ArrowUpDown, ChevronUp, ChevronDown, BarChart2, Zap } from 'lucide-react';
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
  atrPct?: number;
  zScore?: number;
}

interface Props {
  data: Opportunity[];
  isLoading: boolean;
}

type SortKey = 'symbol' | 'price' | 'trend' | 'rsi' | 'rvol' | 'atrPct' | 'zScore' | 'setup';
type SortDirection = 'asc' | 'desc';

export default function ScannerTable({ data, isLoading }: Props) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'setup',
    direction: 'desc'
  });

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'desc';
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
          if (item.isInsideBar) s += 10;
          if (item.isNR7) s += 10;
          if (item.rvol && item.rvol > 1.2) s += 5;
          if (item.rsi && (item.rsi > 70 || item.rsi < 30)) s += 5;
          if (item.zScore && Math.abs(item.zScore) > 2) s += 3;
          return s;
        };
        aVal = score(a);
        bVal = score(b);
      } else {
        aVal = a[sortConfig.key as keyof Opportunity];
        bVal = b[sortConfig.key as keyof Opportunity];
      }

      if (aVal === undefined || aVal === null) aVal = -Infinity;
      if (bVal === undefined || bVal === null) bVal = -Infinity;

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  if (isLoading && data.length === 0) {
    return null;
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
            <SortHeader label="RVOL" sortKey="rvol" currentSort={sortConfig} onSort={handleSort} align="center" />
            <SortHeader label="ATR%" sortKey="atrPct" currentSort={sortConfig} onSort={handleSort} align="center" />
            <SortHeader label="Z-SCORE" sortKey="zScore" currentSort={sortConfig} onSort={handleSort} align="center" />
            <SortHeader label="SETUP / SIGNAL" sortKey="setup" currentSort={sortConfig} onSort={handleSort} align="left" paddingLeft="pl-4" />
            <th className="px-3 py-2 uppercase font-normal text-right text-zinc-400 border-b border-orange-500/30 pr-4 cursor-default">VOL (M)</th>
          </tr>
        </thead>
        <tbody className="bg-black">
          {sortedData.map((item, idx) => {
            const isRsiHigh = item.rsi && item.rsi > 70;
            const isRsiLow = item.rsi && item.rsi < 30;
            const isHighRvol = item.rvol && item.rvol > 1.2;
            const isZScoreExtreme = item.zScore && Math.abs(item.zScore) > 2;
            const isHighAtrPct = item.atrPct && item.atrPct > 3;

            const isPattern = item.isInsideBar || item.isNR7;
            const isConfluence = isPattern && (isHighRvol || isRsiHigh || isRsiLow);

            let bgClass = idx % 2 === 0 ? 'bg-zinc-950/30' : 'bg-black';
            let borderClass = 'border-b border-zinc-900/30';
            let textClass = 'text-zinc-300';

            if (isConfluence) {
              bgClass = 'bg-indigo-950/30 hover:bg-indigo-900/40';
              textClass = 'text-indigo-100 font-bold';
            } else if (isPattern) {
              bgClass = 'bg-orange-950/20 hover:bg-orange-900/30';
              textClass = 'text-orange-100';
            }

            return (
              <tr key={item.symbol} className={`${bgClass} hover:bg-zinc-900 transition-colors cursor-default group h-8 relative`}>
                <td className={`px-3 py-1 font-bold border-r border-zinc-900/50 ${borderClass} relative ${isConfluence ? 'text-indigo-400' : isPattern ? 'text-orange-400' : 'text-zinc-400'}`}>
                  {isConfluence && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 animate-pulse"></div>}
                  {!isConfluence && isPattern && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
                  {item.symbol}
                </td>

                <td className={`px-3 py-1 text-right border-r border-zinc-900/50 tabular-nums ${textClass} ${borderClass}`}>
                  {item.price.toFixed(2)}
                </td>

                <td className={`px-3 py-1 text-center border-r border-zinc-900/50 ${borderClass}`}>
                  <span className={item.trend === 'Up' ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                    {item.trend === 'Up' ? '▲' : '▼'}
                  </span>
                </td>

                <td className={`px-3 py-1 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                  <span className={`px-1 rounded-sm ${
                    isRsiHigh ? 'bg-red-900/50 text-red-200 font-bold' :
                    isRsiLow ? 'bg-green-900/50 text-green-200 font-bold' :
                    'text-zinc-500'
                  }`}>
                    {item.rsi?.toFixed(0) || '--'}
                  </span>
                </td>

                <td className={`px-3 py-1 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                  <span className={`font-bold ${item.rvol && item.rvol > 1.5 ? 'text-blue-400' : 'text-zinc-600'}`}>
                     {item.rvol ? item.rvol.toFixed(1) + 'x' : '-'}
                  </span>
                </td>

                {/* ATR% — Expected daily range as % of price. >3% = high volatility (day-tradeable). */}
                <td className={`px-3 py-1 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                  <span className={`font-bold ${isHighAtrPct ? 'text-amber-400' : 'text-zinc-600'}`}>
                    {item.atrPct ? item.atrPct.toFixed(1) + '%' : '-'}
                  </span>
                </td>

                <td className={`px-3 py-1 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                   <span className={`${isZScoreExtreme ? 'text-purple-400 font-bold' : 'text-zinc-600'}`}>
                     {item.zScore ? item.zScore.toFixed(1) : '-'}
                   </span>
                </td>

                <td className={`px-3 py-1 text-left border-r border-zinc-900/50 font-bold text-[10px] pl-4 ${borderClass}`}>
                  <div className="flex items-center gap-2">
                    {item.isInsideBar && <span className="bg-yellow-600 text-black px-1.5 py-0.5 rounded-sm shadow-sm shadow-yellow-500/20">INSIDE</span>}
                    {item.isNR7 && <span className="bg-cyan-600 text-black px-1.5 py-0.5 rounded-sm shadow-sm shadow-cyan-500/20">NR7</span>}

                    {isHighRvol && isPattern && <span className="text-blue-400 flex items-center gap-1"><BarChart2 className="w-3 h-3"/> VOL+</span>}
                    {isRsiHigh && isPattern && <span className="text-red-400 flex items-center gap-1"><Activity className="w-3 h-3"/> OB</span>}
                    {isRsiLow && isPattern && <span className="text-green-400 flex items-center gap-1"><Activity className="w-3 h-3"/> OS</span>}

                    {!isPattern && isRsiHigh && <span className="text-red-500">O/BOUGHT</span>}
                    {!isPattern && isRsiLow && <span className="text-green-500">O/SOLD</span>}
                    {!isPattern && isHighRvol && <span className="text-blue-500">VOL SPIKE</span>}
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
