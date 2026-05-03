import React, { useState } from 'react';
import './App.css';
import TopBar from './TopBar';
import TickerBand from './TickerBand';
import Watchlist from './Watchlist';
import Chart from './Chart';
import BottomPanels from './BottomPanels';
import RightPanel from './RightPanel';
import MarketClock from './MarketClock';

function App() {
  const [selectedTicker, setSelectedTicker] = useState('AAPL');

  return (
    <div className="terminal">
      <TopBar />
      <MarketClock />
      <TickerBand />
      <div className="main">
        <Watchlist selectedTicker={selectedTicker} onSelectTicker={setSelectedTicker} />
        <div className="center">
          <Chart ticker={selectedTicker} />
          <BottomPanels ticker={selectedTicker} />
        </div>
        <RightPanel />
      </div>
    </div>
  );
}

export default App;