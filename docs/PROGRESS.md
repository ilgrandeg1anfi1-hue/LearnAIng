# Progresso

Piano completo: `C:\Users\ilgra\.claude\plans\pasted-content-id-31c7-voglio-progettar-sparkling-mist.md` (sintesi in `docs/ARCHITECTURE.md`).

## Fase corrente
**Fase 0 — Fondamenta: completata** (tag `v0.0.0-fase0`, 2026-11-20). Prossima: **Fase 1 — Storage, chat UI, i18n**.

## Completato (Fase 0)
- Repo git (`main`), hook gitleaks in `.githooks/pre-commit` (attivato da `npm install` via `prepare`).
- Scaffold Electron 45.4.1 + electron-vite 6 + React 19 + TS 6, baseline di sicurezza completa (vedi `docs/SECURITY.md`).
- IPC: helper `handle()` in `src/main/index.ts` (mittente + validazione); unico canale `app:version`.
- ESLint (+ `tsc --noEmit`), Vitest (3 test su `src/main/security.ts`), Playwright E2E (finestra, IPC, niente `require`/`process`, CSP, navigazione e `window.open` bloccati).
- CI GitHub Actions su windows-latest: lint, test, `npm audit --audit-level=high`.
- electron-builder: `dist/ai-research-learning-0.0.0-setup.exe` e `dist/ai-research-learning-0.0.0-portable.exe`.
- ADR 001–005; `node:sqlite` con FTS5 confermato (ADR 005).

## Prossimi passi (Fase 1)
- Schema SQLite con migrazioni versionate (`node:sqlite`), cartella dati portable/installata.
- Chat persistenti: lista, rinomina, elimina, continua; provider finto "echo".
- UI minimal chiaro/scuro, i18n IT/EN (dizionari JSON + `t()`).
- Test: migrazioni e repository (unit), crea chat → riavvio → chat presente (E2E).

## Problemi aperti
- **Exe non avviabile su questo PC**: Smart App Control (attivo) blocca gli exe non firmati ("Un criterio di controllo dell'applicazione ha bloccato il file"). Verificato invece che il pacchetto `dist/win-unpacked/resources/app.asar` si avvia con l'Electron firmato e risponde via IPC. Opzioni: firma del codice (certificato), test su un altro PC/VM, oppure accettare. Disattivare Smart App Control non è reversibile senza reinstallare Windows.
- `npm audit`: 6 vulnerabilità moderate in `electron-builder` (minimatch via `@electron/universal`, solo build). Nessuna alta; la CI fallisce solo da `high` in su.
- Nessuna icona applicazione (usata quella di Electron).
- Repo GitHub: vedi stato remote con `git remote -v`; GitHub secret scanning/push protection da attivare sul repo.
