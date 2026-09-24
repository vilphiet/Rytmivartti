/** Per-track mixer chain and mute/solo math, generic over any "track" that
 * has muted/solo/volume/pan — used by both the polyrhythm engine and the
 * sequencer engine so they can't disagree on what "audible" means. */

export interface TrackMixerNodes {
  gain: GainNode;
  pan: StereoPannerNode;
}

export function createTrackMixer(ctx: AudioContext, destination: AudioNode, initialPan: number): TrackMixerNodes {
  const gain = ctx.createGain();
  const pan = ctx.createStereoPanner();
  gain.gain.value = 0;
  pan.pan.value = initialPan;
  gain.connect(pan);
  pan.connect(destination);
  return { gain, pan };
}

export function disposeTrackMixer(nodes: TrackMixerNodes): void {
  nodes.gain.disconnect();
  nodes.pan.disconnect();
}

/** Not muted, and — when some other track is soloed — itself soloed. */
export function isTrackAudible(muted: boolean, solo: boolean, anySolo: boolean): boolean {
  return !muted && (!anySolo || solo);
}

/** Ramps the mixer nodes toward their target gain/pan via setTargetAtTime
 * (never an instant jump — avoids clicks), independent of any scheduling
 * loop. `makeupGain` lets a caller compensate for its own velocity
 * convention (e.g. the polyrhythm engine's STEP_NORMAL scaling); pass 1
 * for no compensation. */
export function applyTrackMixTarget(
  nodes: TrackMixerNodes,
  volume: number,
  pan: number,
  audible: boolean,
  makeupGain: number,
  now: number,
  rampTime: number,
): void {
  const targetGain = audible ? volume * makeupGain : 0;
  nodes.gain.gain.setTargetAtTime(targetGain, now, rampTime);
  nodes.pan.pan.setTargetAtTime(pan, now, rampTime);
}
