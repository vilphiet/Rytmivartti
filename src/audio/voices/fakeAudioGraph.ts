/** A minimal in-memory stand-in for the small slice of the Web Audio API
 * that Voice implementations use, so their node graph, envelope scheduling
 * and cleanup can be unit-tested without jsdom or a real AudioContext
 * (which vitest's node environment has neither of). Only implements what's
 * actually exercised — not a general Web Audio polyfill. */

export interface RecordedParamCall {
  method: 'setValueAtTime' | 'linearRampToValueAtTime' | 'exponentialRampToValueAtTime' | 'cancelAndHoldAtTime' | 'setTargetAtTime';
  value?: number;
  time: number;
  timeConstant?: number;
}

export class FakeAudioParam {
  value = 0;
  calls: RecordedParamCall[] = [];

  setValueAtTime(value: number, time: number): this {
    this.value = value;
    this.calls.push({ method: 'setValueAtTime', value, time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.calls.push({ method: 'linearRampToValueAtTime', value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.value = value;
    this.calls.push({ method: 'exponentialRampToValueAtTime', value, time });
    return this;
  }

  cancelAndHoldAtTime(time: number): this {
    this.calls.push({ method: 'cancelAndHoldAtTime', time });
    return this;
  }

  setTargetAtTime(value: number, time: number, timeConstant: number): this {
    this.value = value;
    this.calls.push({ method: 'setTargetAtTime', value, time, timeConstant });
    return this;
  }
}

class FakeAudioNodeBase {
  connectedTo: FakeAudioNodeBase[] = [];
  disconnectCount = 0;

  connect(dest: FakeAudioNodeBase): FakeAudioNodeBase {
    this.connectedTo.push(dest);
    return dest;
  }

  disconnect(): void {
    this.disconnectCount += 1;
    this.connectedTo = [];
  }
}

export class FakeGainNode extends FakeAudioNodeBase {
  gain = new FakeAudioParam();
}

export class FakeBiquadFilterNode extends FakeAudioNodeBase {
  type = 'lowpass';
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
}

export class FakeOscillatorNode extends FakeAudioNodeBase {
  type = 'sine';
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
  onended: (() => void) | null = null;
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  start(time: number): void {
    this.startedAt = time;
  }

  stop(time: number): void {
    this.stoppedAt = time;
  }

  /** Test helper: simulates the browser firing `onended` once playback
   * actually stops. */
  fireEnded(): void {
    this.onended?.();
  }
}

export class FakeAudioContext {
  currentTime = 0;

  /** Every node ever created, in creation order — lets a test inspect the
   * graph play() actually built without needing its internal structure. */
  createdOscillators: FakeOscillatorNode[] = [];
  createdGains: FakeGainNode[] = [];
  createdFilters: FakeBiquadFilterNode[] = [];

  createOscillator(): FakeOscillatorNode {
    const node = new FakeOscillatorNode();
    this.createdOscillators.push(node);
    return node;
  }

  createGain(): FakeGainNode {
    const node = new FakeGainNode();
    this.createdGains.push(node);
    return node;
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    const node = new FakeBiquadFilterNode();
    this.createdFilters.push(node);
    return node;
  }
}

/** A destination node whose `.context` points back at the given fake
 * context, matching how real Voice implementations read `destination.context`. */
export class FakeDestinationNode extends FakeAudioNodeBase {
  context: FakeAudioContext;

  constructor(context: FakeAudioContext) {
    super();
    this.context = context;
  }
}
