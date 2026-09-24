/** Fetches and decodes an audio sample. Not wired to any UI yet — the
 * loader exists so SampleVoice has a real way to get a buffer once a
 * sample-picking UI/file exists, without redesigning this layer later. */
export async function loadSample(ctx: BaseAudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}
