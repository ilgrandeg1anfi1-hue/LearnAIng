# Progresso

Piano completo: `C:\Users\ilgra\.claude\plans\pasted-content-id-31c7-voglio-progettar-sparkling-mist.md` (sintesi in `docs/ARCHITECTURE.md`).

## Fase corrente
**Nome app: LearnAIng** (rinominata il 2026-11-20 da "AI Research & Learning": appId `app.learnaing.desktop`, export `.learnaing`).

**Fase 1 — Storage, chat UI, i18n: completata** (tag `v0.1.0-fase1`, 2026-11-20). Prossima: **Fase 2 — Provider reali e API key**.

**Distribuzione firmata: Microsoft Store** (deciso il 2026-11-20 dopo il rifiuto di SignPath; ADR 006). Exe setup/portable su GitHub non firmati. Passi in "Firma del codice" → Microsoft Store. Identità Partner Center in `signing/store.yml`; installazione MSIX verificata in CI (vedi "Verifica pacchetto Microsoft Store"). **Prima dell'invio: versione ≥ 1.0.0 e icone** (vedi "Problemi aperti").

**Bypass temporaneo firma (deciso il 2026-11-20, finché non arriva la firma):** in locale la verifica di fine fase usa `npm run dist:local` (solo exe portable) al posto di `npm run dist`, perché Smart App Control blocca il passo NSIS (electron-builder esegue l'installer non firmato per generare l'uninstaller → `spawn UNKNOWN`). Setup NSIS + portable restano costruiti in CI (`release.yml`, runner senza SAC). Quando arriva la firma: tornare a `npm run dist` in locale e togliere la nota da `CLAUDE.md`.

## Completato (Fase 1)
- SQLite (`node:sqlite`) in `src/main/store.ts`: migrazioni versionate con `PRAGMA user_version`, ognuna in transazione col bump di versione; rifiuto di DB scritti da versioni più nuove (niente apertura "vuota" al loro posto). Tabelle `chats`, `messages` (FK con `ON DELETE CASCADE`, ruolo vincolato), `settings`. ADR 007.
- Cartella dati: installato → `%APPDATA%\LearnAIng`; portable → `LearnAIng-data` accanto all'exe (`PORTABLE_EXECUTABLE_DIR`, anche il profilo Chromium); solo da non impacchettato `LEARNAING_DATA_DIR` (usato dagli E2E). File `learnaing.db`.
- IPC (tutti via `handle()`, validatori in `security.ts`): `chats:list/create/rename/delete`, `messages:list/send`, `settings:get/set` (chiavi e valori in whitelist). Titoli ≤ 200, messaggi ≤ 100.000 caratteri.
- Provider finto `echo` (`src/main/echo.ts`, async generator come i provider futuri); risposta salvata e restituita a fine generazione (lo streaming verso la UI arriva con i provider reali).
- UI: sidebar con cronologia (rinomina in linea, elimina con conferma), area messaggi, composer (Invio invia, Maiusc+Invio a capo, IME rispettato), tema Sistema/Chiaro/Scuro via `nativeTheme.themeSource` + CSS `light-dark()`, identità "quaderno di studio" (serif Sitka per le risposte, evidenziatore per le domande).
- Markdown: `marked` + DOMPurify; i link aprono il browser solo tramite il gestore `window.open` del main (conferma, solo http(s)); immagini remote bloccate dalla CSP.
- i18n IT/EN: dizionari JSON in `src/shared/locales/`, `translate()` condivisa da main (dialoghi) e renderer. Traduzione inglese fatta da un subagent Haiku; un test verifica chiavi e segnaposto. Lingua predefinita dal locale di sistema finché non scelta.
- Test: 21 unit (migrazioni, repository, validatori, i18n), 3 E2E (crea chat → riavvio → presente, continua, rinomina, lingua e tema persistenti, elimina persistente; markdown sanitizzato; baseline di sicurezza). Gli E2E falliscono su qualsiasi errore non gestito nel renderer.
- Bug trovato dagli E2E: in Electron 45 `scrollIntoView()` restituisce una Promise; un effetto React a freccia la restituiva come cleanup e smontava l'intera UI. Corretto (corpo a blocco, commento nel codice).
- Versione 0.1.0. Verifica: `lint`, `test`, `test:e2e`, `dist:local` verdi; fuse invariati, CSP di produzione senza `unsafe`, `npm audit` invariato (6 moderate note).

## Completato (Fase 0)
- Repo git (`main`), hook gitleaks in `.githooks/pre-commit` (attivato da `npm install` via `prepare`).
- Scaffold Electron 45.4.1 + electron-vite 6 + React 19 + TS 6, baseline di sicurezza completa (vedi `docs/SECURITY.md`).
- IPC: helper `handle()` in `src/main/index.ts` (mittente + validazione); unico canale `app:version`.
- ESLint (+ `tsc --noEmit`), Vitest (3 test su `src/main/security.ts`), Playwright E2E (finestra, IPC, niente `require`/`process`, CSP, navigazione e `window.open` bloccati).
- CI GitHub Actions su windows-latest: lint, test, `npm audit --audit-level=high`.
- electron-builder: `dist/ai-research-learning-0.0.0-setup.exe` e `dist/ai-research-learning-0.0.0-portable.exe`.
- ADR 001–005; `node:sqlite` con FTS5 confermato (ADR 005).

## Verifica exe portable Fase 1 (2026-11-20, prima del push)
Nessuna VM disponibile su questo PC (niente Windows Sandbox, Hyper-V, VirtualBox, VMware; hypervisor non attivo). Verifica fatta sull'exe portable reale, smontato, senza modificare SAC né altre impostazioni di Windows:
- Contenuto: `app.asar` estratto dall'exe (7-Zip) identico a `win-unpacked`, contiene solo `out/` + `package.json` + dipendenze di produzione. Hash d'integrità dell'asar incorporato nell'exe = hash reale (altrimenti l'exe crasherebbe all'avvio). Fuse invariati.
- Esecuzione dell'asar estratto sull'Electron ufficiale con `PORTABLE_EXECUTABLE_DIR` come il launcher: `userData` e `learnaing.db` in `<cartella exe>\LearnAIng-data` (anche il profilo Chromium; nient'altro accanto all'exe), versione e titolo corretti, chat e messaggi presenti dopo 2 riavvii e continuabili, nessun journal residuo, zero errori di renderer (pageerror/console) e main (stderr). Ripetuto con cartella contenente spazi, accenti e caratteri CJK.
- **Bug trovato e corretto:** exe portable in una cartella dove `LearnAIng-data` non si può creare (sola lettura, Program Files, share) → eccezione al caricamento del main, stack trace tecnico. Ora passa dal messaggio tradotto "Impossibile aprire il database…" (anche su stderr) ed esce con codice 1. Test di regressione `e2e/startup.spec.ts` (fallisce sul codice vecchio). Limite: in quel caso Chromium crea comunque il suo profilo in `%APPDATA%\LearnAIng` prima dell'uscita.
- E2E di persistenza ora su una cartella dati con spazi, accenti e CJK.
- Exe reale su questo host: **bloccato da Smart App Control** (CodeIntegrity 3077 + 3118), nessun processo avviato. Build verificata: portable SHA256 `B0F25CF818E3BE01BC58364FC082F6466F9EA945835D4FF69967F363309540CC`.
- **Non verificabile qui:** avvio dell'exe vero (launcher NSIS, estrazione in `%TEMP%`, impostazione di `PORTABLE_EXECUTABLE_DIR`, controllo d'integrità asar a runtime, fuse attivi a runtime) su Windows pulito. Da fare in VM: copiare l'exe in una cartella, avviarlo, controllare `LearnAIng-data\learnaing.db`, creare una chat, chiudere, riaprire, controllare la chat; DevTools da menu Visualizza per gli errori del renderer.
- Nota: le dipendenze runtime (`react`, `marked`, `dompurify`, `@types/trusted-types`) finiscono anche in `node_modules` dell'asar pur essendo già nel bundle del renderer: solo spazio, nessun errore.

## Verifica exe portable reale in CI (2026-11-20)
Tag locale `v0.1.1-fase1` su `351db2e` (non pushato; `package.json` resta `0.1.0`). Branch `verify/portable-exe`, workflow `.github/workflows/portable.yml` (solo quel branch, nessun upload né release): build dell'exe portable sul runner e avvio dell'**exe vero** con `e2e/portable.spec.ts` (saltato senza `PORTABLE_EXE`).
- Guida via CDP (`--remote-debugging-port`), perché i fuse disattivano `--inspect` richiesto da `_electron.launch`. Exe copiato in una cartella con spazio e accenti.
- Controlli: launcher vivo finché l'app gira; tutti i processi `LearnAIng.exe` sotto `%TEMP%` con `resources\app.asar`; titolo e `v0.1.0` (preload + IPC); chat creata; `LearnAIng-data\learnaing.db` presente; chiusura finestra → exit code 0; cartella di estrazione rimossa; accanto all'exe solo exe + `LearnAIng-data`; niente `%APPDATA%\LearnAIng`; DB letto con `node:sqlite` (1 chat, 2 messaggi); riavvio → chat presente e apribile; zero `pageerror`/console error/crash renderer; log Chromium (`--enable-logging=file`, copre anche il caricamento) senza righe CONSOLE/FATAL; nessun evento WER 1000/1001.
- **Esito run 44756181009: superato** (28 s), Windows Server 2025 (`windows-2025-vs2026`). SHA256 exe: `cc2c5d43690a07d5ab27c5e4435cf2aaf54ab475079477728901ba499c3364f9`. Log Chromium: solo `GetGpuDriverOverlayInfo: Failed to retrieve video device` (runner senza GPU). CI (`check`, `secrets`) verde sullo stesso push.
- Limiti: Windows Server, non Windows 11 client; utente amministratore; exe costruito sul runner, quindi niente Mark of the Web, SmartScreen né Smart App Control; Electron in rendering software.

## Verifica pacchetto Microsoft Store (MSIX) in CI (2026-11-20)
Identità da Partner Center in `signing/store.yml` (non segreti): `ginafi.LearnAIng`, `CN=BB687092-540B-4E7F-80F7-703E81CC06CA`, `ginafi`. Branch `verify/store-msix`, workflow `.github/workflows/msix.yml` (solo quel branch, nessun upload né release), test `e2e/store.spec.ts` (saltato senza `STORE_PACKAGE`).
- Manifest generato (`npm run dist:store`): `Identity` con i tre valori, `Version="0.1.0.0"`, `DisplayName` `LearnAIng`, `Application Id="LearnAIng"` → `app\LearnAIng.exe` (`Windows.FullTrustApplication`), unica capability `runFullTrust`, lingue it-IT/en-US, `Windows.Desktop` con MinVersion = MaxVersionTested `10.0.14316.0` (default di electron-builder), loghi di default. Pacchetto non firmato ("Windows Store only build"): lo firma lo Store alla pubblicazione.
- In CI una **copia** del pacchetto è firmata con un certificato usa e getta con subject = `Publisher` del manifest, attendibile solo sul runner (`LocalMachine\TrustedPeople`). Il pacchetto da caricare resta quello non firmato.
- Controlli: `Add-AppxPackage` riuscito; nome, publisher e versione installati corretti; avvio con l'identità del pacchetto tramite `IApplicationActivationManager` (come dal menu Start, ma con gli argomenti per CDP); tutti i processi `LearnAIng.exe` dalla cartella d'installazione in `WindowsApps`; titolo e `v0.1.0`; chat creata; **database in `%LOCALAPPDATA%\Packages\ginafi.LearnAIng_7w4y18hnkbspt\LocalCache\Roaming\LearnAIng\learnaing.db`** (le scritture in `%APPDATA%` sono reindirizzate), nulla nel vero `%APPDATA%\LearnAIng`; DB letto con `node:sqlite` (1 chat, 2 messaggi); riavvio → chat presente e apribile; zero `pageerror`/console error/crash, log Chromium senza righe CONSOLE/FATAL, nessun evento WER; `Remove-AppxPackage` → pacchetto rimosso e **cartella dati del pacchetto cancellata, database compreso**.
- **Esito run 44779469360: superato** (test 17 s), Windows Server 2025 (`windows-2025-vs2026`, immagine 20261116.315.1). SHA256 appx costruito in CI (non firmato): `f48462450f0cea0cd3d11a3831a979760eed7209b278607ece6a7c2d20dab8ee`. Build locale dello stesso commit: `AFCCFD5295B91EB47D4046969EB51218A7B0ED37964C42A33C2FA9676B4A0155` (le build non sono identiche bit a bit). Log Chromium: solo `GetGpuDriverOverlayInfo` (runner senza GPU). CI (`check`, `secrets`) verde sullo stesso push.
- Primo tentativo (run 44779042072) fallito per un errore del test, non dell'app: in PowerShell il cast a un'interfaccia COM non esegue `QueryInterface`; il cast ora è in C#. Installazione e identità erano già passate.
- Limiti: Windows Server, non Windows 11 client; utente amministratore; firma di test, non quella dello Store; niente Windows App Certification Kit; non provati l'aggiornamento da una versione precedente né la convivenza con l'installazione NSIS (secondo la documentazione Microsoft un file già presente nel vero `%APPDATA%` viene aperto e modificato lì: le due installazioni userebbero lo stesso DB).

## Prossimi passi (Fase 2)
- Provider reali (`openai-compatible`, `anthropic`) con `fetch` + SSE, stessa forma di `echo`; streaming verso la UI (evento dal main + annullamento).
- API key cifrate con `safeStorage`, mai al renderer; test "nessuna chiave in IPC/log/export".
- `security-review` prevista in Fase 2.

## Problemi aperti
- Avvio dell'exe portable vero: **verificato in CI** su Windows Server 2025 (vedi "Verifica exe portable reale in CI"). Restano non verificati Windows 11 client, SmartScreen/Smart App Control e il setup NSIS.
- Branch `verify/portable-exe` non ancora unito a `main` (anche `ca3c743` e `351db2e` sono su GitHub solo tramite quel branch). Da esso deriva `verify/store-msix` (identità Store, test MSIX), anch'esso non unito.
- **Microsoft Store, bloccante per l'invio: versione `0.1.0`.** Secondo i requisiti dei pacchetti MSIX (Microsoft Learn, "App package requirements") la prima sezione della versione non può essere 0 e la quarta deve restare 0. electron-builder ricava la versione del pacchetto solo da `package.json` (nessuna opzione appx separata). Decisione rinviata all'utente: portare `package.json` a ≥ 1.0.0 per il primo invio (consigliato, una sola versione ovunque) oppure sovrascrivere la versione solo nel build Store.
- **Microsoft Store, prima dell'invio: icone.** Il pacchetto contiene i loghi di default di electron-builder; servono asset propri in `build/appx/` (`StoreLogo.png`, `Square44x44Logo.png`, `Square150x150Logo.png`, `Wide310x150Logo.png`).
- **Microsoft Store: disinstallare cancella i dati** (verificato in CI). Va detto all'utente e serve l'export prima della pubblicazione.
- MinVersion/MaxVersionTested `10.0.14316.0` (default di electron-builder): nessun requisito dello Store trovato in proposito; rivedere (`appx.minVersion`/`maxVersionTested`) se la certificazione lo segnala.
- Due istanze dell'app aprono lo stesso DB (nessun single-instance lock): SQLite regge, ma le liste non si aggiornano tra finestre. Da valutare se serve.
- **Smart App Control blocca gli exe anche firmati self-signed.** Prova del 2026-11-20 con il certificato `CN=AIRL Dev Self-Signed` (SHA1 `549A01348EE3BCCD0BF399DC17E45DCB0043DB24`, chiave non esportabile in `Cert:\CurrentUser\My`, importato in `CurrentUser\Root` e `TrustedPublisher`): il log CodeIntegrity riporta `KnownRoot=2`, `VerificationError=18`. SAC accetta solo radici del programma Microsoft. Un primo exe firmato era partito per il verdetto di reputazione cloud di Defender, non per la firma; la build successiva (hash diverso) è stata bloccata. Quindi: la firma self-signed è inutile per SAC. Per avviare gli exe su questo PC serve una CA riconosciuta (es. Azure Trusted Signing, certificato OV) oppure testarli su un altro PC/VM. Il pacchetto `app.asar` è verificato con l'Electron firmato.
  Build firmata (solo su questo PC; la cache di electron-builder va disattivata, altrimenti riusa un exe firmato in precedenza ignorando i cambi ai fuse), in PowerShell:
  `npm run build; $env:ELECTRON_BUILDER_DISABLE_BUILD_CACHE='true'; npx electron-builder --win "-c.win.signtoolOptions.certificateSha1=549A01348EE3BCCD0BF399DC17E45DCB0043DB24"`
  Per togliere la fiducia al certificato: `certmgr.msc` → Autorità di certificazione radice attendibili e Autori attendibili → elimina "AIRL Dev Self-Signed".
  **Pulizia completata (2026-11-20):** certificato rimosso da `CurrentUser\Root` e `CurrentUser\TrustedPublisher` (verificato; assente anche dagli store `LocalMachine`). Resta in `CurrentUser\My` con la chiave di firma, non attendibile. Le firme degli exe in `dist/` risultano ora non verificabili (`UnknownError`), come previsto.
  **Verifica avvio exe: superata (2026-11-20)** in macchina virtuale: dopo l'avviso SmartScreen (autore sconosciuto → "Esegui comunque") l'app mostra titolo e `v0.0.0`, quindi preload e IPC funzionano nell'exe impacchettato. La persistenza delle chat è coperta solo dall'E2E (non c'è ancora UI chat). Build testata (SHA256): portable `CCBF4D2457E4BC26A6C778F32423FF4E5082A3D2357860000C96DEA689EC727F`, setup `C1EABF5DFC3B3B375EA2B9997370BEE43AA06256CB9EBC86B3B73E0D6813E801`.
- `npm audit`: 6 vulnerabilità moderate in `electron-builder` (minimatch via `@electron/universal`, solo build). Nessuna alta; la CI fallisce solo da `high` in su.
- Nessuna icona applicazione (usata quella di Electron).
- GitHub secret scanning e push protection: **attivi** dal 2026-11-20 (gratuiti con il repo pubblico), in aggiunta a gitleaks (hook locale e job `secrets` in CI).
- Advisory moderate di `minimatch` (via `app-builder-lib`, `@electron/universal`): non corrette di proposito. Solo build, glob dalla nostra config (ReDoS non sfruttabile); forzare il salto di major rischierebbe di rompere electron-builder. Ricontrollare a ogni aggiornamento di electron-builder.

## Firma del codice (2026-11-20)
**Causa di "Autore sconosciuto":** gli exe non hanno una firma Authenticode emessa da una CA riconosciuta (Microsoft Trusted Root Program). Metadati, fuse o configurazione Electron non c'entrano: senza certificato commerciale l'avviso resta. Anche con firma valida SmartScreen può avvisare finché il file non accumula reputazione (per hash; dal 2024 EV e OV sono trattati allo stesso modo).

**Confronto (verificato 2026-11-20, documentazione Microsoft e listini rivenditori):**
| | Azure Artifact Signing (ex Trusted Signing) | Certificato OV/IV |
|---|---|---|
| Costo | Basic ~9,99 $/mese (5.000 firme), Premium ~99,99 $/mese; fatturato per intero dalla creazione dell'account; serve abbonamento Azure a pagamento | ~100–250 €/anno a seconda della CA (Certum, SSL.com, Sectigo); prezzi da confermare sul sito della CA |
| Italia, persona fisica | **No**: Public Trust per individui solo USA e Canada | **Sì** (validazione individuale, documento d'identità) |
| Italia, organizzazione | Sì (UE); validazione 1–30 giorni lavorativi, sito e email su dominio dell'entità | Sì |
| Chiave | HSM Microsoft, certificati a breve durata gestiti dal servizio | HSM obbligatorio (token USB o cloud del fornitore, es. Certum SimplySign, SSL.com eSigner) |
| electron-builder | `win.azureSignOptions` (installa il modulo PowerShell `TrustedSigning` da PSGallery al build) | `win.signtoolOptions` (`certificateSubjectName`/`certificateSha1` dallo store Windows) |
| Firma in CI | Sì (credenziali Entra ID in variabili d'ambiente) | Di solito solo locale (login con OTP sul telefono) |

**Raccomandazione:** come persona fisica in Italia → certificato OV/IV con chiave RSA in cloud HSM (es. Certum o SSL.com). Azure solo se in futuro si opera come organizzazione (da verificare se una ditta individuale con P.IVA è accettata come "organizzazione": non confermato).

**Implementato (gratis):**
- `signing/ov.yml` e `signing/azure.yml`: estendono `electron-builder.yml` (fuse, file, target identici), `forceCodeSigning: true` (il build fallisce invece di produrre exe non firmati). Verificato: `npm run dist:ov` senza certificato si ferma con "Cannot find certificate" e non scrive exe.
- Script `npm run dist:ov`, `npm run dist:azure`, `npm run verify:signature` (`scripts/verify-signature.ps1`: fallisce se un exe in `dist/` non ha firma `Valid` con timestamp; oggi segnala correttamente gli exe self-signed come `UnknownError`).
- Test `src/main/signing-config.test.ts`: le config firmate passano la validazione di electron-builder e mantengono le protezioni della base.
- ADR 006.

**Strade gratuite (budget zero, 2026-11-20):**
1. **Microsoft Store (scelta definitiva il 2026-11-20 dopo il rifiuto di SignPath, implementata).** Registrazione sviluppatore individuale gratuita (identità con documento e selfie). Il pacchetto MSIX viene firmato da Microsoft: niente "Autore sconosciuto", niente blocco Smart App Control, aggiornamenti automatici, repo resta privato. Limite: vale solo per chi installa dallo Store; exe setup/portable distribuiti fuori dallo Store restano non firmati.
   - `signing/store.yml` + `npm run dist:store` → `dist/learnaing-<versione>-store.appx` (build verificata, fuse letti dall'exe: identici alla base).
   - Bug di electron-builder trovato: il nome dell'eseguibile non è escapato nel manifest AppX, la `&` del productName lo rendeva invalido (`0x80080204`). Risolto prima con `executableName`, poi reso superfluo dal nuovo nome senza `&` (il test impedisce di reintrodurre caratteri non sicuri).
   - Installazione, avvio, database, persistenza e disinstallazione: **verificati in CI** (vedi "Verifica pacchetto Microsoft Store"). Non eseguito il Windows App Certification Kit (non installato): lo verificherà la certificazione dello Store.
   - Passaggi: account su https://partner.microsoft.com (tipo Individual) → riserva il nome dell'app → copia da "Identità app" `Package/Identity/Name`, `Publisher` e `PublisherDisplayName` in `signing/store.yml` (**fatto il 2026-11-20**) → `npm run dist:store` → carica l'appx con privacy policy (obbligatoria: l'app contatta provider AI) e screenshot. Prima dell'invio: versione ≥ 1.0.0 e icone (vedi "Problemi aperti").
   - Dati in MSIX: `learnaing.db` finisce in `%LOCALAPPDATA%\Packages\<famiglia pacchetto>\LocalCache\Roaming\LearnAIng` ed è cancellato alla disinstallazione (verificato in CI). Restano da fare l'avviso all'utente e l'export.
   - Rischio: con il solo provider `echo` la certificazione può rifiutare l'app per mancanza di funzionalità; inviarla dopo la Fase 2. Account e prenotazione del nome si possono fare subito.
2. **SignPath Foundation: richiesta rifiutata (2026-11-20).** Avrebbe comunque mostrato "SignPath Foundation" come editore, non l'autore. Alternativa simile valutata e scartata: OSSign (gratis, ma editore "Cloudyne Systems", binario costruito nel loro repo, candidature sospese a settembre 2026 secondo un progetto terzo). Repo resta pubblico con licenza MIT.
3. **Senza firma:** l'avviso resta. Mitigazioni gratuite: per i propri PC copiare l'exe senza scaricarlo dal browser (niente Mark of the Web, niente SmartScreen; Smart App Control blocca comunque), oppure inviare l'exe a Microsoft (https://www.microsoft.com/wdsi/filesubmission) per la reputazione, da rifare a ogni versione.
- Nota: la prima prova di `dist:store` (target concatenati) ha rigenerato anche setup e portable in `dist/` **non firmati**: gli hash della build testata in VM, riportati sopra, non corrispondono più ai file presenti.

**SignPath, preparazione (2026-11-20):** aggiunti `README.md`, `PRIVACY.md`, `CODE_SIGNING_POLICY.md` (in inglese, per i revisori SignPath; rimosso dopo il rifiuto) e il workflow `.github/workflows/release.yml`: un tag `v*` esegue lint, test, E2E, build su runner pulito e pubblica una pre-release con `SHA256SUMS.txt`. Le release si costruiscono solo in CI.
- **Build NSIS locale bloccata da Smart App Control** (2026-11-20): electron-builder esegue l'installer non firmato appena generato per estrarre l'uninstaller → `spawn UNKNOWN`, CodeIntegrity evento 3077 su `dist/learnaing-0.0.0-setup.exe`. Le build precedenti passavano per reputazione cloud degli hash. Locale funzionano ancora `npm run test:e2e` e `npm run dist:store`; setup/portable solo in CI (o con exe firmato).
- MFA su GitHub resta consigliata (non più un requisito).

**Passaggi quando si acquista (OV/IV):**
1. Scegliere la CA, chiedere certificato **RSA** con firma in cloud o token; completare la validazione.
2. Installare lo strumento del fornitore (es. SimplySign Desktop) ed effettuare il login: il certificato compare in `Cert:\CurrentUser\My`.
3. In `signing/ov.yml` sostituire `REPLACE_WITH_CERTIFICATE_CN` con il CN del certificato.
4. `$env:ELECTRON_BUILDER_DISABLE_BUILD_CACHE='true'; npm run dist:ov; npm run verify:signature`.
5. Provare l'exe su un PC pulito: deve mostrare l'editore verificato; l'avviso SmartScreen può restare per le prime versioni.

**Passaggi per Azure (solo organizzazione):** account Azure a pagamento → risorsa Artifact Signing (es. West Europe) → validazione identità → profilo certificato Public Trust → app registration con ruolo "Artifact Signing Certificate Profile Signer" → compilare `signing/azure.yml` → `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` nell'ambiente → `npm run dist:azure; npm run verify:signature`. `dist:azure` non è stato eseguito (scaricherebbe il modulo da PSGallery senza account).

## Security review Fase 0 (2026-11-20)
Revisione manuale di tutto il codice (la skill `security-review` analizza solo diff verso `origin`, qui vuoto).
- **Corretto**: l'exe impacchettato accettava `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` e `--inspect` (runtime Node firmato riutilizzabile). Aggiunti gli Electron fuses in `electron-builder.yml`; verificato che `ELECTRON_RUN_AS_NODE` non esegue più codice.
- **Corretto**: action della CI fissate per SHA.
- **Rinviato (Fase 7)**: `grantFileProtocolExtraPrivileges` resta attivo perché il renderer è caricato da `file://`; disattivarlo quando si passa al protocollo custom.
- **Nota**: `will-navigate` copre solo il frame principale; oggi la CSP `frame-src 'none'` vieta gli iframe. Con le mini-app (Fase 7) gestire anche `will-frame-navigate`.
- Nessun problema in IPC (`handle()`), preload, permessi, apertura link esterni.

## Verifiche extra (2026-11-20)
- Modalità dev: app aperta con Playwright contro il dev server, versione via IPC visibile, CSS applicato, zero errori in console.

## Repository
- https://github.com/ilgrandeg1anfi1-hue/LearnAIng (**pubblico** dal 2026-11-20, licenza MIT), `main` + tag `v0.0.0-fase0`. Rinominato da `ai-research-learning` (GitHub reindirizza il vecchio URL).
- Prima della pubblicazione: gitleaks su tutta la cronologia e sui file (nessun segreto); email dei commit riscritta in `emailprogrammare@gmail.com` (cronologia e tag riscritti, push forzato). Email impostata nella config git locale del repo.
- Esecuzioni CI dei commit originali cancellate (rimandavano ai commit con la vecchia email). Anche così GitHub può conservare i vecchi commit raggiungibili per SHA esatto: per rimuoverli del tutto serve una richiesta al supporto GitHub.
- CI sul push forzato: `check` verde, `secrets` fallito perché la gitleaks-action scansiona `<primo commit>^..HEAD` e il primo commit del push era la radice (`3434a81^` non esiste). Nessun segreto: scansione completa locale pulita. Si risolve da sola ai push normali.
