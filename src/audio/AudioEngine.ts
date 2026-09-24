import type { BeatEvent, RhythmLayer, VoiceId } from './types';
import type { Voice } from './voices/Voice';
import { ToneVoice } from './voices/ToneVoice';
import { KickVoice, SnareVoice, HihatVoice, RimVoice } from './voices/DrumVoices';
import { SampleVoice } from './voices/SampleVoice';
import { getSharedNoiseBuffer } from './noiseBuffer';

const SCHEDULE_AHEAD_TIME = 0.12;
const LOOKAHEAD_INTERVAL_MS = 25;
const START_LEAD = 0.08;
const ACCENT_EPSILON = 0.004;
const ACCENT_BOOST_FACTOR = 1.3;
const MIX_RAMP_TIME = 0.01;
const DEFAULT_TRIGGER_VELOCITY = 0.6;

const COMPRESSOR_THRESHOLD = -6;
const COMPRESSOR_RATIO = 4;
const COMPRESSOR_ATTACK = 0.003;
const COMPRESSOR_RELEASE = 0.1;

interface LayerRuntime {
  nextIndex: number;
}

interface LayerMixerNodes {
  gain: GainNode;
  pan: StereoPannerNode;
}

/**
 * Look-ahead scheduler in the style of "A Tale of Two Clocks": a setInterval
 * timer periodically schedules oscillator events a short window ahead using
 * AudioContext.currentTime, so audio timing never depends on setTimeout/RAF
 * jitter. Visual code reads getPhase()/getAudioTime() from the same clock.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private timerId: number | null = null;
  private layers: RhythmLayer[] = [];
  private runtime = new Map<string, LayerRuntime>();
  private voices = new Map<string, Voice>();
  private layerMixers = new Map<string, LayerMixerNodes>();

  private baseStartTime = 0;
  private cycleDuration = 1;
  private playing = false;
  private hasStarted = false;
  private frozenPhase = 0;

  private beatListeners = new Set<(events: BeatEvent[]) => void>();

  get isPlaying() {
    return this.playing;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = COMPRESSOR_THRESHOLD;
      this.compressor.ratio.value = COMPRESSOR_RATIO;
      this.compressor.attack.value = COMPRESSOR_ATTACK;
      this.compressor.release.value = COMPRESSOR_RELEASE;
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.compressor);
    }
    return this.ctx;
  }

  getAudioTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /** Fraction 0..1 of the shared base cycle, for canvas rendering. */
  getPhase(): number {
    if (!this.playing) return this.frozenPhase;
    const ctx = this.ctx;
    if (!ctx) return 0;
    const raw = (ctx.currentTime - this.baseStartTime) / this.cycleDuration;
    return ((raw % 1) + 1) % 1;
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
      } else if (this.playing && prev && prev.n !== layer.n) {
        this.runtime.set(layer.id, { nextIndex: this.computeNextIndex(layer) });
      }

      const needsNewVoice =
        !this.voices.has(layer.id) ||
        !prev ||
        prev.voiceId !== layer.voiceId ||
        prev.waveform !== layer.waveform ||
        prev.frequency !== layer.frequency;
      if (needsNewVoice) {
        this.voices.set(layer.id, this.createVoice(layer));
      }

      if (!this.layerMixers.has(layer.id)) {
        const ctx = this.ensureContext();
        const gain = ctx.createGain();
        const pan = ctx.createStereoPanner();
        gain.gain.value = 0;
        pan.pan.value = layer.pan;
        gain.connect(pan);
        pan.connect(this.masterGain!);
        this.layerMixers.set(layer.id, { gain, pan });
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
        nodes.gain.disconnect();
        nodes.pan.disconnect();
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
      const ctx = this.ensureContext();
      const now = ctx.currentTime;
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
    const ctx = this.ensureContext();
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
    const ctx = this.ensureContext();
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
    this.baseStartTime = 0;
    for (const layer of this.layers) {
      this.runtime.set(layer.id, { nextIndex: 0 });
    }
  }

  onBeat(cb: (events: BeatEvent[]) => void): () => void {
    this.beatListeners.add(cb);
    return () => this.beatListeners.delete(cb);
  }

  dispose() {
    if (this.timerId !== null) window.clearInterval(this.timerId);
    this.timerId = null;
    this.beatListeners.clear();
    for (const nodes of this.layerMixers.values()) {
      nodes.gain.disconnect();
      nodes.pan.disconnect();
    }
    this.layerMixers.clear();
    this.voices.clear();
    this.masterGain?.disconnect();
    this.compressor?.disconnect();
    void this.ctx?.close();
    this.ctx = null;
  }

  private createVoice(layer: RhythmLayer): Voice {
    const voiceId: VoiceId = layer.voiceId;
    switch (voiceId) {
      case 'kick':
        return new KickVoice();
      case 'snare':
        return new SnareVoice(this.getNoiseBuffer());
      case 'hihat':
        return new HihatVoice(this.getNoiseBuffer());
      case 'rim':
        return new RimVoice(this.getNoiseBuffer());
      case 'sample':
        return new SampleVoice(null);
      case 'tone':
        return new ToneVoice(layer.waveform, layer.frequency);
    }
  }

  private getNoiseBuffer(): AudioBuffer {
    return getSharedNoiseBuffer(this.ensureContext());
  }

  /** Recomputes every layer's mixer target (mute/solo/volume/pan). Solo is
   * global — one layer's solo state affects every other layer's target —
   * so this always re-applies to the whole layer set, not just the one
   * that changed. Uses setTargetAtTime so changes ramp smoothly instead of
   * clicking, and never touch the scheduling loop. */
  private applyMixTargets() {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const anySolo = this.layers.some((l) => l.solo);
    for (const layer of this.layers) {
      const nodes = this.layerMixers.get(layer.id);
      if (!nodes) continue;
      const audible = !layer.muted && (!anySolo || layer.solo);
      const targetGain = audible ? layer.volume : 0;
      nodes.gain.gain.setTargetAtTime(targetGain, now, MIX_RAMP_TIME);
      nodes.pan.pan.setTargetAtTime(layer.pan, now, MIX_RAMP_TIME);
    }
  }

  private computeNextIndex(layer: RhythmLayer): number {
    const ctx = this.ensureContext();
    const interval = this.cycleDuration / layer.n;
    return Math.max(0, Math.ceil((ctx.currentTime - this.baseStartTime) / interval));
  }

  private schedulerTick() {
    const ctx = this.ensureContext();
    const scheduleUntil = ctx.currentTime + SCHEDULE_AHEAD_TIME;
    const pending: { layer: RhythmLayer; time: number; idx: number }[] = [];

    for (const layer of this.layers) {
      const rt = this.runtime.get(layer.id);
      if (!rt) continue;
      const interval = this.cycleDuration / layer.n;
      let idx = rt.nextIndex;
      let time = this.baseStartTime + idx * interval;
      while (time < scheduleUntil) {
        pending.push({ layer, time, idx });
        idx += 1;
        time = this.baseStartTime + idx * interval;
      }
      rt.nextIndex = idx;
    }

    if (pending.length === 0) return;
    pending.sort((a, b) => a.time - b.time);

    const events: BeatEvent[] = [];
    for (let i = 0; i < pending.length; i++) {
      const { layer, time, idx } = pending[i];
      let isAccent = false;
      for (let j = 0; j < pending.length; j++) {
        if (i === j || pending[j].layer.id === layer.id) continue;
        if (Math.abs(pending[j].time - time) < ACCENT_EPSILON) {
          isAccent = true;
          break;
        }
      }
      const velocity = DEFAULT_TRIGGER_VELOCITY;
      this.triggerVoice(layer, time, velocity, isAccent);
      events.push({ layerId: layer.id, time, vertexIndex: idx % layer.n, isAccent, velocity });
    }

    if (this.beatListeners.size) {
      for (const cb of this.beatListeners) cb(events);
    }
  }

  private triggerVoice(layer: RhythmLayer, time: number, velocity: number, isAccent: boolean) {
    const voice = this.voices.get(layer.id);
    const nodes = this.layerMixers.get(layer.id);
    if (!voice || !nodes) return;
    const effectiveVelocity = isAccent ? Math.min(1, velocity * ACCENT_BOOST_FACTOR) : velocity;
    voice.play(time, effectiveVelocity, nodes.gain);
  }
}
