# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Un GM di Fabula Ultima (il proprietario del progetto) e il suo gruppo di gioco. Strumento personale: non è prevista una distribuzione pubblica.

- **GM:** gestisce lo scontro dalla plancia del Master durante la sessione, in tempo reale, mentre conduce il gioco. Deve applicare danni, cure, status e azioni in pochi secondi senza interrompere il ritmo al tavolo.
- **Giocatori:** guardano lo schermo di battaglia. Non interagiscono con l'app.

## Product Purpose

Trasformare i combattimenti di Fabula Ultima in una scena da JRPG (sul modello di Final Fantasy e Octopath Traveler): il GM tiene i conti sulla plancia, i giocatori vedono sprite, barre, numeri e sequenze d'azione animate. Il successo è una battaglia che sembra un videogioco per i giocatori e che resta veloce e affidabile da condurre per il GM.

## Positioning

Uno schermo di battaglia dedicato alle regole di Fabula Ultima (PV, PM, soglia di Crisi, i sei status), diviso in plancia autorevole del GM e proiezione per i giocatori, con coreografia d'azione che ritarda lo stato visivo fino all'impatto.

## Operating Context

- Doppio schermo: plancia del Master (`#/master`) su un monitor, schermo giocatori (`#/display`) su un secondo, aperto dal Master con `window.open` e sincronizzato via BroadcastChannel.
- Due scenari da supportare entrambi:
  - **Tavolo dal vivo:** il Display su TV o proiettore, letto da giocatori seduti a distanza.
  - **Online:** la finestra Display condivisa in streaming (Discord, OBS) a giocatori remoti.
- Usato durante sessioni di gioco vere, con il GM che parla e decide mentre opera l'app.
- Offline-first (PWA); browser basati su Chromium (Chrome/Edge), necessari per i `.webm` con canale alpha.

## Capabilities and Constraints

- Regole tracciate: PV, PM, Crisi (`0 < PV ≤ floor(PV max / 2)`), KO. Status (Lento, Confuso, Debole, Scosso, Furente, Avvelenato) solo visivi. PI e turni non gestiti: il GM sceglie chi agisce.
- Fasi di battaglia: In preparazione (schermata di attesa, nessun combattente ai giocatori) → In corso → Termina.
- Informazioni sui nemici: nome, status, Crisi/KO sempre visibili; PV/PM solo se rivelati dal GM. Finestra nemici manuale o automatica.
- Azioni coreografate (avanzata, carica, effetto, impatto, ritorno) con effetti integrati: taglio, impatto, fuoco, ghiaccio, tuono, luce, ombra.
- Annulla (fino a 50 passi), salvataggio in `localStorage` versionato.
- Stage logico 16:9 a 1920×1080, scalato alla finestra.
- UI localizzata: italiano predefinito, inglese. Codice in inglese.
- Rispetto di "riduci movimento" del sistema operativo.
- Ancora da costruire: libreria asset in IndexedDB, audio con crossfade, scelta di sprite/ritratti/sfondi (fase 7); preset di incontri e banner di vittoria (fase 8).

## Brand Commitments

- Progetto fan-made: nessun logo, illustrazione o grafica ufficiale di Fabula Ultima. Il nome serve solo come riferimento al sistema di gioco.
- Terminologia italiana del manuale per le statistiche e gli stati (PV, PM, Crisi, KO e i nomi degli status).

## Evidence on Hand

- Incontro dimostrativo che copre tutti gli stati visivi: `#/display?demo=1` (`src/features/display/demo/demoBattle.ts`).
- Nessun asset grafico definitivo: sprite, ritratti e sfondi sono placeholder finché l'utente non li carica (fase 7). Non inventare arte ufficiale né asset di terze parti.
- Documentazione tecnica: `docs/ARCHITECTURE.md`.

## Product Principles

1. **Il ritmo del tavolo viene prima.** Ogni operazione del GM deve essere rapida, annullabile e non deve costringere a fermare la scena.
2. **Il Master è la verità, il Display è spettacolo.** I giocatori vedono solo ciò che il GM ha deciso di mostrare; il Display non contiene logica di gioco.
3. **Leggibile a distanza e in streaming.** La scena deve funzionare su un televisore dall'altra parte del tavolo e su una finestra compressa in una videochiamata.
4. **Fedele alle regole, senza automatizzarle oltre il necessario.** Si tracciano i numeri; il giudizio resta al GM.

## Accessibility & Inclusion

Rispettare `prefers-reduced-motion` (già implementato: le sequenze vengono applicate subito e gli effetti restano statici).
