# ADR 003 — Niente vector DB: FTS5/BM25

Stato: accettato (2026-11-20)

## Contesto
Serve recuperare passaggi da documenti caricati e pagine lette, tutto in locale e senza dipendere da un provider di embeddings.

## Decisione
Chunk indicizzati con SQLite FTS5 (ranking BM25) nello stesso file del database. Nessun vector DB, nessun embedding nella v1.

## Conseguenze
- Zero dipendenze aggiuntive, funziona offline, export in un solo file.
- Recall più bassa su parafrasi/sinonimi.
- Rivalutare gli embeddings solo se i test di recall della Fase 3 risultano insufficienti; in quel caso nuovo ADR.
