'use client';

import { useEffect, useState } from 'react';
import { Activity, BarChart3, Terminal } from 'lucide-react';
import SectorChart from '@/components/SectorChart';
import ScannerTable from '@/components/ScannerTable';

export default function Home() {
  const [sectorData, setSectorData] = useState<any>(null);
  const [scannerData, setScannerData] = useState<any>(null);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingScanner, setLoadingScanner] = useState(true);
  
  const fetchData = async () => {
    setLoadingSectors(true);
    setLoadingScanner(true);

    try {
      const [sectorRes, scannerRes] = await Promise.all([
        fetch('/api/market-pulse'),
        fetch('/api/scanner')
      ]);

      const sectors = await sectorRes.json();
      const scanner = await scannerRes.json();

      setSectorData(sectors);
      setScannerData(scanner);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoadingSectors(false);
      setLoadingScanner(false);
    }
  };

  const [time, setTime] = useState<string>('');

  useEffect(() => {
    fetchData();

    // Live Clock (1s)
    const clockTimer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    // Auto Refresh Data (15m)
    const refreshTimer = setInterval(() => {
      fetchData();
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(clockTimer);
      clearInterval(refreshTimer);
    };
  }, []);

  return (
    <div className="h-screen w-screen bg-black text-orange-500 font-mono overflow-hidden flex flex-col selection:bg-orange-500 selection:text-black">
      {/* HEADER */}
      <header className="h-10 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 text-xs uppercase tracking-widest shrink-0 shadow-sm z-50">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 font-black text-orange-500 text-sm">
            <Terminal className="w-4 h-4" /> VORTEX_TERMINAL_V1
          </span>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-zinc-500 hidden sm:inline">SESSION: <span className="text-green-500 font-bold">ACTIVE</span></span>
        </div>
        <div className="flex items-center gap-6">
           <span className="text-zinc-400 font-bold font-mono text-sm tracking-wide bg-zinc-900 px-3 py-1 rounded border border-zinc-800">{time}</span>
           <button 
             onClick={fetchData} 
             className="hover:text-white hover:bg-zinc-800 px-2 py-1 rounded transition-colors text-zinc-500"
             title="REFRESH DATA"
           >
             [REFRESH]
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
               <div className="absolute inset-0 flex items-center justify-center text-zinc-700 animate-pulse text-xs tracking-widest">
                 [LOADING_SECTORS...]
               </div>
             ) : (
               <SectorChart data={sectorData.sectors} spyChange={sectorData.spyChange} />
             )}
          </div>

          <div className="h-auto min-h-[100px] border-t border-zinc-800 mt-3 pt-3 shrink-0">
            <h3 className="text-[10px] font-bold text-zinc-600 mb-2 uppercase tracking-widest">SYSTEM_ALERTS</h3>
            <div className="text-[10px] text-zinc-500 leading-relaxed space-y-1 font-mono pl-1">
              <p>[+] UNIVERSE: 200+ LIQUID ASSETS</p>
              <p>[+] STRATEGY: INSIDE BAR / NR7</p>
              <p>[+] MOMENTUM: RSI(14) & TREND</p>
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
              <span className="text-zinc-500">ROWS: {scannerData?.opportunities?.length || 0}</span>
            </div>
          </div>
          
          {/* Table Container - Needs explicit overflow handling */}
          <div className="flex-1 w-full overflow-hidden relative">
             <ScannerTable 
               data={scannerData?.opportunities || []} 
               isLoading={loadingScanner} 
             />
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer className="h-6 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between px-4 text-[10px] text-zinc-600 shrink-0 select-none">
        <div className="flex items-center gap-6">
          <span>USER: TRADER_01</span>
          <span>MODE: LIVE</span>
        </div>
        <a href="https://vortexcapitalgroup.com" target="_blank" className="hover:text-orange-500 transition-colors uppercase tracking-widest font-bold">
          VORTEX_CAPITAL_GROUP
        </a>
      </footer>
    </div>
  );
}
