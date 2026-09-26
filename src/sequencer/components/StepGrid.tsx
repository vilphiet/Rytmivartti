import type { SequencerEngine } from '../SequencerEngine';
import type { SeqProject, SeqTrack } from '../types';
import { seqStepVisualState } from '../pattern';
import { melodicCellVisual } from '../melody';
import { noteName } from '../noteNames';
import { useStepPlayheadX } from './useStepPlayheadX';
import { CELL_GAP_PX, CELL_WIDTH_PX, GROUP_SIZE, STEP_SPAN_PX } from './gridConstants';

interface Props {
  engine: SequencerEngine;
  project: SeqProject;
  onToggleStep: (trackId: string, stepIndex: number) => void;
  onOpenTrackSettings: (trackId: string) => void;
  onOpenPianoRoll: (trackId: string) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
}

export function StepGrid({ engine, project, onToggleStep, onOpenTrackSettings, onOpenPianoRoll, onToggleMute, onToggleSolo }: Props) {
  const playheadTargets = useStepPlayheadX(engine, project.patternSteps);

  const visibleSteps = project.patternSteps;
  const rowWidth = visibleSteps * STEP_SPAN_PX;

  return (
    <div className="seq-grid">
      <div className="seq-grid-scroll">
        {project.tracks.map((track) => (
          <SeqRow
            key={track.id}
            track={track}
            visibleSteps={visibleSteps}
            rowWidth={rowWidth}
            onToggleStep={onToggleStep}
            onOpenTrackSettings={onOpenTrackSettings}
            onOpenPianoRoll={onOpenPianoRoll}
            onToggleMute={onToggleMute}
            onToggleSolo={onToggleSolo}
            playheadTargets={playheadTargets}
          />
        ))}
      </div>
    </div>
  );
}

interface SeqRowProps {
  track: SeqTrack;
  visibleSteps: number;
  rowWidth: number;
  onToggleStep: (trackId: string, stepIndex: number) => void;
  onOpenTrackSettings: (trackId: string) => void;
  onOpenPianoRoll: (trackId: string) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  playheadTargets: ReturnType<typeof useStepPlayheadX>;
}

function SeqRow({
  track,
  visibleSteps,
  rowWidth,
  onToggleStep,
  onOpenTrackSettings,
  onOpenPianoRoll,
  onToggleMute,
  onToggleSolo,
  playheadTargets,
}: SeqRowProps) {
  const isMelodic = track.kind === 'melodic';

  return (
    <div className="seq-row">
      <div className="seq-row-header">
        <button
          type="button"
          className="seq-row-name"
          onClick={() => (isMelodic ? onOpenPianoRoll(track.id) : onOpenTrackSettings(track.id))}
          title={isMelodic ? 'Piano roll' : 'Raidan asetukset'}
        >
          {track.name}
        </button>
        {isMelodic && (
          <button type="button" className="icon-btn" title="Asetukset" aria-label="Asetukset" onClick={() => onOpenTrackSettings(track.id)}>
            ⚙
          </button>
        )}
        <button
          type="button"
          className={`icon-btn${track.mute ? ' active' : ''}`}
          title={track.mute ? 'Poista mykistys' : 'Mykistä'}
          aria-label={track.mute ? 'Poista mykistys' : 'Mykistä'}
          onClick={() => onToggleMute(track.id)}
        >
          M
        </button>
        <button
          type="button"
          className={`icon-btn${track.solo ? ' active' : ''}`}
          title={track.solo ? 'Poista solo' : 'Solo'}
          aria-label={track.solo ? 'Poista solo' : 'Solo'}
          onClick={() => onToggleSolo(track.id)}
        >
          S
        </button>
      </div>

      <div className="seq-row-cells" style={{ width: rowWidth }}>
        {Array.from({ length: visibleSteps }, (_, k) => k).map((k) =>
          isMelodic ? (
            <MelodicCell key={k} track={track} index={k} />
          ) : (
            <DrumCell key={k} track={track} index={k} onToggleStep={onToggleStep} />
          ),
        )}
        <div
          className="seq-playhead"
          ref={(el) => {
            if (!el) return;
            playheadTargets.current.add(el);
            return () => {
              playheadTargets.current.delete(el);
            };
          }}
          style={{ width: CELL_WIDTH_PX }}
        />
      </div>
    </div>
  );
}

function DrumCell({ track, index, onToggleStep }: { track: SeqTrack; index: number; onToggleStep: (trackId: string, stepIndex: number) => void }) {
  const step = track.steps[index];
  const state = seqStepVisualState(step.velocity);
  const groupStart = index % GROUP_SIZE === 0 && index !== 0;
  return (
    <button
      type="button"
      className={`seq-cell seq-cell-${state}${groupStart ? ' seq-cell-group-start' : ''}`}
      style={{ width: CELL_WIDTH_PX }}
      onClick={() => onToggleStep(track.id, index)}
      aria-label={`${track.name}, askel ${index + 1}, tila ${state}`}
    />
  );
}

/** Read-only in the main grid — melodic notes are edited via the piano
 * roll, which has the pitch axis a plain step cell doesn't. A note's
 * covered steps render nothing at all (not even a placeholder): the
 * head's own width already spans them (length cells plus their internal
 * gaps), so the row stays the correct total width without doubling up —
 * flexbox's `gap` only applies between actually-rendered siblings, so the
 * next real cell after a long note is still spaced exactly one gap away. */
function MelodicCell({ track, index }: { track: SeqTrack; index: number }) {
  const visual = melodicCellVisual(track.steps, index);
  const groupStart = index % GROUP_SIZE === 0 && index !== 0;

  if (visual.kind === 'covered') return null;

  if (visual.kind === 'head') {
    return (
      <div
        className={`seq-cell seq-cell-melodic-head${visual.isAccent ? ' seq-cell-accent' : ''}${groupStart ? ' seq-cell-group-start' : ''}`}
        style={{ width: CELL_WIDTH_PX * visual.length + (visual.length - 1) * CELL_GAP_PX }}
      >
        {noteName(visual.note)}
      </div>
    );
  }

  return <div className={`seq-cell seq-cell-off${groupStart ? ' seq-cell-group-start' : ''}`} style={{ width: CELL_WIDTH_PX }} />;
}
