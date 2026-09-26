import type { AudioBus } from '../audio/shared/AudioBus';
import { createVoice } from '../audio/shared/createVoice';
import { applyTrackMixTarget, createTrackMixer, disposeTrackMixer, isTrackAudible } from '../audio/shared/trackMixer';
import type { TrackMixerNodes } from '../audio/shared/trackMixer';
import type { Voice } from '../audio/voices/Voice';
import { compensateForOutputLatency } from '../audio/rowPhase';
import { seqStepIntervalSeconds, trackStepIndex, voiceDurationSeconds } from './scheduling';
import type { SeqProject, SeqStep, SeqTrack } from './types';

const SCHEDULE_AHEAD_TIME = 0.12;
const LOOKAHEAD_INTERVAL_MS = 25;
const START_LEAD = 0.08;
const MIX_RAMP_TIME = 0.01;

const EMPTY_PROJECT: SeqProject = { bpm: 100, stepsPerBeat: 4, patternSteps: 16, tracks: [] };

/**
 * Look-ahead scheduler for the step sequencer, same principle as
 * RhythmEngine: every hit time is computed fresh as baseStartTime + idx *
 * stepDuration, never accumulated, so timing can't drift. Unlike
 * RhythmEngine (one interval per layer), every track here shares the same
 * step duration — only which pattern slot each track reads differs, via
 * trackStepIndex(globalIndex, track.lengthSteps). No coincidence-accent
 * boost in the sequencer.
 *
 * Built on the shared AudioBus — owns only its own per-track voices and
 * mixer nodes; dispose() never touches the shared bus.
 */
export class SequencerEngine {
  private bus: AudioBus;
  private timerId: number | null = null;
  private project: SeqProject = EMPTY_PROJECT;
  private voices = new Map<string, Voice>();
  private trackMixers = new Map<string, TrackMixerNodes>();

  private nextIndex = 0;
  private baseStartTime = 0;
  private playing = false;
  private hasStarted = false;
  /** Continuous elapsed-step count frozen at the last pause(); used to
   * resume at the same position (analogous to RhythmEngine's frozenPhase,
   * but unbounded rather than normalized to one cycle, since the
   * sequencer has no single shared loop length). */
  private frozenElapsedSteps = 0;
  private pausedAtCtxTime = 0;

  constructor(bus: AudioBus) {
    this.bus = bus;
  }

  get isPlaying() {
    return this.playing;
  }

  getAudioTime(): number {
    return this.bus.getAudioTime();
  }

  getBaseStartTime(): number {
    return this.baseStartTime;
  }

  getStepDuration(): number {
    return seqStepIntervalSeconds(this.project.bpm, this.project.stepsPerBeat);
  }

  /** "Now" for playhead math: live audio time while playing (compensated
   * for output latency), or the frozen instant of the last pause(). */
  getReferenceTime(): number {
    if (!this.playing) return this.pausedAtCtxTime;
    const ctx = this.bus.ensureContext();
    return compensateForOutputLatency(ctx.currentTime, ctx.outputLatency);
  }

  setProject(project: SeqProject) {
    const prevTracks = this.project.tracks;
    this.project = project;

    for (const track of project.tracks) {
      const prev = prevTracks.find((t) => t.id === track.id);

      const needsNewVoice = !this.voices.has(track.id) || !prev || prev.voiceId !== track.voiceId;
      if (needsNewVoice) {
        // waveform/frequency only matter for the 'tone' voiceId (unused by
        // the sequencer); drum and melodic-synth voices ignore both and
        // get their actual pitch per-note via play()'s options.note.
        this.voices.set(track.id, createVoice(track.voiceId, 'sine', 220, () => this.bus.getNoiseBuffer()));
      }

      if (!this.trackMixers.has(track.id)) {
        const ctx = this.bus.ensureContext();
        this.trackMixers.set(track.id, createTrackMixer(ctx, this.bus.getMasterDestination(), track.pan));
      }
    }

    for (const id of Array.from(this.voices.keys())) {
      if (!project.tracks.some((t) => t.id === id)) this.voices.delete(id);
    }
    for (const [id, nodes] of Array.from(this.trackMixers.entries())) {
      if (!project.tracks.some((t) => t.id === id)) {
        disposeTrackMixer(nodes);
        this.trackMixers.delete(id);
      }
    }

    this.applyMixTargets();
  }

  start() {
    const ctx = this.bus.ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (this.playing) return;

    const stepDuration = this.getStepDuration();
    if (this.hasStarted) {
      this.baseStartTime = ctx.currentTime - this.frozenElapsedSteps * stepDuration;
    } else {
      this.baseStartTime = ctx.currentTime + START_LEAD;
      this.hasStarted = true;
    }
    this.playing = true;
    this.nextIndex = Math.max(0, Math.ceil((ctx.currentTime - this.baseStartTime) / stepDuration));
    this.timerId = window.setInterval(() => this.schedulerTick(), LOOKAHEAD_INTERVAL_MS);
    this.schedulerTick();
  }

  pause() {
    if (!this.playing) return;
    const ctx = this.bus.ensureContext();
    this.pausedAtCtxTime = ctx.currentTime;
    const stepDuration = this.getStepDuration();
    this.frozenElapsedSteps = Math.max(0, (ctx.currentTime - this.baseStartTime) / stepDuration);
    this.playing = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  reset() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.playing = false;
    this.hasStarted = false;
    this.frozenElapsedSteps = 0;
    this.pausedAtCtxTime = 0;
    this.baseStartTime = 0;
    this.nextIndex = 0;
  }

  /** Tears down only this engine's own resources (timer, per-track voices
   * and mixer nodes). Never touches the shared AudioBus. */
  dispose() {
    if (this.timerId !== null) window.clearInterval(this.timerId);
    this.timerId = null;
    for (const nodes of this.trackMixers.values()) {
      disposeTrackMixer(nodes);
    }
    this.trackMixers.clear();
    this.voices.clear();
  }

  private applyMixTargets() {
    const now = this.bus.getAudioTime();
    const anySolo = this.project.tracks.some((t) => t.solo);
    for (const track of this.project.tracks) {
      const nodes = this.trackMixers.get(track.id);
      if (!nodes) continue;
      const audible = isTrackAudible(track.mute, track.solo, anySolo);
      applyTrackMixTarget(nodes, track.gain, track.pan, audible, 1, now, MIX_RAMP_TIME);
    }
  }

  private schedulerTick() {
    const ctx = this.bus.ensureContext();
    const scheduleUntil = ctx.currentTime + SCHEDULE_AHEAD_TIME;
    const stepDuration = this.getStepDuration();
    const anySolo = this.project.tracks.some((t) => t.solo);

    let idx = this.nextIndex;
    let time = this.baseStartTime + idx * stepDuration;
    while (time < scheduleUntil) {
      for (const track of this.project.tracks) {
        if (!isTrackAudible(track.mute, track.solo, anySolo)) continue;
        const slot = trackStepIndex(idx, track.lengthSteps);
        const step = track.steps[slot];
        if (!step || step.velocity <= 0) continue;
        this.triggerVoice(track, step, time, stepDuration);
      }
      idx += 1;
      time = this.baseStartTime + idx * stepDuration;
    }
    this.nextIndex = idx;
  }

  private triggerVoice(track: SeqTrack, step: SeqStep, time: number, stepDuration: number) {
    const voice = this.voices.get(track.id);
    const nodes = this.trackMixers.get(track.id);
    if (!voice || !nodes) return;
    const duration = voiceDurationSeconds(step.length, stepDuration);
    voice.play(time, step.velocity, nodes.gain, { note: step.note, duration });
  }
}
