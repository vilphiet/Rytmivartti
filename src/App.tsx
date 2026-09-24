import './App.css';
import { useRhythmEngine } from './hooks/useRhythmEngine';
import { RhythmCanvas } from './components/RhythmCanvas';
import { RhythmGrid } from './components/RhythmGrid';
import { ViewSwitcher } from './components/ViewSwitcher';
import { PresetTabs } from './components/PresetTabs';
import { TransportBar } from './components/TransportBar';
import { LayerPanel } from './components/LayerPanel';
import { PatternLibrary } from './components/PatternLibrary';

function App() {
  const {
    engine,
    layers,
    bpm,
    setBpm,
    bpmRange,
    viewMode,
    setViewMode,
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
    restoreDefaults,
    namedPatternNames,
    saveCurrentAsNamedPattern,
    loadNamedPatternByName,
    deleteNamedPatternByName,
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
        <ViewSwitcher viewMode={viewMode} onChange={setViewMode} />
      </header>

      <main className="app-main">
        {viewMode === 'grid' ? (
          <RhythmGrid engine={engine} layers={layers} onToggleStep={toggleStep} onUpdateLayer={updateLayer} />
        ) : (
          <RhythmCanvas engine={engine} layers={layers} onToggleStep={toggleStep} />
        )}

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
          <PatternLibrary
            namedPatternNames={namedPatternNames}
            onSave={saveCurrentAsNamedPattern}
            onLoad={loadNamedPatternByName}
            onDelete={deleteNamedPatternByName}
            onRestoreDefaults={restoreDefaults}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
