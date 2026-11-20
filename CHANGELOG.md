# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/it/1.1.0/), versioni [SemVer](https://semver.org/lang/it/).

## [Non rilasciato]
### Sicurezza
- Electron fuses sull'exe impacchettato (niente RunAsNode, NODE_OPTIONS, `--inspect`; integrità asar).
- CI: E2E, scansione segreti con gitleaks, action fissate per SHA.

## [0.0.0-fase0] - 2026-11-20
### Aggiunto
- Scaffold Electron 45 + electron-vite + React 19 + TypeScript.
- Baseline di sicurezza: contextIsolation, sandbox, CSP, blocco navigazione/webview/`window.open`, permessi negati, preload minimo, IPC con verifica mittente e validazione.
- ESLint, Vitest, Playwright per Electron, CI GitHub Actions (lint, test, `npm audit`).
- gitleaks come hook pre-commit (`.githooks/`).
- electron-builder: target NSIS e portable.
- Documentazione: CLAUDE.md, architettura, sicurezza, progresso, ADR 001–005.
