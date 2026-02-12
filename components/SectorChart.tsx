'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
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
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.relativeStrength - a.relativeStrength);
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-black border border-orange-500/50 p-2 text-[10px] font-mono shadow-none rounded-none z-50 pointer-events-none">
          <p className="text-orange-400 font-bold mb-1 uppercase">{d.name} [{d.symbol}]</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-zinc-500">REL STR</span>
            <span className={d.relativeStrength >= 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
              {d.relativeStrength > 0 ? '+' : ''}{d.relativeStrength.toFixed(2)}%
            </span>
            <span className="text-zinc-500">CHANGE</span>
            <span className={d.change >= 0 ? "text-green-500" : "text-red-500"}>
              {d.change.toFixed(2)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col bg-black overflow-hidden relative">
      <div className="terminal-header border-none px-0 pb-2 mb-2 shrink-0">
        <span>SECTOR RELATIVE STRENGTH TODAY (vs SPY {spyChange > 0 ? '+' : ''}{spyChange.toFixed(2)}%)</span>
        <div className="flex gap-2 text-[10px]">
          <span className="text-green-500">LEADERS</span>
          <span className="text-red-500">LAGGARDS</span>
        </div>
      </div>
      
      <div className="flex-1 w-full relative min-h-0">
        <ResponsiveContainer width="99%" height="100%">
          <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="1 1" stroke="#333" horizontal={false} opacity={0.3} />
            <XAxis 
              type="number"
              hide={true} 
            />
            {/* Switched dataKey to "name" and increased width significantly to fit names */}
            <YAxis 
              dataKey="name" 
              type="category" 
              tick={{ fill: '#fb923c', fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }} 
              width={90} 
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff10' }} wrapperStyle={{ outline: 'none' }} />
            <ReferenceLine x={0} stroke="#666" strokeWidth={1} />
            <Bar dataKey="relativeStrength" barSize={14} radius={[0, 2, 2, 0]}>
              {sortedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.relativeStrength >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
