import type { AudioBus } from '../../audio/shared/AudioBus';

interface Props {
  audioBus: AudioBus;
}

/** Placeholder for the step sequencer — data model, scheduling engine and
 * UI land in later commits. Still takes the shared AudioBus so its future
 * SequencerEngine can be wired in without changing this component's
 * interface. */
export function SequencerTab(_props: Props) {
  return (
    <main className="app-main">
      <div className="sequencer-placeholder">
        <p>Sekvensseri on tulossa.</p>
      </div>
    </main>
  );
}
