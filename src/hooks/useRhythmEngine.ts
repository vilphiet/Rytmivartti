import { useCallback, useEffect, useState } from 'react';
import { AudioEngine } from '../audio/AudioEngine';
import type { RhythmLayer } from '../audio/types';
import { colorForIndex, frequencyForIndex, waveformForIndex } from '../audio/layerDefaults';
import { cycleStepVelocity, defaultPattern, resizePattern } from '../audio/pattern';
import { PRESETS } from '../data/presets';

let idCounter = 0;
function makeLayerId(): string {
  idCounter += 1;
  return `layer-${idCounter}`;
}

function buildLayer(steps: number, index: number): RhythmLayer {
  return {
    id: makeLayerId(),
    steps,
    cycleBeats: 1,
    pattern: defaultPattern(steps),
    color: colorForIndex(index),
    voiceId: 'tone',
    waveform: waveformForIndex(index),
    frequency: frequencyForIndex(index),
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
    hidden: false,
  };
}

const MIN_BPM = 20;
const MAX_BPM = 220;
const DEFAULT_BPM = 60;

export function useRhythmEngine() {
  const [engine] = useState(() => new AudioEngine());

  const [layers, setLayers] = useState<RhythmLayer[]>(() => [buildLayer(4, 0), buildLayer(3, 1)]);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePresetLabel, setActivePresetLabel] = useState<string | null>('4:3');

  const cycleDuration = 60 / bpm;

  useEffect(() => {
    engine.setLayers(layers);
  }, [engine, layers]);

  useEffect(() => {
    engine.setTempo(cycleDuration);
  }, [engine, cycleDuration]);

  useEffect(() => {
    return () => engine.dispose();
  }, [engine]);

  const play = useCallback(() => {
    engine.start();
    setIsPlaying(true);
  }, [engine]);

  const pause = useCallback(() => {
    engine.pause();
    setIsPlaying(false);
  }, [engine]);

  const reset = useCallback(() => {
    engine.reset();
    setIsPlaying(false);
  }, [engine]);

  const toggle = useCallback(() => {
    if (engine.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [engine, play, pause]);

  const updateLayer = useCallback((id: string, patch: Partial<RhythmLayer>) => {
    setActivePresetLabel(null);
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...patch };
        if (patch.steps !== undefined && patch.steps !== l.steps) {
          updated.pattern = resizePattern(l.pattern, patch.steps);
        }
        return updated;
      }),
    );
  }, []);

  const toggleStep = useCallback((id: string, stepIndex: number) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const pattern = l.pattern.map((step, i) =>
          i === stepIndex ? { velocity: cycleStepVelocity(step.velocity) } : step,
        );
        return { ...l, pattern };
      }),
    );
  }, []);

  const addLayer = useCallback(() => {
    setActivePresetLabel(null);
    setLayers((prev) => {
      const usedSteps = new Set(prev.map((l) => l.steps));
      let nextSteps = (prev.at(-1)?.steps ?? 2) + 1;
      while (usedSteps.has(nextSteps)) nextSteps += 1;
      return [...prev, buildLayer(nextSteps, prev.length)];
    });
  }, []);

  const removeLayer = useCallback((id: string) => {
    setActivePresetLabel(null);
    setLayers((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }, []);

  const applyPreset = useCallback((label: string, values: number[]) => {
    setActivePresetLabel(label);
    setLayers(values.map((n, i) => buildLayer(n, i)));
  }, []);

  return {
    engine,
    layers,
    bpm,
    setBpm: (value: number) => setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, value))),
    bpmRange: { min: MIN_BPM, max: MAX_BPM },
    isPlaying,
    play,
    pause,
    reset,
    toggle,
    updateLayer,
    toggleStep,
    addLayer,
    removeLayer,
    applyPreset,
    presets: PRESETS,
    activePresetLabel,
  };
}
