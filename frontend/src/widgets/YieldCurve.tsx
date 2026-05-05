import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function YieldCurveWidget() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/yield_curve')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); })
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: '12px', background: '#0a0a0f' }}>
      <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace', marginBottom: '8px', letterSpacing: '1.5px' }}>US TREASURY YIELD CURVE</div>
      {data.length === 0 ? (
        <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement...</div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2028" />
            <XAxis dataKey="maturity" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }} />
            <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }} tickFormatter={v => `${v}%`} />
            <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid #1e2028', fontSize: '10px', fontFamily: 'JetBrains Mono, monospace' }} formatter={(v: any) => [`${v}%`, 'Yield']} />
            <Line type="monotone" dataKey="yield" stroke="#f0c040" dot={{ fill: '#f0c040', r: 3 }} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        {data.map(d => (
          <div key={d.maturity} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>{d.maturity}</div>
            <div style={{ fontSize: '10px', color: '#f0c040', fontFamily: 'JetBrains Mono, monospace' }}>{d.yield}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default YieldCurveWidget;