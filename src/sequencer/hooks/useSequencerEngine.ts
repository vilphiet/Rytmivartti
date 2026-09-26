import { useCallback, useEffect, useState } from 'react';
import { SequencerEngine } from '../SequencerEngine';
import type { AudioBus } from '../../audio/shared/AudioBus';
import { useUndoableState } from './useUndoableState';
import type { ScaleId, SeqProject, SeqTrack, SeqTrackKind } from '../types';
import { clearAllSteps, clearTrackSteps, cycleSeqStepVelocity, setPatternLength } from '../pattern';
import { buildDefaultProject, buildDrumTrack, buildMelodicTrack, makeTrackId } from '../defaultProject';
import { clearMelodicNote, setMelodicAccent, setMelodicNote, setMelodicNoteLength } from '../melody';
import { applyScaleToProject, transposeProject } from '../scale';
import { seqStepIntervalSeconds } from '../scheduling';
import { defaultSeqSteps } from '../pattern';
import { defaultTrackNameForVoice, duplicateTrack } from '../trackActions';
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
/** Matches voiceDurationSeconds's own note-duration convention (a normal
 * scheduled note also gets 90% of a step's duration, leaving a small gap
 * before the next). */
const PREVIEW_DURATION_RATIO = 0.9;

export function useSequencerEngine(audioBus: AudioBus) {
  const [engine] = useState(() => new SequencerEngine(audioBus));

  // useState's lazy initializer runs exactly once per mount, unlike
  // useMemo, so this touches localStorage only on first mount, matching
  // the polyrhythm side's useRhythmEngine.
  const [initialSaved] = useState(() => loadSeqState());

  const {
    value: project,
    setValue: setProject,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoableState<SeqProject>(() => initialSaved?.project ?? buildDefaultProject());
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
  }, [setProject]);

  const setPatternStepsCount = useCallback((steps: number) => {
    setProject((prev) => setPatternLength(prev, steps));
  }, [setProject]);

  const toggleStep = useCallback((trackId: string, stepIndex: number) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const steps = t.steps.map((s, i) => (i === stepIndex ? { ...s, velocity: cycleSeqStepVelocity(s.velocity) } : s));
        return { ...t, steps };
      }),
    }));
  }, [setProject]);

  const updateTrack = useCallback((trackId: string, patch: Partial<SeqTrack>) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => {
        if (t.id !== trackId) return t;
        // Auto-renaming: if the voice is changing and the track still has
        // its old voice's default name (i.e. the user hasn't renamed it
        // themselves), and the patch itself isn't setting an explicit new
        // name, update the name to match the new voice's default too.
        if (patch.voiceId && patch.voiceId !== t.voiceId && patch.name === undefined && t.name === defaultTrackNameForVoice(t.voiceId)) {
          return { ...t, ...patch, name: defaultTrackNameForVoice(patch.voiceId) };
        }
        return { ...t, ...patch };
      }),
    }));
  }, [setProject]);

  const addTrack = useCallback((kind: SeqTrackKind) => {
    setProject((prev) => {
      const newTrack: SeqTrack =
        kind === 'melodic'
          ? buildMelodicTrack(defaultTrackNameForVoice('bass'), prev.patternSteps)
          : buildDrumTrack(defaultTrackNameForVoice('kick'), 'kick', defaultSeqSteps(), prev.patternSteps);
      return { ...prev, tracks: [...prev.tracks, newTrack] };
    });
  }, [setProject]);

  const removeTrack = useCallback((trackId: string) => {
    setProject((prev) => (prev.tracks.length > 1 ? { ...prev, tracks: prev.tracks.filter((t) => t.id !== trackId) } : prev));
  }, [setProject]);

  const clearTrack = useCallback((trackId: string) => {
    setProject((prev) => clearTrackSteps(prev, trackId));
  }, [setProject]);

  const duplicateTrackAction = useCallback((trackId: string) => {
    setProject((prev) => duplicateTrack(prev, trackId, makeTrackId()));
  }, [setProject]);

  const mapTrackSteps = useCallback((trackId: string, mapSteps: (track: SeqTrack) => SeqTrack['steps']) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, steps: mapSteps(t) } : t)),
    }));
  }, [setProject]);

  // Places (or relocates) a note at stepIndex/note. Tapping an existing
  // note of its own pitch is handled entirely in the piano roll's own
  // selection state now (it only selects, never deletes here) -- deleting
  // a note is a separate, explicit action (see deleteNoteAtStep).
  const setNoteAtStep = useCallback(
    (trackId: string, stepIndex: number, note: number) => {
      mapTrackSteps(trackId, (t) => setMelodicNote(t.steps, stepIndex, note));
    },
    [mapTrackSteps],
  );

  const deleteNoteAtStep = useCallback(
    (trackId: string, stepIndex: number) => {
      mapTrackSteps(trackId, (t) => clearMelodicNote(t.steps, stepIndex));
    },
    [mapTrackSteps],
  );

  const setNoteLength = useCallback(
    (trackId: string, headIndex: number, targetIndex: number) => {
      mapTrackSteps(trackId, (t) => setMelodicNoteLength(t.steps, t.lengthSteps, headIndex, targetIndex));
    },
    [mapTrackSteps],
  );

  const setNoteAccent = useCallback(
    (trackId: string, stepIndex: number, isAccent: boolean) => {
      mapTrackSteps(trackId, (t) => setMelodicAccent(t.steps, stepIndex, isAccent));
    },
    [mapTrackSteps],
  );

  const setRootNote = useCallback((newRootNote: number) => {
    setProject((prev) => transposeProject(prev, newRootNote));
  }, [setProject]);

  const setScale = useCallback((newScale: ScaleId) => {
    setProject((prev) => applyScaleToProject(prev, newScale));
  }, [setProject]);

  const previewNote = useCallback(
    (trackId: string, note: number, velocity: number) => {
      const duration = seqStepIntervalSeconds(project.bpm, project.stepsPerBeat) * PREVIEW_DURATION_RATIO;
      engine.previewNote(trackId, note, velocity, duration);
    },
    [engine, project.bpm, project.stepsPerBeat],
  );

  const restoreDefaults = useCallback(() => {
    engine.reset();
    setIsPlaying(false);
    setProject(buildDefaultProject());
  }, [engine, setProject]);

  const clearPattern = useCallback(() => {
    setProject((prev) => clearAllSteps(prev));
  }, [setProject]);

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
  }, [setProject]);

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
    clearTrack,
    duplicateTrackAction,
    setNoteAtStep,
    deleteNoteAtStep,
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
  };
}
