import { useState } from 'react';
import type { AudioBus } from '../../audio/shared/AudioBus';
import { PatternLibrary } from '../../components/PatternLibrary';
import { useSequencerEngine } from '../hooks/useSequencerEngine';
import { scaleChangeAffectsNotes } from '../scale';
import type { ScaleId } from '../types';
import { StepGrid } from './StepGrid';
import { SequencerTransport } from './SequencerTransport';
import { TrackSettingsPanel } from './TrackSettingsPanel';
import { PianoRoll } from './PianoRoll';

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
    setNoteAtStep,
    setNoteLength,
    setNoteAccent,
    setRootNote,
    setScale,
    previewNote,
    restoreDefaults,
    namedPatternNames,
    saveCurrentAsNamedPattern,
    loadNamedPatternByName,
    deleteNamedPatternByName,
  } = useSequencerEngine(audioBus);

  const [openTrackId, setOpenTrackId] = useState<string | null>(null);
  const [pianoRollTrackId, setPianoRollTrackId] = useState<string | null>(null);
  const openTrack = project.tracks.find((t) => t.id === openTrackId) ?? null;
  const pianoRollTrack = project.tracks.find((t) => t.id === pianoRollTrackId) ?? null;

  const handleScaleChange = (scale: ScaleId) => {
    if (scaleChangeAffectsNotes(project, scale) && !window.confirm('Asteikon vaihto siirtää joitain nuotteja lähimpään asteikon säveleen. Jatketaanko?')) {
      return;
    }
    setScale(scale);
  };

  return (
    <main className="app-main">
      <div className="seq-main">
        <StepGrid
          engine={engine}
          project={project}
          onToggleStep={toggleStep}
          onOpenTrackSettings={(id) => setOpenTrackId((prev) => (prev === id ? null : id))}
          onOpenPianoRoll={(id) => setPianoRollTrackId((prev) => (prev === id ? null : id))}
          onToggleMute={(id) => {
            const track = project.tracks.find((t) => t.id === id);
            if (track) updateTrack(id, { mute: !track.mute });
          }}
          onToggleSolo={(id) => {
            const track = project.tracks.find((t) => t.id === id);
            if (track) updateTrack(id, { solo: !track.solo });
          }}
        />

        {pianoRollTrack && (
          <PianoRoll
            engine={engine}
            track={pianoRollTrack}
            rootNote={project.rootNote}
            scale={project.scale}
            onDraw={(index, note) => setNoteAtStep(pianoRollTrack.id, index, note)}
            onSetLength={(headIndex, targetIndex) => setNoteLength(pianoRollTrack.id, headIndex, targetIndex)}
            onSetAccent={(index, isAccent) => setNoteAccent(pianoRollTrack.id, index, isAccent)}
            onPreviewNote={(note, velocity) => previewNote(pianoRollTrack.id, note, velocity)}
            onClose={() => setPianoRollTrackId(null)}
          />
        )}

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

        <div className="seq-add-track-row">
          <button type="button" className="add-layer-btn" onClick={() => addTrack('drum')}>
            + Rumpuraita
          </button>
          <button type="button" className="add-layer-btn" onClick={() => addTrack('melodic')}>
            + Melodiaraita
          </button>
        </div>
      </div>

      <div className="side-panel">
        <SequencerTransport
          isPlaying={isPlaying}
          bpm={project.bpm}
          bpmRange={bpmRange}
          patternSteps={project.patternSteps}
          rootNote={project.rootNote}
          scale={project.scale}
          onToggle={toggle}
          onBpmChange={setBpm}
          onPatternStepsChange={setPatternStepsCount}
          onRootNoteChange={setRootNote}
          onScaleChange={handleScaleChange}
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
