import { useState } from 'react';
import type { ScaleId } from '../types';
import { PITCH_CLASS_NAMES, SCALE_LABELS } from '../scale';

const PATTERN_LENGTH_OPTIONS = [8, 16, 32];
const SCALE_OPTIONS = Object.keys(SCALE_LABELS) as ScaleId[];

interface Props {
  patternSteps: number;
  onPatternStepsChange: (steps: number) => void;
  rootNote: number;
  onRootNoteChange: (rootNote: number) => void;
  scale: ScaleId;
  onScaleChange: (scale: ScaleId) => void;
  namedPatternNames: string[];
  onSaveNamedPattern: (name: string) => void;
  onLoadNamedPattern: (name: string) => void;
  onDeleteNamedPattern: (name: string) => void;
  onClearPattern: () => void;
  onNewProject: () => void;
  onClose: () => void;
}

/** The sequencer's own "Lisää" (⋯) panel. Deliberately does not reuse the
 * shared PatternLibrary component (used by the polyrhythm tab, which has
 * no undo history to fall back on) — this reimplements save/load/delete
 * directly against the sequencer's own hook functions, so its own
 * confirm-dialog choices don't affect the polyrhythm tab at all. */
export function SequencerMenu({
  patternSteps,
  onPatternStepsChange,
  rootNote,
  onRootNoteChange,
  scale,
  onScaleChange,
  namedPatternNames,
  onSaveNamedPattern,
  onLoadNamedPattern,
  onDeleteNamedPattern,
  onClearPattern,
  onNewProject,
  onClose,
}: Props) {
  const [newPatternName, setNewPatternName] = useState('');

  const handleSave = () => {
    if (!newPatternName.trim()) return;
    onSaveNamedPattern(newPatternName);
    setNewPatternName('');
  };

  const handleDelete = (name: string) => {
    // Deleting a saved pattern touches localStorage directly, outside the
    // undoable project state -- Kumoa can't bring it back, so this keeps
    // a confirmation (unlike Tyhjennä kuvio / Uusi projekti below, both of
    // which only ever change the live, undoable project).
    if (window.confirm(`Poistetaanko kuvio "${name}"? Tätä ei voi kumota.`)) {
      onDeleteNamedPattern(name);
    }
  };

  return (
    <div className="seq-menu-backdrop" onClick={onClose}>
      <div className="seq-menu" onClick={(e) => e.stopPropagation()}>
        <div className="seq-menu-header">
          <h2>Lisää</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            Sulje
          </button>
        </div>

        <label className="layer-field">
          <span>Sävellaji</span>
          <select value={rootNote} onChange={(e) => onRootNoteChange(Number(e.target.value))}>
            {PITCH_CLASS_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="layer-field">
          <span>Asteikko</span>
          <select value={scale} onChange={(e) => onScaleChange(e.target.value as ScaleId)}>
            {SCALE_OPTIONS.map((id) => (
              <option key={id} value={id}>
                {SCALE_LABELS[id]}
              </option>
            ))}
          </select>
        </label>

        <div className="seq-pattern-length">
          <span>Kuvion pituus</span>
          <div className="seq-pattern-length-options">
            {PATTERN_LENGTH_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`tab-bar-btn${patternSteps === n ? ' active' : ''}`}
                onClick={() => onPatternStepsChange(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="seq-menu-section">
          <h3>Kuviokirjasto</h3>
          <div className="pattern-save-row">
            <input
              type="text"
              className="pattern-name-input"
              placeholder="Kuvion nimi"
              value={newPatternName}
              onChange={(e) => setNewPatternName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
            <button type="button" className="add-layer-btn" onClick={handleSave} disabled={!newPatternName.trim()}>
              Tallenna nimellä
            </button>
          </div>
          {namedPatternNames.length > 0 && (
            <ul className="pattern-list">
              {namedPatternNames.map((name) => (
                <li key={name} className="pattern-list-item">
                  <span className="pattern-list-name">{name}</span>
                  <button type="button" className="icon-btn" onClick={() => onLoadNamedPattern(name)}>
                    Lataa
                  </button>
                  <button type="button" className="icon-btn remove" onClick={() => handleDelete(name)}>
                    Poista kuvio
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="seq-menu-section seq-menu-danger">
          <div className="seq-menu-danger-item">
            <button type="button" className="icon-btn remove" onClick={onClearPattern}>
              Tyhjennä kuvio
            </button>
            <p>Tyhjentää askeleet kaikilta raidoilta. Raidat ja äänet säilyvät.</p>
          </div>
          <div className="seq-menu-danger-item">
            <button type="button" className="icon-btn remove" onClick={onNewProject}>
              Uusi projekti
            </button>
            <p>Palauttaa oletusraidat ja -asetukset.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
