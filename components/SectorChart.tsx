'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useMemo } from 'react';

interface SectorData {
  symbol: string;
  name: string;
  relativeStrength: number;
  change: number;
}

interface Props {
  data: SectorData[];
  spyChange: number;
}

export default function SectorChart({ data, spyChange }: Props) {
  // Sort data by Relative Strength for better visualization
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.relativeStrength - a.relativeStrength);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs">
          <p className="font-bold text-slate-200 mb-1">{d.name} ({d.symbol})</p>
          <p className="text-slate-400">Perf: <span className={d.change >= 0 ? "text-green-400" : "text-red-400"}>{d.change.toFixed(2)}%</span></p>
          <p className="text-slate-400">vs SPY: <span className={d.relativeStrength >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{d.relativeStrength > 0 ? '+' : ''}{d.relativeStrength.toFixed(2)}%</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[350px] bg-slate-900/50 rounded-lg p-4 border border-slate-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          Sector Relative Strength
          <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded">vs SPY ({spyChange > 0 ? '+' : ''}{spyChange.toFixed(2)}%)</span>
        </h2>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div>Leaders</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div>Laggards</div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis 
            dataKey="symbol" 
            tick={{ fill: '#94a3b8', fontSize: 11 }} 
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 11 }} 
            axisLine={{ stroke: '#475569' }}
            tickLine={false}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} />
          <Bar dataKey="relativeStrength">
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.relativeStrength >= 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
