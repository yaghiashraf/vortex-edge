'use client';

import { useEffect, useState, useRef } from 'react';
import { Activity, BarChart3, Terminal, Settings, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import SectorChart from '@/components/SectorChart';
import ScannerTable from '@/components/ScannerTable';

export default function Home() {
  const [sectorData, setSectorData] = useState<any>(null);
  const [scannerData, setScannerData] = useState<any[]>([]);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingScanner, setLoadingScanner] = useState(false);
  
  // Progress & Stats
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(503); // Approx S&P 500
  const [startTime, setStartTime] = useState<number>(0);
  const [etr, setEtr] = useState<string>('--');
  
  // Settings
  const [refreshInterval, setRefreshInterval] = useState(15); // Minutes
  const [countdown, setCountdown] = useState(refreshInterval * 60);
  const [showSettings, setShowSettings] = useState(false);

  const isScanningRef = useRef(false);

  // --- Fetch Sectors ---
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

  // --- Fetch Scanner (Paginated) ---
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

        // Calculate ETR
        const elapsed = (Date.now() - startTs) / 1000; // seconds
        const rate = scannedSoFar / elapsed; // items per second
        const remaining = totalCount - scannedSoFar;
        if (rate > 0) {
          const etrSeconds = Math.ceil(remaining / rate);
          setEtr(`${etrSeconds}s`);
        }

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
    setCountdown(refreshInterval * 60); // Reset countdown
    fetchSectors();
    fetchScanner();
  };

  const [time, setTime] = useState<string>('');

  // Clock & Countdown Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
      
      setCountdown(prev => {
        if (prev <= 1) {
          fetchAll();
          return refreshInterval * 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [refreshInterval]); // Re-run if interval changes

  // Initial Load
  useEffect(() => {
    fetchAll();
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-screen bg-black text-orange-500 font-mono overflow-hidden flex flex-col selection:bg-orange-500 selection:text-black">
      {/* HEADER */}
      <header className="h-12 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 text-xs uppercase tracking-widest shrink-0 shadow-sm z-50 relative">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Vortex Edge" width={140} height={28} priority className="h-6 w-auto" />
          </div>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-zinc-500">SESSION:</span>
            <span className="text-green-500 font-bold flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              LIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
           {/* Auto Refresh Config */}
           <div className="flex items-center gap-2 bg-zinc-900 rounded px-2 py-1 border border-zinc-800 relative group">
             <Clock className="w-3 h-3 text-zinc-500" />
             <span className="text-zinc-300 font-bold">{formatCountdown(countdown)}</span>
             <button onClick={() => setShowSettings(!showSettings)} className="hover:text-white ml-2">
               <Settings className="w-3 h-3 text-zinc-600 hover:text-orange-500 transition-colors" />
             </button>
             
             {/* Dropdown */}
             {showSettings && (
               <div className="absolute top-full right-0 mt-2 w-32 bg-zinc-900 border border-zinc-700 shadow-xl rounded z-50 flex flex-col">
                 <div className="px-3 py-2 text-[10px] text-zinc-500 border-b border-zinc-800">REFRESH RATE</div>
                 {[5, 10, 15, 30].map(mins => (
                   <button
                     key={mins}
                     onClick={() => { setRefreshInterval(mins); setCountdown(mins * 60); setShowSettings(false); }}
                     className={`text-left px-3 py-2 text-xs hover:bg-zinc-800 ${refreshInterval === mins ? 'text-orange-500 font-bold' : 'text-zinc-400'}`}
                   >
                     {mins} MINS
                   </button>
                 ))}
               </div>
             )}
           </div>

           <span className="text-zinc-400 font-bold font-mono text-sm tracking-wide">{time}</span>
           
           <button 
             onClick={fetchAll} 
             disabled={loadingScanner}
             className="bg-orange-600 hover:bg-orange-500 text-black font-bold px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
             title="FORCE REFRESH"
           >
             <RefreshCw className={`w-3 h-3 ${loadingScanner ? 'animate-spin' : ''}`} />
             RUN
           </button>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="flex-1 grid grid-cols-12 gap-px bg-zinc-800 overflow-hidden min-h-0">
        
        {/* LEFT PANEL: SECTOR CHART */}
        <div className="col-span-12 lg:col-span-3 bg-black flex flex-col border-r border-zinc-800 p-3 overflow-hidden">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800 shrink-0">
            <h2 className="text-xs font-bold text-orange-400 flex items-center gap-2 tracking-wide">
              <BarChart3 className="w-3 h-3" /> SECTOR_ROTATION
            </h2>
          </div>
          
          <div className="flex-1 min-h-0 w-full relative overflow-hidden">
             {loadingSectors || !sectorData ? (
               <div className="absolute inset-0 flex items-center justify-center text-zinc-700 animate-pulse text-xs tracking-widest flex-col gap-2">
                 <Activity className="w-6 h-6 animate-bounce opacity-20" />
                 [LOADING_SECTORS...]
               </div>
             ) : (
               <SectorChart data={sectorData.sectors} spyChange={sectorData.spyChange} />
             )}
          </div>

          <div className="h-auto min-h-[100px] border-t border-zinc-800 mt-3 pt-3 shrink-0">
            <h3 className="text-[10px] font-bold text-zinc-600 mb-2 uppercase tracking-widest">SYSTEM_ALERTS</h3>
            <div className="text-[10px] text-zinc-500 leading-relaxed space-y-1 font-mono pl-1">
              <p>[+] UNIVERSE: 500+ S&P ASSETS</p>
              <p>[+] STRATEGY: INSIDE BAR / NR7</p>
              <p>[+] MOMENTUM: RSI(14) & TREND</p>
              <p>[+] FEED: YAHOO FINANCE V8</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: SCANNER TABLE */}
        <div className="col-span-12 lg:col-span-9 bg-black flex flex-col p-0 overflow-hidden">
           {/* Sticky Header for Scanner Panel */}
           <div className="h-10 flex items-center justify-between px-4 bg-black border-b border-zinc-800 shrink-0 z-10">
            <h2 className="text-xs font-bold text-orange-400 flex items-center gap-2 tracking-wide">
              <Activity className="w-3 h-3" /> VOLATILITY_SCANNER
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-600 rounded-sm"></span> INSIDE</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-cyan-600 rounded-sm"></span> NR7</span>
              <span className="flex items-center gap-1 text-zinc-600">|</span>
              <span className="text-zinc-500">ROWS: {scannerData.length}</span>
            </div>
          </div>
          
          <div className="flex-1 w-full overflow-hidden relative">
             <ScannerTable 
               data={scannerData} 
               isLoading={false} // We handle loading state in status bar now
             />
             
             {/* Center Loading State */}
             {scannerData.length === 0 && loadingScanner && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                 <div className="text-orange-500 font-mono text-sm tracking-wide animate-pulse mb-2">
                   [+] INITIALIZING SCANNER...
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* STATUS BAR FOOTER */}
      <footer className="h-8 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between px-4 text-[10px] font-mono shrink-0 select-none z-50">
        <div className="flex items-center gap-6 w-full">
          
          {/* Progress Bar Container */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="text-zinc-500 w-16">PROGRESS:</span>
            <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
              <div 
                className="absolute top-0 left-0 h-full bg-orange-600 transition-all duration-300 ease-out"
                style={{ width: `${(processedCount / totalCount) * 100}%` }}
              ></div>
            </div>
            <span className="text-zinc-300 w-12 text-right">{Math.round((processedCount / totalCount) * 100)}%</span>
          </div>

          <div className="h-4 w-px bg-zinc-800"></div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-zinc-400">
            <span>PROCESSED: <span className="text-zinc-200">{processedCount}</span>/{totalCount}</span>
            <span>ETR: <span className="text-zinc-200">{etr}</span></span>
            {loadingScanner ? (
               <span className="text-orange-500 animate-pulse font-bold">SCANNING...</span>
            ) : (
               <span className="text-green-500 font-bold">IDLE</span>
            )}
          </div>

        </div>

        <div className="flex items-center gap-4">
          <a href="https://vortexcapitalgroup.com" target="_blank" className="hover:text-orange-500 transition-colors uppercase tracking-widest font-bold text-zinc-600">
            VORTEX CAPITAL GROUP
          </a>
        </div>
      </footer>
    </div>
  );
}
