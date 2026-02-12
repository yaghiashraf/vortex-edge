'use client';

import { useEffect, useState } from 'react';
import { Activity, Zap, BarChart3, RefreshCw, Terminal, Globe, ShieldCheck } from 'lucide-react';
import SectorChart from '@/components/SectorChart';
import ScannerTable from '@/components/ScannerTable';

export default function Home() {
  const [sectorData, setSectorData] = useState<any>(null);
  const [scannerData, setScannerData] = useState<any>(null);
  const [loadingSectors, setLoadingSectors] = useState(true);
  const [loadingScanner, setLoadingScanner] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

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
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoadingSectors(false);
      setLoadingScanner(false);
    }
  };

  const [time, setTime] = useState<string>('');

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Live Clock
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-screen w-screen bg-black text-orange-500 font-mono overflow-hidden flex flex-col selection:bg-orange-500 selection:text-black">
      {/* Top Status Bar (Fake Terminal Header) */}
      <header className="h-8 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-2 text-xs uppercase tracking-widest shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 font-bold text-orange-500">
            <Terminal className="w-3 h-3" /> VORTEX_TERMINAL_V1
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">STATUS: <span className="text-green-500">CONNECTED</span></span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">DATA: <span className="text-blue-400">YAHOO_FINANCE_STREAM</span></span>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-zinc-500 font-bold">{time}</span>
           <button 
             onClick={fetchData} 
             className="hover:text-white transition-colors"
             title="REFRESH DATA"
           >
             [REFRESH]
           </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-12 gap-px bg-zinc-900 overflow-hidden">
        
        {/* Left Panel: Market Pulse (Sectors) - 3 Columns */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-black flex flex-col border-r border-zinc-800 p-2">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-zinc-800">
            <h2 className="text-xs font-bold text-orange-400 flex items-center gap-1">
              <BarChart3 className="w-3 h-3" /> SECTOR_ROTATION
            </h2>
            <span className="text-[10px] text-zinc-600">REL_STR_VS_SPY</span>
          </div>
          
          <div className="flex-1 min-h-0 relative">
             {loadingSectors || !sectorData ? (
               <div className="absolute inset-0 flex items-center justify-center text-zinc-700 animate-pulse text-xs">
                 LOADING_SECTORS...
               </div>
             ) : sectorData?.error || !sectorData?.sectors ? (
               <div className="absolute inset-0 flex items-center justify-center text-red-900 text-xs text-center px-4 border border-red-900/20 bg-red-950/10">
                 ! DATA_FEED_ERROR !
                 <br/>
                 UNABLE TO RETRIEVE SECTOR DATA
               </div>
             ) : (
               <SectorChart data={sectorData.sectors} spyChange={sectorData.spyChange} />
             )}
          </div>

          {/* Mini News Ticker Placeholder at bottom left */}
          <div className="h-24 border-t border-zinc-800 mt-2 pt-2">
            <h3 className="text-[10px] font-bold text-zinc-500 mb-1 uppercase">SYSTEM_ALERTS</h3>
            <div className="text-[10px] text-zinc-400 leading-tight space-y-1 font-mono">
              <p>[+] MONITORING 100+ TICKERS</p>
              <p>[+] VOLATILITY SCAN: ACTIVE</p>
              <p>[+] RSI FILTER: ENABLED (14)</p>
              <p>[+] TREND FILTER: 20-DAY SMA</p>
            </div>
          </div>
        </div>

        {/* Right Panel: Scanner Table - 9 Columns */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 bg-black flex flex-col p-2">
           <div className="flex items-center justify-between mb-2 pb-1 border-b border-zinc-800">
            <h2 className="text-xs font-bold text-orange-400 flex items-center gap-1">
              <Activity className="w-3 h-3" /> VOLATILITY_SCANNER
            </h2>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="px-1.5 py-0.5 bg-yellow-600/20 text-yellow-500 border border-yellow-600/30">INSIDE_BAR</span>
              <span className="px-1.5 py-0.5 bg-cyan-600/20 text-cyan-500 border border-cyan-600/30">NR7</span>
              <span className="px-1.5 py-0.5 bg-red-600/20 text-red-500 border border-red-600/30">RSI_O/B</span>
              <span className="px-1.5 py-0.5 bg-green-600/20 text-green-500 border border-green-600/30">RSI_O/S</span>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 border border-zinc-900 relative">
             <ScannerTable 
               data={scannerData?.opportunities || []} 
               isLoading={loadingScanner} 
             />
          </div>
        </div>

      </div>

      {/* Bottom Footer Line */}
      <footer className="h-6 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between px-2 text-[10px] text-zinc-600 shrink-0">
        <div className="flex items-center gap-4">
          <span>Logged in as: TRADER_01</span>
          <span>SESSION: ACTIVE</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://vortexcapitalgroup.com" target="_blank" className="hover:text-orange-500 transition-colors uppercase">VORTEX_CAPITAL_GROUP_LLC</a>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
