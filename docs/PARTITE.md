<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Partite con la chat

Lo streamer gioca CON la chat: una custom, un quiz, una lobby. Chi vuole
giocare si mette in fila (`!gioco`), lo streamer sceglie chi gioca a ogni
manche, dice com'è andata (`!vince @primo @secondo`) e le monete arrivano da
sole secondo lo schema scelto. Una partita è una serata di manche.

Codice: `src/features/partite.js`. Porte: i comandi (registrati in
`comandi-registro.js`, modulo `partite`, rinominabili), le rotte
`/api/streamer/partita` e `/api/streamer/partita/:mossa` del server, la carta
«Partite con la chat» nella scheda Giveaway del pannello. Prova:
`test/unita/partite.test.mjs`.

## Chi comanda

Sempre lo streamer. I moderatori solo se lui accende «Anche i moderatori
possono comandarla» (`regole.staff`): in chat e dal pannello, se sono
moderatori delegati. Un moderatore non può accenderlo né spegnerlo: il server
tiene il valore dello streamer quando apre o cambia le regole un moderatore.

## Il modello

Una partita per canale, salvata in `statoVivo` (`partita`) a ogni mossa, come
il giveaway: un riavvio a metà serata non si porta via fila e conti. Una
dimenticata per più di due giorni non si riprende.

```
partita = { nome, aperta, creata, regole, fila: [{ user, display, nick, ts, ricevuta }],
            manche: [{ n, giocatori, esito: [user…] | null, dati: [{ user, monete }] }] }
regole  = { costo, nick, max, soloSub, staff, punti: [p1, p2, …], partecipazione, rotazione }
```

## Gli invarianti

- una persona è al massimo una volta in fila, e chi gioca la manche aperta non
  è in fila: esce quando è scelto, e con la rotazione torna in fondo quando la
  manche si chiude, senza pagare di nuovo;
- una manche aperta alla volta: scegliere prima dell'esito è un errore detto;
- l'esito accetta solo chi giocava; le monete date restano scritte nella
  manche, e «annulla» toglie esattamente quelle e riapre la manche. Annullare
  una manche senza esito rimette i giocatori in testa alla fila, nell'ordine;
- il costo è una posta (tutto o niente) pagata entrando; la ricevuta resta
  nella riga della fila e torna coi suoi lotti a chi esce senza aver giocato e
  a chi è in fila alla fine. Chi è stato scelto l'ha spesa;
- le monete si muovono solo da `economia.js` (`dai` «giochi», `punta`,
  `rendi`, `togli`).

## Cosa si dice in chat

Le frasi stanno in `partite.FRASI`: le usano i comandi e il pannello, con i
nomi dei comandi come li ha scelti lo streamer. Chi entra in fila non riceve
risposta (in una chat piena sarebbe un muro); la riceve se qualcosa non va.

## Fuori da questo giro

La fila e la classifica nell'overlay, le squadre, i formati salvati, le azioni
della partita nei Moduli. I punti canale di Twitch non si regalano dall'API:
i premi sono le monete del canale.
