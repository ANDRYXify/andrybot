# Gli incidenti: un attacco è una cosa sola

## Il problema

Il registro c'era già, e non bastava. Dopo un'ondata restavano quattrocento
righe in fila — «bloccato», «bloccato», «assetto», «bloccato» — e per capire
cos'era successo bisognava rimetterle insieme a mano ogni volta.

Le domande sono sempre queste sei:

1. quando è cominciato;
2. quanto è durato;
3. quanto forte è andato;
4. chi c'era dentro;
5. cosa abbiamo fatto;
6. quanto ha funzionato.

Sono domande a cui si risponde **mentre succede**, non ricostruendo dopo. Quindi
un attacco diventa un oggetto, che si apre quando l'assetto sale, si chiude
quando si torna in pace, e nel mezzo si riempie da solo.

## Si riapre

Un attacco che riprende sette minuti dopo non è un attacco nuovo: è lo stesso
che respira. Se aprissimo un incidente ogni volta, un'ondata a ondate
diventerebbe dieci incidenti da niente invece di uno grosso — e il conto dei
danni sarebbe sbagliato in tutti e dieci.

La soglia è **quindici minuti**. Sotto, si riapre quello di prima e si conta la
riapertura. Sopra, è un attacco nuovo. E se le due facce sono diverse — prima
un'ondata di follow, poi un coro — il tipo diventa `misto`, che è la verità.

## Chi c'era ha un giudizio

`certo`, `probabile`, `sospetto`, `legittimo`. Non è un dettaglio: **serve alla
bonifica**.

Chi è arrivato durante un attacco non è per ciò stesso un bot. Dentro un'ondata
ci finisce anche gente vera, ed è quella che non si deve toccare dopo, quando si
ripulisce. Per questo chi arriva mentre l'assetto è alto e non ha nessun segnale
contro resta scritto come **legittimo**, e chi arriva mentre l'ondata è già
giudicata artificiale resta **sospetto** — non condannato.

Un giudizio più grave sostituisce uno più lieve, mai il contrario: durante un
attacco si scopre, non si dimentica.

## Le azioni si contano, gli eventi si raccontano

Quattrocento righe «bloccato» in una timeline non raccontano niente; un numero
sì. Quindi le azioni dell'esecutore (blocca, ban, timeout, cancella, limita)
diventano un conteggio con dentro quante sono andate, quante sono fallite e
quante sono rimaste a vuoto. Gli eventi salienti — l'assetto che sale, la
raffica, il coro, il blocco di massa — vanno in timeline, perché sono quelli che
rispondono a «cos'è successo e quando».

Tutto passa da un punto solo, `registra()`, che è già l'unico posto da cui passa
ogni intervento. L'incidente si riempie da lì e nessuno deve ricordarsi di
aggiornarlo.

## Il picco

Dice **quanto è stato grave**, non com'è adesso: si aggiorna solo se si sale.
Un attacco che arriva a novanta e poi cala a venti è stato un attacco da
novanta.

## Il riavvio

Un incidente rimasto aperto si **chiude**, e non si cancella. Il bot non ha
nessuna prova che l'attacco sia ancora in corso — la stessa ragione per cui
l'assetto torna in pace — ma quello che è successo è successo e resta scritto,
con una riga di timeline che dice perché si è chiuso. Se l'attacco continua
davvero, il prossimo allarme lo riapre.

Il numero progressivo si riprende dal disco: sennò dopo un riavvio due attacchi
diversi avrebbero lo stesso nome.

## Dove si vedono

- `GET /api/antibot/incidenti` — l'elenco, con le sei risposte per ciascuno.
- `GET /api/antibot/incidenti/:id` — uno solo, con la timeline e i coinvolti
  divisi per giudizio.
- La console dello scudo riporta l'incidente aperto, se c'è.

Vivono in `data/incidenti.json`. Si tengono centottanta giorni, e al massimo
duecento per canale.

## Le prove

`test/unita/incidenti.test.mjs`, dentro `npm test`. Dodici casi, e i due che
contano di più sono la riapertura (un attacco a ondate resta un attacco solo) e
«chi arriva durante un attacco non è per ciò stesso un bot», che è la prova che
protegge la bonifica.

Ogni prova è stata vista rossa rompendo il codice sotto: dodici rotture, dodici
rossi.
