import './App.css';
import { useRhythmEngine } from './hooks/useRhythmEngine';
import { RhythmCanvas } from './components/RhythmCanvas';
import { PresetTabs } from './components/PresetTabs';
import { TransportBar } from './components/TransportBar';
import { LayerPanel } from './components/LayerPanel';

function App() {
  const {
    engine,
    layers,
    bpm,
    setBpm,
    bpmRange,
    isPlaying,
    toggle,
    reset,
    updateLayer,
    toggleStep,
    addLayer,
    removeLayer,
    applyPreset,
    presets,
    activePresetLabel,
  } = useRhythmEngine();

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Rytmivartti</h1>
        <PresetTabs
          presets={presets}
          activeLabel={activePresetLabel}
          onSelect={(preset) => applyPreset(preset.label, preset.values)}
        />
      </header>

      <main className="app-main">
        <RhythmCanvas engine={engine} layers={layers} onToggleStep={toggleStep} />

        <div className="side-panel">
          <TransportBar
            isPlaying={isPlaying}
            bpm={bpm}
            bpmRange={bpmRange}
            onToggle={toggle}
            onReset={reset}
            onBpmChange={setBpm}
          />
          <LayerPanel layers={layers} onUpdate={updateLayer} onRemove={removeLayer} onAdd={addLayer} />
        </div>
      </main>
    </div>
  );
}

export default App;
