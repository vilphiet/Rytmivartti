import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { SequencerEngine } from '../SequencerEngine';
import type { ScaleId, SeqTrack } from '../types';
import { SCALES } from '../scale';
import { SEQ_STEP_NORMAL } from '../pattern';
import { melodicCellVisual } from '../melody';
import { noteName } from '../noteNames';
import { defaultBaseOctaveForTrack } from '../pianoRoll';
import { useStepPlayheadX } from './useStepPlayheadX';
import { useFollowPlaybackPage } from './useFollowPlaybackPage';
import { PAGE_SIZE, StepPager, pageCountFor } from './StepPager';
import { GROUP_SIZE } from './gridConstants';

const MIN_BASE_OCTAVE = -1;
const MAX_BASE_OCTAVE = 8;

interface Props {
  engine: SequencerEngine;
  track: SeqTrack;
  rootNote: number;
  scale: ScaleId;
  isPlaying: boolean;
  onToggle: () => void;
  canUndo: boolean;
  onUndo: () => void;
  onCreateNote: (index: number, note: number) => void;
  onDeleteNote: (index: number) => void;
  onSetLength: (headIndex: number, targetIndex: number) => void;
  onSetAccent: (index: number, isAccent: boolean) => void;
  onPreviewNote: (note: number, velocity: number) => void;
  onClose: () => void;
}

/** Full-screen: tapping an empty (or differently-pitched) cell creates a
 * new note there and selects it; tapping an existing note of its own
 * pitch only selects it (never deletes) -- deleting is now an explicit
 * action in the selected note's own contextual toolbar. */
export function PianoRoll({
  engine,
  track,
  rootNote,
  scale,
  isPlaying,
  onToggle,
  canUndo,
  onUndo,
  onCreateNote,
  onDeleteNote,
  onSetLength,
  onSetAccent,
  onPreviewNote,
  onClose,
}: Props) {
  const [baseOctave, setBaseOctave] = useState(() => defaultBaseOctaveForTrack(track));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [followPlayback, setFollowPlayback] = useState(false);

  const pageCount = pageCountFor(track.lengthSteps, PAGE_SIZE);
  const clampedPage = Math.min(currentPage, pageCount - 1);
  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);
  useFollowPlaybackPage(engine, track.lengthSteps, PAGE_SIZE, followPlayback, handlePageChange);
  const playheadTargets = useStepPlayheadX(engine, track.lengthSteps, clampedPage, PAGE_SIZE);

  const pageStart = clampedPage * PAGE_SIZE;
  const pageEnd = Math.min(track.lengthSteps, pageStart + PAGE_SIZE);

  const intervals = [...SCALES[scale]].sort((a, b) => b - a); // descending, for top-to-bottom rows
  const rowNotes: number[] = [];
  for (const oct of [baseOctave + 1, baseOctave]) {
    for (const interval of intervals) {
      rowNotes.push((oct + 1) * 12 + rootNote + interval);
    }
  }

  const selectedVisual = selectedIndex !== null ? melodicCellVisual(track.steps, selectedIndex) : null;
  const selectedHead = selectedVisual && selectedVisual.kind === 'head' ? selectedVisual : null;

  const handleSelect = (index: number) => setSelectedIndex(index);

  const handleCreate = (index: number, note: number) => {
    onCreateNote(index, note);
    onPreviewNote(note, SEQ_STEP_NORMAL);
    setSelectedIndex(index);
  };

  const decreaseLength = () => {
    if (selectedIndex === null || !selectedHead) return;
    const newLength = Math.max(1, selectedHead.length - 1);
    onSetLength(selectedIndex, selectedIndex + newLength - 1);
  };

  const increaseLength = () => {
    if (selectedIndex === null || !selectedHead) return;
    onSetLength(selectedIndex, selectedIndex + selectedHead.length);
  };

  const toggleAccent = () => {
    if (selectedIndex === null || !selectedHead) return;
    onSetAccent(selectedIndex, !selectedHead.isAccent);
  };

  const deleteSelected = () => {
    if (selectedIndex === null) return;
    onDeleteNote(selectedIndex);
    setSelectedIndex(null);
  };

  return (
    <div className="piano-roll-overlay">
      <div className="piano-roll-topbar">
        <button type="button" className="transport-btn primary seq-top-bar-play" onClick={onToggle}>
          {isPlaying ? 'Pysäytä' : 'Toista'}
        </button>
        <button type="button" className="icon-btn" onClick={onUndo} disabled={!canUndo} title="Kumoa" aria-label="Kumoa">
          ↶ Kumoa
        </button>
        <button type="button" className="icon-btn" onClick={onClose}>
          Sulje
        </button>
      </div>

      <div className="piano-roll-subheader">
        <h3>{track.name}</h3>
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

      <StepPager
        patternSteps={track.lengthSteps}
        currentPage={clampedPage}
        onPageChange={handlePageChange}
        followPlayback={followPlayback}
        onFollowPlaybackChange={setFollowPlayback}
      />

      <div className="piano-roll-rows">
        {rowNotes.map((note) => (
          <PianoRollRow
            key={note}
            note={note}
            isRootRow={((note % 12) + 12) % 12 === rootNote}
            track={track}
            pageStart={pageStart}
            pageEnd={pageEnd}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            onCreate={handleCreate}
            playheadTargets={playheadTargets}
          />
        ))}
      </div>

      {selectedHead && selectedIndex !== null && (
        <div className="piano-roll-note-toolbar">
          <span className="piano-roll-note-toolbar-name">{noteName(selectedHead.note)}</span>
          <button type="button" className="icon-btn" onClick={decreaseLength} disabled={selectedHead.length <= 1}>
            Pituus −
          </button>
          <span className="piano-roll-note-toolbar-length">{selectedHead.length}</span>
          <button type="button" className="icon-btn" onClick={increaseLength}>
            Pituus +
          </button>
          <button type="button" className={`icon-btn${selectedHead.isAccent ? ' active' : ''}`} onClick={toggleAccent}>
            Aksentti
          </button>
          <button type="button" className="icon-btn remove" onClick={deleteSelected}>
            Poista
          </button>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  note: number;
  isRootRow: boolean;
  track: SeqTrack;
  pageStart: number;
  pageEnd: number;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onCreate: (index: number, note: number) => void;
  playheadTargets: ReturnType<typeof useStepPlayheadX>;
}

function PianoRollRow({ note, isRootRow, track, pageStart, pageEnd, selectedIndex, onSelect, onCreate, playheadTargets }: RowProps) {
  const cells: ReactNode[] = [];
  let k = pageStart;
  while (k < pageEnd) {
    const index = k;
    const groupStart = index % GROUP_SIZE === 0 && index !== pageStart;
    const visual = melodicCellVisual(track.steps, index);
    const belongsToThisRow = (visual.kind === 'head' || visual.kind === 'covered') && visual.note === note;

    if (visual.kind === 'head' && belongsToThisRow) {
      const span = Math.min(visual.length, pageEnd - index);
      cells.push(
        <button
          type="button"
          key={index}
          className={`seq-cell seq-cell-melodic-head${visual.isAccent ? ' seq-cell-accent' : ''}${selectedIndex === index ? ' seq-cell-selected' : ''}${groupStart ? ' seq-cell-group-start' : ''}`}
          style={{ flexGrow: span, flexBasis: 0 }}
          onClick={() => onSelect(index)}
        >
          {noteName(note)}
        </button>,
      );
      k = index + span;
      continue;
    }

    if (visual.kind === 'covered' && belongsToThisRow) {
      cells.push(<div key={index} className={`seq-cell seq-cell-continuation${groupStart ? ' seq-cell-group-start' : ''}`} />);
      k = index + 1;
      continue;
    }

    cells.push(
      <button
        type="button"
        key={index}
        className={`seq-cell seq-cell-off${groupStart ? ' seq-cell-group-start' : ''}`}
        onClick={() => onCreate(index, note)}
        aria-label={`${noteName(note)}, askel ${index + 1}`}
      />,
    );
    k = index + 1;
  }

  return (
    <div className={`proll-row${isRootRow ? ' proll-row-root' : ''}`}>
      <div className="proll-row-header">{noteName(note)}</div>
      <div className="seq-row-cells">
        {cells}
        <div
          className="seq-playhead"
          ref={(el) => {
            if (!el) return;
            playheadTargets.current.add(el);
            return () => {
              playheadTargets.current.delete(el);
            };
          }}
        />
      </div>
    </div>
  );
}
