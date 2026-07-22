# Studio UI — "Moduli" (automazioni componibili)

> Documento di design. Obiettivo: dare allo streamer **libertà totale** di creare
> automazioni ad hoc, in modo **intuitivo** per un umano, dentro il linguaggio visivo
> già esistente della dashboard (niente stile "generato", coerenza con `.carta`, `.btn`,
> `.badge`, `--primary`).

## 1. Modello mentale: QUANDO → SE → ALLORA

Le persone capiscono le automazioni come regole in linguaggio naturale. Ogni modulo è:

> **QUANDO** succede una cosa, **SE** (facoltativo) valgono certe condizioni, **ALLORA**
> il bot fa una o più azioni.

È lo stesso schema mentale di Nightbot / IFTTT / Zapier: nessun gergo tecnico, nessun
"nodo" astratto. Tre blocchi, in italiano, letti dall'alto in basso.

Non usiamo le parole "trigger/condition/action" nell'interfaccia: usiamo **QUANDO / SE /
ALLORA**. Ogni modulo mostra in lista un riassunto in una riga:
`QUANDO scrivono !social → invia un messaggio`.

## 2. Principi

1. **Progressive disclosure.** Si parte semplice (nome + QUANDO + un'azione). Le condizioni
   e le azioni extra sono nascoste dietro "+ Aggiungi", così un comando base si crea in 15
   secondi ma la potenza è tutta lì sotto.
2. **Parti da un esempio.** Chi non sa da dove iniziare sceglie un **modello pronto**
   (saluto, timer, social, contatore morti, "collega il mio bot"): riempie il modulo e lo
   può modificare. Foglio bianco = paralisi; il modello lo evita.
3. **Le variabili sono cliccabili, non da ricordare.** Sotto ogni campo di testo c'è una
   fila di "pillole" (`$user`, `$args`, `$uptime`…): un clic le inserisce nel punto giusto.
   Nessuno deve imparare una sintassi a memoria.
4. **Sempre riassunto in italiano.** Mentre costruisci, in cima all'editor compare la frase
   "QUANDO … SE … ALLORA …" che si aggiorna: vedi *cosa farà* prima di salvare.
5. **Prova prima di fidarti.** Ogni modulo ha "Prova": lo esegue una volta lì per lì
   (contesto = te), così vedi il risultato in chat/overlay senza aspettare un vero evento.
6. **Libertà con reti di sicurezza.** L'azione **Webhook** apre a qualunque logica esterna
   (il bot custom che già hai): la tua logica resta sul tuo server e SocialBot ne pubblica la
   risposta. Così "libertà totale" senza eseguire codice altrui sul server condiviso.

## 3. Architettura della scheda "Moduli"

```
┌ Scheda: Moduli ────────────────────────────────────────────┐
│ (carta) Introduzione + [ + Nuovo modulo ]                  │
│         modelli pronti: [Saluto][Timer][Social][Contatore] │
│                         [Collega il mio bot ↗]             │
│                                                            │
│ (carta) I tuoi moduli                                      │
│   • [toggle] Nome — "QUANDO … → …"   [Prova][Modifica][⋯]  │
│   • [toggle] …                                             │
│                                                            │
│ (editor, appare inline quando crei/modifichi)              │
│   Nome: [__________]                                       │
│   ┌ QUANDO ─ accento viola ─────────────────────────────┐ │
│   │ [tipo ▾]  + campi contestuali                        │ │
│   └──────────────────────────────────────────────────────┘ │
│   ┌ SE (facoltativo) ───────────────────────────────────┐ │
│   │ chi può [▾]  cooldown [__]s  probabilità [__]%       │ │
│   │ [+ Aggiungi condizione]                              │ │
│   └──────────────────────────────────────────────────────┘ │
│   ┌ ALLORA ─ accento viola ─────────────────────────────┐ │
│   │ ① Scrivi in chat: [textarea]  [× rimuovi]            │ │
│   │    pillole: $user $args $touser $uptime $game …      │ │
│   │ ② …                                                  │ │
│   │ [+ Aggiungi azione ▾]                                │ │
│   └──────────────────────────────────────────────────────┘ │
│   riassunto: "QUANDO … SE … ALLORA …"                      │
│   [Salva]  [Prova]  [Annulla]                              │
│                                                            │
│ (carta) Connettori avanzati                                │
│   Chiave API in ingresso: [••••••] [Mostra][Rigenera][Copia]│
│   URL: https://bot.andryxify.it/api/ext/<login>            │
│   esempio d'uso (curl) — per far dire/fare cose da un tuo   │
│   servizio esterno.                                        │
└────────────────────────────────────────────────────────────┘
```

## 4. QUANDO — i tipi di innesco (linguaggio umano)

| Voce nel menu | Campi contestuali |
|---|---|
| **Un comando in chat** (`!nome`) | comando (senza `!`) + alias facoltativi |
| **Una parola/frase in chat** | testo + modo: *contiene · è esatto · inizia con* |
| **Un evento del canale** | evento: nuovo follow · sub/resub · raid · bits/cheer · riscatto punti · primo messaggio di un utente · sei andato in live · fine live |
| **A tempo (timer)** | ogni N minuti · e/o solo se sono passati almeno N messaggi |
| **Manuale / da un mio servizio** | (nessun campo: si attiva dal bottone "Prova" o via API in ingresso) |

## 5. SE — condizioni (tutte facoltative)

- **Chi può attivarlo:** tutti · sub · VIP · mod (riusa la stessa scala degli Effetti).
- **Cooldown:** secondi minimi tra un'attivazione e l'altra.
- **Probabilità:** % (per interventi non sempre uguali).
- **Solo se in live / solo se offline.**
- (avanzata) **Contatore**: attiva solo se un contatore è >/< di un valore.

## 6. ALLORA — azioni (in sequenza, riordinabili con ↑/↓)

| Azione | Campi |
|---|---|
| **Scrivi in chat** | testo (con variabili) |
| **Fai partire un effetto** | quale effetto (menu con gli effetti già caricati) |
| **Contatore** | nome · incrementa / azzera / imposta a N |
| **Chiama un webhook** | URL (https) · "usa la risposta `{reply}` come messaggio in chat" |
| **Aspetta** | N secondi (prima dell'azione successiva) |
| **Mostra testo sull'overlay** | testo · durata |
| **Timeout in chat** (moderazione) | secondi (per moduli anti-spam) |

Riordino con frecce ↑/↓ (niente drag & drop: più robusto e accessibile).

## 7. Variabili (pillole cliccabili + legenda breve)

`$user` chi ha attivato · `$touser` primo argomento o, se assente, `$user` ·
`$args` tutto il testo dopo il comando · `$arg1 $arg2 …` singole parole ·
`$canale` · `$uptime` da quanto è live · `$gioco` · `$titolo` ·
`$count(nome)` valore di un contatore · `$random(1,100)` · `$pick(a|b|c)` a caso.
Per gli eventi: `$raider $viewers` (raid), `$mesi` (sub), `$bits` (cheer), `$premio`
(riscatto punti).

## 8. Copy & tono

Italiano, caldo ma asciutto, coerente con le altre schede ("Insegnagli qualcosa",
"La memoria del bot"). Titoli con una emoji sobria. Errori gentili via `toast`. Empty
state incoraggiante: *"Nessun modulo ancora: parti da un modello qui sopra 👆"*.

## 9. Componenti nuovi da aggiungere allo stile (coerenti con l'esistente)

- `.modulo` — riga in lista: toggle + nome + riassunto + azioni. Bordo come `.carta`.
- `.blocco-quando`, `.blocco-se`, `.blocco-allora` — riquadri con barra-accento a
  sinistra in `var(--primary)`; etichetta in maiuscoletto.
- `.azione-riga` — sotto-scheda di un'azione con icona-tipo, campi, ↑/↓ e ×.
- `.chip-var` — pillola monospace cliccabile per inserire una variabile.
- `.riassunto-modulo` — frase viva che si aggiorna.
- `.modello-pronto` — bottoncini dei modelli.

Riuso il più possibile: `.carta`, `.btn(.secondario/.mini/.pericolo/.grande)`, `.badge`,
`.campo`, `.suggerimento`, `.griglia-campi`, `.interruttore`, `.riga-check`.

## 10. Contratto API (per l'implementazione)

- `GET /api/streamer/moduli` → `{ moduli:[…], effettiDisponibili:[…], apiKey|null, apiUrl }`
- `POST /api/streamer/moduli` (body con `id?` per modifica) → `{ ok:true, id }`
- `DELETE /api/streamer/moduli/:id` → `{ ok:true }`
- `POST /api/streamer/moduli/:id/prova` → esegue una volta → `{ ok:true }`
- `POST /api/streamer/apikey` (rigenera) → `{ apiKey }`
- Ingresso esterno: `POST /api/ext/:login` con `Authorization: Bearer <apiKey>` →
  body `{ azione:'messaggio'|'effetto'|'modulo', testo?|comando?|modulo? }`.
