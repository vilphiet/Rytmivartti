# Rytmivartti

Kaksi välilehteä: **Polyrytmit** ja **Sekvensseri**. Molemmat jakavat
saman Web Audio -pohjan (yksi `AudioContext`), mutta niillä on omat
ajastimensa, tilansa ja tallennuksensa — vain aktiivinen välilehti on
kiinnitettynä kerrallaan, joten toiselle vaihtaminen pysäyttää aina
edellisen soiton eikä jätä ääninodeja roikkumaan.

## Polyrytmit

Yksi jaettu ympyrä, jonka kehälle piirretään säännöllinen monikulmio per
rytmikerros (N kärkeä = iskuja per perussykli). Yhteinen "kello"-osoitin
pyyhkäisee ympyrää yhtä kierrosta per perussykli; kun osoitin osuu
kerroksen kärkeen, kerros soittaa iskun. Jos useamman kerroksen kärjet
osuvat samaan kohtaan yhtäaikaa, isku korostuu (kirkkaampi pulssi +
aksentoitu ääni). Näkymä vaihdettavissa ympyrän ja ruudukon välillä.

## Sekvensseri

Askelsekvensseri/rumpukone samalla look-ahead-periaatteella. Raidat
voivat olla rumpu- tai melodiaraitoja:

- **Rumpuraita**: perinteinen askelruudukko (off/normaali/aksentti per
  askel), rumpuäänet (kick/snare/hi-hat/rim).
- **Melodiaraita**: yksiääninen (yksi nuotti per askel, uusi nuotti
  korvaa/typistää edellisen), viisi synttiesiasetusta (Basso, Lead, Pad,
  Pluck, Keys). Muokataan piano rollissa: rivit = valitun sävellajin/
  asteikon sävelet kahden oktaavin alueelta, työkalut Piirrä/Pituus/
  Aksentti (ei vetämistä). Grundsävelen vaihto transponoi kaiken
  melodian; asteikon vaihto sovittaa asteikon ulkopuoliset nuotit
  lähimpään sallittuun säveleen (kysyy vahvistuksen jos jokin nuotti
  oikeasti siirtyisi).

Molemmat puolet tukevat autosavea, nimettyjä kuvioita ja oletusten
palautusta, kukin omalla `localStorage`-avaimellaan ja
skeemaversiollaan — vanha tallennus migratoidaan, ei hylätä.

## Kehitys

```bash
npm install
npm run dev
```

- `npm run build` – tuotantobuild (`tsc -b && vite build`)
- `npm run lint` – oxlint
- `npm run test` – vitest (yksikkötestit, ei selainta)
- `npm run preview` – esikatsele tuotantobuildia

## Rakenne

### Jaettu ääni-pohja (`src/audio/`)

- `shared/AudioBus.ts` – yksi lazily luotu `AudioContext` + master-ketju
  (gain → compressor → destination), jaettu koko sovelluksen kesken.
- `shared/trackMixer.ts`, `shared/createVoice.ts` – geneerinen
  raidan mikserisketju (gain+pan) ja äänifaktori, joita sekä
  `RhythmEngine` että `SequencerEngine` käyttävät.
- `voices/` – `Voice`-rajapinnan toteutukset: rumpuäänet
  (`DrumVoices.ts`), yksinkertainen oskillaattoriääni (`ToneVoice.ts`),
  näyteääni (`SampleVoice.ts`, ei vielä UI:ta), melodiset synttiäänet
  (`MelodicSynthVoice.ts` + esiasetukset `synthPresets.ts`).
- `midi.ts` – MIDI-nuotti → taajuus.
- `RhythmEngine.ts` – polyrytmin look-ahead-ajastin
  (`AudioContext.currentTime`-pohjainen, ei `setTimeout`/RAF-ajastus),
  rakentuu `AudioBus`in päälle. Pitää äänen ja visuaalin synkassa myös
  tempon muuttuessa kesken soiton.
- `types.ts`, `layerDefaults.ts`, `pattern.ts`, `scheduling.ts`,
  `rowPhase.ts` – kerrostyypit, oletusarvot ja puhdas ajastus-/
  kuviomatematiikka.

### Polyrytmi-UI

- `hooks/useRhythmEngine.ts` – yhdistää `RhythmEngine`-instanssin
  React-tilaan, autosave `useDebouncedAutosave`-hookilla.
- `components/PolyrhythmTab.tsx` – välilehden kokonaisuus.
- `components/RhythmCanvas.tsx` – ympyränäkymä, piirtää
  `requestAnimationFrame`-silmukassa suoraan enginen tilasta.
- `components/RhythmGrid.tsx`, `gridLayout.ts` – ruudukkonäkymä.
- `components/PresetTabs.tsx`, `ViewSwitcher.tsx`, `TransportBar.tsx`,
  `LayerPanel.tsx`, `PatternLibrary.tsx` – UI-kontrollit.
- `data/presets.ts` – valmiit suhde-esiasetukset (2:3, 3:4, 3:5, 4:5,
  5:4, 5:7, 6:4, 7:8).

### Sekvensseri (`src/sequencer/`)

- `types.ts` – `SeqProject`/`SeqTrack`/`SeqStep`-tietomalli
  (`rootNote`/`scale` projektitasolla).
- `SequencerEngine.ts` – oma look-ahead-ajastin; kaikki raidat jakavat
  saman askelkellon, vain kunkin raidan oma `lengthSteps`-modulo eroaa.
- `scheduling.ts`, `pattern.ts` – puhdas askel-/kuviomatematiikka.
- `scale.ts` – sävellaji/asteikko: transponointi ja asteikkosovitus.
- `melody.ts` – yksiäänisen melodiaraidan muokkausfunktiot (nuotin
  asetus/pituus/aksentti), `noteNames.ts` – nuotin nimi (esim. "E3").
- `pianoRoll.ts` – piano rollin oletusoktaavin laskenta.
- `defaultProject.ts` – oletusprojekti (4 rumpuraitaa + perusbiitti).
- `state/` – oma skeemaversio, tallennus ja nimetyt kuviot, erillään
  polyrytmin `src/state/`-tilasta.
- `hooks/useSequencerEngine.ts` – React-hook.
- `components/` – `SequencerTab.tsx`, `StepGrid.tsx`, `PianoRoll.tsx`,
  `TrackSettingsPanel.tsx`, `SequencerTransport.tsx`.

### Sovelluskuori

- `App.tsx`, `components/TabBar.tsx` – välilehtien vaihto, vain
  aktiivinen välilehti on mountattuna kerrallaan.
- `state/appShell.ts` – aktiivisen välilehden tallennus.
- `state/debouncedFlush.ts`, `hooks/useDebouncedAutosave.ts` – debounced
  autosave, joka flushaa heti kun välilehti piilotetaan/suljetaan tai
  komponentti unmountataan (React-riippumaton ydinlogiikka +
  ohut hook-kääre).
