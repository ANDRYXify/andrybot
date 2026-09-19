# I ruoli di Discord, dati da quello che sappiamo noi

Discord i **sub** di Twitch se li sincronizza da solo. Tutto il resto no: chi ti
segue, chi e' VIP, chi e' moderatore, quante ore ti ha guardato, quante monete
ha, da quante dirette di fila c'e'. Quei dati ce li abbiamo, e qui diventano
ruoli sul server dello streamer.

## Tre pezzi, e nessuno sa il mestiere dell'altro

| pezzo | cosa sa | cosa NON sa |
|---|---|---|
| `features/discord-ruoli.js` | la regola: dalle condizioni e da cosa sappiamo di una persona, i ruoli che le spettano — e la **differenza** con quelli che ha | cosa sia Discord |
| `features/discord-api.js` | come si chiede e come si scrive: leggere i ruoli, leggere un membro, dare, togliere | perche' |
| il giro | mette insieme i due, una persona alla volta | — |

La regola e' pura apposta: si prova senza rete, e la si legge senza sapere
niente di HTTP. Il filo e' muto apposta: non decide mai niente.

## Quattro cose che non devono poter succedere

Stanno scritte per esteso in cima a `discord-ruoli.js`, in breve qui:

1. **Non si tocca un ruolo che non e' nostro.** Si puo' togliere solo un ruolo
   che una regola nomina. Lavorare per sottrazione — «via tutto quello che non
   gli spetta» — vorrebbe dire spogliare il server la prima volta che si accende
   l'interruttore.
2. **Si scrive solo la differenza.** Se non cambia niente non si chiama nessuno:
   per i limiti di frequenza, e perche' il registro del server non deve
   riempirsi di righe che non dicono niente.
3. **Un ruolo piu' alto del bot** non glielo puo' dare nessuno: Discord rifiuta.
   Si riconosce **prima**, dalle posizioni, e si dice — invece di riprovarci a
   ogni giro senza capire mai perche'.
4. **Una regola senza ruolo non e' una regola.** Un ruolo cancellato dal server
   lascia una condizione che non puo' avverarsi: si scarta, e si dice.

## Il filo: cosa e' chiuso prima di chiamare

`discord-api.js` parla **solo** con `https://discord.com/api/v10`. L'indirizzo
non arriva mai da fuori: la base e' fissa e dentro il percorso ci vanno solo
cifre (`ID_RE`). Un id che non e' fatto di sole cifre non parte nemmeno — e'
l'unico modo per uscire dal percorso, e si chiude prima della chiamata.

Il token viaggia nell'intestazione, mai nell'indirizzo, e non finisce nel
registro nemmeno a pezzi: quando una chiamata va male si scrive cosa e'
successo, non con cosa ci si e' autenticati.

Su «troppe richieste» si aspetta il tempo che dice Discord, **una volta sola**.
Un modulo che riprova per conto suo, in silenzio, e' un modulo che non si riesce
piu' a fermare: oltre la soglia il filo lo dice e lascia decidere al giro.

E **«non e' nel server» non e' un errore**: e' una risposta. Un ruolo non si puo'
dare a chi non c'e', e va detto cosi', non come un guasto.

## La memoria

`discord_ruoli` (una riga per canale) tiene l'id del server, le regole, e il
token del bot **solo se lo streamer se n'e' portato uno suo** — di solito quella
casella e' vuota e si usa quello della piattaforma. Quando c'e' e' un segreto:
sta nella busta (`docs/SEGRETI.md`) e non esce mai verso il browser. La tabella
e' sua e non `settings` proprio per questo — `settings` non e' cifrato.

`discord_link` tiene chi ha detto «questo account Discord sono io», **per
canale**. Il consenso non e' un'iscrizione all'anagrafe: collegarsi al server di
uno streamer non vuol dire farsi riconoscere da tutti gli altri. Chi si scollega
sparisce da li', e da quel momento il giro non lo tocca piu' — ne' per dare ne'
per togliere: i ruoli che ha restano suoi. Se lo streamer spegne tutto, i
collegamenti vanno via con la configurazione: non si tengono consensi per un
servizio che non c'e' piu'.

## Il pannello: la scheda Discord, in «Le tue community»

Sta li' e non fra gli **Avvisi** perche' sono due mestieri diversi: l'avviso
«sono in onda» e' una notifica, questo e' un gestore di privilegi su casa di
qualcun altro. Nel menu convivono, ognuno dove serve.

Tre carte, e ognuna risponde a una domanda:

- **il bot del tuo server** — un tasto che lo porta su Discord a scegliere il
  server, e poi una riga che non dice «ok»: dice come si chiama il server, come
  si chiama il bot, e **quanti ruoli riesce davvero a muovere**. E' l'unica
  frase che smaschera il passo che si sbaglia sempre (il ruolo del bot troppo in
  basso), prima che lo streamer passi mezz'ora a chiedersi perche' non succede
  niente. Sotto, piegato, il campo per chi preferisce il bot suo;
- **le regole** — una condizione e il ruolo che le tocca. Quali condizioni
  esistono lo dice la regola (`TIPI` viaggia dal server al pannello); come si
  chiamano in italiano, inglese e spagnolo lo sa il pannello. Due cose diverse,
  due posti diversi, e un cancello che controlla che l'elenco delle parole copra
  l'elenco delle condizioni;
- **chi si e' collegato** — quanti sono (non chi: quelli sono fatti loro), come
  ci si collega, e cosa ha fatto l'ultimo giro, compresi i ruoli che non ha
  potuto toccare.

Due tasti che valgono piu' di quanto sembrano: **«fammi vedere cosa faresti»**
funziona anche a interruttore spento — e' proprio li' che serve, prima di
accendere — e non scrive niente; **«scollega tutto»** avvisa che i ruoli gia'
dati restano dove sono, perche' toglierli sarebbe una punizione per una scelta
dello streamer.

Aprendo la scheda i ruoli si vanno a chiedere **subito**, non al primo tasto:
una regola scritta ieri, riletta oggi, deve dire «Abbonati» e non un numero di
diciotto cifre. E se intanto il token e' stato revocato, lo si scopre aprendo il
pannello invece che il giorno in cui serve.

Il token non torna mai indietro verso il browser. Un pannello che rimostra il
segreto che gli hai dato e' un segreto in piu' in giro, e non serve a niente:
chi lo rivuole lo rigenera su Discord. Percio' un campo vuoto vuol dire «non
l'ho toccato», mai «cancellalo».

## Il collegamento, e il verso in cui va il codice

Servono due meta': chi sei su Discord e chi sei su Twitch. La prima la dice
Discord, con la sua schermata del permesso. La seconda e' il problema, perche'
uno spettatore su SocialBot non ha un account.

La strada ovvia — il bot scrive in chat un link personale e tu lo apri — e'
**sbagliata**, e si rompe in un modo che non si vede: la chat e' pubblica. Chi
sta guardando vede il tuo link, lo apre prima di te, autorizza il SUO Discord, e
da quel momento e' lui a prendersi i tuoi ruoli. Nessuno se ne accorge, e il
derubato pensa di aver sbagliato qualcosa.

Quindi il codice va nell'altro verso:

1. apri `socialbot.live/collega/<canale>` e premi **Continua con Discord**;
2. Discord ti chiede il permesso (`identify`, niente altro) e torna da noi;
3. la pagina ti mostra un **codice di sei caratteri**, che sta solo sul tuo
   schermo;
4. lo scrivi nella chat dello streamer: `!discord ABC123`. Quel messaggio —
   che porta con se' l'autorita' di Twitch — chiude il collegamento, e **lo
   consuma**.

Chi legge il codice in chat lo legge gia' bruciato: e' arrivato secondo per
costruzione, perche' prima del tuo messaggio quel codice non esisteva per
nessun altro. E se lo scrivi nella chat sbagliata muore lo stesso — e' comunque
finito in pubblico, quindi non deve valere piu' nemmeno a casa sua.

Il resto sono conseguenze: un codice vive dieci minuti e vale per un canale
solo; ricominciare sostituisce quello di prima; lo stesso account Discord non
puo' restare appeso a due persone sullo stesso canale (sarebbe la stessa rapina,
fatta piano); e `!discord via` stacca, lasciando dov'e' quello che hai — i ruoli
non si tolgono per ripicca.

Il codice sta nel database e non in memoria per lo stesso motivo del cancello di
Telegram: un riavvio non deve lasciare una persona a meta' strada con un codice
che non vale piu' niente e nessuno che glielo dica.

## Il giro, e il difetto piu' pericoloso di tutti

Ogni quarto d'ora, sui canali accesi: si leggono le regole, si chiedono a
Discord i ruoli del server e l'altezza del bot, e per ogni persona collegata si
scrive **solo la differenza**. Un giro in cui non cambia niente non chiama
nessuno, quindi costa quanto una lettura.

Il pericolo non e' sbagliare a dare un ruolo: e' **leggere «non lo so» come
«no»**. Se Twitch tace per un minuto — un permesso revocato, una chiamata andata
storta — e noi capiamo «non e' abbonato», il giro dopo toglie il ruolo dei sub a
tutto il server. Un guasto di lettura diventa una scrittura irreversibile su
casa di qualcun altro, e quei ruoli poi li ridai a mano, uno per uno.

Percio' la regola e' scritta in negativo, e vale da cima a fondo:

- nello strato di Twitch, `null` vuol dire «non l'ho potuto chiedere» ed e'
  diverso da un elenco vuoto, che vuol dire «non c'e' nessuno». `getVips`
  tornava `[]` in tutti e due i casi: adesso no. Chi segue si chiede una
  persona alla volta, e se **una** chiamata cade non si torna una fotografia a
  meta': o si sa di tutti, o non si sa;
- nella fotografia (`helix.ruoliDi`) un fatto che non sappiamo **non c'e'
  proprio**: e' l'assenza della chiave, non un `false`. Un valore che non esiste
  non si puo' confondere con un no;
- nel giro, una condizione che non sappiamo valutare per quella persona, in
  quel giro, **non e' una regola**: non da' e non toglie niente. Il ruolo resta
  dov'e'.

Il resto viene da se': si respira fra una persona e l'altra, e se Discord chiede
una lunga attesa il giro si ferma e torna dopo — non e' il filo a decidere
quanto insistere, e' chi sta girando. «Fammi vedere cosa faresti» percorre la
**stessa** strada senza scrivere: se fosse una strada sua, mostrerebbe una cosa
e ne farebbe un'altra.

## Un'applicazione sola, due poteri diversi

Sono due cose diverse e vanno tenute diverse, anche se stanno nella stessa
applicazione:

| | a cosa serve | cosa puo' fare |
|---|---|---|
| **riconoscere** (client id + secret) | lo spettatore dice «questo account Discord sono io» | leggere il suo id e il suo nome (`identify`). Nient'altro |
| **il bot** (il token) | dare e togliere ruoli nei server che lo hanno invitato | quello che gli permette il suo posto nella scala dei ruoli di QUEL server |

Chi riconosce non entra in nessun server. Il bot non sa chi sei su Twitch: sa
solo che un certo id Discord deve avere un certo ruolo, e glielo dice il giro.

Il bot e' **uno solo, della piattaforma**, ed e' cosi' che funzionano tutti i
bot di Discord. Non e' una scorciatoia: chiedere a ogni streamer di creare
un'applicazione, generare un token, incollarlo e copiare a mano l'id del server
era fargli fare un lavoro che **Discord sa gia' fare da solo** — e in cambio di
niente, perche' quel bot avrebbe comunque avuto in mano lo stesso potere.

Chi preferisce portarsi il bot suo puo' ancora: un token nel pannello, e quello
vince. Il campo vuoto non vuol dire «niente bot», vuol dire «quello della
casa» — la regola sta in `tokenDi()` e la legge un posto solo.

### L'applicazione della piattaforma (una volta sola, nel `.env`)

1. https://discord.com/developers/applications → **New Application**, un nome e
   accetta i termini.
2. **OAuth2** nel menu a sinistra. Copia **Client ID** (e' anche l'Application
   ID, solo cifre) e premi **Reset Secret** per avere il **Client Secret**: si
   vede una volta sola, se lo perdi se ne rigenera un altro.
3. Sempre in OAuth2, **Redirects** → **Add Redirect** e incolla
   `https://socialbot.live/discord/oidc/callback` — identico, senza barra in
   fondo. Salva. **Uno solo**: i due giri (lo spettatore che si riconosce, lo
   streamer che invita il bot) tornano dalla stessa porta, e a distinguerli e'
   lo stato monouso.
4. **Bot** nel menu → **Reset Token**, e copia il token.
5. Nel `.env` del server: `DISCORD_CLIENT_ID=`, `DISCORD_CLIENT_SECRET=` e
   `DISCORD_BOT_TOKEN=`, poi riavvia.

Facoltativo ma gentile: in **General Information** metti icona e descrizione —
sono quelle che si vedono nella schermata di Discord che chiede il permesso, e
sono la faccia del bot nei server degli streamer.

## Quello che si chiede all'invito, e i due motivi diversi

L'invito chiede più di quanto il bot adoperi, e la differenza va detta chiara
perché non è la stessa cosa.

**Quelli che usa lui.** «Gestire i ruoli» per il gestore dei privilegi,
«Gestire i canali» per il costruttore, e «vedere il canale», «scrivere»,
«anteprima dei link» per l'avviso di diretta — da quando lo scrive il bot e non
più un webhook creato a mano. Ognuno di questi deve servire a qualcosa, e un
cancello controlla che sia così: un permesso che non usiamo mai è potere tenuto
in tasca per niente, e su casa d'altri.

**Quelli che non usa mai.** Cacciare, bannare, mettere in pausa, ripulire,
soprannomi, zittire, spostare, e gli altri della tabella. Il bot non li adopera
in nessun caso: li tiene perché **Discord non lascia dare a un ruolo un
privilegio che chi lo crea non ha**. Senza averli, un «Moderatori» costruito
dal preset nascerebbe senza poteri — un ruolo finto, che sembra fatto e non
serve a niente.

Il prezzo è reale: il bot quei poteri li **detiene** su ogni server che lo
invita. Una frase come «ma non li usiamo» scritta in un commento non vale
niente — vale finché qualcuno non aggiunge una riga, magari in buona fede, per
una funzione comoda. Perciò non è una promessa, è un cancello:
`scripts/verifica-poteri.mjs` controlla che in tutto il codice non si chiami
mai una porta di Discord che quei poteri li **esercita** — bannare, cacciare,
mettere in pausa, cancellare messaggi altrui, cambiare il soprannome.
Distribuirli sì, usarli mai.

E controlla anche il contrario: che dare e togliere ruoli a una persona resti
quello che il bot sa fare. Un cancello diventato verde perché abbiamo tolto il
gestore dei privilegi avrebbe misurato la cosa sbagliata.

### Il numero non si scrive a mano

```js
export const DA_DARE = Object.values(PRIVILEGI).reduce((t, v) => t | v, 0n);
export const PERMESSI_BOT = String(MANAGE_ROLES | MANAGE_CHANNELS | VIEW_CHANNEL
                                 | SEND_MESSAGES | EMBED_LINKS | DA_DARE);
```

Aggiungere un privilegio alla tabella lo fa entrare da solo nell'invito.
Un numero battuto a mano sarebbe la cosa che un giorno non coincide più, e
nessuno saprebbe cosa è entrato o uscito.

### Chi aveva già invitato il bot

Non ce li ha, e non lo deve scoprire da un errore a metà costruzione. I
permessi di un bot si aggiornano **reinvitandolo**, cioè ripassando dal tasto
che lo porta nel server: è lo stesso giro di prima, dura un clic, e i canali e
i ruoli restano dove sono.

## Come lo streamer porta il bot nel suo server

Un tasto. Il pannello chiede `/api/discord/invito`, che risponde con
l'indirizzo di autorizzazione: `scope=bot` e i permessi che servono davvero —
**Gestire i ruoli** (questo gestore) e **Gestire i canali** (il costruttore del
server, `docs/DISCORD-SERVER.md`). Due, non di piu': una lista lunga di permessi
su una schermata di conferma e' il modo migliore per farsi dire di no, ed e'
anche potere che non ci serve.

Il numero non si scrive a mano — si compone da costanti con un nome
(`PERMESSI_BOT = String(MANAGE_ROLES | MANAGE_CHANNELS)`), e un cancello
controlla che ognuna di quelle che chiediamo sia davvero usata da qualche parte
nel codice: un permesso che non usiamo e' potere tenuto in tasca su casa
d'altri.

**Chi aveva invitato il bot prima** non ha «Gestire i canali»: i permessi si
aggiornano reinvitando, cioe' ripassando da quel tasto. Non lo si lascia
scoprire da un errore a meta' costruzione — il permesso si guarda prima, e la
cura che si dice e' il tasto.

Discord mostra **la sua** scelta del server: ci sono solo quelli dove lo
streamer e' amministratore, ed e' Discord a garantirlo. Lui conferma, il bot
entra, e si torna indietro.

**L'id del server non arriva dalla query.** Discord lo rimanda anche li'
(`guild_id`), ma quella query passa dal browser di chi autorizza e si riscrive
a mano nella barra degli indirizzi: chi volesse potrebbe metterci l'id del
server di un ALTRO streamer dove il nostro bot e' gia' dentro, e da li' in poi
le proprie regole muoverebbero i ruoli di casa d'altri. Quello buono sta nella
RISPOSTA dello scambio del codice (`scambiaInvito`), che viaggia da Discord a
noi e non passa da nessuna parte in mezzo.

### Il buco che apre un bot condiviso

Finche' ogni streamer si portava il suo bot, scrivere a mano nel pannello l'id
del server di un altro era inutile: quel bot li' dentro non c'era. Con un bot
della piattaforma il conto cambia — il nostro bot sta in TUTTI i server dei
nostri streamer, e un id scritto a mano sarebbe una chiave per casa d'altri.

Quindi la regola: **col bot della casa il server lo dice Discord, e basta**.
L'id dal pannello si accetta solo insieme a un token suo, dove il problema non
esiste per costruzione. Vale per il salvataggio e per la prova, e sta in
`test/contratto/discord-invito.test.mjs`.

Resta a mano **una cosa sola**, e non per pigrizia: in **Impostazioni server →
Ruoli**, trascinare il ruolo del bot **sopra** quelli che deve poter dare.
Discord non lascia che un bot si sposti piu' in alto di dov'e' — e' la regola
che gli impedisce di promuoversi da solo, e va bene cosi'. Ma non lo lasciamo
indovinare: il pannello sa gia' quali ruoli sono fuori portata
(`fuoriPortata`/`mioLivello`) e li nomina.
