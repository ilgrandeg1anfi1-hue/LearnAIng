# Progresso

Piano completo: `C:\Users\ilgra\.claude\plans\pasted-content-id-31c7-voglio-progettar-sparkling-mist.md` (sintesi in `docs/ARCHITECTURE.md`).

## Fase corrente
**Fase 0 — Fondamenta: completata** (tag `v0.0.0-fase0`, 2026-11-20), con un criterio non verificabile su questo PC: l'avvio dell'exe è bloccato da Smart App Control (vedi Problemi aperti). Prossima: **Fase 1 — Storage, chat UI, i18n**.

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
- **Smart App Control blocca gli exe anche firmati self-signed.** Prova del 2026-11-20 con il certificato `CN=AIRL Dev Self-Signed` (SHA1 `549A01348EE3BCCD0BF399DC17E45DCB0043DB24`, chiave non esportabile in `Cert:\CurrentUser\My`, importato in `CurrentUser\Root` e `TrustedPublisher`): il log CodeIntegrity riporta `KnownRoot=2`, `VerificationError=18`. SAC accetta solo radici del programma Microsoft. Un primo exe firmato era partito per il verdetto di reputazione cloud di Defender, non per la firma; la build successiva (hash diverso) è stata bloccata. Quindi: la firma self-signed è inutile per SAC. Per avviare gli exe su questo PC serve una CA riconosciuta (es. Azure Trusted Signing, certificato OV) oppure testarli su un altro PC/VM. Il pacchetto `app.asar` è verificato con l'Electron firmato.
  Build firmata (solo su questo PC; la cache di electron-builder va disattivata, altrimenti riusa un exe firmato in precedenza ignorando i cambi ai fuse), in PowerShell:
  `npm run build; $env:ELECTRON_BUILDER_DISABLE_BUILD_CACHE='true'; npx electron-builder --win "-c.win.signtoolOptions.certificateSha1=549A01348EE3BCCD0BF399DC17E45DCB0043DB24"`
  Per togliere la fiducia al certificato: `certmgr.msc` → Autorità di certificazione radice attendibili e Autori attendibili → elimina "AIRL Dev Self-Signed".
- `npm audit`: 6 vulnerabilità moderate in `electron-builder` (minimatch via `@electron/universal`, solo build). Nessuna alta; la CI fallisce solo da `high` in su.
- Nessuna icona applicazione (usata quella di Electron).
- GitHub secret scanning/push protection non disponibili sul repo privato gratuito (API: 422). Sostituiti da gitleaks in CI (job `secrets`).
- Advisory moderate di `minimatch` (via `app-builder-lib`, `@electron/universal`): non corrette di proposito. Solo build, glob dalla nostra config (ReDoS non sfruttabile); forzare il salto di major rischierebbe di rompere electron-builder. Ricontrollare a ogni aggiornamento di electron-builder.

## Security review Fase 0 (2026-11-20)
Revisione manuale di tutto il codice (la skill `security-review` analizza solo diff verso `origin`, qui vuoto).
- **Corretto**: l'exe impacchettato accettava `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` e `--inspect` (runtime Node firmato riutilizzabile). Aggiunti gli Electron fuses in `electron-builder.yml`; verificato che `ELECTRON_RUN_AS_NODE` non esegue più codice.
- **Corretto**: action della CI fissate per SHA.
- **Rinviato (Fase 7)**: `grantFileProtocolExtraPrivileges` resta attivo perché il renderer è caricato da `file://`; disattivarlo quando si passa al protocollo custom.
- **Nota**: `will-navigate` copre solo il frame principale; oggi la CSP `frame-src 'none'` vieta gli iframe. Con le mini-app (Fase 7) gestire anche `will-frame-navigate`.
- Nessun problema in IPC (`handle()`), preload, permessi, apertura link esterni.

## Verifiche extra (2026-11-20)
- Modalità dev: app aperta con Playwright contro il dev server, versione via IPC visibile, CSS applicato, zero errori in console.

## Repository
- https://github.com/ilgrandeg1anfi1-hue/ai-research-learning (privato), `main` + tag `v0.0.0-fase0`.
- CI su `v0.0.0-fase0`: verde (lint, test, audit) — run 44711577374. Dopo: aggiunti E2E e gitleaks in CI.
