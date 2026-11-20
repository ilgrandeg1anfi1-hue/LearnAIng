# ADR 005 — SQLite tramite `node:sqlite` integrato

Stato: accettato (2026-11-20)

## Contesto
Il piano richiede SQLite con FTS5. Un modulo nativo (`better-sqlite3`) va ricompilato per ogni versione di Electron; il modulo integrato `node:sqlite` lo evita, se presente nel Node incluso in Electron.

## Verifica (Fase 0)
`npm run check:sqlite` (`scripts/check-sqlite.mjs`) esegue il Node di Electron (`ELECTRON_RUN_AS_NODE`), crea un DB in memoria, una tabella FTS5 e una query `MATCH`. Esito:

```json
{"electron":"45.4.1","node":"24.22.3","sqlite":"3.54.1","fts5":true}
```

Nessun warning di modulo sperimentale.

## Decisione
Usare `node:sqlite` (`DatabaseSync`) nel main process. Niente `better-sqlite3`.

## Conseguenze
- Nessun modulo nativo da ricompilare, packaging più semplice.
- API sincrona: query pesanti vanno tenute brevi o spostate fuori dal thread principale se bloccano la UI.
- Rieseguire `npm run check:sqlite` a ogni aggiornamento di Electron.
