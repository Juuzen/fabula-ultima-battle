---
name: Fabula Ultima Battle
description: Schermo di battaglia JRPG per Fabula Ultima, con plancia del GM e proiezione per i giocatori.
colors:
  cartridge-blue: '#2a3f9e'
  cartridge-blue-mid: '#16226a'
  cartridge-blue-deep: '#0c1446'
  frame-white: '#eef1ff'
  hp-healthy: '#10b981'
  hp-healthy-glint: '#bef264'
  crisis-amber: '#f59e0b'
  crisis-amber-glint: '#fde047'
  crisis-amber-tag: '#fbbf24'
  crisis-amber-text: '#fcd34d'
  ko-red: '#b91c1c'
  ko-red-bright: '#ef4444'
  ko-red-tag: '#dc2626'
  ko-red-text: '#f87171'
  mp-sky: '#0ea5e9'
  mp-sky-glint: '#67e8f9'
  trail-damage: '#ffe4e6'
  trail-heal: '#a7f3d0'
  status-slow: '#0284c7'
  status-dazed: '#7c3aed'
  status-weak: '#78716c'
  status-shaken: '#4f46e5'
  status-enraged: '#dc2626'
  status-poisoned: '#059669'
  text-outline: '#0a0a19'
  dusk-sky-top: '#1a1440'
  dusk-sky-mid: '#3b2a63'
  dusk-horizon: '#c27a5a'
  dusk-ground: '#3d3a2c'
  ally-placeholder: '#2b4c8f'
  enemy-placeholder: '#7a2433'
  console-black: '#020617'
  console-panel: '#0f172a'
  console-line: '#1e293b'
  console-hover: '#334155'
  console-stroke: '#475569'
  console-muted: '#94a3b8'
  console-ink: '#f1f5f9'
  command-indigo: '#4f46e5'
  command-indigo-hover: '#6366f1'
  command-indigo-focus: '#818cf8'
  action-danger: '#be123c'
  action-success: '#047857'
typography:
  display:
    fontFamily: 'Cinzel, Georgia, serif'
    fontSize: '2.25rem'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '0.05em'
  display-waiting:
    fontFamily: 'Cinzel, Georgia, serif'
    fontSize: '3.75rem'
    fontWeight: 400
    lineHeight: 1
    letterSpacing: '0.2em'
  combat-number:
    fontFamily: 'Cinzel, Georgia, serif'
    fontSize: '4.5rem'
    fontWeight: 900
    lineHeight: 1
  headline:
    fontFamily: 'Cinzel, Georgia, serif'
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.33
  title:
    fontFamily: 'Cinzel, Georgia, serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.55
    letterSpacing: '0.025em'
  gauge-value:
    fontFamily: 'Inter Variable, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.33
    fontFeature: 'tnum'
  body:
    fontFamily: 'Inter Variable, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: 'Inter Variable, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: '0.025em'
  tag:
    fontFamily: 'Inter Variable, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 700
    lineHeight: 1.43
    letterSpacing: '0.1em'
rounded:
  sm: '2px'
  md: '6px'
  lg: '8px'
  xl: '12px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  window-x: '28px'
  window-y: '20px'
components:
  jrpg-window:
    backgroundColor: '{colors.cartridge-blue}'
    textColor: '{colors.frame-white}'
    rounded: '{rounded.xl}'
    padding: '20px 28px'
  party-slot:
    backgroundColor: '{colors.console-panel}'
    textColor: '{colors.frame-white}'
    rounded: '{rounded.lg}'
  enemy-card:
    backgroundColor: '{colors.cartridge-blue-deep}'
    textColor: '{colors.frame-white}'
    typography: '{typography.title}'
    rounded: '{rounded.lg}'
    padding: '6px 12px'
    width: '290px'
  gauge-hp:
    backgroundColor: '{colors.hp-healthy}'
    rounded: '{rounded.full}'
    height: '10px'
  gauge-hp-crisis:
    backgroundColor: '{colors.crisis-amber}'
    rounded: '{rounded.full}'
    height: '10px'
  gauge-hp-ko:
    backgroundColor: '{colors.ko-red}'
    rounded: '{rounded.full}'
    height: '10px'
  gauge-mp:
    backgroundColor: '{colors.mp-sky}'
    rounded: '{rounded.full}'
    height: '10px'
  state-tag-ko:
    backgroundColor: '{colors.ko-red-tag}'
    textColor: '#ffffff'
    typography: '{typography.tag}'
    rounded: '{rounded.sm}'
    padding: '2px 8px'
  state-tag-crisis:
    backgroundColor: '{colors.crisis-amber-tag}'
    textColor: '#451a03'
    typography: '{typography.tag}'
    rounded: '{rounded.sm}'
    padding: '2px 8px'
  status-badge:
    backgroundColor: '{colors.status-poisoned}'
    textColor: '#ffffff'
    rounded: '{rounded.full}'
    size: '30px'
  action-banner:
    backgroundColor: '{colors.cartridge-blue}'
    textColor: '{colors.frame-white}'
    typography: '{typography.display}'
    rounded: '{rounded.xl}'
    padding: '12px 56px'
  button-primary:
    backgroundColor: '{colors.command-indigo}'
    textColor: '#ffffff'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0 16px'
    height: '40px'
  button-primary-hover:
    backgroundColor: '{colors.command-indigo-hover}'
  button-secondary:
    backgroundColor: '{colors.console-line}'
    textColor: '{colors.console-ink}'
    rounded: '{rounded.md}'
    padding: '0 16px'
    height: '40px'
  button-secondary-hover:
    backgroundColor: '{colors.console-hover}'
  button-danger:
    backgroundColor: '{colors.action-danger}'
    textColor: '#ffffff'
    rounded: '{rounded.md}'
    padding: '0 16px'
    height: '40px'
  button-success:
    backgroundColor: '{colors.action-success}'
    textColor: '#ffffff'
    rounded: '{rounded.md}'
    padding: '0 16px'
    height: '40px'
  button-ghost:
    textColor: '{colors.console-muted}'
    rounded: '{rounded.md}'
    padding: '0 10px'
    height: '32px'
  input:
    backgroundColor: '{colors.console-black}'
    textColor: '{colors.console-ink}'
    rounded: '{rounded.md}'
    padding: '0 12px'
    height: '40px'
  panel:
    backgroundColor: '{colors.console-panel}'
    textColor: '{colors.console-ink}'
    rounded: '{rounded.xl}'
    padding: '16px'
---

# Design System: Fabula Ultima Battle

## Overview

**Creative North Star: "La Cartuccia Ritrovata"**

Il sistema è un JRPG anni '90-2000 tirato fuori dal cassetto e rimasterizzato in HD. Il tono è classico e luminoso: blu saturo, cornici bianche nette, numeri enormi e colore usato come segnale, non come decorazione. Lo schermo dei giocatori è il gioco: uno stage logico fisso a 1920×1080, letterboxato sul nero, che deve leggersi da una TV dall'altra parte del tavolo come da una finestra compressa su Discord. Ogni elemento è dimensionato per quella distanza: nomi in Cinzel a 24px, valori PV a 24px tabellari, testo fluttuante a 72px con contorno scuro di 6px.

La plancia del Master è oggi il retroscena: una console slate scura con accenti indaco, densa e operativa, dove il GM applica danni e stati in pochi secondi. Condivide già con il Display il carattere Cinzel per titoli e nomi e le stesse icone di status. La direzione confermata è **avvicinarla al Display**: nelle prossime iterazioni il Master prende in prestito cornici, gauge e gerarchia JRPG, senza perdere la rapidità d'uso (vedi Do's and Don'ts).

I componenti sono netti e giocosi: premere un pulsante deve dare la sensazione di premere A sul pad. Le transizioni sono brevi (200–300ms), le barre hanno la scia classica che si svuota dopo il colpo, la Crisi pulsa e il KO sfuma in grigio. La profondità viene dalle cornici; il bagliore è riservato agli stati.

**Key Characteristics:**

- Finestra JRPG blu a doppio bordo bianco come contenitore firma.
- Semantica cromatica fissa: verde sano, ambra Crisi, rosso KO, azzurro PM.
- Cinzel per tutto ciò che è nome o evento, Inter per numeri, etichette e controlli.
- Stato sempre doppio: colore più testo o forma, mai solo colore.
- Movimento rapido e coreografato, con fallback statico per "riduci movimento".

## Colors

Un blu da cartuccia saturo e una semantica di gioco ad alto contrasto sullo schermo dei giocatori; una console slate neutra con un solo accento indaco sulla plancia.

### Primary

- **Blu Cartuccia** (cartridge-blue → cartridge-blue-mid → cartridge-blue-deep): il gradiente verticale della finestra JRPG (0% → 55% → 100%). Pannello del party, finestra nemici, banner delle azioni. È il colore che dice "questo è il gioco".
- **Bianco Cornice** (frame-white): il bordo esterno di 3px delle finestre e il testo su blu. Leggermente freddo, mai bianco puro sul bordo.

### Secondary

- **Verde Vita** (hp-healthy → hp-healthy-glint): gradiente orizzontale della barra PV in salute. Anche la scia di cura (trail-heal) e il testo "+8".
- **Azzurro Mana** (mp-sky → mp-sky-glint): barra PM e testo fluttuante dei PM.

### Tertiary

- **Ambra Crisi** (crisis-amber → crisis-amber-glint): barra PV in Crisi; crisis-amber-tag per l'etichetta "Crisi", crisis-amber-text per nome e valore in Crisi, e il bagliore pulsante della cornice dello slot.
- **Rosso KO** (ko-red → ko-red-bright): barra PV a zero; ko-red-tag per l'etichetta "KO", ko-red-text per nome e valore abbattuti, ring rosso semitrasparente sulla cornice.
- **Colori degli status** (status-slow, status-dazed, status-weak, status-shaken, status-enraged, status-poisoned): il fondo dei sei badge (Lento azzurro, Confuso viola, Debole pietra, Scosso indaco, Furente rosso, Avvelenato smeraldo). Il testo fluttuante usa la tinta 300 della stessa tonalità.

### Neutral

- **Nero Console** (console-black): fondo della plancia e degli input; il letterbox del Display è nero puro.
- **Ardesia Pannello** (console-panel): fondo dei Panel del Master all'80% di opacità e fondo degli slot del party.
- **Linea Console** (console-line): bordi dei pannelli, divisori delle card, fondo dei pulsanti secondari.
- **Inchiostro Console** (console-ink) e **Grigio Silenzio** (console-muted): testo primario e secondario del Master.
- **Indaco Comando** (command-indigo, -hover, -focus): l'unico accento del Master. Pulsante primario, interruttori attivi, anello di focus.
- **Contorno Testo** (text-outline): il bordo di 6px del testo fluttuante, al 90%.
- **Crepuscolo** (dusk-sky-top, dusk-sky-mid, dusk-horizon, dusk-ground): lo sfondo predefinito del campo quando il GM non ha scelto un'immagine.
- **Segnaposto alleato/nemico** (ally-placeholder, enemy-placeholder): blu e bordeaux delle sagome provvisorie.

### Named Rules

**La Regola del Semaforo.** Verde, ambra e rosso appartengono a PV, Crisi e KO. Non si usano per nient'altro sullo schermo dei giocatori, così il colore di una barra si legge da tre metri senza leggere il numero.

**La Regola dell'Unico Comando.** Sul Master l'indaco segna solo l'azione primaria, il focus e gli interruttori attivi. Rosso e verde dei pulsanti significano danno e cura, come sul Display.

## Typography

**Display Font:** Cinzel (con Georgia, serif)
**Body Font:** Inter Variable (con system-ui, sans-serif)

**Character:** Cinzel dà l'incisione da titolo di JRPG fantasy a nomi, abilità ed eventi; Inter tiene numeri ed etichette asciutti e tabellari. Entrambi sono inclusi via @fontsource, quindi funzionano offline.

### Hierarchy

- **Display** (Cinzel 700, 36px, tracking 0.05em): nome dell'abilità nel banner d'azione.
- **Display Waiting** (Cinzel 400, 60px, tracking 0.2em): "In attesa" sulla schermata di preparazione, tra due filetti sfumati.
- **Combat Number** (Cinzel 900, 72px; 48–60px per PM, Crisi, KO e status): testo fluttuante con contorno di 6px e `paint-order: stroke fill`.
- **Headline** (Cinzel 700, 24px): nome del membro del party sullo slot; titolo della plancia.
- **Title** (Cinzel 600, 18px, tracking 0.025em): nomi nemici, titoli dei Panel e nomi nelle card del Master.
- **Gauge Value** (Inter 600, 24px, cifre tabellari): "48 / 62" sopra le barre del party; il massimo scende a 16px in slate-300.
- **Body** (Inter 400–500, 14px): controlli, pulsanti, testo operativo del Master.
- **Label** (Inter 500, 12px, maiuscolo, tracking 0.025em): etichette dei campi del Master.
- **Tag** (Inter 700, 14px o 12px, maiuscolo, tracking 0.1em): "KO" e "Crisi".

### Named Rules

**La Regola del Nome Inciso.** Ciò che ha un nome nel mondo di gioco (personaggi, nemici, abilità, eventi) va in Cinzel. Ciò che si conta o si regola va in Inter.

**La Regola dei Numeri in Fila.** Ogni valore numerico usa cifre tabellari, così un PV che scende da 100 a 99 non fa ballare la riga.

## Layout

Il Display vive in uno **stage logico fisso di 1920×1080** scalato uniformemente alla finestra (`min(vw/1920, vh/1080)`) e centrato su nero. Tutte le misure del Display sono in pixel di stage, mai responsive: la composizione è una sola. Il pannello del party è centrato in basso e cresce in larghezza con il numero di alleati, la finestra nemici è una fascia centrata in alto (max 1840px, card da 290px che vanno a capo) e si ritira quando parte il banner d'azione. Gli strati seguono z-index espliciti: testo fluttuante 1300, finestra nemici 1500, banner 1600.

Il Master segue un ritmo di 4px (Tailwind): header sticky con padding 24px × 12px, contenuto con padding 24px. Controllo schermo è un **master/detail**: sopra la barra della pagina (nome della scena, finestra nemici, impostazioni), sotto due riquadri, il **Campo** (20–26rem) e il **Dettaglio** (il resto). Da 1280px la pagina occupa l'altezza della finestra e ogni riquadro scorre per conto suo; sotto si impilano. Nel Dettaglio largo i bersagli di party e nemici stanno su due colonne. L'anteprima dello schermo giocatori è una finestra flottante sopra tutto, che il GM sposta dove vuole.

Le finestre JRPG usano 28px × 20px di padding interno; quando contengono slot o card scendono a 12px su tutti i lati.

## Elevation & Depth

Il sistema è ibrido: **cornici per la struttura, bagliore per lo stato**. Le finestre si staccano dalla scena con un doppio bordo inciso e un'unica ombra esterna profonda; le superfici del Master sono piatte, separate solo da tono e bordi da 1px. Il glow compare solo quando qualcosa succede: Crisi, impatto, cura, rinascita.

### Shadow Vocabulary

- **Cornice JRPG** (`box-shadow: inset 0 0 0 2px #0c1446, inset 0 0 0 4px rgba(255,255,255,.18), 0 10px 30px rgba(0,0,0,.55)` più `border: 3px solid #eef1ff`): l'unica ombra strutturale. Solo sulle finestre JRPG.
- **Rilievo testo** (`text-shadow: 0 2px 0 rgba(0,0,0,.6)`): testo dentro le finestre e sulle targhette nemiche.
- **Bagliore Crisi slot** (`box-shadow: 0 0 22px rgba(251,191,36,.75)`, pulsazione da 1,4s): cornice dello slot del party in Crisi.
- **Bagliore Crisi sprite** (`filter: drop-shadow(0 0 14px rgba(255,60,40,.9)) brightness(1.08)`, pulsazione da 1,4s): sprite in Crisi.
- **Ombra a terra** (ellisse nera al 45%, blur 4px): sotto ogni sprite.
- **Ombra badge** (`drop-shadow(0 2px 2px rgba(0,0,0,.6))`): icone di status.

### Named Rules

**La Regola della Cornice.** Una superficie del Display che contiene informazione di gioco porta la cornice JRPG o un ring bianco al 20–35%. Niente ombre morbide senza bordo.

**La Regola del Bagliore Guadagnato.** Un glow appare solo come risposta a uno stato o a un evento e sparisce con esso. Nessun elemento brilla a riposo.

## Shapes

Angoli morbidi ma decisi, mai pillole per i contenitori. Le finestre JRPG e i Panel usano 12px; slot del party, card nemiche e card del Master 8px; pulsanti e input 6px; i tag KO e Crisi 2px, quasi squadrati come un timbro. Barre, interruttori e badge degli status basic sono completamente tondi.

Gli status hanno due silhouette: **cerchio** per gli status semplici, **rombo** (quadrato ruotato di 45° con 3px di raggio) per quelli maggiori. La forma distingue il livello anche senza colore. I bordi del Display sono ring da 1–2px in bianco semitrasparente (20–35%), ambra o rosso a seconda dello stato.

## Components

### Finestra JRPG (componente firma)

Il contenitore che dice "gioco". Gradiente verticale Blu Cartuccia, bordo esterno di 3px in Bianco Cornice, doppio filetto interno, ombra profonda, testo bianco con rilievo. Usata per il pannello del party, la finestra nemici e il banner d'azione. La finestra nemici entra e esce con uno scorrimento di 32px e dissolvenza in 300ms.

### Slot del party

Ritratto a tutta altezza come sfondo; targhetta con il nome in alto su un gradiente scuro; badge di status a 30px sotto il nome; gauge PV e PM in basso su un gradiente nero. Ring di 2px: bianco al 35% a riposo, ambra pulsante in Crisi, rosso al 70% in KO (con ritratto desaturato e scurito al 50%).

### Gauge PV / PM

Binario nero al 60% con ring bianco al 30%, riempimento a gradiente orizzontale nel colore dello stato. **Scia JRPG:** al danno la barra scende in 200ms e una scia rosa pallido la segue dopo 350ms in 650ms; alla cura una scia verde pallido anticipa in 250ms e la barra la raggiunge dopo 300ms in 550ms. Due layout: impilato (party, barra da 10px, valori a 24px) e in linea (card nemiche, barra da 6px, valori a 14px). I numeri si animano verso il nuovo valore.

### Tag di stato

"KO" su rosso con testo bianco, "Crisi" su ambra con testo ambra-950 che pulsa. Maiuscolo, tracking ampio, 2px di raggio. È sempre testuale: lo stato non è mai affidato al solo colore della barra.

### Badge di status

Cerchio o rombo nel colore dello status, ring bianco all'80% di 2px, icona Lucide bianca al 60% del lato con tratto 2,5. Sul Master gli stessi badge fanno da interruttori: spenti al 30% di opacità e in scala di grigi, accesi a piena intensità.

### Testo fluttuante

Cinzel 900 con contorno scuro di 6px. Due corsie per combattente: numeri (danno bianco, cura verde) e testo (Crisi, KO, status, PM), con il numero 76px sotto il testo. Appare, resta e sfuma in 1,4s, senza spostarsi.

### Banner d'azione

Finestra JRPG con il nome dell'abilità in Display. Entra dall'alto (16px) e si allarga da 85% a 100% in 220ms.

### Pulsanti (Master)

- **Shape:** angoli morbidi (6px), altezza 40px (32px nella taglia sm), icona Lucide da 16px con gap di 6px.
- **Primary:** Indaco Comando con testo bianco; hover un tono più chiaro.
- **Secondary:** Linea Console con ring da 1px in slate-600; hover slate-700. È il default.
- **Danger / Success:** rosa-700 e smeraldo-700, per Danno e Cura.
- **Ghost:** solo testo Grigio Silenzio; hover fondo slate-800 e testo bianco, con tinta per azione (ambra per "agisci", rosa per "rimuovi").
- **Focus / Disabled:** outline di 2px a 2px di offset nella tinta 400 della variante; disabilitato al 40%.

### Input

Fondo Nero Console, bordo da 1px slate-600, 6px di raggio, altezza 40px; al focus il bordo diventa Indaco Comando chiaro. Etichetta sopra in Label. I numeri usano cifre tabellari.

### Panel e card (Master)

Panel: fondo Ardesia all'80%, bordo da 1px Linea Console, 12px di raggio, padding 16px, titolo in Title.

**Card del Campo:** compatta come la card nemica del Display. Fondo Nero Console al 70%, 8px di raggio, ring bianco al 15% (al 35% in hover); ambra in Crisi, rosso al 50% in KO (nome barrato), **indaco a 2px quando è selezionata**. Nome in Cinzel 16px, tag Crisi/KO, status a 20px, gauge PV/PM in linea. Il ritratto o lo sprite (o il segnaposto) occupa il lato destro al 45% (30% il segnaposto), sfumato verso il nome. Nessun pulsante d'azione: solo il menu "⋯".

**Compositore:** righe-bersaglio con checkbox, nome in Cinzel e PV/PM a destra; spuntate prendono il ring indaco e si aprono sull'esito (tipo, valore, sei status: un piccolo badge bianco + o − dice se lo status verrà aggiunto o tolto). Piè di pagina fisso con il riepilogo e "Agisci" (Primary).

**Anteprima flottante:** finestra JRPG senza padding, barra del titolo da 34px con maniglia, riduci e chiudi; maniglia di ridimensionamento nell'angolo in basso a destra.

**Popover:** fondo slate-900, bordo slate-700, 12px di raggio, padding 16px, la stessa ombra dei menu. Si apre sotto il pulsante che lo comanda.

### Interruttore

Binario 44×24px tondo, slate-600 spento e indaco-500 acceso, pomello bianco da 20px che scorre di 20px.

### Movimento

Sequenza d'azione: avanzata 280ms, carica 240ms, effetto 600–1100ms con impatto tra il 35% e il 55%, attesa 380ms, ritorno 280ms. KO: scala di grigi e luminosità 55% in 700ms. Crisi: pulsazione da 1,4s. Con "riduci movimento" la sequenza si applica subito, le barre non hanno transizione e la Crisi resta come bagliore statico.

## Do's and Don'ts

### Do:

- **Do** usare la finestra JRPG (gradiente Blu Cartuccia, bordo Bianco Cornice da 3px, doppio filetto interno) per ogni contenitore di informazione di gioco sul Display.
- **Do** accoppiare ogni stato a un segnale non cromatico: tag testuale per KO e Crisi, cerchio o rombo per gli status, barrato per i nemici abbattuti.
- **Do** dimensionare il Display in pixel di stage 1920×1080 e verificare la leggibilità a distanza: nomi ≥ 18px, valori PV del party a 24px, testo fluttuante ≥ 48px.
- **Do** dare al testo sopra la scena un contorno o un rilievo scuro (6px di stroke per il testo fluttuante, `0 2px 0` per il testo nelle finestre).
- **Do** usare la terminologia italiana del manuale (PV, PM, Crisi, KO e i nomi degli status) in tutte le etichette.
- **Do** portare gradualmente sul Master gli elementi del Display: cornici JRPG sulle sezioni chiave, gauge con la stessa semantica, Cinzel per i nomi. Va fatto senza aumentare i clic e senza togliere densità.
- **Do** fornire un'alternativa statica a ogni animazione sotto `prefers-reduced-motion`.

### Don't:

- **Don't** usare verde, ambra o rosso sul Display per significati diversi da PV, Crisi e KO.
- **Don't** introdurre loghi, illustrazioni o grafica ufficiale di Fabula Ultima: il progetto è fan-made e gli asset restano placeholder finché il GM non li carica.
- **Don't** aggiungere glow o pulsazioni a elementi a riposo: il bagliore segnala solo stati ed eventi.
- **Don't** rendere responsive la composizione del Display: si scala lo stage intero, non si riorganizzano i pannelli.
- **Don't** usare cifre proporzionali per PV, PM o importi.
- **Don't** aggiungere al Master un secondo colore d'accento accanto all'indaco.
