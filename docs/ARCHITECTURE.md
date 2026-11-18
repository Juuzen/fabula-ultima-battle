# Architettura

Web app React offline che simula uno schermo di battaglia JRPG (Final Fantasy, Octopath Traveler) per il GM di Fabula Ultima, su doppio schermo.

## Decisioni di perimetro (v1)

| Tema    | Decisione                                                                                                                                                                                    |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regole  | **PV** e soglia di **Crisi** (≤ metà PV max). Gli **status** (Lento, Confuso, Debole, Scosso, Furente, Avvelenato) sono **solo visivi**, senza effetti sul calcolo. **PM e PI non gestiti.** |
| Turni   | Nessuna gestione dei turni: il GM sceglie chi agisce.                                                                                                                                        |
| Asset   | Caricati dall'app e salvati in IndexedDB (disponibili offline).                                                                                                                              |
| Audio   | Riprodotto dalla finestra **Display**.                                                                                                                                                       |
| Sprite  | PNG statici o GIF animate, speculati via CSS.                                                                                                                                                |
| Lingue  | Codice in inglese, UI localizzata (it di default, en).                                                                                                                                       |
| Browser | Basati su Chromium (Chrome/Edge): necessari per i video `.webm` con canale alpha.                                                                                                            |

## Principi

1. **Il Master è l'unica fonte di verità.** Lo stato autorevole vive solo nel Master. Il Display è una proiezione senza logica di gioco.
2. **Il dominio è separato da React.** Le regole sono funzioni TypeScript pure in `src/domain`, testate con Vitest.
3. **Lo stato logico è distinto da quello visivo.** Lo stato logico cambia subito; il Display aggiorna i PV visivi solo al passo `impact` della coreografia.

## Livelli

```
src/
├── domain/        # TS puro: tipi, regole, comandi → nuovo stato + eventi di presentazione
├── app/           # composizione: router, store Zustand (Master), sync
├── infra/         # adapter: BroadcastChannel, IndexedDB (Dexie), audio
├── features/
│   ├── master/    # plancia del GM
│   └── display/   # stage 16:9, sprite, FX, coreografia
└── shared/        # UI comune, i18n
```

Regola di dipendenza: `features → app → domain`; `infra` implementa le interfacce richieste da `app`. `domain` non importa nulla dagli altri livelli.

## Dominio e store (fase 1)

**Dominio (`src/domain`).** È TypeScript puro e gli schemi Zod sono l'unica fonte dei tipi.

- `Combatant` ha `id`, `name`, `side` (`ally` o `enemy`), `maxHp`, `hp`, `statuses`, `spriteAssetId` e `flipSprite`.
- Si è in **Crisi** quando `0 < hp ≤ floor(maxHp / 2)`. A 0 PV il combattente è **KO** e non conta come in Crisi.
- Gli status (`slow`, `dazed`, `weak`, `shaken`, `enraged`, `poisoned`) sono solo marcatori visivi.
- `applyCommand(state, command)` è un riduttore puro che restituisce `{ ok, state, events }` oppure `{ ok: false, error }`. Non modifica mai l'input.
- I comandi disponibili sono `ADD_COMBATANT`, `UPDATE_COMBATANT`, `REMOVE_COMBATANT`, `MOVE_COMBATANT`, `DAMAGE`, `HEAL`, `SET_HP`, `SET_STATUS`, `SET_BACKGROUND`, `RENAME_BATTLE` e `LOAD_BATTLE`.
- Gli eventi (`DAMAGED`, `HEALED`, `CRISIS_ENTERED`, `KNOCKED_OUT`, `REVIVED`…) descrivono cosa è successo. Riportano l'importo effettivamente applicato, cioè senza l'eccesso di danno o di cura. Il Display li userà per la coreografia.

**Store (`src/app/store`).** Usa Zustand (vanilla), un'istanza sola e solo nel Master.

- `dispatch(command)` applica il comando, salva lo stato precedente nella cronologia di annullamento (al massimo 50 passi, solo in memoria) e pubblica un `BattleChange` sul bus `battleStore.changes`. Dalla fase 4 il livello di sincronizzazione si collega lì.
- Con `undo()` si torna indietro di un passo. I comandi senza effetto non finiscono nella cronologia.
- Lo stato della battaglia viene salvato in `localStorage` (`fu-battle.battle`) ed è versionato. Al ricaricamento viene validato con Zod; se è corrotto viene scartato.
- Gli hook per React sono `useBattleStore`, `useBattleActions`, `useCombatants(side)`, `useCombatant(id)` e `useCanUndo`.

## Display statico (fase 2)

- **Stage:** lo spazio logico è 1920×1080. I nemici stanno a sinistra, il party a destra.
- **Formazioni:** `formationSlots(count, side)` è una funzione pura e testata.
  - Fino a 4 combattenti stanno in una colonna sola; oltre si aggiungono altre colonne, con le righe sfalsate in diagonale come nei JRPG classici.
  - Gli sprite più in basso sono un po' più grandi e vengono disegnati sopra gli altri.
  - I gruppi numerosi vengono compressi per restare dentro lo schermo.
- **Sprite:** finché non c'è un'immagine si usa un placeholder (una sagoma con l'iniziale, nel colore del lato). Non c'è nessuna specchiatura automatica: `flipSprite` specchia solo le immagini vere.
- **Stati sullo sprite:** in Crisi ha un bagliore rosso pulsante, che con `prefers-reduced-motion` diventa statico. Se è KO appare desaturato e semitrasparente. Gli status sono badge sopra la testa.
- **HUD in stile FF:**
  - La finestra del party mostra nome, tag Crisi/KO, status, `PV / PV max` e la barra.
  - La finestra nemici mostra nome, barra e tag Crisi, ma **non i PV esatti**: decide il GM quanto rivelare.
  - Oltre 4 alleati, o oltre 4 nemici, la finestra passa a un layout compatto.
- **Sfondo:** se non è impostato, si usa un fondale al tramonto con una griglia prospettica.
- **Asset:** `useAssetUrl(id)` legge da `AssetResolverContext`. Per ora non risolve nulla; nella fase 7 diventerà IndexedDB.
- **`useDisplayStore`:** contiene la battaglia mostrata, che non è lo stato autorevole. Nella fase 4 la alimenterà la sincronizzazione.
- **Anteprima:** `#/display?demo=1` carica un incontro di esempio che copre tutti gli stati visivi.
- **Font:** Cinzel e Inter sono inclusi nel pacchetto (`@fontsource`), quindi funzionano anche offline.

## Rotte

Si usa l'hash routing, che funziona offline e su qualsiasi host statico:

- `#/master` è la plancia del GM;
- `#/display` è lo schermo dei giocatori, aperto dal Master con `window.open`. Al primo clic sblocca l'audio.

## Protocollo di sincronizzazione (dalla fase 4)

```ts
type SyncMessage =
  | { v: 1; type: 'HELLO' } // Display → Master
  | { v: 1; type: 'SNAPSHOT'; state: BattleState } // Master → Display
  | { v: 1; type: 'PRESENTATION'; seq: number; events: PresentationEvent[] }
```

Ogni messaggio viene validato con Zod. Se `seq` presenta un buco, il Display richiede un nuovo `SNAPSHOT`. Il trasporto è astratto dietro `SyncTransport`, quindi BroadcastChannel si può sostituire in futuro (per esempio con WebSocket).

## Coreografia (dalla fase 6)

Le sequenze di attacco sono dati (`advance → wait → fx → impact → shake → floatText → retreat`), eseguite da un sequencer a coda nel Display.

## Roadmap

| Fase | Contenuto                                                                 | Stato |
| ---- | ------------------------------------------------------------------------- | ----- |
| 0    | Impalcatura: Vite, TS strict, lint, CI, PWA, routing, i18n                | ✅    |
| 1    | Dominio (combattenti, PV, Crisi, status visivi) + store + persistenza     |       |
| 2    | Display statico: sfondo, sprite, barre PV                                 |       |
| 3    | Master: roster, modifica PV e status                                      |       |
| 4    | Ponte BroadcastChannel: snapshot e riconnessione                          |       |
| 5    | Animazioni base: barre fluide, shake, testo dei danni                     |       |
| 6    | Coreografia completa con FX `.webm` e SFX                                 |       |
| 7    | Libreria asset (IndexedDB) e audio con crossfade                          |       |
| 8    | Rifinitura: preset incontri da importare ed esportare, banner di vittoria |       |
