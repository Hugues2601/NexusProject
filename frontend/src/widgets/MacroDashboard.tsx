import React, { useEffect, useState } from 'react';

function MacroDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/macro_dashboard')
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
  }, []);

  const Row = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #13131a' }}>
      <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '11px', color: '#e0e8f0', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{value}</div>
        {sub && <div style={{ fontSize: '9px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>{sub}</div>}
      </div>
    </div>
  );

  const Section = ({ title }: { title: string }) => (
    <div style={{ fontSize: '9px', fontWeight: 600, color: '#f0c040', letterSpacing: '1.5px', margin: '10px 0 6px', fontFamily: 'JetBrains Mono, monospace' }}>{title}</div>
  );

  return (
    <div style={{ padding: '12px', background: '#0a0a0f', overflowY: 'auto' }}>
      {!data ? (
        <div style={{ fontSize: '10px', color: '#4a5060', fontFamily: 'JetBrains Mono, monospace' }}>Chargement données macro...</div>
      ) : (
        <>
          <Section title="POLITIQUE MONÉTAIRE" />
          <Row label="Fed Funds Rate"  value={`${data.fed_rate}%`}  sub={`Prochain FOMC: ${data.next_fomc}`} />
          <Row label="BCE Refi Rate"   value={`${data.ecb_rate}%`}  sub={`Prochain conseil: ${data.next_ecb}`} />
          <Row label="BOE Bank Rate"   value={`${data.boe_rate}%`} />
          <Row label="BOJ Policy Rate" value={`${data.boj_rate}%`} />

          <Section title="INFLATION" />
          <Row label="CPI YoY USA"    value={`${data.cpi_us}%`}   sub="Target Fed 2.00%" />
          <Row label="Core CPI YoY"   value={`${data.core_cpi}%`} />
          <Row label="PCE YoY"        value={`${data.pce}%`} />

          <Section title="MARCHÉ DU TRAVAIL" />
          <Row label="Unemployment"   value={`${data.unemployment}%`} sub={`NFP: ${data.nfp}`} />
          <Row label="Règle de Sahm"  value={data.sahm_rule}          sub="< 0.5% = pas de récession" />

          <Section title="CONDITIONS FINANCIÈRES" />
          <Row label="VIX"            value={data.vix}   sub={data.vix > 20 ? "Zone vigilance" : "Zone calme"} />
          <Row label="10Y - 2Y"       value={`${data.spread_10y_2y}%`} sub={data.spread_10y_2y > 0 ? "Courbe normale" : "Courbe inversée"} />
          <Row label="DXY"            value={data.dxy} />
        </>
      )}
    </div>
  );
}

export default MacroDashboard;