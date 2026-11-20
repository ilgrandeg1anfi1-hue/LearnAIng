# 006 — Firma del codice Windows

**Stato:** accettata (2026-11-20), acquisto rinviato.

**Contesto.** "Autore sconosciuto" e il blocco di Smart App Control dipendono solo dall'assenza di una firma Authenticode emessa da una CA del Microsoft Trusted Root Program. La firma self-signed non serve (vedi `PROGRESS.md`).

**Decisione.**
- Due configurazioni opzionali che estendono `electron-builder.yml` senza toccarlo: `signing/ov.yml` (signtool + certificato OV/IV nello store Windows, chiave in HSM cloud del fornitore) e `signing/azure.yml` (Azure Artifact Signing). Entrambe con `forceCodeSigning: true`.
- Per uno sviluppatore individuale in Italia la via praticabile è un certificato OV/IV: Artifact Signing Public Trust per individui è limitato a USA e Canada; per le organizzazioni copre l'UE.
- Chiavi RSA (Smart App Control e il Trusted Root Program non accettano ECC per la firma del codice).
- Nessun segreto nel repo: credenziali Azure solo in variabili d'ambiente.

- Budget zero: distribuzione principale tramite Microsoft Store (`signing/store.yml`, MSIX firmato da Microsoft, account individuale gratuito). I certificati OV/Azure restano pronti per quando ci sarà budget.

**Aggiornamento (2026-11-20).** SignPath Foundation ha rifiutato la richiesta. Confermato il Microsoft Store come unico canale firmato: è l'unica via gratuita che mostra il nome dell'autore (SignPath e OSSign mostrerebbero il proprio nome come editore) e che evita SmartScreen e il blocco di Smart App Control. Gli exe setup/portable su GitHub restano non firmati, con l'avviso dichiarato.

**Conseguenze.** Il build non firmato (`npm run dist`) resta invariato; un test verifica che le config firmate mantengano fuse, file e target. La reputazione SmartScreen si costruisce comunque nel tempo, per hash del file.
