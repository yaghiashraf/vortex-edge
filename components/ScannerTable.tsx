'use client';

import { Activity, ArrowUpDown, ChevronUp, ChevronDown, BarChart2, Search, X } from 'lucide-react';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';

interface Opportunity {
  symbol: string;
  price: number;
  change: number;
  date: string;
  isInsideBar: boolean;
  isNR7: boolean;
  volume: number;
  rsi: number | null;
  trend: 'Up' | 'Down';
  rvol?: number;
  atr?: number;
  atrPct?: number;
  gapPct?: number;
  dollarVol?: number;
  zScore?: number;
}

interface Props {
  data: Opportunity[];
  isLoading: boolean;
}

type SortKey = 'symbol' | 'price' | 'change' | 'trend' | 'rsi' | 'rvol' | 'atrPct' | 'gapPct' | 'zScore' | 'dollarVol' | 'setup';
type SortDirection = 'asc' | 'desc';

export default function ScannerTable({ data, isLoading }: Props) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'setup', direction: 'desc'
  });
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  // Keyboard shortcut: / to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !showSearch) {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSearch]);

  useEffect(() => {
    if (showSearch && searchRef.current) searchRef.current.focus();
  }, [showSearch]);

  const score = useCallback((item: Opportunity) => {
    let s = 0;
    if (item.isInsideBar) s += 10;
    if (item.isNR7) s += 10;
    if (item.rvol && item.rvol > 1.2) s += 5;
    if (item.rsi && (item.rsi > 70 || item.rsi < 30)) s += 5;
    if (item.zScore && Math.abs(item.zScore) > 2) s += 3;
    return s;
  }, []);

  const filteredAndSorted = useMemo(() => {
    if (!data) return [];

    let filtered = data;
    if (search.trim()) {
      const q = search.trim().toUpperCase();
      filtered = data.filter(d => d.symbol.includes(q));
    }

    return [...filtered].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortConfig.key === 'setup') {
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
  }, [data, sortConfig, search, score]);

  if (isLoading && data.length === 0) return null;

  return (
    <div className="h-full w-full flex flex-col bg-black relative">
      {/* Search Bar */}
      {showSearch && (
        <div className="h-9 flex items-center gap-2 px-3 bg-zinc-950 border-b border-zinc-800 shrink-0 animate-in">
          <Search className="w-3 h-3 text-zinc-500" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value.toUpperCase())}
            placeholder="SEARCH TICKER..."
            className="flex-1 bg-transparent text-xs font-mono text-zinc-200 outline-none placeholder:text-zinc-700 tracking-wider"
            spellCheck={false}
          />
          <span className="text-[9px] text-zinc-600">{filteredAndSorted.length} RESULTS</span>
          <button onClick={() => { setShowSearch(false); setSearch(''); }} className="text-zinc-600 hover:text-orange-500 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Table */}
      <div ref={tableRef} className="flex-1 overflow-y-auto bg-black border-l border-r border-zinc-900 custom-scrollbar scroll-smooth">
        <table className="w-full text-left text-xs font-mono tracking-tight border-separate border-spacing-0">
          <thead className="bg-zinc-900 text-orange-500 sticky top-0 z-20 shadow-md shadow-black/50">
            <tr>
              <SortHeader label="TICKER" sortKey="symbol" currentSort={sortConfig} onSort={handleSort} align="left" />
              <SortHeader label="PRICE" sortKey="price" currentSort={sortConfig} onSort={handleSort} align="right" />
              <SortHeader label="CHG%" sortKey="change" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortHeader label="GAP%" sortKey="gapPct" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortHeader label="RSI" sortKey="rsi" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortHeader label="RVOL" sortKey="rvol" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortHeader label="ATR%" sortKey="atrPct" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortHeader label="Z-SCR" sortKey="zScore" currentSort={sortConfig} onSort={handleSort} align="center" />
              <SortHeader label="SETUP" sortKey="setup" currentSort={sortConfig} onSort={handleSort} align="left" paddingLeft="pl-3" />
              <SortHeader label="$VOL" sortKey="dollarVol" currentSort={sortConfig} onSort={handleSort} align="right" />
            </tr>
          </thead>
          <tbody className="bg-black">
            {filteredAndSorted.map((item, idx) => {
              const isRsiHigh = item.rsi && item.rsi > 70;
              const isRsiLow = item.rsi && item.rsi < 30;
              const isHighRvol = item.rvol && item.rvol > 1.2;
              const isZScoreExtreme = item.zScore && Math.abs(item.zScore) > 2;
              const isHighAtrPct = item.atrPct && item.atrPct > 3;
              const isBigGap = item.gapPct && Math.abs(item.gapPct) > 1;
              const isHighDolVol = item.dollarVol && item.dollarVol > 500;

              const isPattern = item.isInsideBar || item.isNR7;
              const isConfluence = isPattern && (isHighRvol || isRsiHigh || isRsiLow);

              let bgClass = idx % 2 === 0 ? 'bg-zinc-950/30' : 'bg-black';
              let textClass = 'text-zinc-300';
              if (isConfluence) {
                bgClass = 'bg-indigo-950/30 hover:bg-indigo-900/40';
                textClass = 'text-indigo-100 font-bold';
              } else if (isPattern) {
                bgClass = 'bg-orange-950/20 hover:bg-orange-900/30';
                textClass = 'text-orange-100';
              }
              const borderClass = 'border-b border-zinc-900/30';

              return (
                <tr key={item.symbol} className={`${bgClass} hover:bg-zinc-900 transition-all duration-150 cursor-default group h-7 relative row-animate`} style={{ animationDelay: `${Math.min(idx * 15, 300)}ms` }}>
                  {/* TICKER */}
                  <td className={`px-3 py-0.5 font-bold border-r border-zinc-900/50 ${borderClass} relative ${isConfluence ? 'text-indigo-400' : isPattern ? 'text-orange-400' : 'text-zinc-400'}`}>
                    {isConfluence && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 animate-pulse"></div>}
                    {!isConfluence && isPattern && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
                    {item.symbol}
                  </td>

                  {/* PRICE */}
                  <td className={`px-2 py-0.5 text-right border-r border-zinc-900/50 tabular-nums ${textClass} ${borderClass}`}>
                    {item.price.toFixed(2)}
                  </td>

                  {/* CHG% */}
                  <td className={`px-2 py-0.5 text-center border-r border-zinc-900/50 tabular-nums font-bold ${borderClass}`}>
                    <span className={item.change >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                    </span>
                  </td>

                  {/* GAP% */}
                  <td className={`px-2 py-0.5 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                    <span className={`${isBigGap ? (item.gapPct! > 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold') : 'text-zinc-600'}`}>
                      {item.gapPct != null ? `${item.gapPct > 0 ? '+' : ''}${item.gapPct.toFixed(1)}%` : '-'}
                    </span>
                  </td>

                  {/* RSI */}
                  <td className={`px-2 py-0.5 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                    <span className={`px-1 rounded-sm ${isRsiHigh ? 'bg-red-900/50 text-red-200 font-bold' : isRsiLow ? 'bg-green-900/50 text-green-200 font-bold' : 'text-zinc-500'}`}>
                      {item.rsi?.toFixed(0) || '--'}
                    </span>
                  </td>

                  {/* RVOL */}
                  <td className={`px-2 py-0.5 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                    <span className={`font-bold ${item.rvol && item.rvol > 1.5 ? 'text-blue-400' : 'text-zinc-600'}`}>
                      {item.rvol ? item.rvol.toFixed(1) + 'x' : '-'}
                    </span>
                  </td>

                  {/* ATR% */}
                  <td className={`px-2 py-0.5 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                    <span className={`font-bold ${isHighAtrPct ? 'text-amber-400' : 'text-zinc-600'}`}>
                      {item.atrPct ? item.atrPct.toFixed(1) + '%' : '-'}
                    </span>
                  </td>

                  {/* Z-SCORE */}
                  <td className={`px-2 py-0.5 text-center border-r border-zinc-900/50 tabular-nums ${borderClass}`}>
                    <span className={`${isZScoreExtreme ? 'text-purple-400 font-bold' : 'text-zinc-600'}`}>
                      {item.zScore ? item.zScore.toFixed(1) : '-'}
                    </span>
                  </td>

                  {/* SETUP */}
                  <td className={`px-2 py-0.5 text-left border-r border-zinc-900/50 font-bold text-[10px] pl-3 ${borderClass}`}>
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      {item.isInsideBar && <span className="bg-yellow-600 text-black px-1 py-0 rounded-sm text-[9px]">IB</span>}
                      {item.isNR7 && <span className="bg-cyan-600 text-black px-1 py-0 rounded-sm text-[9px]">NR7</span>}
                      {isHighRvol && isPattern && <span className="text-blue-400 text-[9px]">V+</span>}
                      {isRsiHigh && isPattern && <span className="text-red-400 text-[9px]">OB</span>}
                      {isRsiLow && isPattern && <span className="text-green-400 text-[9px]">OS</span>}
                      {!isPattern && isRsiHigh && <span className="text-red-500 text-[9px]">OB</span>}
                      {!isPattern && isRsiLow && <span className="text-green-500 text-[9px]">OS</span>}
                      {!isPattern && isHighRvol && <span className="text-blue-500 text-[9px]">VOL</span>}
                    </div>
                  </td>

                  {/* $VOL */}
                  <td className={`px-2 py-0.5 text-right tabular-nums pr-3 ${borderClass}`}>
                    <span className={`${isHighDolVol ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      {item.dollarVol != null ? (item.dollarVol >= 1000 ? `${(item.dollarVol / 1000).toFixed(1)}B` : `${item.dollarVol.toFixed(0)}M`) : '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortHeader({ label, sortKey, currentSort, onSort, align = 'left', paddingLeft = '' }: any) {
  const isActive = currentSort.key === sortKey;
  return (
    <th
      className={`px-2 py-1.5 uppercase font-normal text-zinc-400 border-b border-orange-500/30 cursor-pointer hover:text-orange-400 select-none text-${align} ${paddingLeft} text-[10px]`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-0.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
        {label}
        <span className="w-3 h-3 flex items-center justify-center">
          {isActive ? (
            currentSort.direction === 'asc' ? <ChevronUp className="w-2.5 h-2.5 text-orange-500" /> : <ChevronDown className="w-2.5 h-2.5 text-orange-500" />
          ) : (
            <ArrowUpDown className="w-2 h-2 text-zinc-700 opacity-50" />
          )}
        </span>
      </div>
    </th>
  );
}
