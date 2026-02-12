'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label } from 'recharts';
import { useMemo, useState, useEffect } from 'react';

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
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, [data]);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.relativeStrength - a.relativeStrength);
  }, [data]);

  const maxAbs = useMemo(() => {
    const m = Math.max(...sortedData.map(d => Math.abs(d.relativeStrength)), 0.5);
    return Math.ceil(m * 2) / 2; // Round up to nearest 0.5
  }, [sortedData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-zinc-950 border border-zinc-700 p-2 text-[10px] font-mono z-50 pointer-events-none">
          <p className="text-orange-400 font-bold mb-1 uppercase">{d.name} ({d.symbol})</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span className="text-zinc-500">REL STR</span>
            <span className={d.relativeStrength >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
              {d.relativeStrength > 0 ? '+' : ''}{d.relativeStrength.toFixed(2)}%
            </span>
            <span className="text-zinc-500">CHANGE</span>
            <span className={d.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              {d.change >= 0 ? '+' : ''}{d.change.toFixed(2)}%
            </span>
            <span className="text-zinc-500">SPY</span>
            <span className="text-zinc-300">{spyChange >= 0 ? '+' : ''}{spyChange.toFixed(2)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full h-full flex flex-col bg-black overflow-hidden relative transition-opacity duration-500 ${animate ? 'opacity-100' : 'opacity-0'}`}>
      {/* Condensed single-line header */}
      <div className="flex items-center justify-between px-0 pb-1.5 mb-1 border-b border-zinc-800/50 shrink-0">
        <span className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase">
          SECTOR RS TODAY <span className="text-zinc-600">|</span> SPY <span className={spyChange >= 0 ? 'text-green-500' : 'text-red-500'}>{spyChange >= 0 ? '+' : ''}{spyChange.toFixed(2)}%</span>
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full relative min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sortedData} layout="vertical" margin={{ top: 2, right: 12, left: 0, bottom: 18 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#27272a" horizontal={false} opacity={0.5} />
            <XAxis
              type="number"
              domain={[-maxAbs, maxAbs]}
              tick={{ fill: '#71717a', fontSize: 8, fontFamily: 'monospace' }}
              tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={{ stroke: '#3f3f46' }}
              tickCount={7}
            >
              <Label value="LAGGARDS" position="insideBottomLeft" offset={0} fill="#ef4444" fontSize={8} fontFamily="monospace" fontWeight="bold" />
              <Label value="LEADERS" position="insideBottomRight" offset={0} fill="#22c55e" fontSize={8} fontFamily="monospace" fontWeight="bold" />
            </XAxis>
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: '#a1a1aa', fontSize: 8, fontFamily: 'monospace', fontWeight: 600 }}
              width={82}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} wrapperStyle={{ outline: 'none' }} />
            <ReferenceLine x={0} stroke="#52525b" strokeWidth={1} strokeDasharray="3 3" />
            <Bar
              dataKey="relativeStrength"
              barSize={12}
              radius={[0, 2, 2, 0]}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.relativeStrength >= 0 ? '#22c55e' : '#ef4444'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
