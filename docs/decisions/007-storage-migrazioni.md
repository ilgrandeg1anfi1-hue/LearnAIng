# 007 — Storage SQLite e migrazioni

**Stato:** accettata (2026-11-20)

**Contesto.** La Fase 1 introduce dati persistenti (chat, messaggi, impostazioni). Lo schema crescerà a ogni fase e un DB non va mai perso né riscritto da una versione sbagliata dell'app.

**Decisione.**
- Un solo file `learnaing.db` nella cartella `userData` (portable: `LearnAIng-data` accanto all'exe). Journal predefinito (non WAL): a riposo resta un solo file, copiabile e coerente con l'export `VACUUM INTO` (ADR 004).
- Migrazioni = array di SQL in `src/main/store.ts`, solo in aggiunta; la versione è `PRAGMA user_version`. Ogni migrazione gira in una transazione insieme al bump di versione: o entrambe o nessuna.
- Un DB con versione più alta di quella conosciuta viene rifiutato: l'app mostra l'errore ed esce, senza crearne uno nuovo.
- Repository = funzioni pure su `DatabaseSync`, chiamate solo dai gestori IPC del main. Il renderer non vede SQL né percorsi.
- ID interi (`INTEGER PRIMARY KEY`), timestamp in millisecondi, colonne in snake_case restituite così come sono (nessuna mappatura).

**Conseguenze.** Nessun ORM né libreria di migrazione. Una migrazione già rilasciata non si modifica mai. Per tornare a una versione precedente dell'app serve un export fatto prima dell'aggiornamento.
