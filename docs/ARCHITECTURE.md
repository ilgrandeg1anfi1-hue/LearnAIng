# Architettura

```
┌──────────── Renderer (React, sandbox, no Node) ────────────┐
│ Chat UI · Pannello evidenze · Impostazioni · Viewer lezioni │
│        └─ <iframe sandbox="allow-scripts"> mini-app        │
└──────────── preload: API tipizzata e minima ───────────────┘
                     IPC (canali whitelistati, input validato)
┌──────────────────── Main process (Node) ───────────────────┐
│ core/store      SQLite (chat, messaggi, fonti, documenti, FTS5)
│ core/secrets    API key cifrate con safeStorage (DPAPI)     │
│ core/providers  adapter: openai-compatible, anthropic       │
│ core/router     scelta automatica modello (regole)          │
│ core/search     adapter ricerca web + fetch pagine (SSRF guard)
│ core/docs       parsing + chunking + indicizzazione FTS5    │
│ core/research   pipeline Normale / Profonda / Ultra         │
│ core/verify     claim, citazioni verbatim, contraddizioni   │
│ core/learn      generazione lezioni e mini-app              │
└─────────────────────────────────────────────────────────────┘
```

Stato attuale (Fase 0): esistono solo la finestra, il preload con `getVersion` e l'helper IPC validato. I moduli `core/*` arrivano dalle fasi successive.

## Confini
| Confine | Regola |
|---|---|
| Renderer → main | solo via `window.api` (preload) → `ipcMain.handle` tramite `handle()`: mittente verificato + argomenti validati |
| Main → rete | solo `fetch` verso provider configurati e URL whitelistati (risultati di ricerca / input utente), SSRF guard |
| Modello → app | output JSON/testo validato; il modello non chiama strumenti |
| Mini-app → app | `postMessage` con schema fisso; nessuna rete, nessun accesso al DOM padre o allo storage |
| Dati → disco | un solo file SQLite nella cartella dati (portable: accanto all'exe; installato: `%APPDATA%`) |

## Decisioni chiave
1. Orchestrazione nel codice, non agente libero con tool-calling → [ADR 002](decisions/002-orchestrazione-nel-codice.md).
2. Provider = 2 protocolli (`openai-compatible`, `anthropic`) scritti con `fetch` + SSE; interfaccia unica `stream(messages, {model, json?, maxTokens, signal})`. Nuovi provider = config.
3. Router modelli a regole sui metadati dei modelli; override manuale per chat e per fase.
4. RAG con FTS5/BM25, niente vector DB → [ADR 003](decisions/003-no-vector-db.md).
5. Verifica deterministica: ogni citazione include testo verbatim controllato come sottostringa normalizzata della fonte; se non combacia → "non verificata".
6. Ricerca web: `SearchProvider` con adapter a chiave (Brave/Tavily) e SearXNG. Niente scraping dei motori.
7. Ultra: ciclo iterativo con budget (iterazioni, fonti, token, costo, tempo), annullabile, stato salvato a ogni iterazione.
8. Export `.airl` = `VACUUM INTO` → [ADR 004](decisions/004-formato-export.md).
9. Portable: dati accanto all'exe (`PORTABLE_EXECUTABLE_DIR`); DPAPI lega le chiavi all'utente Windows.

## Dipendenze ammesse
- Runtime: `react`, `react-dom`; `node:sqlite` (integrato); `pdfjs-dist`, `mammoth`, `@mozilla/readability` + `linkedom`, `marked` + `dompurify` (dalle fasi che li usano).
- Dev: `electron`, `electron-vite`, `vite`, `@vitejs/plugin-react`, `electron-builder`, `typescript`, `vitest`, `@playwright/test`, `eslint` (+ `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`), `@types/*`.
- Esclusi: SDK dei provider AI, LangChain e simili, vector DB, librerie di stato/i18n (i18n = dizionari JSON + `t()`).
