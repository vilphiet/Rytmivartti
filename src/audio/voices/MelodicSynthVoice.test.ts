import { describe, expect, it } from 'vitest';
import { MelodicSynthVoice } from './MelodicSynthVoice';
import type { SynthPreset } from './synthPresets';
import { midiNoteToFrequency } from '../midi';
import { FakeAudioContext, FakeDestinationNode } from './fakeAudioGraph';
import type { FakeGainNode } from './fakeAudioGraph';

const TEST_PRESET: SynthPreset = {
  label: 'Test',
  oscillators: [
    { type: 'sawtooth', detuneCents: -5, gain: 0.6 },
    { type: 'triangle', detuneCents: 5, gain: 0.4 },
  ],
  filterType: 'lowpass',
  filterBaseFreq: 300,
  filterEnvAmount: 1000,
  filterEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.2 },
  filterQ: 1.5,
  ampEnvelope: { attack: 0.01, decay: 0.08, sustain: 0.6, release: 0.15 },
};

function setup() {
  const ctx = new FakeAudioContext();
  const destination = new FakeDestinationNode(ctx);
  const voice = new MelodicSynthVoice(TEST_PRESET);
  return { ctx, destination, voice };
}

describe('MelodicSynthVoice', () => {
  it('sets every oscillator to the note\'s MIDI frequency and its own preset detune', () => {
    const { ctx, destination, voice } = setup();
    voice.play(1.0, 1, destination as never, { note: 69, duration: 0.3 }); // A4 = 440 Hz

    expect(ctx.createdOscillators).toHaveLength(2);
    for (const [i, osc] of ctx.createdOscillators.entries()) {
      expect(osc.frequency.calls[0]).toMatchObject({ method: 'setValueAtTime', value: midiNoteToFrequency(69), time: 1.0 });
      expect(osc.detune.calls[0]).toMatchObject({ value: TEST_PRESET.oscillators[i].detuneCents, time: 1.0 });
    }
  });

  it('defaults to a fallback note when options.note is omitted, instead of producing NaN', () => {
    const { ctx, destination, voice } = setup();
    voice.play(0, 1, destination as never, { duration: 0.2 });
    const freq = ctx.createdOscillators[0].frequency.calls[0].value!;
    expect(Number.isFinite(freq)).toBe(true);
    expect(freq).toBeGreaterThan(0);
  });

  it('builds oscillator -> per-osc gain -> shared filter -> shared amp gain -> destination', () => {
    const { ctx, destination, voice } = setup();
    voice.play(1.0, 0.9, destination as never, { note: 69, duration: 0.3 });

    expect(ctx.createdFilters).toHaveLength(1);
    const filter = ctx.createdFilters[0];
    // Every oscillator's own gain connects into the shared filter.
    expect(ctx.createdGains.filter((g) => g.connectedTo.includes(filter))).toHaveLength(2);
    // The shared filter connects into the amp gain, which connects to destination.
    expect(filter.connectedTo).toHaveLength(1);
    const ampGain = filter.connectedTo[0] as FakeGainNode;
    expect(ampGain.connectedTo).toEqual([destination]);
  });

  it('schedules the amp envelope: 0 -> peak (attack) -> sustain (decay), release starting at note-off', () => {
    const { ctx, destination, voice } = setup();
    const time = 2.0;
    const duration = 0.5;
    const velocity = 0.8;
    voice.play(time, velocity, destination as never, { note: 60, duration });

    const ampGain = ctx.createdFilters[0].connectedTo[0] as FakeGainNode;
    const calls = ampGain.gain.calls;

    expect(calls[0]).toMatchObject({ method: 'setValueAtTime', value: 0, time });
    expect(calls[1]).toMatchObject({
      method: 'linearRampToValueAtTime',
      value: velocity,
      time: time + TEST_PRESET.ampEnvelope.attack,
    });
    expect(calls[2]).toMatchObject({
      method: 'linearRampToValueAtTime',
      value: velocity * TEST_PRESET.ampEnvelope.sustain,
      time: time + TEST_PRESET.ampEnvelope.attack + TEST_PRESET.ampEnvelope.decay,
    });

    const noteOffTime = time + duration;
    expect(calls[3]).toMatchObject({ method: 'cancelAndHoldAtTime', time: noteOffTime });
    expect(calls[4]).toMatchObject({ method: 'setTargetAtTime', value: 0, time: noteOffTime });
  });

  it('uses cancelAndHoldAtTime at note-off even for a note shorter than attack+decay (no jump-to-sustain click)', () => {
    const { ctx, destination, voice } = setup();
    const time = 0;
    // Attack alone is 0.01s; give the note only 0.005s so release must cut
    // in mid-attack, never after the decay stage completes.
    const duration = 0.005;
    voice.play(time, 1, destination as never, { note: 60, duration });

    const ampGain = ctx.createdFilters[0].connectedTo[0] as FakeGainNode;
    // Regardless of how short the note is relative to attack+decay, the
    // last two scheduled calls are always cancelAndHoldAtTime immediately
    // followed by the release — this is what makes cancelAndHoldAtTime
    // effective in a real AudioParam (it cancels any not-yet-started
    // ramps and holds at whatever value the envelope had actually
    // reached), rather than snapping to the sustain level first.
    const calls = ampGain.gain.calls;
    const noteOffTime = time + duration;
    expect(calls.at(-2)).toMatchObject({ method: 'cancelAndHoldAtTime', time: noteOffTime });
    expect(calls.at(-1)).toMatchObject({ method: 'setTargetAtTime', value: 0, time: noteOffTime });
  });

  it('schedules every oscillator to stop comfortably after both envelopes release, and disconnects the whole graph once ended', () => {
    const { ctx, destination, voice } = setup();
    const time = 0;
    const duration = 0.3;
    voice.play(time, 1, destination as never, { note: 60, duration });

    const noteOffTime = time + duration;
    const maxRelease = Math.max(TEST_PRESET.filterEnvelope.release, TEST_PRESET.ampEnvelope.release);
    for (const osc of ctx.createdOscillators) {
      expect(osc.startedAt).toBe(time);
      expect(osc.stoppedAt).not.toBeNull();
      expect(osc.stoppedAt!).toBeGreaterThan(noteOffTime + maxRelease);
    }

    // Nothing has disconnected yet -- the graph is still "live" mid-note.
    expect(ctx.createdOscillators.every((o) => o.disconnectCount === 0)).toBe(true);

    // Capture the graph shape before disconnecting anything -- disconnect()
    // clears connectedTo, so this must be read before fireEnded() runs.
    const filter = ctx.createdFilters[0];
    const ampGain = filter.connectedTo[0] as FakeGainNode;

    // Simulate the browser firing onended once the scheduled stop elapses.
    ctx.createdOscillators[0].fireEnded();

    expect(filter.disconnectCount).toBe(1);
    expect(ampGain.disconnectCount).toBe(1);
    for (const osc of ctx.createdOscillators) expect(osc.disconnectCount).toBe(1);
    for (const gain of ctx.createdGains) expect(gain.disconnectCount).toBe(1);
  });
});
