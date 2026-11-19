# Fabula Ultima Battle Screen

Schermo di battaglia in stile JRPG per i GM di **Fabula Ultima**, pensato per il doppio schermo: la plancia del Master su un monitor, la scena per i giocatori sull'altro. Funziona offline come PWA.

## Requisiti

- Node.js ≥ 22
- Un browser basato su Chromium (Chrome o Edge)

## Avvio

```bash
npm install
npm run dev
```

Apri `http://localhost:5173/#/master` e premi **Apri schermo giocatori**.

## Script

| Comando             | Descrizione                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Server di sviluppo                              |
| `npm run build`     | Build di produzione (con service worker)        |
| `npm run preview`   | Serve la build: è il modo per provare l'offline |
| `npm run typecheck` | Controllo dei tipi                              |
| `npm run lint`      | Oxlint                                          |
| `npm run format`    | Prettier                                        |
| `npm test`          | Vitest                                          |

## Hook di commit

Dopo `npm install`, un hook di pre-commit ([husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged)) lavora sui soli file in stage:

- formatta automaticamente i file con Prettier;
- esegue Oxlint sui file `.ts` e `.tsx`, corregge da solo quello che può e blocca il commit se restano errori.

In casi eccezionali si può saltare con `git commit --no-verify`. La CI ripete comunque tutti i controlli.

## Stack

Vite · React 19 · TypeScript (strict) · React Router (hash) · Zustand · Zod · Motion · Tailwind CSS v4 · Dexie (IndexedDB) · i18next · vite-plugin-pwa · Vitest

L'architettura e le decisioni sono descritte in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
