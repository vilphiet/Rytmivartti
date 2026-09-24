import { useState } from 'react';
import type { AudioBus } from '../../audio/shared/AudioBus';
import { PatternLibrary } from '../../components/PatternLibrary';
import { useSequencerEngine } from '../hooks/useSequencerEngine';
import { StepGrid } from './StepGrid';
import { SequencerTransport } from './SequencerTransport';
import { TrackSettingsPanel } from './TrackSettingsPanel';

interface Props {
  audioBus: AudioBus;
}

/** The step sequencer: a drum-track grid built on the shared AudioBus via
 * its own SequencerEngine. Only mounted while its tab is active, so
 * switching tabs unmounts it and useSequencerEngine's cleanup effect
 * disposes the engine (stopping playback, freeing its own mixer
 * nodes/voices), without touching the shared AudioBus. */
export function SequencerTab({ audioBus }: Props) {
  const {
    engine,
    project,
    isPlaying,
    toggle,
    bpmRange,
    setBpm,
    setPatternStepsCount,
    toggleStep,
    updateTrack,
    addTrack,
    removeTrack,
    restoreDefaults,
    namedPatternNames,
    saveCurrentAsNamedPattern,
    loadNamedPatternByName,
    deleteNamedPatternByName,
  } = useSequencerEngine(audioBus);

  const [openTrackId, setOpenTrackId] = useState<string | null>(null);
  const openTrack = project.tracks.find((t) => t.id === openTrackId) ?? null;

  return (
    <main className="app-main">
      <div className="seq-main">
        <StepGrid
          engine={engine}
          project={project}
          onToggleStep={toggleStep}
          onOpenTrackSettings={(id) => setOpenTrackId((prev) => (prev === id ? null : id))}
          onToggleMute={(id) => {
            const track = project.tracks.find((t) => t.id === id);
            if (track) updateTrack(id, { mute: !track.mute });
          }}
          onToggleSolo={(id) => {
            const track = project.tracks.find((t) => t.id === id);
            if (track) updateTrack(id, { solo: !track.solo });
          }}
        />

        {openTrack && (
          <TrackSettingsPanel
            track={openTrack}
            canRemove={project.tracks.length > 1}
            onUpdate={(patch) => updateTrack(openTrack.id, patch)}
            onRemove={() => {
              removeTrack(openTrack.id);
              setOpenTrackId(null);
            }}
            onClose={() => setOpenTrackId(null)}
          />
        )}

        <button type="button" className="add-layer-btn" onClick={addTrack}>
          + Lisää raita
        </button>
      </div>

      <div className="side-panel">
        <SequencerTransport
          isPlaying={isPlaying}
          bpm={project.bpm}
          bpmRange={bpmRange}
          patternSteps={project.patternSteps}
          onToggle={toggle}
          onBpmChange={setBpm}
          onPatternStepsChange={setPatternStepsCount}
        />
        <PatternLibrary
          namedPatternNames={namedPatternNames}
          onSave={saveCurrentAsNamedPattern}
          onLoad={loadNamedPatternByName}
          onDelete={deleteNamedPatternByName}
          onRestoreDefaults={restoreDefaults}
        />
      </div>
    </main>
  );
}
