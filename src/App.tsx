import { useState } from 'react';
import './App.css';
import { AudioBus } from './audio/shared/AudioBus';
import { loadActiveTab, saveActiveTab } from './state/appShell';
import type { AppTab } from './state/appShell';
import { TabBar } from './components/TabBar';
import { PolyrhythmTab } from './components/PolyrhythmTab';
import { SequencerTab } from './sequencer/components/SequencerTab';

function App() {
  const [audioBus] = useState(() => new AudioBus());
  const [activeTab, setActiveTab] = useState<AppTab>(() => loadActiveTab());

  const changeTab = (tab: AppTab) => {
    setActiveTab(tab);
    saveActiveTab(tab);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Rytmivartti</h1>
        <TabBar activeTab={activeTab} onChange={changeTab} />
      </header>

      {activeTab === 'polyrhythm' ? (
        <PolyrhythmTab audioBus={audioBus} />
      ) : (
        <SequencerTab audioBus={audioBus} />
      )}
    </div>
  );
}

export default App;
