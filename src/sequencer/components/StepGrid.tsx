import { useEffect, useRef } from 'react';
import type { SequencerEngine } from '../SequencerEngine';
import type { SeqProject, SeqTrack } from '../types';
import { seqStepVisualState } from '../pattern';

const CELL_WIDTH_PX = 36;
const CELL_GAP_PX = 3;
const GROUP_SIZE = 4;
const STEP_SPAN_PX = CELL_WIDTH_PX + CELL_GAP_PX;

interface Props {
  engine: SequencerEngine;
  project: SeqProject;
  onToggleStep: (trackId: string, stepIndex: number) => void;
  onOpenTrackSettings: (trackId: string) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
}

export function StepGrid({ engine, project, onToggleStep, onOpenTrackSettings, onToggleMute, onToggleSolo }: Props) {
  const playheadRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const stepDuration = engine.getStepDuration();
      const baseStartTime = engine.getBaseStartTime();
      const referenceTime = engine.getReferenceTime();
      const patternSteps = Math.max(1, project.patternSteps);
      const elapsedSteps = (referenceTime - baseStartTime) / stepDuration;
      const currentStep = ((Math.floor(elapsedSteps) % patternSteps) + patternSteps) % patternSteps;
      const x = (currentStep * STEP_SPAN_PX).toFixed(2);
      for (const el of playheadRefs.current.values()) {
        el.style.transform = `translateX(${x}px)`;
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engine, project.patternSteps]);

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
            onToggleMute={onToggleMute}
            onToggleSolo={onToggleSolo}
            playheadRef={(el) => {
              if (el) playheadRefs.current.set(track.id, el);
              else playheadRefs.current.delete(track.id);
            }}
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
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  playheadRef: (el: HTMLDivElement | null) => void;
}

function SeqRow({ track, visibleSteps, rowWidth, onToggleStep, onOpenTrackSettings, onToggleMute, onToggleSolo, playheadRef }: SeqRowProps) {
  return (
    <div className="seq-row">
      <div className="seq-row-header">
        <button
          type="button"
          className="seq-row-name"
          onClick={() => onOpenTrackSettings(track.id)}
          title="Raidan asetukset"
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
      </div>

      <div className="seq-row-cells" style={{ width: rowWidth }}>
        {track.steps.slice(0, visibleSteps).map((step, k) => {
          const state = seqStepVisualState(step.velocity);
          const groupStart = k % GROUP_SIZE === 0 && k !== 0;
          return (
            <button
              key={k}
              type="button"
              className={`seq-cell seq-cell-${state}${groupStart ? ' seq-cell-group-start' : ''}`}
              style={{ width: CELL_WIDTH_PX }}
              onClick={() => onToggleStep(track.id, k)}
              aria-label={`${track.name}, askel ${k + 1}, tila ${state}`}
            />
          );
        })}
        <div className="seq-playhead" ref={playheadRef} style={{ width: CELL_WIDTH_PX }} />
      </div>
    </div>
  );
}
