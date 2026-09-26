import { useState } from 'react';
import type { SequencerEngine } from '../SequencerEngine';
import type { ScaleId, SeqTrack } from '../types';
import { SCALES } from '../scale';
import { SEQ_STEP_NORMAL } from '../pattern';
import { melodicCellVisual } from '../melody';
import { noteName } from '../noteNames';
import { defaultBaseOctaveForTrack } from '../pianoRoll';
import { useStepPlayheadX } from './useStepPlayheadX';
import { CELL_GAP_PX, CELL_WIDTH_PX, GROUP_SIZE, STEP_SPAN_PX } from './gridConstants';

const MIN_BASE_OCTAVE = -1;
const MAX_BASE_OCTAVE = 8;

type Tool = 'draw' | 'length' | 'accent';

interface Props {
  engine: SequencerEngine;
  track: SeqTrack;
  rootNote: number;
  scale: ScaleId;
  onDraw: (index: number, note: number) => void;
  onSetLength: (headIndex: number, targetIndex: number) => void;
  onSetAccent: (index: number, isAccent: boolean) => void;
  onPreviewNote: (note: number, velocity: number) => void;
  onClose: () => void;
}

export function PianoRoll({ engine, track, rootNote, scale, onDraw, onSetLength, onSetAccent, onPreviewNote, onClose }: Props) {
  const [tool, setTool] = useState<Tool>('draw');
  const [baseOctave, setBaseOctave] = useState(() => defaultBaseOctaveForTrack(track));
  const [selectedHeadIndex, setSelectedHeadIndex] = useState<number | null>(null);

  const playheadTargets = useStepPlayheadX(engine, track.lengthSteps);

  const intervals = [...SCALES[scale]].sort((a, b) => b - a); // descending, for top-to-bottom rows
  const rowNotes: number[] = [];
  for (const oct of [baseOctave + 1, baseOctave]) {
    for (const interval of intervals) {
      rowNotes.push((oct + 1) * 12 + rootNote + interval);
    }
  }

  const visibleSteps = track.lengthSteps;
  const rowWidth = visibleSteps * STEP_SPAN_PX;

  const handleCellClick = (stepIndex: number, note: number) => {
    const visual = melodicCellVisual(track.steps, stepIndex);
    const isThisNote = visual.kind === 'head' && visual.note === note;

    if (tool === 'draw') {
      onDraw(stepIndex, note);
      if (!isThisNote) onPreviewNote(note, SEQ_STEP_NORMAL);
      return;
    }

    if (tool === 'length') {
      if (selectedHeadIndex === null) {
        if (isThisNote) setSelectedHeadIndex(stepIndex);
      } else {
        onSetLength(selectedHeadIndex, stepIndex);
        setSelectedHeadIndex(null);
      }
      return;
    }

    // accent
    if (isThisNote) onSetAccent(stepIndex, !visual.isAccent);
  };

  return (
    <div className="piano-roll">
      <div className="piano-roll-header">
        <h3>{track.name} — piano roll</h3>
        <button type="button" className="icon-btn" onClick={onClose}>
          Sulje
        </button>
      </div>

      <div className="piano-roll-tools">
        <div className="seq-pattern-length-options">
          <button type="button" className={`tab-bar-btn${tool === 'draw' ? ' active' : ''}`} onClick={() => setTool('draw')}>
            Piirrä
          </button>
          <button
            type="button"
            className={`tab-bar-btn${tool === 'length' ? ' active' : ''}`}
            onClick={() => {
              setTool('length');
              setSelectedHeadIndex(null);
            }}
          >
            Pituus
          </button>
          <button type="button" className={`tab-bar-btn${tool === 'accent' ? ' active' : ''}`} onClick={() => setTool('accent')}>
            Aksentti
          </button>
        </div>
        <div className="piano-roll-octave-buttons">
          <button
            type="button"
            className="icon-btn"
            title="Oktaavi ylös"
            aria-label="Oktaavi ylös"
            disabled={baseOctave >= MAX_BASE_OCTAVE}
            onClick={() => setBaseOctave((o) => Math.min(MAX_BASE_OCTAVE, o + 1))}
          >
            ▲
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Oktaavi alas"
            aria-label="Oktaavi alas"
            disabled={baseOctave <= MIN_BASE_OCTAVE}
            onClick={() => setBaseOctave((o) => Math.max(MIN_BASE_OCTAVE, o - 1))}
          >
            ▼
          </button>
        </div>
      </div>

      <div className="piano-roll-scroll">
        {rowNotes.map((note) => (
          <PianoRollRow
            key={note}
            note={note}
            track={track}
            visibleSteps={visibleSteps}
            rowWidth={rowWidth}
            onCellClick={handleCellClick}
            playheadTargets={playheadTargets}
          />
        ))}
      </div>
    </div>
  );
}

interface RowProps {
  note: number;
  track: SeqTrack;
  visibleSteps: number;
  rowWidth: number;
  onCellClick: (stepIndex: number, note: number) => void;
  playheadTargets: ReturnType<typeof useStepPlayheadX>;
}

function PianoRollRow({ note, track, visibleSteps, rowWidth, onCellClick, playheadTargets }: RowProps) {
  return (
    <div className="proll-row">
      <div className="proll-row-header">{noteName(note)}</div>
      <div className="proll-row-cells" style={{ width: rowWidth }}>
        {Array.from({ length: visibleSteps }, (_, k) => k).map((k) => (
          <PianoRollCell key={k} note={note} track={track} index={k} onCellClick={onCellClick} />
        ))}
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

function PianoRollCell({ note, track, index, onCellClick }: { note: number; track: SeqTrack; index: number; onCellClick: (i: number, n: number) => void }) {
  const visual = melodicCellVisual(track.steps, index);
  const groupStart = index % GROUP_SIZE === 0 && index !== 0;

  // A step covered by (or the head of) a note at a DIFFERENT pitch than
  // this row doesn't belong to this row at all -- render it as empty here.
  const belongsToThisRow = (visual.kind === 'head' || visual.kind === 'covered') && visual.note === note;

  if (visual.kind === 'covered' && belongsToThisRow) return null; // spanned by this row's own head, see StepGrid's MelodicCell

  if (visual.kind === 'head' && belongsToThisRow) {
    return (
      <button
        type="button"
        className={`seq-cell seq-cell-melodic-head${visual.isAccent ? ' seq-cell-accent' : ''}${groupStart ? ' seq-cell-group-start' : ''}`}
        style={{ width: CELL_WIDTH_PX * visual.length + (visual.length - 1) * CELL_GAP_PX }}
        onClick={() => onCellClick(index, note)}
      >
        {noteName(note)}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`seq-cell seq-cell-off${groupStart ? ' seq-cell-group-start' : ''}`}
      style={{ width: CELL_WIDTH_PX }}
      onClick={() => onCellClick(index, note)}
      aria-label={`${noteName(note)}, askel ${index + 1}`}
    />
  );
}
