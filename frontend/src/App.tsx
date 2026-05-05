import React, { useState } from 'react';
import './App.css';
import TopBar from './TopBar';
import TickerBand from './TickerBand';
import MarketClock from './MarketClock';
import Watchlist from './Watchlist';
import Chart from './Chart';
import BottomPanels from './BottomPanels';
import RightPanel from './RightPanel';
import Portfolio from './Portfolio';
import AIAdvisor from './AIAdvisor';
import News from './News';
import { WidgetManager } from './WidgetManager';
import YieldCurveWidget from './widgets/YieldCurve';
import MacroDashboard from './widgets/MacroDashboard';
import FearGreed from './widgets/FearGreed';
import VixChart from './widgets/VixChart';

interface WidgetInstance {
  id: string;
  title: string;
  component: React.ReactNode;
  width: number;
  height: number;
  x: number;
  y: number;
}

const WIDGET_CONFIGS: Record<string, Omit<WidgetInstance, 'id'>> = {
  yield_curve:     { title: 'YIELD CURVE',       component: <YieldCurveWidget />, width: 420, height: 280, x: 100, y: 100 },
  macro_dashboard: { title: 'MACRO DASHBOARD',   component: <MacroDashboard />,   width: 320, height: 400, x: 200, y: 80  },
  fear_greed: { title: 'FEAR & GREED INDEX', component: <FearGreed />, width: 380, height: 480, x: 200, y: 80 },
  vix: { title: 'VIX', component: <VixChart />, width: 420, height: 360, x: 150, y: 100 },
};

function App() {
  const [selectedTicker, setSelectedTicker]     = useState('AAPL');
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);
  const [activeTab, setActiveTab]               = useState('TERMINAL');
  const [openWidgets, setOpenWidgets]           = useState<WidgetInstance[]>([]);

  const toggleIndicator = (key: string) => {
    setActiveIndicators(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const openWidget = (widgetId: string) => {
    if (openWidgets.find(w => w.id === widgetId)) return;
    const config = WIDGET_CONFIGS[widgetId];
    if (!config) return;
    setOpenWidgets(prev => [...prev, { id: widgetId, ...config }]);
  };

  const closeWidget = (id: string) => {
    setOpenWidgets(prev => prev.filter(w => w.id !== id));
  };

  return (
    <div className="terminal">
      <TopBar activeTab={activeTab} onTabChange={setActiveTab} onOpenWidget={openWidget} />
      <MarketClock />
      <TickerBand />
      <div className="main">
        <div style={{ display: activeTab === 'TERMINAL'   ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          <Watchlist selectedTicker={selectedTicker} onSelectTicker={setSelectedTicker} />
          <div className="center">
            <Chart ticker={selectedTicker} activeIndicators={activeIndicators} />
            <BottomPanels ticker={selectedTicker} />
          </div>
          <RightPanel activeIndicators={activeIndicators} onToggle={toggleIndicator} />
        </div>
        <div style={{ display: activeTab === 'PORTFOLIO'  ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          <Portfolio />
        </div>
        <div style={{ display: activeTab === 'STRATEGIES' ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          <AIAdvisor />
        </div>
        <div style={{ display: activeTab === 'NEWS'       ? 'flex' : 'none', flex: 1, overflow: 'hidden' }}>
          <News />
        </div>
      </div>

      {/* Floating widgets — rendus au dessus de tout */}
      <WidgetManager widgets={openWidgets} onClose={closeWidget} />
    </div>
  );
}

export default App;