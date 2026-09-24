import { useEffect, useRef } from 'react';
import type { RhythmEngine } from '../audio/RhythmEngine';
import type { BeatEvent, RhythmLayer } from '../audio/types';
import { hexToRgbTriplet } from '../audio/layerDefaults';
import { stepVisualState } from '../audio/pattern';
import { rowPhase } from '../audio/rowPhase';
import { cellWidthPx, rowWidthPx } from './gridLayout';

const PIXELS_PER_BEAT = 240;
const FLASH_DURATION = 0.5;
const ACCENT_FLASH_DURATION = 0.7;

interface CellFlash {
  time: number;
  isAccent: boolean;
}

interface Props {
  engine: RhythmEngine;
  layers: RhythmLayer[];
  onToggleStep: (layerId: string, stepIndex: number) => void;
  onUpdateLayer: (id: string, patch: Partial<RhythmLayer>) => void;
}

export function RhythmGrid({ engine, layers, onToggleStep, onUpdateLayer }: Props) {
  const layersRef = useRef(layers);
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const playheadRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cellRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const flashesRef = useRef<Map<string, CellFlash>>(new Map());

  useEffect(() => {
    const unsubscribe = engine.onBeat((events: BeatEvent[]) => {
      for (const e of events) {
        flashesRef.current.set(`${e.layerId}:${e.vertexIndex}`, { time: e.time, isAccent: e.isAccent });
      }
    });
    return unsubscribe;
  }, [engine]);

  useEffect(() => {
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const now = engine.getAudioTime();
      const referenceTime = engine.getReferenceTime();
      const baseStartTime = engine.getBaseStartTime();
      const beatDuration = engine.getCycleDuration();

      for (const layer of layersRef.current) {
        if (layer.hidden) continue;

        const playheadEl = playheadRefs.current.get(layer.id);
        if (playheadEl) {
          const phase = rowPhase(referenceTime, baseStartTime, beatDuration, layer.cycleBeats);
          const width = rowWidthPx(PIXELS_PER_BEAT, layer.cycleBeats, layer.steps);
          playheadEl.style.transform = `translateX(${(phase * width).toFixed(2)}px)`;
        }

        for (let k = 0; k < layer.steps; k++) {
          const cellEl = cellRefs.current.get(`${layer.id}:${k}`);
          if (!cellEl) continue;

          const flash = flashesRef.current.get(`${layer.id}:${k}`);
          let glow = 0;
          if (flash) {
            const duration = flash.isAccent ? ACCENT_FLASH_DURATION : FLASH_DURATION;
            const elapsed = now - flash.time;
            if (elapsed >= 0 && elapsed < duration) {
              glow = (1 - elapsed / duration) * (flash.isAccent ? 1.4 : 1);
            }
          }
          cellEl.style.setProperty('--glow', glow.toFixed(3));
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [engine]);

  return (
    <div className="grid-view">
      <div className="grid-scroll">
        {layers
          .filter((layer) => !layer.hidden)
          .map((layer) => {
            const rowWidth = rowWidthPx(PIXELS_PER_BEAT, layer.cycleBeats, layer.steps);
            const cellWidth = cellWidthPx(PIXELS_PER_BEAT, layer.cycleBeats, layer.steps);
            const colorRgb = hexToRgbTriplet(layer.color);

            return (
              <div className="grid-row" key={layer.id} style={{ borderColor: layer.color }}>
                <div className="grid-row-header">
                  <span className="grid-row-swatch" style={{ background: layer.color }} />
                  <span className="grid-row-steps">{layer.steps}</span>
                  <button
                    type="button"
                    className={`icon-btn${layer.muted ? ' active' : ''}`}
                    title={layer.muted ? 'Poista mykistys' : 'Mykistä'}
                    aria-label={layer.muted ? 'Poista mykistys' : 'Mykistä'}
                    onClick={() => onUpdateLayer(layer.id, { muted: !layer.muted })}
                  >
                    M
                  </button>
                  <button
                    type="button"
                    className={`icon-btn${layer.solo ? ' active' : ''}`}
                    title={layer.solo ? 'Poista solo' : 'Solo'}
                    aria-label={layer.solo ? 'Poista solo' : 'Solo'}
                    onClick={() => onUpdateLayer(layer.id, { solo: !layer.solo })}
                  >
                    S
                  </button>
                </div>

                <div className="grid-row-cells" style={{ width: rowWidth }}>
                  {layer.pattern.map((step, k) => {
                    const state = stepVisualState(step.velocity);
                    return (
                      <button
                        key={k}
                        type="button"
                        ref={(el) => {
                          const key = `${layer.id}:${k}`;
                          if (el) cellRefs.current.set(key, el);
                          else cellRefs.current.delete(key);
                        }}
                        className={`grid-cell grid-cell-${state}`}
                        style={{
                          width: cellWidth,
                          borderColor: layer.color,
                          ['--cell-color-rgb' as string]: colorRgb,
                          ...(state !== 'off' ? { background: layer.color } : {}),
                        }}
                        onClick={() => onToggleStep(layer.id, k)}
                        aria-label={`Askel ${k + 1}, tila ${state}`}
                      />
                    );
                  })}
                  <div
                    className="grid-playhead"
                    ref={(el) => {
                      if (el) playheadRefs.current.set(layer.id, el);
                      else playheadRefs.current.delete(layer.id);
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
