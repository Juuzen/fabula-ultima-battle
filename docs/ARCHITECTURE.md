# Architettura

Web app React offline che simula uno schermo di battaglia JRPG (Final Fantasy, Octopath Traveler) per il GM di Fabula Ultima, su doppio schermo.

## Decisioni di perimetro (v1)

| Tema        | Decisione                                                                                                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regole      | **PV** e soglia di **Crisi** (≤ metà PV max), **PM** tracciati e mostrati. Gli **status** (Lento, Confuso, Debole, Scosso, Furente, Avvelenato) sono **solo visivi**, senza effetti sul calcolo. **PI non gestiti.**                                     |
| Turni       | Nessuna gestione dei turni: il GM sceglie chi agisce.                                                                                                                                                                                                    |
| Asset       | Caricati dall'app e salvati in IndexedDB (disponibili offline).                                                                                                                                                                                          |
| Audio       | Riprodotto dalla finestra **Display**.                                                                                                                                                                                                                   |
| Sprite      | PNG statici o GIF animate, specchiati via CSS. **Ritratto separato** per lo slot del party.                                                                                                                                                              |
| Info nemici | Nome, status e Crisi/KO sempre visibili (targhetta sul campo) fino a fine battaglia. PV/PM solo se rivelati dal GM, per singolo nemico o tutti insieme. Finestra nemici manuale o automatica (compare quando cambia qualcosa e sparisce dopo X secondi). |
| Lingue      | Codice in inglese, UI localizzata (it di default, en).                                                                                                                                                                                                   |
| Browser     | Basati su Chromium (Chrome/Edge): necessari per i video `.webm` con canale alpha.                                                                                                                                                                        |

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

- `Combatant` ha `id`, `name`, `side` (`ally` o `enemy`), `maxHp`, `hp`, `maxMp`, `mp`, `statuses`, `spriteAssetId`, `portraitAssetId`, `flipSprite` e `revealStats`.
- `BattleState.presentation` contiene le scelte del GM su cosa vedono i giocatori: la modalità della finestra nemici, il ritardo di auto-nascondi e il flag per rivelare tutti i nemici.
- Si è in **Crisi** quando `0 < hp ≤ floor(maxHp / 2)`. A 0 PV il combattente è **KO** e non conta come in Crisi.
- Gli status (`slow`, `dazed`, `weak`, `shaken`, `enraged`, `poisoned`) sono solo marcatori visivi.
- `applyCommand(state, command)` è un riduttore puro che restituisce `{ ok, state, events }` oppure `{ ok: false, error }`. Non modifica mai l'input.
- I comandi disponibili sono `ADD_COMBATANT`, `UPDATE_COMBATANT`, `REMOVE_COMBATANT`, `MOVE_COMBATANT`, `DAMAGE`, `HEAL`, `SET_HP`, `SPEND_MP`, `RESTORE_MP`, `SET_MP`, `SET_STATUS`, `SET_REVEAL_STATS`, `SET_PRESENTATION`, `SET_BACKGROUND`, `RENAME_BATTLE`, `LOAD_BATTLE` e `END_BATTLE`. `END_BATTLE` toglie i nemici, lascia il party com'è e nasconde di nuovo le informazioni sui nemici.
- Gli eventi (`DAMAGED`, `HEALED`, `CRISIS_ENTERED`, `KNOCKED_OUT`, `REVIVED`…) descrivono cosa è successo. Riportano l'importo effettivamente applicato, cioè senza l'eccesso di danno o di cura. Il Display li userà per la coreografia.

**Store (`src/app/store`).** Usa Zustand (vanilla), un'istanza sola e solo nel Master.

- `dispatch(command)` applica il comando, salva lo stato precedente nella cronologia di annullamento (al massimo 50 passi, solo in memoria) e pubblica un `BattleChange` sul bus `battleStore.changes`. Dalla fase 4 il livello di sincronizzazione si collega lì.
- Con `undo()` si torna indietro di un passo. I comandi senza effetto non finiscono nella cronologia.
- Lo stato della battaglia viene salvato in `localStorage` (`fu-battle.battle`) ed è versionato: ora è alla v2, e `migrations.ts` aggiorna i salvataggi v1. Al ricaricamento viene validato con Zod; se è corrotto viene scartato.
- Gli hook per React sono `useBattleStore`, `useBattleActions`, `useCombatants(side)`, `useCombatant(id)` e `useCanUndo`.

## Display statico (fase 2)

- **Stage:** lo spazio logico è 1920×1080. I nemici stanno a sinistra, il party a destra.
- **Formazioni:** `formationSlots(count, side)` è una funzione pura e testata.
  - Fino a 4 combattenti stanno in una colonna sola; oltre si aggiungono altre colonne, con le righe sfalsate in diagonale.
  - Gli sprite più in basso sono un po' più grandi e vengono disegnati sopra gli altri.
  - I gruppi numerosi vengono compressi per restare dentro lo schermo.
- **Sprite:** finché non c'è un'immagine si usa un placeholder (una sagoma con l'iniziale). `flipSprite` specchia solo le immagini vere.
- **Stati sullo sprite:** in Crisi ha un bagliore rosso pulsante, statico con `prefers-reduced-motion`. Se è KO appare desaturato.
- **Pannello del party (in basso, centrato):** uno slot per alleato, ispirato ai JRPG 2D moderni. Ogni slot contiene:
  - il ritratto come sfondo; se manca si usa lo sprite, e se manca anche quello un placeholder;
  - la targhetta del nome con il tag Crisi/KO;
  - gli status;
  - le barre `PV` e `PM`, con valore e massimo. La barra dei PM compare solo se `maxMp > 0`.

  La larghezza degli slot (`partySlotWidth`) si adatta al numero di alleati, così il pannello sta sempre nello schermo ed è bilanciato.

- **Targhette nemici:** sono su un livello sopra tutti gli sprite e mostrano nome, Crisi/KO e status. Restano visibili anche a KO finché il GM non termina la battaglia (`END_BATTLE`).
- **Icone di stato:** sono le stesse ovunque: party, targhette, campo e finestra nemici. Ogni icona è un glifo bianco (Lucide, incluso nel pacchetto) su sfondo colorato. Gli status base (Lento, Confuso, Debole, Scosso) stanno in un **cerchio**, quelli maggiori (Furente, Avvelenato) in un **rombo**. L'ordine è sempre lo stesso (`sortStatuses`), così le icone non si spostano. Crisi e KO restano tag testuali. Tutti e 6 gli status più Crisi stanno su una riga sola.
- **Finestra nemici (in alto, centrata):** è speculare al pannello del party, con carte compatte. Ogni carta ha tre righe fisse:
  1. il nome, con ellissi se è troppo lungo;
  2. le icone di stato e il tag Crisi/KO;
  3. PV e PM come barre sottili affiancate, solo se rivelati (`revealStats` sul singolo nemico oppure `presentation.revealAllEnemyStats`).

  Tutte le carte hanno la stessa altezza: con 10 nemici la fascia sta su 2 righe, alte circa 225px in tutto. La visibilità la decide `useEnemyPanelVisibility`:
  - `manual`: la finestra segue il flag `visible` impostato dal GM;
  - `auto`: compare quando cambia qualcosa che i giocatori possono vedere sui nemici e sparisce dopo `autoHideSeconds`. Ogni nuova modifica fa ripartire il conto alla rovescia, e il GM può comunque forzarla con `visible`.

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

| Fase | Contenuto                                                                                                                           | Stato |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 0    | Impalcatura: Vite, TS strict, lint, CI, PWA, routing, i18n                                                                          | ✅    |
| 1    | Dominio (combattenti, PV, Crisi, status visivi) + store + persistenza                                                               |       |
| 2    | Display statico: sfondo, sprite, barre PV                                                                                           |       |
| 3    | Master: roster, modifica PV/PM e status, controlli della finestra nemici (manuale/auto, secondi), rivelazione PV/PM, fine battaglia |       |
| 4    | Ponte BroadcastChannel: snapshot e riconnessione                                                                                    |       |
| 5    | Animazioni base: barre fluide, shake, testo dei danni                                                                               |       |
| 6    | Coreografia completa con FX `.webm` e SFX                                                                                           |       |
| 7    | Libreria asset (IndexedDB) e audio con crossfade                                                                                    |       |
| 8    | Rifinitura: preset incontri da importare ed esportare, banner di vittoria                                                           |       |
