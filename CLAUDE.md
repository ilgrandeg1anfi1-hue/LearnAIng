# LearnAIng

App desktop Windows per ricerca approfondita verificata e apprendimento interattivo. Dati locali, indipendente dai provider AI, installabile (NSIS) e portable.

**Prima di iniziare qualsiasi lavoro: leggi `docs/PROGRESS.md`** (fase corrente, prossimi passi, problemi aperti). Aggiornalo a fine sessione.

## Stack
- Electron 45 + electron-vite 6 + React 19 + TypeScript 6 (un solo linguaggio ovunque).
- SQLite tramite `node:sqlite` integrato in Electron (ADR 005), FTS5 per la ricerca nei testi.
- Test: Vitest (unit, `src/**/*.test.ts`), Playwright `_electron` (E2E, `e2e/`).
- Packaging: electron-builder (`electron-builder.yml`), target `nsis` + `portable`.
- Dipendenze ammesse: solo quelle elencate in `docs/ARCHITECTURE.md`. Niente SDK dei provider AI, framework agentici, vector DB, librerie di stato/i18n. Nuove dipendenze solo con approvazione.

## Comandi
| Comando | Cosa fa |
|---|---|
| `npm run dev` | app in sviluppo con HMR |
| `npm run lint` | `tsc --noEmit` + ESLint |
| `npm test` | unit test (Vitest) |
| `npm run test:e2e` | build + E2E Playwright su Electron |
| `npm run dist` | build + exe NSIS e portable in `dist/` |
| `npm run dist:local` | build + solo exe portable (temporaneo: NSIS bloccato in locale da Smart App Control finché manca la firma) |
| `npm run check:sqlite` | verifica `node:sqlite` + FTS5 nel Node di Electron |

Verifica di fine fase: `npm run lint && npm test && npm run test:e2e && npm run dist`.
Temporaneo, finché non arriva la firma digitale: in locale l'ultimo passo è `npm run dist:local`; NSIS + portable si costruiscono in CI (`release.yml`). Vedi `docs/PROGRESS.md`.

## Struttura
- `src/main/` — main process (Node). `security.ts` contiene i controlli puri ai confini (testati).
- `src/preload/` — unica superficie esposta al renderer (`window.api`).
- `src/renderer/` — React, senza Node.
- `docs/` — architettura, sicurezza, progresso, ADR in `docs/decisions/`.

## Regole di sicurezza (non negoziabili)
- `BrowserWindow`: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`.
- Navigazione bloccata (`will-navigate`), `<webview>` bloccati, `window.open` negato; link http(s) aperti nel browser di sistema solo dopo conferma.
- CSP rigida nel `index.html` (`default-src 'self'`, niente script remoti/inline). L'eccezione `unsafe-inline` esiste solo nel dev server.
- Permessi web (camera, notifiche…) negati a livello di sessione.
- Preload: solo funzioni specifiche, mai `ipcRenderer` esposto. Ogni canale IPC passa da `handle()` in `src/main/index.ts`: verifica mittente (frame principale della nostra pagina) e valida gli argomenti con validatori scritti a mano.
- API key: solo nel main process, cifrate con `safeStorage`, mai al renderer (solo "configurata sì/no"), mai nei log, mai negli export.
- Contenuti esterni (pagine, documenti) = dati non affidabili: delimitati nei prompt; l'output del modello è solo JSON/testo validato. Il modello non ha strumenti con effetti collaterali.
- Fetch pagine: solo URL da risultati di ricerca o forniti dall'utente; blocco IP privati/localhost (anche dopo redirect); limiti di dimensione e timeout; niente cookie.
- Markdown sempre sanitizzato con DOMPurify.
- Mini-app: `iframe sandbox="allow-scripts"` senza `allow-same-origin`, protocollo custom, CSP `connect-src 'none'`, solo `postMessage` con schema fisso.
- Git: nessun dato reale nelle fixture; gitleaks gira come hook pre-commit (`.githooks/`, attivato da `npm install`).

## Convenzioni
- Risposte e documentazione in italiano; codice, identificatori e commenti nel codice in inglese.
- Soluzioni semplici, nessuna astrazione non richiesta. Scorciatoie note: commento `shortcut: <limite>, <quando aggiornare>`.
- Ogni fase chiude con test verdi, `docs/PROGRESS.md` e `CHANGELOG.md` aggiornati, commit e tag `vX.Y.Z-faseN`.
- Decisioni architetturali nuove → ADR breve in `docs/decisions/NNN-titolo.md`.
