# ADR 002 — Orchestrazione nel codice, non agente con tool-calling

Stato: accettato (2026-11-20)

## Contesto
La pipeline di ricerca deve funzionare con provider diversi, inclusi modelli locali con tool-calling scadente, con costi controllabili e resistente alla prompt injection.

## Decisione
La pipeline (pianifica → cerca → leggi → estrai → sintetizza → verifica) è una macchina a stati in TypeScript. Il modello riceve solo richieste di output JSON strutturato e non dispone di strumenti con effetti collaterali. Niente framework agentici.

## Conseguenze
- Funziona con qualsiasi modello che produca JSON (parser tollerante + 1 retry).
- Limiti di iterazioni/fonti/token/costo/tempo applicati dal codice.
- Una prompt injection può fuorviare il contenuto ma non eseguire azioni; gli URL da leggere vengono solo da risultati di ricerca o dall'utente.
- Meno flessibilità "emergente" dell'agente: accettato.
