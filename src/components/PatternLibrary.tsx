import { useState } from 'react';

interface Props {
  namedPatternNames: string[];
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  onRestoreDefaults: () => void;
}

export function PatternLibrary({ namedPatternNames, onSave, onLoad, onDelete, onRestoreDefaults }: Props) {
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name);
    setName('');
  };

  const handleRestoreDefaults = () => {
    if (window.confirm('Haluatko varmasti palauttaa oletukset? Nykyinen tila korvataan.')) {
      onRestoreDefaults();
    }
  };

  const handleDelete = (patternName: string) => {
    if (window.confirm(`Poistetaanko kuvio "${patternName}"?`)) {
      onDelete(patternName);
    }
  };

  return (
    <div className="pattern-library">
      <h2>Nimetyt kuviot</h2>

      <div className="pattern-save-row">
        <input
          type="text"
          className="pattern-name-input"
          placeholder="Kuvion nimi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />
        <button type="button" className="add-layer-btn" onClick={handleSave} disabled={!name.trim()}>
          Tallenna nimellä
        </button>
      </div>

      {namedPatternNames.length > 0 && (
        <ul className="pattern-list">
          {namedPatternNames.map((patternName) => (
            <li key={patternName} className="pattern-list-item">
              <span className="pattern-list-name">{patternName}</span>
              <button type="button" className="icon-btn" onClick={() => onLoad(patternName)}>
                Lataa
              </button>
              <button type="button" className="icon-btn remove" onClick={() => handleDelete(patternName)}>
                Poista kuvio
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="icon-btn remove restore-defaults-btn" onClick={handleRestoreDefaults}>
        Palauta oletukset
      </button>
    </div>
  );
}
