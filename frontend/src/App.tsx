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

function App() {
  const [selectedTicker, setSelectedTicker]     = useState('AAPL');
  const [activeIndicators, setActiveIndicators] = useState<string[]>([]);
  const [activeTab, setActiveTab]               = useState('TERMINAL');

  const toggleIndicator = (key: string) => {
    setActiveIndicators(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="terminal">
      <TopBar activeTab={activeTab} onTabChange={setActiveTab} />
      <MarketClock />
      <TickerBand />
      <div className="main">
        {activeTab === 'TERMINAL' && (
          <>
            <Watchlist selectedTicker={selectedTicker} onSelectTicker={setSelectedTicker} />
            <div className="center">
              <Chart ticker={selectedTicker} activeIndicators={activeIndicators} />
              <BottomPanels ticker={selectedTicker} />
            </div>
            <RightPanel activeIndicators={activeIndicators} onToggle={toggleIndicator} />
          </>
        )}
        {activeTab === 'PORTFOLIO'   && <Portfolio />}
        {activeTab === 'STRATEGIES'  && <AIAdvisor />}
      </div>
    </div>
  );
}

export default App;