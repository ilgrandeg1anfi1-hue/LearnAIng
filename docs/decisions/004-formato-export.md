# ADR 004 — Formato export `.airl`

Stato: accettato (2026-11-20)

## Contesto
L'utente deve poter salvare e spostare tutti i dati (chat, fonti, documenti, lezioni) tra PC o profili.

## Decisione
Export = `VACUUM INTO` del database SQLite in un file `.airl` (nessuna libreria zip). Import = validazione di schema e versione, poi merge nel database corrente. Le API key non vengono mai esportate.

## Conseguenze
- Un solo file, consistente, apribile con qualsiasi tool SQLite.
- Le chiavi vanno reinserite sul nuovo PC (anche perché DPAPI le lega all'utente Windows): comportamento voluto.
- Le migrazioni di schema devono supportare l'import di versioni precedenti.
- Test di Fase 8: export → import su profilo vuoto = dati identici; nessuna chiave nell'export.
