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
