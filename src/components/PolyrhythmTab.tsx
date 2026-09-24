import type { AudioBus } from '../audio/shared/AudioBus';
import { useRhythmEngine } from '../hooks/useRhythmEngine';
import { RhythmCanvas } from './RhythmCanvas';
import { RhythmGrid } from './RhythmGrid';
import { ViewSwitcher } from './ViewSwitcher';
import { PresetTabs } from './PresetTabs';
import { TransportBar } from './TransportBar';
import { LayerPanel } from './LayerPanel';
import { PatternLibrary } from './PatternLibrary';

interface Props {
  audioBus: AudioBus;
}

/** The original polyrhythm app, unchanged in behavior — now mounted only
 * while its tab is active, so switching tabs unmounts it and its
 * useRhythmEngine hook's cleanup effect disposes its RhythmEngine
 * (stopping playback and freeing its own mixer nodes/voices), without
 * touching the shared AudioBus. */
export function PolyrhythmTab({ audioBus }: Props) {
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
  } = useRhythmEngine(audioBus);

  return (
    <>
      <div className="tab-toolbar">
        <PresetTabs
          presets={presets}
          activeLabel={activePresetLabel}
          onSelect={(preset) => applyPreset(preset.label, preset.values)}
        />
        <ViewSwitcher viewMode={viewMode} onChange={setViewMode} />
      </div>

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
    </>
  );
}
