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
- **Firma solo self-signed (risolto per questo PC, 2026-11-20)**: Smart App Control blocca gli exe non firmati. Creato il certificato `CN=AIRL Dev Self-Signed` (SHA1 `549A01348EE3BCCD0BF399DC17E45DCB0043DB24`, scade 2028-11-20, chiave non esportabile in `Cert:\CurrentUser\My`), reso attendibile in `CurrentUser\Root` e `CurrentUser\TrustedPublisher`. Con la firma l'exe portable si avvia e mostra la finestra. Build firmata (la config non è nel repo perché il certificato esiste solo su questo PC):
  `npm run build && npx electron-builder --win -c.win.signtoolOptions.certificateSha1=549A01348EE3BCCD0BF399DC17E45DCB0043DB24`
  Su altri PC l'exe resta non attendibile: per distribuirlo serve un certificato di una CA riconosciuta (decidere entro la Fase 8). Per revocare la fiducia: rimuovere il certificato da `certmgr.msc` → Autorità di certificazione radice attendibili e Autori attendibili.
- `npm audit`: 6 vulnerabilità moderate in `electron-builder` (minimatch via `@electron/universal`, solo build). Nessuna alta; la CI fallisce solo da `high` in su.
- Nessuna icona applicazione (usata quella di Electron).
- GitHub secret scanning/push protection non ancora attivati sul repo (su repo privati possono richiedere GitHub Advanced Security).

## Repository
- https://github.com/ilgrandeg1anfi1-hue/ai-research-learning (privato), `main` + tag `v0.0.0-fase0`.
- CI su `v0.0.0-fase0`: verde (lint, test, audit) — run 44711577374.
