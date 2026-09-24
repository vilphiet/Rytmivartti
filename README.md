# Rytmivartti

Polyrytmien visualisointi- ja soittosovellus. Yksi jaettu ympyrä, jonka
kehälle piirretään säännöllinen monikulmio per rytmikerros (N kärkeä =
iskuja per perussykli). Yhteinen "kello"-osoitin pyyhkäisee ympyrää yhtä
kierrosta per perussykli; kun osoitin osuu kerroksen kärkeen, kerros
soittaa iskun. Jos useamman kerroksen kärjet osuvat samaan kohtaan
yhtäaikaa, isku korostuu (kirkkaampi pulssi + aksentoitu ääni).

## Kehitys

```bash
npm install
npm run dev
```

- `npm run build` – tuotantobuild (`tsc -b && vite build`)
- `npm run lint` – oxlint
- `npm run preview` – esikatsele tuotantobuildia

## Rakenne

- `src/audio/AudioEngine.ts` – Web Audio -pohjainen look-ahead-ajastin
  (`AudioContext.currentTime`-pohjainen, ei `setTimeout`/RAF-ajastus).
  Pitää äänen ja visuaalin synkassa myös tempon muuttuessa kesken soiton.
- `src/audio/types.ts`, `src/audio/layerDefaults.ts` – kerrostyypit ja
  oletusarvot (värit, aaltomuodot, taajuudet).
- `src/hooks/useRhythmEngine.ts` – React-hook, joka yhdistää
  `AudioEngine`-instanssin React-tilaan ilman että äänen ajastus riippuu
  renderöinnistä.
- `src/components/RhythmCanvas.tsx` – Canvas-visualisointi, piirtää joka
  framen `requestAnimationFrame`-silmukassa suoraan enginen tilasta.
- `src/components/PresetTabs.tsx`, `TransportBar.tsx`, `LayerPanel.tsx` –
  UI-kontrollit (esiasetukset, play/pause/reset + tempo, kerrosten hallinta).
- `src/data/presets.ts` – valmiit suhde-esiasetukset (2:3, 3:4, 3:5, 4:5,
  5:4, 5:7, 6:4, 7:8).
