# La porta d'ingresso di Discord

Chi arriva su un server incontra tre cose, in quest'ordine: il **filtro** che
decide quando potra' scrivere, la **prima schermata** che legge aprendolo, e le
**domande** a cui risponde — e ogni risposta gli apre dei canali e gli da' dei
ruoli. Discord le tiene in tre posti diversi (`verification_level` nelle
impostazioni, `welcome-screen`, `onboarding`); qui sono una scheda sola, «Chi
entra», perche' fanno un mestiere solo: dire a chi non ti conosce dove andare.

## Perche' nella traccia si nomina per NOME

Le domande dicono, per ogni risposta, quali canali aprire e quali ruoli dare.
Discord li vuole per id. Ma la traccia puo' CREARE quei canali e quei ruoli
nello stesso giro: un id scritto nella traccia sarebbe l'id di un canale che non
esiste ancora, o peggio l'id di uno cancellato il mese scorso.

Quindi nella traccia canali e ruoli si chiamano per nome, come gia' fa
`permessi` («questo canale lo vedono i Moderatori»). I nomi diventano id al
momento di costruire — in `discord-costruisci.js`, dopo che canali e ruoli sono
stati creati, con la mappa dei canali nati in quel giro. E' lo stesso passaggio
che il costruttore fa gia' per i permessi: una strada sola, non due.

Un nome che non si risolve non si inventa: quella risposta perde quel canale, e
il pannello dice quale (`ingressoPersi`), invece di mandare a Discord un id a
caso.

## Cosa pretende Discord, e perche' lo contiamo prima

Verificato sulla documentazione (`PUT /guilds/{id}/onboarding`,
`PATCH /guilds/{id}/welcome-screen`):

- Serve `MANAGE_GUILD`, e il server dev'essere **COMMUNITY**. Senza, nessuna
  delle due chiamate passa.
- Con la porta **accesa** servono almeno **7** canali fra quelli che contano, e
  almeno **5** dove `@everyone` puo' vedere e scrivere.
- `mode` 0: contano solo i canali di partenza. `mode` 1: contano anche quelli
  che le risposte aprono.

Da qui tre scelte:

1. **Il modo non e' una manopola, e' una conseguenza.** Se ci sono domande, i
   canali che aprono devono contare, quindi modo 1; se non ce ne sono, modo 0.
   Metterlo fra le scelte vorrebbe dire chiedere allo streamer di indovinare la
   regola qui sopra, e di scoprire l'errore da un rifiuto di Discord.
2. **Il conto si fa sul mondo che CI SARA'**, non su quello di adesso: i canali
   del server piu' quelli che la traccia sta per creare (`canaliDelDopo` in
   `discord-preset.js`). Contare solo l'esistente vorrebbe dire dire «ne hai
   tre» mentre se ne stanno creando dieci, e fermare una cosa che riusciva.
   Per ogni canale la domanda e' una: `@everyone` lo vede e ci scrive? Per
   quelli gia' sul server si legge dalla fotografia; per quelli della traccia si
   legge dai suoi `permessi`, e se la traccia non ne parla il canale eredita
   dalla sua categoria, come fa Discord alla creazione.
3. **Se Discord direbbe di no, si dice prima e non si chiama.** La frase sta in
   `blocco`, arriva nell'anteprima, e il resto della costruzione parte lo stesso.

## Non si riscrive l'uguale

Le risposte che le persone hanno gia' dato sono legate all'id dell'opzione.
Riscrivere le domande identiche le cancellerebbe tutte. Percio':

- la porta di adesso si legge da Discord (per id), si ritraduce in nomi con la
  fotografia, e si confronta con quella voluta: se coincidono,
  `differenzaIngresso` torna `null` e non si chiama niente;
- quando il titolo di una domanda o di una risposta coincide con quello di
  prima, l'id di prima si porta avanti. Cosi' aggiungere una risposta non
  smemora le altre.

Il confronto usa `chiaveNome`, che normalizza da tutte e due le parti («Il
Generale» e «il-generale» sono lo stesso canale): senza, il confronto direbbe
«diverso» a ogni giro e la porta si riscriverebbe tutte le sere.

## Dove sta nel codice

| pezzo | dove |
|---|---|
| le due porte di Discord | `src/features/discord-api.js` — `benvenuto`/`sistemaBenvenuto`, `ingresso`/`sistemaIngresso` |
| com'e' scritta nella traccia | `src/features/discord-catalogo.js` — `normalizzaPreset`, `MAX_DOMANDE`, `MAX_RISPOSTE` |
| cosa cambierebbe | `src/features/discord-preset.js` — `differenzaIngresso`, `canaliDelDopo`, `MIN_PARTENZA`, `MIN_APERTI` |
| i nomi che diventano id | `src/features/discord-costruisci.js` — dopo canali e ruoli, prima delle rimozioni |
| «parti dal server che hai» | `dallaFotografia(foto, { porta })`, e la rotta `/api/streamer/dcserver/dalserver` |
| la scheda | pannello, `dcentra` — «Chi entra» |

## L'impronta

La porta entra nell'impronta dell'anteprima (`improntaDi`) come i canali, i
ruoli e le impostazioni. Non e' un di piu': una risposta in piu' puo' dare un
ruolo a chiunque entri, e un «sì, fallo» dato guardando i canali non deve
autorizzare una porta arrivata nel frattempo.

## Due schede, un giro solo

La traccia si scrive da due schede — «Il server» e «Chi entra» — ma guardare,
salvare e costruire stanno in un posto solo (`_dcsSalvaTraccia`, `_dcsVedi`,
`_dcsFai`, col prefisso della scheda). Due copie sarebbero due giri che al primo
cambiamento non fanno piu' la stessa cosa, e chi guarda da una scheda vedrebbe
un'altra.

Per lo stesso motivo la configurazione si legge **una volta sola**: passare da
una scheda all'altra non rilegge, perche' rileggere vorrebbe dire ripartire
dalla traccia salvata e buttare via quello che si stava scrivendo di la' — in
silenzio, e proprio nel momento in cui si va a controllare l'altra meta'. E
toccare la traccia spegne il tasto «Costruisci» di tutte e due le schede:
l'impronta e' di quello che si era guardato.

Il pannello CONTA i canali scelti e dice quanti ne vuole Discord; il verdetto
vero lo da' l'anteprima, che e' l'unico posto dove quella regola e' scritta.
Contarla anche nel pannello vorrebbe dire due implementazioni della stessa
regola, e un giorno una delle due direbbe un'altra cosa.

E passare dall'una all'altra non e' un'uscita: la finestra «hai modifiche non
salvate» non compare, perche' non si sta lasciando niente — e si metterebbe
davanti ai tasti proprio mentre si va a controllare l'altra meta'. Ma non
chiedere non vuol dire dimenticare: la traccia resta sporca, la barra del
salvataggio si riaggancia alla carta dei tasti della scheda nuova, e uscendo
DAVVERO la domanda arriva. Le schede che scrivono la stessa cosa stanno
dichiarate in `STESSA_ROBA`.

## La porta gia' scritta

Una scheda che ti chiede di inventarti sette canali di partenza, tre domande e
una lista di parole e' una scheda che non usa nessuno. Percio' la porta e il
filtro arrivano scritti — ma NON si scrivono a mano nel catalogo: si DERIVANO
dai canali che la traccia ha (`portaPronta` e `filtroPronto`).

Non e' pigrizia. Una porta scritta a mano puo' nominare un canale che quella
traccia non ha, e al momento di costruire quel nome cade: una porta monca senza
che nessuno abbia sbagliato niente. Derivandola dai canali che ci sono, quel
difetto non puo' esistere — e la stessa funzione serve al tasto «scrivimi una
porta di partenza», che lavora su una traccia letta da un server che nessuno
aveva mai visto.

Le regole della derivazione:

- **niente canali nascosti**: offrire una porta chiusa e' peggio che non
  offrirla;
- **niente vocali**: Discord li conta a modo suo, e una porta che si fa
  rifiutare e' peggio di una porta spenta;
- **una risposta per CATEGORIA**, non per canale: chi entra sceglie di cosa gli
  va di parlare, non spunta quindici caselle;
- **accesa o spenta non lo decide chi scrive la traccia**: lo decide la conta di
  Discord (`contaPorta`, la stessa che spiega il rifiuto nell'anteprima). Due
  delle quattro tracce del catalogo nascono spente perche' non arrivano a sette
  canali, e il giorno che crescono si accendono da sole. Deciderlo a mano
  vorrebbe dire che quel giorno non se ne accorge nessuno.

Il filtro di partenza sono le tre cose che le guide dicono di accendere su
qualunque server — le liste di Discord, lo spam, le raffiche di menzioni — coi
ruoli dello staff esentati. **Le parole tue non le mettiamo noi**: dipendono da
chi sei e da chi ti guarda, e una lista scritta da noi sarebbe una lista che non
c'entra niente col tuo server.
