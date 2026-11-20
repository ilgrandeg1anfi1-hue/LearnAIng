# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/it/1.1.0/), versioni [SemVer](https://semver.org/lang/it/).

## [Non rilasciato]
### Modificato
- App rinominata **LearnAIng** (appId `app.learnaing.desktop`, estensione export `.learnaing`); licenza MIT, repository pubblico.

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
