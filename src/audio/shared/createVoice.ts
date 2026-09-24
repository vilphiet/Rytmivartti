import type { VoiceId, Waveform } from '../types';
import type { Voice } from '../voices/Voice';
import { ToneVoice } from '../voices/ToneVoice';
import { KickVoice, SnareVoice, HihatVoice, RimVoice } from '../voices/DrumVoices';
import { SampleVoice } from '../voices/SampleVoice';

/** Builds a Voice for the given voiceId. `getNoiseBuffer` is lazy (called
 * only for noise-based voices) so callers don't need an AudioContext ready
 * just to construct a tone voice. */
export function createVoice(
  voiceId: VoiceId,
  waveform: Waveform,
  frequency: number,
  getNoiseBuffer: () => AudioBuffer,
): Voice {
  switch (voiceId) {
    case 'kick':
      return new KickVoice();
    case 'snare':
      return new SnareVoice(getNoiseBuffer());
    case 'hihat':
      return new HihatVoice(getNoiseBuffer());
    case 'rim':
      return new RimVoice(getNoiseBuffer());
    case 'sample':
      return new SampleVoice(null);
    case 'tone':
      return new ToneVoice(waveform, frequency);
  }
}
