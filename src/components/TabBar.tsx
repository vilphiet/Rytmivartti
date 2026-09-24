import type { AppTab } from '../state/appShell';

interface Props {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

export function TabBar({ activeTab, onChange }: Props) {
  return (
    <div className="tab-bar">
      <button
        type="button"
        className={`tab-bar-btn${activeTab === 'polyrhythm' ? ' active' : ''}`}
        onClick={() => onChange('polyrhythm')}
      >
        Polyrytmit
      </button>
      <button
        type="button"
        className={`tab-bar-btn${activeTab === 'sequencer' ? ' active' : ''}`}
        onClick={() => onChange('sequencer')}
      >
        Sekvensseri
      </button>
    </div>
  );
}
