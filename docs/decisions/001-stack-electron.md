# ADR 001 — Stack: Electron + TypeScript + React

Stato: accettato (2026-11-20)

## Contesto
App desktop Windows con parsing di PDF/DOCX/HTML, chiavi API da proteggere, mini-app isolate, distribuzione installabile e portable. Sul PC sono presenti Node e Python; mancano Rust e .NET.

## Alternative
| Opzione | Pro | Contro |
|---|---|---|
| **Electron + TS + React** | ecosistema maturo per documenti, Node già presente, `safeStorage` (DPAPI), iframe sandbox Chromium affidabili, electron-builder fa NSIS e portable | ~100 MB, sicurezza da configurare esplicitamente |
| Tauri 2 | binario piccolo, permessi granulari | Rust assente, parsing documenti più faticoso o sidecar Python |
| .NET WinUI/WPF + WebView2 | nativo | .NET assente, ecosistema AI/JS debole, UI web comunque necessaria |
| Python (PySide/Flet) | librerie AI | packaging fragile, sandboxing delle mini-app debole |

## Decisione
Electron + TypeScript + React, con baseline di sicurezza rigida da Fase 0 (`docs/SECURITY.md`). Un solo linguaggio in tutto il progetto.

## Conseguenze
- Dimensione ~110 MB per exe, accettata.
- La sicurezza dipende dalla configurazione: coperta da E2E e checklist di fase.
- Electron va aggiornato a ogni fase.
