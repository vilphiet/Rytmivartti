interface Props {
  trackName: string;
  canRemove: boolean;
  onSettings: () => void;
  onRename: () => void;
  onClearTrack: () => void;
  onDuplicateTrack: () => void;
  onRemoveTrack: () => void;
  onClose: () => void;
}

/** The row-level "⋯" menu for a single track. All of its actions only
 * ever touch the live, undoable project state, so — unlike deleting a
 * saved named pattern in SequencerMenu — none of them need a confirm
 * dialog: a single Kumoa (undo) always reverses them. */
export function TrackRowMenu({
  trackName,
  canRemove,
  onSettings,
  onRename,
  onClearTrack,
  onDuplicateTrack,
  onRemoveTrack,
  onClose,
}: Props) {
  return (
    <div className="seq-menu-backdrop" onClick={onClose}>
      <div className="seq-menu" onClick={(e) => e.stopPropagation()}>
        <div className="seq-menu-header">
          <h2>{trackName}</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            Sulje
          </button>
        </div>

        <div className="seq-row-menu-actions">
          <button type="button" className="seq-row-menu-item" onClick={onSettings}>
            Asetukset
          </button>
          <button type="button" className="seq-row-menu-item" onClick={onRename}>
            Nimeä
          </button>
          <button type="button" className="seq-row-menu-item" onClick={onDuplicateTrack}>
            Monista raita
          </button>
          <button type="button" className="seq-row-menu-item" onClick={onClearTrack}>
            Tyhjennä raita
          </button>
          <button type="button" className="seq-row-menu-item remove" onClick={onRemoveTrack} disabled={!canRemove}>
            Poista raita
          </button>
        </div>
      </div>
    </div>
  );
}
