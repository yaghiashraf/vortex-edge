'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { Activity, BarChart3, Settings, Clock, RefreshCw, Search } from 'lucide-react';
import Image from 'next/image';
import SectorChart from '@/components/SectorChart';
import ScannerTable from '@/components/ScannerTable';

export default function Home() {
  const [sectorData, setSectorData] = useState<any>(null);
  const [scannerData, setScannerData] = useState<any[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingScanner, setLoadingScanner] = useState(false);

  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(395);
  const [startTime, setStartTime] = useState<number>(0);
  const [etr, setEtr] = useState<string>('--');

  const [refreshInterval, setRefreshInterval] = useState(15);
  const [countdown, setCountdown] = useState(refreshInterval * 60);
  const [showSettings, setShowSettings] = useState(false);

  const isScanningRef = useRef(false);

  const marketBreadth = useMemo(() => {
    if (scannerData.length === 0) return { adv: 0, dec: 0, ratio: 0 };
    const adv = scannerData.filter(d => d.change > 0).length;
    const dec = scannerData.filter(d => d.change < 0).length;
    const ratio = dec === 0 ? adv : adv / dec;
    return { adv, dec, ratio };
  }, [scannerData]);

  const fetchSectors = async () => {
    setLoadingSectors(true);
    try {
      const res = await fetch('/api/market-pulse');
      if (res.ok) {
        const data = await res.json();
        setSectorData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSectors(false);
    }
  };

  const fetchScanner = async () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setLoadingScanner(true);
    setScannerData([]);
    setProcessedCount(0);
    setEtr('CALC...');
    const startTs = Date.now();
    setStartTime(startTs);

    let page = 0;
    let hasMore = true;
    const limit = 20;

    try {
      while (hasMore) {
        const res = await fetch(`/api/scanner?page=${page}&limit=${limit}`);
        if (!res.ok) break;
        const data = await res.json();
        if (data.opportunities && data.opportunities.length > 0) {
          setScannerData(prev => [...prev, ...data.opportunities]);
        }
        const scannedSoFar = Math.min((page + 1) * limit, totalCount);
        setProcessedCount(scannedSoFar);
        const elapsed = (Date.now() - startTs) / 1000;
        const rate = scannedSoFar / elapsed;
        const remaining = totalCount - scannedSoFar;
        if (rate > 0) setEtr(`${Math.ceil(remaining / rate)}s`);
        hasMore = data.hasMore;
        page++;
      }
    } catch (err) {
      console.error('Scan failed', err);
    } finally {
      setLoadingScanner(false);
      isScanningRef.current = false;
      setEtr('DONE');
      setProcessedCount(totalCount);
    }
  };

  const fetchAll = () => {
    setCountdown(refreshInterval * 60);
    fetchSectors();
    fetchScanner();
  };

  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
      setCountdown(prev => {
        if (prev <= 1) { fetchAll(); return refreshInterval * 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshInterval]);

  useEffect(() => { fetchAll(); }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Trigger search in scanner via keyboard shortcut
  const triggerSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
  };

  return (
    <div className="h-screen w-screen bg-black text-orange-500 font-mono overflow-hidden flex flex-col selection:bg-orange-500 selection:text-black">
      {/* HEADER */}
      <header className="h-12 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 text-xs uppercase tracking-widest shrink-0 shadow-sm z-50 relative">
        <div className="flex items-center gap-5">
          <Image src="/logo.svg" alt="Vortex Edge" width={160} height={32} priority className="h-7 w-auto" />
          <span className="text-zinc-700 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-3 text-[10px]">
            <span className="text-zinc-500">ADV <span className="text-green-500 font-bold">{marketBreadth.adv}</span></span>
            <span className="text-zinc-500">DEC <span className="text-red-500 font-bold">{marketBreadth.dec}</span></span>
            <span className="text-zinc-600">R:{marketBreadth.ratio.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 rounded px-2 py-1 border border-zinc-800 relative">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span className="text-zinc-300 font-bold text-[11px]">{formatCountdown(countdown)}</span>
            <button onClick={() => setShowSettings(!showSettings)} className="hover:text-white ml-1">
              <Settings className="w-3 h-3 text-zinc-600 hover:text-orange-500 transition-colors" />
            </button>
            {showSettings && (
              <div className="absolute top-full right-0 mt-2 w-28 bg-zinc-900 border border-zinc-700 shadow-xl rounded z-50 flex flex-col">
                <div className="px-3 py-1.5 text-[9px] text-zinc-500 border-b border-zinc-800">REFRESH</div>
                {[5, 10, 15, 30].map(mins => (
                  <button
                    key={mins}
                    onClick={() => { setRefreshInterval(mins); setCountdown(mins * 60); setShowSettings(false); }}
                    className={`text-left px-3 py-1.5 text-[10px] hover:bg-zinc-800 ${refreshInterval === mins ? 'text-orange-500 font-bold' : 'text-zinc-400'}`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-zinc-500 font-bold text-[11px] tracking-wide hidden sm:inline">{time}</span>

          <button
            onClick={fetchAll}
            disabled={loadingScanner}
            className="bg-orange-600 hover:bg-orange-500 text-black font-bold px-2.5 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-[10px]"
          >
            <RefreshCw className={`w-3 h-3 ${loadingScanner ? 'animate-spin' : ''}`} />
            RUN
          </button>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="flex-1 grid grid-cols-12 gap-px bg-zinc-800 overflow-hidden min-h-0">

        {/* LEFT PANEL */}
        <div className="col-span-12 lg:col-span-3 bg-black flex flex-col border-r border-zinc-800 p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-zinc-800 shrink-0">
            <h2 className="text-[10px] font-bold text-orange-400 flex items-center gap-2 tracking-wide">
              <BarChart3 className="w-3 h-3" /> SECTOR_ROTATION
            </h2>
          </div>

          <div className="flex-1 min-h-0 w-full relative overflow-hidden">
            {loadingSectors || !sectorData ? (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-700 animate-pulse text-xs tracking-widest flex-col gap-2">
                <Activity className="w-5 h-5 animate-bounce opacity-20" />
                [LOADING...]
              </div>
            ) : (
              <SectorChart data={sectorData.sectors} spyChange={sectorData.spyChange} />
            )}
          </div>

          <div className="h-auto min-h-[80px] border-t border-zinc-800 mt-2 pt-2 shrink-0">
            <h3 className="text-[9px] font-bold text-zinc-600 mb-1.5 uppercase tracking-widest">SYSTEM</h3>
            <div className="text-[9px] text-zinc-500 leading-relaxed space-y-0.5 font-mono pl-1">
              <p>[+] UNIVERSE: ~400 S&P / GROWTH</p>
              <p>[+] PATTERNS: IB / NR7</p>
              <p>[+] QUANT: ATR% / GAP% / RVOL / Z-SCR</p>
              <p>[+] PRESS <span className="text-orange-500">/</span> TO SEARCH</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="col-span-12 lg:col-span-9 bg-black flex flex-col p-0 overflow-hidden relative">
          <div className="h-9 flex items-center justify-between px-3 bg-black border-b border-zinc-800 shrink-0 z-10">
            <h2 className="text-[10px] font-bold text-orange-400 flex items-center gap-2 tracking-wide">
              <Activity className="w-3 h-3" /> VOLATILITY_SCANNER
            </h2>
            <div className="flex items-center gap-2 text-[9px] font-bold">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-yellow-600 rounded-sm"></span> IB</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-cyan-600 rounded-sm"></span> NR7</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-sm"></span> CONF</span>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-500">{scannerData.length}</span>
              <button onClick={triggerSearch} className="ml-2 flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-blue-500/50 text-zinc-500 hover:text-blue-400 px-2 py-0.5 rounded transition-all" title="Search ticker">
                <Search className="w-3 h-3" />
                <span className="text-[9px] tracking-wide">SEARCH</span>
                <kbd className="text-[8px] bg-zinc-800 text-zinc-500 px-1 rounded border border-zinc-700">/</kbd>
              </button>
            </div>
          </div>

          <div className="flex-1 w-full overflow-hidden relative">
            <ScannerTable data={scannerData} isLoading={false} />
            {scannerData.length === 0 && loadingScanner && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
                <div className="text-orange-500 font-mono text-sm tracking-wide animate-pulse mb-2">[+] INITIALIZING SCANNER...</div>
                <div className="text-zinc-600 text-xs">CONNECTING TO FEED</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="h-7 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between px-4 text-[9px] font-mono shrink-0 select-none z-50">
        <div className="flex items-center gap-5 w-full">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <span className="text-zinc-600 w-12">PROG:</span>
            <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-orange-600 transition-all duration-300 ease-out"
                style={{ width: `${(processedCount / totalCount) * 100}%` }}
              ></div>
            </div>
            <span className="text-zinc-400 w-10 text-right">{Math.round((processedCount / totalCount) * 100)}%</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-500">
            <span>{processedCount}/{totalCount}</span>
            <span>ETR: <span className="text-zinc-300">{etr}</span></span>
            {loadingScanner ? (
              <span className="text-orange-500 animate-pulse font-bold">SCANNING</span>
            ) : (
              <span className="text-green-600 font-bold">IDLE</span>
            )}
          </div>
        </div>
        <a href="https://vortexcapitalgroup.com" target="_blank" className="hover:text-blue-400 transition-colors uppercase tracking-widest font-bold text-blue-700 whitespace-nowrap text-[8px]">
          VORTEX CAPITAL GROUP
        </a>
      </footer>
    </div>
  );
}
