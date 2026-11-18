# Architettura

Web app React offline che simula uno schermo di battaglia JRPG (Final Fantasy, Octopath Traveler) per il GM di Fabula Ultima, su doppio schermo.

## Decisioni di perimetro (v1)

| Tema           | Decisione                                                                                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Regole         | **PV** e soglia di **Crisi** (≤ metà PV max), **PM** tracciati e mostrati. Gli **status** (Lento, Confuso, Debole, Scosso, Furente, Avvelenato) sono **solo visivi**, senza effetti sul calcolo. **PI non gestiti.**                                                                       |
| Turni          | Nessuna gestione dei turni: il GM sceglie chi agisce.                                                                                                                                                                                                                                      |
| Asset          | Caricati dall'app e salvati in IndexedDB (disponibili offline).                                                                                                                                                                                                                            |
| Audio          | Riprodotto dalla finestra **Display**.                                                                                                                                                                                                                                                     |
| Sprite         | PNG statici o GIF animate, specchiati via CSS. **Ritratto separato** per lo slot del party.                                                                                                                                                                                                |
| Info nemici    | Nome, status e Crisi/KO sempre visibili (targhetta sul campo) fino a fine battaglia. PV/PM solo se rivelati dal GM, per singolo nemico o tutti insieme. Finestra nemici manuale o automatica (compare quando cambia qualcosa e sparisce dopo X secondi).                                   |
| Fase battaglia | **In preparazione**: i giocatori vedono una schermata di attesa ("In attesa della battaglia…") con sfondo configurabile, e non ricevono nessun combattente. **Inizia battaglia** → **In corso**: party e nemici. **Termina battaglia**: nemici rimossi, si torna alla schermata di attesa. |
| Lingue         | Codice in inglese, UI localizzata (it di default, en).                                                                                                                                                                                                                                     |
| Browser        | Basati su Chromium (Chrome/Edge): necessari per i video `.webm` con canale alpha.                                                                                                                                                                                                          |

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
- Lo stato della battaglia viene salvato in `localStorage` (`fu-battle.battle`) ed è versionato: ora è alla v4, e `migrations.ts` aggiorna i salvataggi delle versioni precedenti (v2: PM e ritratti; v3: fase della battaglia; v4: sfondo della schermata di attesa). Al ricaricamento viene validato con Zod; se è corrotto viene scartato.
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
- **`useDisplayStore`:** contiene la battaglia mostrata, che non è lo stato autorevole; la alimenta la sincronizzazione.
- **Anteprima:** `#/display?demo=1` carica un incontro di esempio che copre tutti gli stati visivi.
- **Font:** Cinzel e Inter sono inclusi nel pacchetto (`@fontsource`), quindi funzionano anche offline.

## Plancia del Master (fase 3)

- **Layout:** a sinistra le sezioni Party e Nemici; a destra l'anteprima dal vivo dello schermo dei giocatori, i controlli della finestra nemici e quelli della battaglia. L'header resta fisso in alto con "Annulla ultima azione", "Apri schermo giocatori" e la lingua.
- **Scheda combattente:**
  - riordino ▲▼ all'interno del proprio lato;
  - nome con il tag Crisi/KO;
  - lettura di PV e PM, con le colonne allineate tra le schede;
  - campo **Valore** con i pulsanti Danno, Cura, −PM e +PM. Invio applica il danno, Maiusc+Invio la cura, e il valore resta nel campo per riapplicarlo;
  - interruttori degli status con le stesse icone del Display;
  - per i nemici, l'interruttore "PV/PM visibili", che si disattiva quando è attivo "mostra tutti";
  - modifica in linea: nome, PV e PM attuali e massimi, specchiatura dello sprite. Il salvataggio è un unico `UPDATE_COMBATANT`, quindi si annulla con un passo solo;
  - rimozione.
- **Aggiunta:** nome, PV max e PM max (opzionale, 0 se vuoto). Dopo l'aggiunta il nome si svuota ma le statistiche restano, così è veloce inserire nemici uguali.
- **Finestra nemici:** modalità Manuale o Automatica, pulsante Mostra/Nascondi, secondi di auto-nascondi (registrati quando si esce dal campo; i valori fuori da 1–120 vengono annullati) e "Mostra PV/PM di tutti i nemici".
- **Battaglia:** il nome viene registrato quando si esce dal campo. C'è un indicatore della fase (In preparazione / In corso). "Inizia battaglia" è disattivato se non ci sono nemici; "Termina battaglia" chiede una conferma in due passi. In preparazione la sezione Nemici mostra l'etichetta "Nascosti ai giocatori".
- **Annulla:** con il pulsante o con Ctrl/Cmd+Z, tranne mentre si scrive in un campo. I campi di testo registrano il valore solo all'uscita, per non riempire la cronologia a ogni tasto.
- **Errori di dominio:** compaiono in un banner localizzato in base al codice, che si può chiudere.
- **Componenti UI condivisi** (`src/shared/ui`): `Button`, `TextField`, `NumberField`, `Toggle` (`role="switch"`) e `Panel`.
- **Code splitting:** Master e Display sono caricati separatamente (`lazy` di React Router), e il service worker li mette entrambi in cache per l'uso offline.

## Animazioni base (fase 5)

Libreria: **Motion** (`motion/react`). `MotionConfig reducedMotion="user"` rispetta l'impostazione "riduci movimento" del sistema operativo, e anche le transizioni CSS hanno `motion-reduce`.

- **Effetti visivi** (`src/features/display/fx`):
  - `eventsToFx` è una funzione pura che trasforma gli eventi di dominio ricevuti con lo `STATE` in effetti: `damage`, `heal`, `mpLoss`, `mpGain`, `crisis`, `ko`, `revive`. Un danno 0 resta visibile ("0"); le variazioni di PM nulle no.
  - `useFxStore` è la coda degli effetti in corso, limitata a 40 per non accumulare effetti scaduti se la scheda resta in background. Ogni effetto si toglie da solo a fine animazione.
  - Gli effetti arrivano alla scena tramite `FxContext`: il Display lo fornisce, l'anteprima della plancia no, quindi lì non ci sono testi fluttuanti.
- **Testo fluttuante:** sopra lo sprite compaiono i danni (bianco), le cure (verde, `+8`), i PM (azzurro, `−8 PM`), la Crisi ("Crisi!") e il KO. Più testi sullo stesso bersaglio si impilano; le scritte di stato arrivano 0,25 s dopo il numero che le ha causate.
- **Reazione dello sprite:**
  - un danno lo fa tremare e lampeggiare;
  - una cura o una rianimazione gli dà un bagliore verde;
  - il passaggio a KO (desaturazione) avviene con una transizione.
- **Barre con scia:**
  - sul danno la barra scende subito e una scia rosa si svuota dopo 350 ms;
  - sulla cura una scia verde chiara cresce subito e la barra la segue dopo 300 ms.

  Anche i numeri di PV e PM scorrono verso il nuovo valore (`AnimatedNumber`, che aggiorna il DOM senza far ri-renderizzare React).

- **Entrate e uscite:** i nemici entrano da sinistra e il party da destra, scaglionati di 0,12 s. Chi viene rimosso svanisce. Quando la formazione cambia (riordino, aggiunte), gli sprite e le targhette scivolano nelle nuove posizioni.
- **Dissolvenze di inizio e fine battaglia:** `PlayerScreen` passa da attesa a battaglia e viceversa con una dissolvenza al nero di 0,6 s per lato (`AnimatePresence mode="wait"`). A fine battaglia la scena svanisce mostrando ancora l'ultimo fotogramma, nemici compresi, prima della schermata di attesa.
- **Test:** `MotionGlobalConfig.skipAnimations = true`, così i test verificano gli stati finali e non i singoli fotogrammi.

## Rotte

Si usa l'hash routing, che funziona offline e su qualsiasi host statico:

- `#/master` è la plancia del GM;
- `#/display` è lo schermo dei giocatori, aperto dal Master con `window.open`. Al primo clic sblocca l'audio.

## Sincronizzazione Master → Display (fase 4)

- **Trasporto:** `SyncTransport` (`src/app/sync/transport.ts`). L'implementazione reale è su `BroadcastChannel('fu-battle.sync')` (`src/infra/sync`); ce n'è una in memoria per i test. Si può sostituire, per esempio con un WebSocket per un Display su un altro PC, senza toccare la logica.
- **Protocollo** (`protocol.ts`, v1): ogni messaggio in arrivo è validato con Zod e quelli non validi vengono ignorati.

```ts
type SyncMessage =
  | { v: 1; type: 'HELLO'; displayId } // Display → Master: "mandami lo stato"
  | { v: 1; type: 'HEARTBEAT'; displayId } // Display → Master: ogni 4 s
  | { v: 1; type: 'BYE'; displayId } // Display → Master: finestra in chiusura
  | { v: 1; type: 'STATE'; session; seq; state; events } // Master → Display
```

- **`STATE`:** è sempre uno **snapshot completo** di ciò che i giocatori possono vedere, più gli eventi che l'hanno prodotto (serviranno alla coreografia nelle fasi 5–6). `session` cambia quando il Master viene ricaricato, `seq` cresce all'interno della sessione: il Display scarta i messaggi vecchi o duplicati e ricomincia a contare quando cambia la sessione.
- **Proiezione** (`projectForPlayers` e `projectEventsForPlayers` nel dominio): in preparazione al Display **non arriva nessun combattente** e nessun evento sui combattenti; i nemici in preparazione restano segreti invece di essere solo nascosti a video. Il Display mostra la `WaitingScreen` (sfondo `presentation.waitingBackgroundAssetId`, o quello predefinito se è null). `PlayerScreen` sceglie tra schermata di attesa e scena di battaglia ed è usato sia dal Display sia dall'anteprima della plancia. Senza plancia collegata il Display mostra la stessa schermata di attesa, con una piccola nota per il GM.
- **Ordine di apertura:**
  - Display aperto dopo il Master: manda `HELLO` e riceve subito lo stato.
  - Master aperto o ricaricato dopo il Display: pubblica lo stato all'avvio, e il Display lo accetta come nuova sessione.
- **Presenza:** il Master conta gli schermi collegati, aggiungendoli con `HELLO`/`HEARTBEAT` e togliendoli con `BYE` o dopo 12 s di silenzio. L'header mostra "Schermo giocatori collegato" oppure "non collegato".
- **Hook React:** `useMasterSync` nella plancia e `useDisplaySync` nel Display, quest'ultimo disattivato con `?demo=1`.

## Coreografia (dalla fase 6)

Le sequenze di attacco sono dati (`advance → wait → fx → impact → shake → floatText → retreat`), eseguite da un sequencer a coda nel Display.

## Roadmap

| Fase | Contenuto                                                                                                                                | Stato |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 0    | Impalcatura: Vite, TS strict, lint, CI, PWA, routing, i18n                                                                               | ✅    |
| 1    | Dominio (combattenti, PV, Crisi, status visivi) + store + persistenza                                                                    |       |
| 2    | Display statico: sfondo, sprite, barre PV                                                                                                |       |
| 3    | Master: roster, modifica PV/PM e status, controlli della finestra nemici (manuale/auto, secondi), rivelazione PV/PM, fine battaglia      | ✅    |
| 4    | Ponte BroadcastChannel: snapshot, riconnessione, presenza dello schermo, fase di preparazione                                            | ✅    |
| 5    | Animazioni base: barre fluide, shake, testo dei danni, dissolvenze di inizio e fine battaglia                                            | ✅    |
| 6    | Coreografia completa con FX `.webm` e SFX                                                                                                |       |
| 7    | Libreria asset (IndexedDB) e audio con crossfade; scelta di sprite, ritratti, sfondo di battaglia e **sfondo della schermata di attesa** |       |
| 8    | Rifinitura: preset incontri da importare ed esportare, banner di vittoria                                                                |       |
