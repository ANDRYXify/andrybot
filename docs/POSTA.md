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
4. **Reverse DNS** dell'IP del server, dalla console Hetzner. Il nome che
   scegli qui (`mail.socialbot.live` va benissimo) deve avere un record A che
   torna allo stesso IP, ed e' anche il nome con cui il bot si presenta:
   se non e' il dominio nudo, va scritto in `MAIL_HELO`.
5. Nel `.env`, solo se serve: `MAIL_DOMINIO` (di serie il dominio di
   `BASE_URL`), `MAIL_DA` (di serie `rapporti@<dominio>`),
   `MAIL_DKIM_SELETTORE` (di serie `sb1`), `MAIL_HELO` (di serie il dominio),
   `MAIL=no` per spegnere.
6. **La prova**: `node scripts/posta-chiave.mjs --verifica --ip <IP>`. Non tocca
   niente e guarda com'e' messo il server adesso; quando e' tutto verde, la
   prova vera e' scrivere il proprio indirizzo nella scheda Dirette.

Senza la chiave la posta è **spenta**: `posta.attiva()` è falso, la scheda
Dirette lo dice e il rapporto arriva su Telegram. Meglio niente che una mail
che parte e sparisce.

## Il cerchio: EHLO, reverse DNS e IP

Chi riceve posta non si fida di un nome: lo chiude in un cerchio. Il nome detto
nell'`EHLO` deve avere un record A che punta all'IP da cui la mail arriva, e
quell'IP deve dichiarare lo stesso nome nel suo reverse DNS. Tre pezzi che
guardati uno per uno sembrano tutti giusti, e insieme non combaciano: e' il caso
normale, perche' un IP di posta si chiama `mail.<dominio>` mentre il bot, di
serie, si presenterebbe col dominio nudo.

Percio' il nome si **dice** (`MAIL_HELO`), non si deduce, e `--verifica` chiude
il cerchio per intero: legge il reverse DNS dell'IP, controlla che quel nome
torni davvero a quell'IP, e lo confronta con quello che il bot direbbe. Se non
combaciano stampa la riga esatta da mettere nel `.env`.

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

## La verifica, e perche' non e' una lista da spuntare

`node scripts/posta-chiave.mjs --verifica [--ip <IP>]` non tocca niente e guarda
com'e' messo il server adesso. Guarda le tre cose che vanno storte davvero, e
che una lista scritta a mano non puo' garantire:

- **il DKIM pubblicato contro la chiave vera.** Non «c'e' / non c'e'»: si
  confronta carattere per carattere la `p=` del DNS con la chiave che il server
  usa per firmare. Un record troncato dal pannello DNS — il guasto piu' comune —
  da fuori sembra a posto, e le mail partono firmate male.
- **la porta 25 in uscita, aprendola.** Un firewall che la blocca non risponde
  «chiusa»: resta muto. Quindi la prova e' il banner `220` che arriva entro il
  tempo da uno scambiatore vero, non «la connessione non e' fallita».
- **il cerchio EHLO ↔ reverse DNS ↔ IP** (qui sopra), con la riga pronta da
  copiare nel `.env` quando non si chiude.

## Il collaudo

`test/unita/posta.test.mjs`: il messaggio (intestazioni, oggetto UTF-8, le
due parti), la canonizzazione e una firma che la chiave pubblica verifica, la
consegna a un server SMTP finto sulla porta locale (sequenza, punti
raddoppiati, un 550 che ferma, una porta chiusa che spiega), `invia` da capo
a fondo, la posta spenta, il guscio HTML coi colori del tema.

## Il codice di verifica: come si riconosce una nostra mail

Un mittente si falsifica scrivendolo. SPF, DKIM e DMARC difendono *il nostro
dominio* — chi riceve non può usare il nostro nome — ma non dicono niente a chi
riceve una mail che *somiglia* alla nostra da un dominio vicino
(`socialbot-live.com`, `soc1albot.live`). Contro quello serve qualcosa che il
destinatario possa **controllare**, e che l'imitatore non possa sapere.

Perciò in fondo a ogni mail c'è un **codice**, e quel codice si ritrova solo
dentro al pannello, dove si entra con le proprie credenziali.

- **Per canale.** Se fosse uguale per tutti, basterebbe riceverne una per
  conoscere quello di chiunque.
- **Per settimana** (settimana ISO, dal lunedì). Uno rubato invecchia da solo in
  pochi giorni.
- **Non si conserva.** Si ricava con `segno('codice-posta', canale|settimana)` in
  `src/segreti.js`: una chiave HKDF derivata dal segreto del server *per questo
  scopo soltanto*, poi HMAC. Sopravvive a un riavvio, non c'è una tabella in più
  da rubare, e se il codice trapela non porta con sé niente di quello che sta
  nelle buste.
- **Senza lettere che si confondono** (niente `0/O`, niente `1/I/L`): un codice
  serve a essere confrontato a occhio, e due caratteri simili farebbero dire
  «non combacia» a una mail buona.

Nel pannello, scheda *Stato*, ci sono il codice di questa settimana e quelli
delle settimane già passate del mese, per chi apre una mail in ritardo. Quelli
futuri no: uno sguardo allo schermo di passaggio sarebbe un regalo.
La porta è `GET /api/streamer/codici-posta`, solo per il proprietario e solo per
il proprio canale.

Il confine della settimana è in UTC: una mail spedita fra la mezzanotte e le due
di lunedì in Italia porta il codice della settimana appena finita, che nella
scheda c'è comunque.

## Chi scrive, non solo da dove

Senza un nome nell'intestazione `From`, nell'elenco della posta si legge il pezzo
prima della chiocciola: «info». Ora il `From` è `SocialBot <indirizzo>`
(`MAIL_NOME` lo cambia), mentre la busta SMTP (`MAIL FROM`) resta il solo
indirizzo, come vuole il protocollo. Il `From` è fra le intestazioni firmate con
DKIM, quindi il nome viaggia dentro la firma.

Il logo accanto al mittente, quello sì, non si può fare senza BIMI, che chiede un
certificato a pagamento: non lo facciamo, e non lo promettiamo.
