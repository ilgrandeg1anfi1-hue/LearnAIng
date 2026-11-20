# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/it/1.1.0/), versioni [SemVer](https://semver.org/lang/it/).

## [Non rilasciato]

## [0.1.0-fase1] - 2026-11-20
### Aggiunto
- Storage SQLite (`node:sqlite`) con migrazioni versionate (`PRAGMA user_version`, transazionali, rifiuto di DB più nuovi); tabelle chat, messaggi, impostazioni (ADR 007).
- Chat persistenti: crea (al primo messaggio), lista, rinomina, elimina, continua; provider finto "echo".
- UI chat con sidebar, area messaggi e composer; tema Sistema/Chiaro/Scuro; identità grafica propria.
- Markdown sanitizzato con `marked` + DOMPurify; i link passano dalla conferma del main.
- i18n italiano/inglese con dizionari JSON e `translate()` condivisa da main e renderer.
- Cartella dati portable accanto all'exe (`LearnAIng-data`).
- Test: unit su migrazioni, repository, validatori IPC e dizionari; E2E chat → riavvio → chat presente, impostazioni persistenti, sanitizzazione.
- `npm run dist:local`: build locale solo portable, finché Smart App Control blocca il passo NSIS non firmato.

### Corretto
- Crash del renderer: in Electron 45 `scrollIntoView()` restituisce una Promise che React prendeva per funzione di cleanup.

### Modificato
- App rinominata **LearnAIng** (appId `app.learnaing.desktop`, estensione export `.learnaing`); licenza MIT, repository pubblico.
- README, privacy policy, code signing policy; workflow di release in GitHub Actions (pre-release con checksum).

### Sicurezza
- Electron fuses sull'exe impacchettato (niente RunAsNode, NODE_OPTIONS, `--inspect`; integrità asar).
- CI: E2E, scansione segreti con gitleaks, action fissate per SHA.
- Preparazione firma commerciale: config `signing/ov.yml` e `signing/azure.yml` con firma obbligatoria, `npm run verify:signature`, ADR 006.
- Pacchetto Microsoft Store (`npm run dist:store`, `signing/store.yml`): firma gratuita da parte di Microsoft.

## [0.0.0-fase0] - 2026-11-20
### Aggiunto
- Scaffold Electron 45 + electron-vite + React 19 + TypeScript.
- Baseline di sicurezza: contextIsolation, sandbox, CSP, blocco navigazione/webview/`window.open`, permessi negati, preload minimo, IPC con verifica mittente e validazione.
- ESLint, Vitest, Playwright per Electron, CI GitHub Actions (lint, test, `npm audit`).
- gitleaks come hook pre-commit (`.githooks/`).
- electron-builder: target NSIS e portable.
- Documentazione: CLAUDE.md, architettura, sicurezza, progresso, ADR 001–005.
