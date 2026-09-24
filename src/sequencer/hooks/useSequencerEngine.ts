import { useCallback, useEffect, useState } from 'react';
import { SequencerEngine } from '../SequencerEngine';
import type { AudioBus } from '../../audio/shared/AudioBus';
import type { SeqTrack } from '../types';
import { cycleSeqStepVelocity, defaultSeqSteps, setPatternLength } from '../pattern';
import { buildDefaultProject, makeTrackId } from '../defaultProject';
import { serializeSeqState } from '../state/serialize';
import {
  deleteSeqNamedPattern,
  listSeqNamedPatterns,
  loadSeqNamedPattern,
  loadSeqState,
  saveSeqNamedPattern,
  saveSeqState,
} from '../state/storage';
import { useDebouncedAutosave } from '../../hooks/useDebouncedAutosave';

const MIN_BPM = 40;
const MAX_BPM = 240;
const AUTOSAVE_DEBOUNCE_MS = 500;

export function useSequencerEngine(audioBus: AudioBus) {
  const [engine] = useState(() => new SequencerEngine(audioBus));

  // useState's lazy initializer runs exactly once per mount, unlike
  // useMemo, so this touches localStorage only on first mount, matching
  // the polyrhythm side's useRhythmEngine.
  const [initialSaved] = useState(() => loadSeqState());

  const [project, setProject] = useState(() => initialSaved?.project ?? buildDefaultProject());
  const [isPlaying, setIsPlaying] = useState(false);
  const [namedPatternNames, setNamedPatternNames] = useState<string[]>(() => listSeqNamedPatterns());

  useEffect(() => {
    engine.setProject(project);
  }, [engine, project]);

  useEffect(() => {
    return () => engine.dispose();
  }, [engine]);

  // Flushes immediately on unmount/tab-hide/pagehide instead of relying
  // solely on the debounce, matching the polyrhythm side's hardened
  // autosave — an edit right before a tab switch is never lost.
  useDebouncedAutosave(serializeSeqState(project), saveSeqState, AUTOSAVE_DEBOUNCE_MS);

  const play = useCallback(() => {
    engine.start();
    setIsPlaying(true);
  }, [engine]);

  const pause = useCallback(() => {
    engine.pause();
    setIsPlaying(false);
  }, [engine]);

  const toggle = useCallback(() => {
    if (engine.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [engine, play, pause]);

  const setBpm = useCallback((value: number) => {
    setProject((prev) => ({ ...prev, bpm: Math.min(MAX_BPM, Math.max(MIN_BPM, value)) }));
  }, []);

  const setPatternStepsCount = useCallback((steps: number) => {
    setProject((prev) => setPatternLength(prev, steps));
  }, []);

  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const steps = t.steps.map((s, i) => (i === stepIndex ? { ...s, velocity: cycleSeqStepVelocity(s.velocity) } : s));
        return { ...t, steps };
      }),
    }));
  }, []);

  const updateTrack = useCallback((trackId: string, patch: Partial<SeqTrack>) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
    }));
  }, []);

  const addTrack = useCallback(() => {
    setProject((prev) => {
      const newTrack: SeqTrack = {
        id: makeTrackId(),
        name: `Raita ${prev.tracks.length + 1}`,
        kind: 'drum',
        voiceId: 'kick',
        gain: 0.8,
        pan: 0,
        mute: false,
        solo: false,
        lengthSteps: prev.patternSteps,
        steps: defaultSeqSteps(),
      };
      return { ...prev, tracks: [...prev.tracks, newTrack] };
    });
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setProject((prev) => (prev.tracks.length > 1 ? { ...prev, tracks: prev.tracks.filter((t) => t.id !== trackId) } : prev));
  }, []);

  const restoreDefaults = useCallback(() => {
    engine.reset();
    setIsPlaying(false);
    setProject(buildDefaultProject());
  }, [engine]);

  const refreshNamedPatterns = useCallback(() => {
    setNamedPatternNames(listSeqNamedPatterns());
  }, []);

  const saveCurrentAsNamedPattern = useCallback(
    (name: string) => {
      if (!name.trim()) return;
      saveSeqNamedPattern(name.trim(), serializeSeqState(project));
      refreshNamedPatterns();
    },
    [project, refreshNamedPatterns],
  );

  const loadNamedPatternByName = useCallback((name: string) => {
    const found = loadSeqNamedPattern(name);
    if (!found) return;
    setProject(found.project);
  }, []);

  const deleteNamedPatternByName = useCallback(
    (name: string) => {
      deleteSeqNamedPattern(name);
      refreshNamedPatterns();
    },
    [refreshNamedPatterns],
  );

  return {
    engine,
    project,
    isPlaying,
    toggle,
    bpmRange: { min: MIN_BPM, max: MAX_BPM },
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
  };
}
