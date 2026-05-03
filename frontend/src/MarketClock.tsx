import React, { useState, useEffect } from 'react';

const MARKETS = [
  { name: 'NEW YORK',   tz: 'America/New_York',    open: 9.5,  close: 16  },
  { name: 'LONDON',     tz: 'Europe/London',        open: 8,    close: 16.5},
  { name: 'PARIS',      tz: 'Europe/Paris',         open: 9,    close: 17.5},
  { name: 'FRANKFURT',  tz: 'Europe/Berlin',        open: 9,    close: 17.5},
  { name: 'TOKYO',      tz: 'Asia/Tokyo',           open: 9,    close: 15.5},
  { name: 'HONG KONG',  tz: 'Asia/Hong_Kong',       open: 9.5,  close: 16  },
  { name: 'SHANGHAI',   tz: 'Asia/Shanghai',        open: 9.5,  close: 15  },
  { name: 'SYDNEY',     tz: 'Australia/Sydney',     open: 10,   close: 16  },
  { name: 'DUBAI',      tz: 'Asia/Dubai',           open: 10,   close: 14  },
  { name: 'TORONTO',    tz: 'America/Toronto',      open: 9.5,  close: 16  },
];

function isWeekday(date: Date, tz: string): boolean {
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return day !== 'Sat' && day !== 'Sun';
}

function getLocalTime(tz: string): { time: string; hours: number } {
  const now = new Date();
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  const [h, m] = time.split(':').map(Number);
  return { time, hours: h + m / 60 };
}

function MarketClock() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      height: '32px',
      background: '#06060e',
      borderBottom: '1px solid #1e2028',
      display: 'flex',
      alignItems: 'center',
      padding: '0 12px',
      gap: '0',
      flexShrink: 0,
      overflowX: 'auto',
    }}>
      {MARKETS.map(m => {
        const { time, hours } = getLocalTime(m.tz);
        const now = new Date();
        const weekday = isWeekday(now, m.tz);
        const isOpen = weekday && hours >= m.open && hours < m.close;

        return (
          <div key={m.name} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 14px',
            borderRight: '1px solid #1e2028',
            flexShrink: 0,
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isOpen ? '#22c55e' : '#ef4444',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: '13px',
              color: 'white',
              fontFamily: 'JetBrains Mono, monospace',
              letterSpacing: '0.5px',
            }}>{m.name}</span>
            <span style={{
              fontSize: '13px',
              fontFamily: 'JetBrains Mono, monospace',
              color: isOpen ? '#22c55e' : '#6b7280',
            }}>{time}</span>
          </div>
        );
      })}
    </div>
  );
}

export default MarketClock;