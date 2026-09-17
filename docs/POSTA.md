# La posta di casa: il bot è il suo server di posta

Niente servizi esterni. Quando serve una mail (il rapporto di fine diretta,
la conferma di un indirizzo) il bot la manda da sé: cerca gli scambiatori
(MX) del destinatario, si presenta sulla porta 25, alza TLS se il server lo
offre, consegna e chiude. Non c'è un Postfix accanto da tenere in piedi, non
c'è una porta in più aperta (la 25 serve in uscita, non in entrata), e tutto
sta in `src/features/posta.js`: composizione, firma DKIM, consegna.

## Perché la firma

Una mail da un server sconosciuto, senza firma, oggi non arriva: Gmail e gli
altri la mettono in spam o la rifiutano prima di leggerla. Quello che guardano
è scritto nel DNS del dominio mittente: **SPF** (chi può mandare posta per
questo dominio), **DKIM** (la firma della mail, verificata con la chiave
pubblica pubblicata nel DNS), **DMARC** (cosa fare se SPF e DKIM non passano).
E il **reverse DNS** dell'IP del server, che deve tornare al dominio.

## La lista, una volta sola

1. **Porta 25 in uscita.** Hetzner la chiude sui progetti nuovi: si chiede
   dalla console (Limits, oppure un ticket) e la aprono. Finché è chiusa il
   pannello dice «il server non riesce a consegnare posta adesso».
2. **La chiave DKIM.** Sul server: `node scripts/posta-chiave.mjs --ip <IP>`.
   Genera `DATA_DIR/dkim.pem` (2048 bit, permessi del solo padrone, mai nel
   repository né nel database) e stampa i tre record TXT.
3. **I record DNS**, copiati com'è stampati:
   - `socialbot.live` TXT `v=spf1 ip4:<IP> -all`
   - `sb1._domainkey.socialbot.live` TXT `v=DKIM1; k=rsa; p=…`
   - `_dmarc.socialbot.live` TXT `v=DMARC1; p=quarantine; adkim=s; aspf=s`
4. **Reverse DNS** dell'IP del server → `socialbot.live`, dalla console Hetzner
   (rDNS del server).
5. Nel `.env`, solo se serve: `MAIL_DOMINIO` (di serie il dominio di
   `BASE_URL`), `MAIL_DA` (di serie `rapporti@<dominio>`),
   `MAIL_DKIM_SELETTORE` (di serie `sb1`), `MAIL=no` per spegnere.

Senza la chiave la posta è **spenta**: `posta.attiva()` è falso, la scheda
Dirette lo dice e il rapporto arriva su Telegram. Meglio niente che una mail
che parte e sparisce.

## Cosa fa la consegna

`consegna()` prende gli MX in ordine di priorità (o l'host stesso se non ne
ha), prova il primo e passa al successivo solo su errore temporaneo; un rifiuto
permanente (5xx, «nessuna casella») ferma subito. Dialogo: banner, `EHLO`,
`STARTTLS` se offerto (con `EHLO` di nuovo dentro TLS), `MAIL FROM`, `RCPT
TO`, `DATA`, il messaggio con i punti a inizio riga raddoppiati, `QUIT`.
Venti secondi di tempo per passo. Il TLS verso gli MX è opportunistico
(`rejectUnauthorized: false`): i certificati degli scambiatori spesso non
corrispondono al nome, e il rifiuto sarebbe peggio del testo in chiaro che
usano tutti.

Il messaggio è `multipart/alternative` (testo e HTML, in base64), con `Date`,
`Message-ID` sul dominio e l'oggetto in UTF-8 codificato. La firma DKIM è
`rsa-sha256`, canonizzazione `relaxed/relaxed`, sulle intestazioni `from, to,
subject, date, message-id, mime-version, content-type` e sul corpo.

## L'indirizzo dello streamer

Il login non ci dà nessuna mail, e a un indirizzo non verificato non si manda
niente. Nella scheda Dirette lo streamer scrive l'indirizzo: parte una mail
con un tasto, il codice non si conserva (solo il suo calco sha256) e scade in
un giorno; al clic (`GET /posta/conferma?t=…`, pubblica) l'indirizzo diventa
buono e l'interruttore «via mail» si accende. Al più una richiesta ogni dieci
minuti per canale. «Togli» cancella l'indirizzo e spegne il canale mail.

Nella privacy sta scritto: l'indirizzo è facoltativo, serve solo per il
rapporto, resta finché lo streamer non lo toglie.

## Il collaudo

`test/unita/posta.test.mjs`: il messaggio (intestazioni, oggetto UTF-8, le
due parti), la canonizzazione e una firma che la chiave pubblica verifica, la
consegna a un server SMTP finto sulla porta locale (sequenza, punti
raddoppiati, un 550 che ferma, una porta chiusa che spiega), `invia` da capo
a fondo, la posta spenta, il guscio HTML coi colori del tema.
