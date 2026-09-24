import type { ViewMode } from '../state/schema';

interface Props {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewSwitcher({ viewMode, onChange }: Props) {
  return (
    <div className="view-switcher">
      <button
        type="button"
        className={`view-switch-btn${viewMode === 'grid' ? ' active' : ''}`}
        onClick={() => onChange('grid')}
      >
        Ruudukko
      </button>
      <button
        type="button"
        className={`view-switch-btn${viewMode === 'circle' ? ' active' : ''}`}
        onClick={() => onChange('circle')}
      >
        Ympyrä
      </button>
    </div>
  );
}
