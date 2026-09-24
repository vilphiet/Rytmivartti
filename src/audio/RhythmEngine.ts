import type { BeatEvent, RhythmLayer } from './types';
import type { Voice } from './voices/Voice';
import type { AudioBus } from './shared/AudioBus';
import { createVoice } from './shared/createVoice';
import { applyTrackMixTarget, createTrackMixer, disposeTrackMixer, isTrackAudible } from './shared/trackMixer';
import type { TrackMixerNodes } from './shared/trackMixer';
import { ACCENT_EPSILON_SECONDS, applyAccentBoost, detectAccents, stepIndexForBeat, stepIntervalSeconds } from './scheduling';
import { STEP_NORMAL } from './pattern';
import { compensateForOutputLatency } from './rowPhase';

const SCHEDULE_AHEAD_TIME = 0.12;
const LOOKAHEAD_INTERVAL_MS = 25;
const START_LEAD = 0.08;
const MIX_RAMP_TIME = 0.01;
// A normal-velocity step (STEP_NORMAL) should reproduce the old, pre-pattern
// output level exactly. Since voice output now scales with velocity, this
// makeup gain cancels that scaling back out downstream of every voice.
const MAKEUP_GAIN = 1 / STEP_NORMAL;

interface LayerRuntime {
  nextIndex: number;
}

/**
 * Look-ahead scheduler in the style of "A Tale of Two Clocks": a setInterval
 * timer periodically schedules oscillator events a short window ahead using
 * AudioContext.currentTime, so audio timing never depends on setTimeout/RAF
 * jitter. Visual code reads getPhase()/getAudioTime() from the same clock.
 *
 * Built on the shared AudioBus (one AudioContext/master chain for the whole
 * app) — this engine owns only its own per-layer voices and mixer nodes,
 * and dispose() never touches the shared bus, which outlives it.
 */
export class RhythmEngine {
  private bus: AudioBus;
  private timerId: number | null = null;
  private layers: RhythmLayer[] = [];
  private runtime = new Map<string, LayerRuntime>();
  private voices = new Map<string, Voice>();
  private layerMixers = new Map<string, TrackMixerNodes>();

  private baseStartTime = 0;
  private cycleDuration = 1;
  private playing = false;
  private hasStarted = false;
  private frozenPhase = 0;
  /** ctx.currentTime snapshot taken at the last pause(); meaningless while
   * playing. Lets getReferenceTime() derive phase for ANY duration (not
   * just the shared cycleDuration) while paused — frozenPhase alone can't,
   * since it already discarded which multiple of cycleDuration had
   * elapsed, information other durations need. */
  private pausedAtCtxTime = 0;

  private beatListeners = new Set<(events: BeatEvent[]) => void>();

  constructor(bus: AudioBus) {
    this.bus = bus;
  }

  get isPlaying() {
    return this.playing;
  }

  getAudioTime(): number {
    return this.bus.getAudioTime();
  }

  /** Fraction 0..1 of the shared base cycle, for canvas rendering. */
  getPhase(): number {
    if (!this.playing) return this.frozenPhase;
    const now = this.bus.getAudioTime();
    const raw = (now - this.baseStartTime) / this.cycleDuration;
    return ((raw % 1) + 1) % 1;
  }

  /** The shared phase-0 reference instant, for callers computing phase
   * against a different duration than the shared cycle (e.g. a grid row
   * with its own cycleBeats). Read-only — never touches scheduling. */
  getBaseStartTime(): number {
    return this.baseStartTime;
  }

  /** The current shared beat duration in seconds, for callers computing a
   * per-row cycle length as cycleDuration * layer.cycleBeats. */
  getCycleDuration(): number {
    return this.cycleDuration;
  }

  /** "Now", for phase math: live audio time while playing (compensated for
   * output latency when the browser reports one, so a visual indicator
   * matches what's actually audible rather than what was just scheduled —
   * this can drift noticeably apart on e.g. Bluetooth headphones), or the
   * frozen instant of the last pause() otherwise. */
  getReferenceTime(): number {
    if (!this.playing) return this.pausedAtCtxTime;
    const ctx = this.bus.ensureContext();
    return compensateForOutputLatency(ctx.currentTime, ctx.outputLatency);
  }

  setLayers(layers: RhythmLayer[]) {
    const prevLayers = this.layers;
    this.layers = layers;

    for (const layer of layers) {
      const prev = prevLayers.find((l) => l.id === layer.id);

      const existingRuntime = this.runtime.get(layer.id);
      if (!existingRuntime) {
        this.runtime.set(layer.id, {
          nextIndex: this.playing ? this.computeNextIndex(layer) : 0,
        });
      } else if (this.playing && prev && (prev.steps !== layer.steps || prev.cycleBeats !== layer.cycleBeats)) {
        this.runtime.set(layer.id, { nextIndex: this.computeNextIndex(layer) });
      }

      const needsNewVoice =
        !this.voices.has(layer.id) ||
        !prev ||
        prev.voiceId !== layer.voiceId ||
        prev.waveform !== layer.waveform ||
        prev.frequency !== layer.frequency;
      if (needsNewVoice) {
        this.voices.set(layer.id, createVoice(layer.voiceId, layer.waveform, layer.frequency, () => this.bus.getNoiseBuffer()));
      }

      if (!this.layerMixers.has(layer.id)) {
        const ctx = this.bus.ensureContext();
        this.layerMixers.set(layer.id, createTrackMixer(ctx, this.bus.getMasterDestination(), layer.pan));
      }
    }

    for (const id of Array.from(this.runtime.keys())) {
      if (!layers.some((l) => l.id === id)) this.runtime.delete(id);
    }
    for (const id of Array.from(this.voices.keys())) {
      if (!layers.some((l) => l.id === id)) this.voices.delete(id);
    }
    for (const [id, nodes] of Array.from(this.layerMixers.entries())) {
      if (!layers.some((l) => l.id === id)) {
        disposeTrackMixer(nodes);
        this.layerMixers.delete(id);
      }
    }

    this.applyMixTargets();
  }

  /** Change the shared cycle length without discontinuity: the current
   * phase position is preserved so all layers keep their relative timing. */
  setTempo(cycleDuration: number) {
    if (cycleDuration <= 0) return;
    if (this.playing) {
      const now = this.bus.getAudioTime();
      const raw = (now - this.baseStartTime) / this.cycleDuration;
      const normalizedPhase = ((raw % 1) + 1) % 1;
      this.baseStartTime = now - normalizedPhase * cycleDuration;
      this.cycleDuration = cycleDuration;
      for (const layer of this.layers) {
        this.runtime.set(layer.id, { nextIndex: this.computeNextIndex(layer) });
      }
    } else {
      this.cycleDuration = cycleDuration;
    }
  }

  start() {
    const ctx = this.bus.ensureContext();
    if (ctx.state === 'suspended') void ctx.resume();
    if (this.playing) return;

    if (this.hasStarted) {
      this.baseStartTime = ctx.currentTime - this.frozenPhase * this.cycleDuration;
    } else {
      this.baseStartTime = ctx.currentTime + START_LEAD;
      this.hasStarted = true;
    }
    this.playing = true;
    for (const layer of this.layers) {
      this.runtime.set(layer.id, { nextIndex: this.computeNextIndex(layer) });
    }
    this.timerId = window.setInterval(() => this.schedulerTick(), LOOKAHEAD_INTERVAL_MS);
    this.schedulerTick();
  }

  pause() {
    if (!this.playing) return;
    const ctx = this.bus.ensureContext();
    this.pausedAtCtxTime = ctx.currentTime;
    const raw = (ctx.currentTime - this.baseStartTime) / this.cycleDuration;
    this.frozenPhase = ((raw % 1) + 1) % 1;
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
    this.frozenPhase = 0;
    this.pausedAtCtxTime = 0;
    this.baseStartTime = 0;
    for (const layer of this.layers) {
      this.runtime.set(layer.id, { nextIndex: 0 });
    }
  }

  onBeat(cb: (events: BeatEvent[]) => void): () => void {
    this.beatListeners.add(cb);
    return () => this.beatListeners.delete(cb);
  }

  /** Tears down only this engine's own resources (timer, per-layer voices
   * and mixer nodes). Never touches the shared AudioBus (context/master
   * chain), which outlives this engine — e.g. when the polyrhythm tab is
   * unmounted while the sequencer tab keeps playing. */
  dispose() {
    if (this.timerId !== null) window.clearInterval(this.timerId);
    this.timerId = null;
    this.beatListeners.clear();
    for (const nodes of this.layerMixers.values()) {
      disposeTrackMixer(nodes);
    }
    this.layerMixers.clear();
    this.voices.clear();
  }

  /** Recomputes every layer's mixer target (mute/solo/volume/pan). Solo is
   * global — one layer's solo state affects every other layer's target —
   * so this always re-applies to the whole layer set, not just the one
   * that changed. Uses setTargetAtTime so changes ramp smoothly instead of
   * clicking, and never touch the scheduling loop. */
  private applyMixTargets() {
    const now = this.bus.getAudioTime();
    const anySolo = this.layers.some((l) => l.solo);
    for (const layer of this.layers) {
      const nodes = this.layerMixers.get(layer.id);
      if (!nodes) continue;
      const audible = isTrackAudible(layer.muted, layer.solo, anySolo);
      applyTrackMixTarget(nodes, layer.volume, layer.pan, audible, MAKEUP_GAIN, now, MIX_RAMP_TIME);
    }
  }

  private computeNextIndex(layer: RhythmLayer): number {
    const ctx = this.bus.ensureContext();
    const interval = stepIntervalSeconds(this.cycleDuration, layer.cycleBeats, layer.steps);
    return Math.max(0, Math.ceil((ctx.currentTime - this.baseStartTime) / interval));
  }

  private schedulerTick() {
    const ctx = this.bus.ensureContext();
    const scheduleUntil = ctx.currentTime + SCHEDULE_AHEAD_TIME;
    const pending: { layer: RhythmLayer; time: number; stepIndex: number; velocity: number }[] = [];

    for (const layer of this.layers) {
      const rt = this.runtime.get(layer.id);
      if (!rt) continue;
      const interval = stepIntervalSeconds(this.cycleDuration, layer.cycleBeats, layer.steps);
      let idx = rt.nextIndex;
      let time = this.baseStartTime + idx * interval;
      while (time < scheduleUntil) {
        const stepIndex = stepIndexForBeat(idx, layer.steps);
        const velocity = layer.pattern[stepIndex]?.velocity ?? 0;
        // Steps at velocity 0 are skipped entirely: never scheduled, never
        // trigger a voice, never emit a BeatEvent (so canvas never flashes
        // a vertex that didn't actually sound), and never enter accent
        // coincidence detection below.
        if (velocity > 0) {
          pending.push({ layer, time, stepIndex, velocity });
        }
        idx += 1;
        time = this.baseStartTime + idx * interval;
      }
      rt.nextIndex = idx;
    }

    if (pending.length === 0) return;
    pending.sort((a, b) => a.time - b.time);

    const anySolo = this.layers.some((l) => l.solo);
    const accentFlags = detectAccents(
      pending.map((p) => ({
        layerId: p.layer.id,
        time: p.time,
        audible: isTrackAudible(p.layer.muted, p.layer.solo, anySolo),
      })),
      ACCENT_EPSILON_SECONDS,
    );

    const events: BeatEvent[] = [];
    for (let i = 0; i < pending.length; i++) {
      const { layer, time, stepIndex, velocity } = pending[i];
      const isAccent = accentFlags[i];
      this.triggerVoice(layer, time, velocity, isAccent);
      events.push({ layerId: layer.id, time, vertexIndex: stepIndex, isAccent, velocity });
    }

    if (this.beatListeners.size) {
      for (const cb of this.beatListeners) cb(events);
    }
  }

  private triggerVoice(layer: RhythmLayer, time: number, velocity: number, isAccent: boolean) {
    const voice = this.voices.get(layer.id);
    const nodes = this.layerMixers.get(layer.id);
    if (!voice || !nodes) return;
    voice.play(time, applyAccentBoost(velocity, isAccent), nodes.gain);
  }
}
