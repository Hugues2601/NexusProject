import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface VixData {
  current: number;
  high52w: number;
  low52w: number;
  avg30d: number;
  signal: string;
  history: { time: number; close: number }[];
}

function VixChart() {
  const [data, setData] = useState<VixData | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/vix')
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const getColor = (val: number) => {
    if (val < 15) return '#22c55e';
    if (val < 20) return '#86efac';
    if (val < 30) return '#f0c040';
    return '#ef4444';
  };

  const chartData = data?.history.map(h => ({
    date: new Date(h.time * 1000).toLocaleDateString('fr-FR', { month: 'short', day: '2-digit' }),
    value: h.close,
  })) ?? [];

  return (
    <div style={{ padding: '12px', background: '#0a0a0f' }}>

      {!data ? (
        <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement...</div>
      ) : (
        <>
          {/* Chart */}
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
              <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}
                interval={Math.floor(chartData.length / 6)} />
              <YAxis tick={{ fontSize: 8, fill: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }} />
              <Tooltip
                contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }}
                formatter={(v: any) => [v, 'VIX']}
              />
              <ReferenceLine y={20} stroke="#f0c040" strokeDasharray="3 3" label={{ value: '20', fill: '#f0c040', fontSize: 8 }} />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" label={{ value: '30', fill: '#ef4444', fontSize: 8 }} />
              <Line type="monotone" dataKey="value" stroke={getColor(data.current)} dot={false} strokeWidth={1.5} />
            </LineChart>
          </ResponsiveContainer>

          {/* Stats */}
          <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              { label: 'VIX Actuel', val: data.current.toFixed(2), color: getColor(data.current) },
              { label: '52W High',   val: data.high52w.toFixed(2), color: '#ef4444' },
              { label: '52W Low',    val: data.low52w.toFixed(2),  color: '#22c55e' },
              { label: 'Moy. 30j',   val: data.avg30d.toFixed(2),  color: '#c8d0db' },
            ].map(f => (
              <div key={f.label} style={{ background: '#0d0d14', borderRadius: '4px', padding: '6px 8px' }}>
                <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '3px' }}>{f.label}</div>
                <div style={{ fontSize: '14px', fontFamily: 'JetBrains Mono, monospace', color: f.color, fontWeight: 600 }}>{f.val}</div>
              </div>
            ))}
          </div>

          {/* Signal */}
          <div style={{ marginTop: '8px', padding: '8px 12px', background: '#0d0d14', borderRadius: '4px', border: `1px solid ${getColor(data.current)}` }}>
            <span style={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', color: getColor(data.current) }}>
              {data.signal}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default VixChart;