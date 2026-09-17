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

Poi guarda anche il BIMI, ma **senza farne una riga rossa**: non averlo non e' un
guasto. Se invece il record c'e', allora l'indirizzo del logo viene aperto per
davvero (risposta 200, tipo `image/svg+xml`, entro i 32 kB). Un record che indica
un logo che non si apre e' peggio del record assente: chi lo controlla legge un
mittente che dichiara una cosa falsa.

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

## BIMI: il logo accanto al mittente

BIMI è il modo in cui un programma di posta mostra il **logo** del mittente al
posto del cerchietto con l'iniziale. Non è un'impostazione: è un record DNS più
un certificato, e il certificato si paga.

**Il logo c'è già.** `node scripts/marchio-bimi.mjs` lo ricalca dal disegno vero
in `assets/marchio/sbot.png` e scrive `src/web/public/bimi/socialbot.svg`.
Ricalcare, non ridisegnare: segue il bordo fra i pixel di ogni colore e lo
trasforma in una linea, così il segno che esce è lo stesso che c'è in casa e non
una sua imitazione fatta a occhio, che il giorno dopo diverge. Lo strumento è la
canvas di Chromium, come per `marchio.mjs`.

Il profilo che BIMI pretende è stretto — **SVG Tiny 1.2 Portable/Secure** — e non
si vede a occhio: un SVG che si apre benissimo nel browser può essere rifiutato da
chi emette il certificato, e ce ne si accorge dopo aver pagato. Perciò c'è un
cancello, `verifica-bimi.mjs`, dentro `npm run cancelli`: titolo obbligatorio,
riquadro quadrato, niente che esegua, niente che si muova, niente che venga da
fuori, niente testo (le lettere devono essere disegno, se no dipendono da un
carattere che chi guarda non ha), non più di 32 kB.

Due scelte che si vedono nel file:

- **Fondo chiaro.** Il disegno ha i contorni neri: su fondo scuro il segno
  diventa una macchia. È la stessa ragione per cui le icone dell'app stanno sulla
  carta calda del prodotto.
- **Il segno occupa l'80% del quadrato.** Chi mostra i loghi BIMI spesso li
  ritaglia a cerchio, e il cerchio più grande dentro un quadrato tocca i lati a
  metà: quindi ciò che deve starci dentro non è la larghezza, è la **diagonale**
  del riquadro del segno. Questo segno è largo e basso, la sua diagonale misura
  1,185 volte la larghezza, e può arrivare a 0,84 prima di toccare il cerchio. Al
  66% delle icone dell'app restava un francobollo in mezzo al vuoto, illeggibile
  a 96 pixel.

### Cosa manca, e quanto costa

1. **DMARC a `quarantine` o `reject`.** Già fatto: `p=quarantine`.
2. **Il logo servito in HTTPS.** Già fatto: `https://<dominio>/bimi/socialbot.svg`,
   pubblico, senza sessione.
3. **Il certificato.** È il pezzo che manca e l'unico che si paga. Lo emettono
   DigiCert ed Entrust, costa attorno ai mille euro l'anno:
   - **VMC** (Verified Mark Certificate): vuole un **marchio registrato** in un
     ufficio riconosciuto (EUIPO, USPTO e pochi altri).
   - **CMC** (Common Mark Certificate): il marchio registrato non lo chiede, ma
     vuole il logo **in uso documentato** da almeno un anno, e lo accettano meno
     programmi.
4. **Il record**, quando il certificato c'è:

   ```
   default._bimi.socialbot.live  TXT
   v=BIMI1; l=https://socialbot.live/bimi/socialbot.svg; a=https://socialbot.live/bimi/certificato.pem
   ```

### La strada gratis, e fin dove arriva

Il record **senza** la parte `a=` si pubblica subito e non costa niente:

```
default._bimi.socialbot.live  TXT
v=BIMI1; l=https://socialbot.live/bimi/socialbot.svg
```

È legittimo: nello standard `a=` è facoltativo, e un record con la sola `l=`
significa «il logo sta qui, prova documentale non ne ho». Chi lo onora lo mostra,
chi vuole il certificato lo ignora e basta. Non peggiora la consegna e non ha
effetti sul resto.

Il punto è **chi lo onora**, e conviene dirlo per nome invece che sperarci:
Fastmail e qualche programma minore mostrano il logo con la sola `l=`. Gmail,
Apple Mail e Yahoo no, e sono loro la quasi totalità delle caselle vere. La
richiesta del certificato non è un capriccio: senza, chiunque possieda un dominio
metterebbe accanto al proprio nome il logo di una banca.

Percorsi gratuiti al certificato non ce ne sono, e non è una questione di prezzo
di listino: il certificato deve risalire a una delle poche autorità nella lista
BIMI, quindi uno fatto in casa non vale, e ognuna di quelle autorità verifica a
mano il marchio. La spesa vera, per un marchio non ancora registrato, è prima la
registrazione e poi il certificato.

Quindi la strada gratis si prende per quello che è: **il record si pubblica**, il
logo c'è e risponde, e il giorno in cui arrivasse un certificato basta aggiungere
`a=`. Nel frattempo, nella casella di posta, quello che si vede davvero è il nome
del mittente e l'oggetto, che sono già nostri.

