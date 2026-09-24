const NOISE_DURATION_SECONDS = 2;
const cache = new WeakMap<BaseAudioContext, AudioBuffer>();

/** One white-noise buffer per context, reused by every noise-based voice
 * instead of generating fresh random samples on every hit. */
export function getSharedNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = cache.get(ctx);
  if (cached) return cached;

  const length = Math.ceil(ctx.sampleRate * NOISE_DURATION_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cache.set(ctx, buffer);
  return buffer;
}
