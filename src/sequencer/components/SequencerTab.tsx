import { useState } from 'react';
import type { AudioBus } from '../../audio/shared/AudioBus';
import { useSequencerEngine } from '../hooks/useSequencerEngine';
import { scaleChangeAffectsNotes } from '../scale';
import type { ScaleId } from '../types';
import { StepGrid } from './StepGrid';
import { SequencerTopBar } from './SequencerTopBar';
import { SequencerMenu } from './SequencerMenu';
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
    clearTrack,
    duplicateTrackAction,
    setNoteAtStep,
    setNoteLength,
    setNoteAccent,
    setRootNote,
    setScale,
    previewNote,
    undo,
    redo,
    canUndo,
    canRedo,
    restoreDefaults,
    clearPattern,
    namedPatternNames,
    saveCurrentAsNamedPattern,
    loadNamedPatternByName,
    deleteNamedPatternByName,
  } = useSequencerEngine(audioBus);

  const [openTrackId, setOpenTrackId] = useState<string | null>(null);
  const [autoFocusName, setAutoFocusName] = useState(false);
  const [pianoRollTrackId, setPianoRollTrackId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const openTrack = project.tracks.find((t) => t.id === openTrackId) ?? null;
  const pianoRollTrack = project.tracks.find((t) => t.id === pianoRollTrackId) ?? null;

  const handleScaleChange = (scale: ScaleId) => {
    if (scaleChangeAffectsNotes(project, scale) && !window.confirm('Asteikon vaihto siirtää joitain nuotteja lähimpään asteikon säveleen. Jatketaanko?')) {
      return;
    }
    setScale(scale);
  };

  return (
    <div className="seq-page">
      <SequencerTopBar
        isPlaying={isPlaying}
        onToggle={toggle}
        bpm={project.bpm}
        bpmRange={bpmRange}
        onBpmChange={setBpm}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((v) => !v)}
      />

      <div className="seq-main">
        <StepGrid
          engine={engine}
          project={project}
          onToggleStep={toggleStep}
          onOpenTrackSettings={(id) => {
            setAutoFocusName(false);
            setOpenTrackId((prev) => (prev === id ? null : id));
          }}
          onRenameTrack={(id) => {
            setAutoFocusName(true);
            setOpenTrackId(id);
          }}
          onOpenPianoRoll={(id) => setPianoRollTrackId((prev) => (prev === id ? null : id))}
          onToggleMute={(id) => {
            const track = project.tracks.find((t) => t.id === id);
            if (track) updateTrack(id, { mute: !track.mute });
          }}
          onToggleSolo={(id) => {
            const track = project.tracks.find((t) => t.id === id);
            if (track) updateTrack(id, { solo: !track.solo });
          }}
          onClearTrack={clearTrack}
          onDuplicateTrack={duplicateTrackAction}
          onRemoveTrack={(id) => {
            removeTrack(id);
            setOpenTrackId((prev) => (prev === id ? null : prev));
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
            autoFocusName={autoFocusName}
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

      {menuOpen && (
        <SequencerMenu
          patternSteps={project.patternSteps}
          onPatternStepsChange={setPatternStepsCount}
          rootNote={project.rootNote}
          onRootNoteChange={setRootNote}
          scale={project.scale}
          onScaleChange={handleScaleChange}
          namedPatternNames={namedPatternNames}
          onSaveNamedPattern={saveCurrentAsNamedPattern}
          onLoadNamedPattern={loadNamedPatternByName}
          onDeleteNamedPattern={deleteNamedPatternByName}
          onClearPattern={clearPattern}
          onNewProject={restoreDefaults}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
