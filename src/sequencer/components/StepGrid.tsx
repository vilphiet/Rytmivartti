import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { SequencerEngine } from '../SequencerEngine';
import type { SeqProject, SeqTrack } from '../types';
import { SEQ_STEP_OFF, seqStepVisualState } from '../pattern';
import { melodicCellVisual } from '../melody';
import { noteName } from '../noteNames';
import { useStepPlayheadX } from './useStepPlayheadX';
import { useFollowPlaybackPage } from './useFollowPlaybackPage';
import { PAGE_SIZE, StepPager, pageCountFor } from './StepPager';
import { GROUP_SIZE } from './gridConstants';
import { TrackRowMenu } from './TrackRowMenu';

interface Props {
  engine: SequencerEngine;
  project: SeqProject;
  onToggleStep: (trackId: string, stepIndex: number) => void;
  onOpenTrackSettings: (trackId: string) => void;
  onRenameTrack: (trackId: string) => void;
  onOpenPianoRoll: (trackId: string) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onClearTrack: (trackId: string) => void;
  onDuplicateTrack: (trackId: string) => void;
  onRemoveTrack: (trackId: string) => void;
}

function trackIsEmpty(track: SeqTrack): boolean {
  return track.steps.slice(0, track.lengthSteps).every((s) => s.velocity === SEQ_STEP_OFF);
}

export function StepGrid({
  engine,
  project,
  onToggleStep,
  onOpenTrackSettings,
  onRenameTrack,
  onOpenPianoRoll,
  onToggleMute,
  onToggleSolo,
  onClearTrack,
  onDuplicateTrack,
  onRemoveTrack,
}: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [followPlayback, setFollowPlayback] = useState(false);
  const [rowMenuTrackId, setRowMenuTrackId] = useState<string | null>(null);

  const pageCount = pageCountFor(project.patternSteps, PAGE_SIZE);
  const clampedPage = Math.min(currentPage, pageCount - 1);

  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);
  useFollowPlaybackPage(engine, project.patternSteps, PAGE_SIZE, followPlayback, handlePageChange);

  const playheadTargets = useStepPlayheadX(engine, project.patternSteps, clampedPage, PAGE_SIZE);

  const pageStart = clampedPage * PAGE_SIZE;
  const pageEnd = Math.min(project.patternSteps, pageStart + PAGE_SIZE);
  const canRemoveTrack = project.tracks.length > 1;
  const rowMenuTrack = project.tracks.find((t) => t.id === rowMenuTrackId) ?? null;

  return (
    <div className="seq-grid">
      <StepPager
        patternSteps={project.patternSteps}
        currentPage={clampedPage}
        onPageChange={handlePageChange}
        followPlayback={followPlayback}
        onFollowPlaybackChange={setFollowPlayback}
      />

      <div className="seq-grid-rows">
        {project.tracks.map((track) => (
          <SeqRow
            key={track.id}
            track={track}
            pageStart={pageStart}
            pageEnd={pageEnd}
            onToggleStep={onToggleStep}
            onOpenTrackSettings={onOpenTrackSettings}
            onOpenPianoRoll={onOpenPianoRoll}
            onToggleMute={onToggleMute}
            onToggleSolo={onToggleSolo}
            onOpenRowMenu={() => setRowMenuTrackId(track.id)}
            playheadTargets={playheadTargets}
          />
        ))}
      </div>

      {rowMenuTrack && (
        <TrackRowMenu
          trackName={rowMenuTrack.name}
          canRemove={canRemoveTrack}
          onSettings={() => {
            onOpenTrackSettings(rowMenuTrack.id);
            setRowMenuTrackId(null);
          }}
          onRename={() => {
            onRenameTrack(rowMenuTrack.id);
            setRowMenuTrackId(null);
          }}
          onClearTrack={() => {
            onClearTrack(rowMenuTrack.id);
            setRowMenuTrackId(null);
          }}
          onDuplicateTrack={() => {
            onDuplicateTrack(rowMenuTrack.id);
            setRowMenuTrackId(null);
          }}
          onRemoveTrack={() => {
            onRemoveTrack(rowMenuTrack.id);
            setRowMenuTrackId(null);
          }}
          onClose={() => setRowMenuTrackId(null)}
        />
      )}
    </div>
  );
}

interface SeqRowProps {
  track: SeqTrack;
  pageStart: number;
  pageEnd: number;
  onToggleStep: (trackId: string, stepIndex: number) => void;
  onOpenTrackSettings: (trackId: string) => void;
  onOpenPianoRoll: (trackId: string) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onOpenRowMenu: () => void;
  playheadTargets: ReturnType<typeof useStepPlayheadX>;
}

function SeqRow({
  track,
  pageStart,
  pageEnd,
  onToggleStep,
  onOpenTrackSettings,
  onOpenPianoRoll,
  onToggleMute,
  onToggleSolo,
  onOpenRowMenu,
  playheadTargets,
}: SeqRowProps) {
  const isMelodic = track.kind === 'melodic';
  const isEmpty = trackIsEmpty(track);

  const cells: ReactNode[] = [];
  let k = pageStart;
  while (k < pageEnd) {
    const groupStart = k % GROUP_SIZE === 0 && k !== pageStart;

    if (!isMelodic) {
      cells.push(<DrumCell key={k} track={track} index={k} groupStart={groupStart} onToggleStep={onToggleStep} />);
      k += 1;
      continue;
    }

    const visual = melodicCellVisual(track.steps, k);

    if (visual.kind === 'head') {
      // Clip a head's rendered span to the cells remaining on this page --
      // if its true length reaches beyond pageEnd, the next page renders
      // the rest as continuation blocks (see the 'covered' branch below).
      const span = Math.min(visual.length, pageEnd - k);
      cells.push(<MelodicHeadCell key={k} note={visual.note} isAccent={visual.isAccent} span={span} groupStart={groupStart} />);
      k += span;
      continue;
    }

    if (visual.kind === 'covered') {
      // Reachable only when the owning head isn't on this page (a head on
      // this page would already have advanced k past every step it
      // covers, via the branch above) -- render a plain filled block
      // rather than nothing, so the sustain is still visible.
      cells.push(<MelodicContinuationCell key={k} groupStart={groupStart} />);
      k += 1;
      continue;
    }

    cells.push(<MelodicOffCell key={k} groupStart={groupStart} />);
    k += 1;
  }

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
        <button type="button" className="icon-btn" title="Raidan valikko" aria-label="Raidan valikko" onClick={onOpenRowMenu}>
          ⋯
        </button>
      </div>

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

      {isEmpty && (
        <p className="seq-row-empty-hint">
          {isMelodic ? 'Ei nuotteja vielä — avaa piano roll ja napauta ruudukkoa.' : 'Ei iskuja vielä — napauta ruutuja lisätäksesi rytmin.'}
        </p>
      )}
    </div>
  );
}

function DrumCell({
  track,
  index,
  groupStart,
  onToggleStep,
}: {
  track: SeqTrack;
  index: number;
  groupStart: boolean;
  onToggleStep: (trackId: string, stepIndex: number) => void;
}) {
  const step = track.steps[index];
  const state = seqStepVisualState(step.velocity);
  return (
    <button
      type="button"
      className={`seq-cell seq-cell-${state}${groupStart ? ' seq-cell-group-start' : ''}`}
      onClick={() => onToggleStep(track.id, index)}
      aria-label={`${track.name}, askel ${index + 1}, tila ${state}`}
    />
  );
}

/** Read-only in the main grid — melodic notes are edited via the piano
 * roll, which has the pitch axis a plain step cell doesn't. */
function MelodicHeadCell({ note, isAccent, span, groupStart }: { note: number; isAccent: boolean; span: number; groupStart: boolean }) {
  return (
    <div
      className={`seq-cell seq-cell-melodic-head${isAccent ? ' seq-cell-accent' : ''}${groupStart ? ' seq-cell-group-start' : ''}`}
      style={{ flexGrow: span, flexBasis: 0 }}
    >
      {noteName(note)}
    </div>
  );
}

/** A covered step whose owning head lies on an earlier, currently
 * unrendered page — shown as a plain filled block (rather than nothing)
 * so the sustain reads correctly regardless of which page is displayed. */
function MelodicContinuationCell({ groupStart }: { groupStart: boolean }) {
  return <div className={`seq-cell seq-cell-continuation${groupStart ? ' seq-cell-group-start' : ''}`} />;
}

function MelodicOffCell({ groupStart }: { groupStart: boolean }) {
  return <div className={`seq-cell seq-cell-off${groupStart ? ' seq-cell-group-start' : ''}`} />;
}
