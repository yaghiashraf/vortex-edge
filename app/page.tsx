'use client';

import { useEffect, useState } from 'react';
import { Activity, Zap, BarChart3, RefreshCw, ExternalLink } from 'lucide-react';
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
      // Parallel fetch
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

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              VORTEX <span className="text-blue-500">EDGE</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="https://vortexcapitalgroup.com" 
              target="_blank" 
              rel="noreferrer"
              className="text-sm text-slate-400 hover:text-white transition-colors hidden sm:block"
            >
              Vortex Capital Group
            </a>
            <button 
              onClick={fetchData}
              className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-95"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${loadingSectors ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Market Intelligence</h1>
            <p className="text-slate-400 max-w-2xl">
              Real-time relative strength analysis and volatility contraction scanning for US Equities. 
              Identify leaders, laggards, and coiled setups for the next session.
            </p>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">Last Update</div>
            <div className="text-sm font-medium text-slate-300">{lastUpdated || '--:--:--'}</div>
          </div>
        </div>

        {/* Top Section: Sector Radar */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-white">Sector Relative Strength</h2>
          </div>
          
          {loadingSectors || !sectorData ? (
            <div className="w-full h-[350px] bg-slate-900/50 rounded-lg border border-slate-800 animate-pulse" />
          ) : (
            <SectorChart data={sectorData.sectors} spyChange={sectorData.spyChange} />
          )}
        </section>

        {/* Bottom Section: Scanner */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-500" />
              <h2 className="text-xl font-semibold text-white">Volatility Contraction Scanner</h2>
            </div>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">
              Scanned: {scannerData?.scannedCount || 0} Assets
            </span>
          </div>

          <p className="text-sm text-slate-500 mb-4">
            Scanning top liquid assets for <span className="text-yellow-500 font-medium">Inside Bar</span> and <span className="text-cyan-400 font-medium">NR7</span> patterns. These setups often precede explosive expansions.
          </p>

          <ScannerTable 
            data={scannerData?.opportunities || []} 
            isLoading={loadingScanner} 
          />
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-800 pt-8 mt-12 text-center text-slate-600 text-sm">
          <p>© {new Date().getFullYear()} Vortex Capital Group. For educational purposes only.</p>
        </footer>
      </main>
    </div>
  );
}
