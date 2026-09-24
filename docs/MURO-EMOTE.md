# Il muro delle emote

Chiesto così: «https://realityripple.com/Tools/Twitch/EmoteWall/ Riusciamo ad
aggiungere anche la possibilità di aggiungere una roba simile? magari più figa,
personalizzabile (al massimo) come solo sappiamo fare noi?»

## Cosa fa quello di riferimento

L'Emote Wall di RealityRipple (pubblico dominio, `CONFIG.md` sul suo GitHub) è
una pagina da mettere in OBS che si collega da sola alla chat e fa volare le
emote dei messaggi sullo schermo. Le opzioni, lette dal suo file di
configurazione e non a memoria:

- **dodici animazioni per le emote singole**: ferma, linea dritta, sale
  ondeggiando, rimbalzo sul fondo (come il Solitario), sfreccia, resta in
  alto e cade, impazzita contro i bordi, coriandoli, lancio al centro, salto
  dal basso, cubo 3D; ogni emote ne pesca una a caso fra quelle accese;
- **sedici esplosioni** («kappagen»): sale, sfreccia, impazzita, scoppio dal
  centro, fuochi d'artificio, spirale, piramide grande e piccola, colonne alla
  Matrix, fontana, stampede, coriandoli, trenino, montagne russe, cubo, una
  scritta fatta di emote;
- esplosioni lanciate **da eventi** (raid, follow, sub e regali per livello,
  bit sopra una soglia, hype train, sondaggi, pronostici, obiettivi, beneficenza,
  timeout e ban), **da comandi** (con alias, permessi e attesa) e **da premi**
  a punti canale;
- **chi** può far comparire emote o esplosioni (per ruolo: proprietario, mod,
  VIP, sub per livello, follower, tutti);
- **quante**: massimo a schermo, coda, doppioni per messaggio, e una soglia
  («almeno N volte la stessa emote in T secondi»);
- **quanto grandi**: rispetto al lato corto dello schermo, con minimo, massimo
  e ogni tanto una più grande o più piccola;
- **come entrano ed escono**: dissolvenza e zoom;
- **fonti**: Twitch, 7TV, BTTV, FFZ, emoji, e le emote «a larghezza zero» che
  si sovrappongono;
- **colore e ombra** di tutte le emote, un effetto «rave» che fa ruotare i
  colori durante l'hype train, e liste di persone ed emote da ignorare.

## Cosa sarà da noi

Un **elemento della scena** come gli altri (docs/OVERLAY.md): chiave `muro`,
configurazione di canale `overlayMuro`, si accende e si spegne per overlay e
per occasione, e la sua area si sposta e si ridimensiona nello Studio (di serie
lo schermo intero). Le emote volano **dentro l'area**: chi vuole il muro solo
sopra la webcam, o solo in una fascia in basso, lo chiude in un riquadro.

Non si collega a niente da solo: il bot legge già la chat, e l'overlay carica
già la mappa di 7TV del canale (`/overlay/:login/emotes`). Niente token da
incollare, niente seconda connessione alla chat.

## Il modello

### L'area e l'emote

L'area è un rettangolo W×H in pixel (il box dell'elemento), con `overflow:
hidden`: quello che esce dall'area non si vede. Un'emote è un quadrato di lato
`s` di cui si muove il **centro** `(x, y)`; ogni fotogramma dice anche la
rotazione `r`, la scala `sx, sy` e l'opacità `o`.

Due misure, per due domande diverse:

- **per i contatti** (il pavimento su cui rimbalza, il bordo che non deve
  passare) l'emote è un **disco** di raggio `h = s/2` per la scala: le emote
  sono facce e oggetti tondeggianti su fondo trasparente, e un disco che rotola
  ha la rotazione giusta per definizione (`r = distanza / h`);
- **per la visibilità** (quando è del tutto fuori, all'entrata e all'uscita)
  l'emote è il **quadrato** intero, che ruotato arriva a `h·√2` dal centro.
  Un'emote che entra da un bordo parte a `h·√2` oltre il bordo: non compare
  mai a metà.

La grandezza: `s` è una percentuale del lato corto dell'area, variata di
quanto si sceglie, chiusa fra un minimo e un massimo in pixel, e mai più di
metà del lato corto (il tetto che rende possibile ogni figura: in un'area
bassa un'emote grande non ci starebbe).

### Un'animazione è una traiettoria vera

Ogni animazione è una funzione pura: dati l'area, `s` e un generatore di
numeri in [0, 1), restituisce la durata e la **posizione nel tempo** `p(t)`,
con `t` da 0 a 1. Il browser non inventa niente fra due fotogrammi: la
traiettoria si campiona fitta (30 punti al secondo) e ogni istante che conta
(un urto col pavimento, l'apice di un salto) entra nei campioni **per nome**,
non per fortuna. Web Animations la fa girare su `transform` e `opacity`.

Il caso sceglie solo **dentro intervalli che rispettano già la regola**: la
regola non la controlla nessuno a valle, la garantisce il modo in cui si
sceglie. Un generatore che restituisce sempre 0, o sempre quasi 1, produce
due traiettorie valide ai due estremi.

| animazione | traiettoria | cosa resta vero per costruzione |
| --- | --- | --- |
| `sale` | dal fondo alla cima, oscilla di lato con un seno | l'oscillazione sta nella larghezza: il centro parte a distanza `h + A` dai lati |
| `linea` | da un lato all'altro in linea dritta | le due quote sono nell'area, quindi lo è tutta la linea |
| `rimbalzo` | entra da un lato, cade con la gravità, rimbalza sul fondo perdendo forza, esce dall'altro lato | tocca il pavimento esattamente a ogni urto (schiacciata), e non sale mai oltre la quota da cui è partita |
| `sfreccia` | attraversa velocissima, allungata nel verso della corsa | la pendenza ha un tetto, e l'ingombro verticale dell'emote allungata e inclinata è calcolato al tetto |
| `cade` | appesa in alto trema, poi cade girando con la gravità | lontana dai lati quanto il quadrato ruotato (`h·√2`) |
| `coriandoli` | scende oscillando e girandosi come un foglio | discesa sempre in avanti (mai risale), oscillazione nella larghezza |
| `salto` | parabola dal fondo: sale, si ferma, ricade | la parabola ha l'apice sotto la cima, il resto è più in basso |
| `lancio` | lanciata da un angolo basso, arco verso il centro, rimbalzi, esce | come il rimbalzo, dopo un arco il cui apice è sotto la cima |
| `pulsa` | compare ferma in un punto e batte come un cuore | il punto è lontano dai bordi quanto l'emote al massimo del battito |
| `orbita` | gira su un'ellisse attorno al centro dell'area | gli assi dell'ellisse sono la metà dell'area meno l'emote |

Il pannello tiene acceso almeno un movimento: spegnere l'ultimo lo lascia
acceso e lo dice, perche' un muro senza movimenti non avrebbe niente da far
volare. Se arrivasse vuoto lo stesso, il server li riaccende tutti.

Entrata e uscita (dissolvenza, zoom o niente) sono un **inviluppo** che
moltiplica opacità o scala per un numero fra 0 e 1 nel primo e nell'ultimo
decimo: rimpicciolire non porta mai fuori, quindi l'inviluppo non rompe
nessuna delle regole qui sopra.

### Le esplosioni

Un'esplosione è un gruppo di traiettorie che fanno **una figura insieme**:

| esplosione | figura | cosa resta vero |
| --- | --- | --- |
| `fuochi` | scoppia da un punto in tutte le direzioni e ricade | le direzioni sono equidistanti sull'angolo giro |
| `fontana` | zampilla dal fondo al centro e ricade ai lati | ogni getto parte dallo stesso ugello |
| `spirale` | si apre a spirale dal centro | le emote stanno su una spirale d'Archimede |
| `pioggia` | piove da tutta la larghezza | le colonne dividono la larghezza in parti uguali |
| `trenino` | una fila che attraversa ondeggiando | ogni vagone fa la stessa strada del primo, in ritardo |
| `piramide` | si costruisce a gradini dal fondo, poi crolla | ogni gradino ha una emote in meno di quello sotto, e ognuna poggia a metà fra le due sotto |
| `scritta` | le emote compongono una parola, poi si disperdono | le caselle occupate sono esattamente i punti delle lettere |
| `cuore` | le emote disegnano un cuore e battono, poi volano via | i punti stanno sulla curva del cuore |

Si lanciano:

- **da un comando**, di serie `!esplodi` (rinominabile, spegnibile, riservabile
  come ogni comando pronto), con le emote scritte nel messaggio (se ne scrivi
  due volte una, pesa il doppio), e un'attesa per tutti fra due esplosioni;
- **dagli eventi del canale**, ognuno con la sua figura e la sua soglia: raid
  (con le emote 7TV del canale che arriva, se le ha), sub e regali, bit sopra
  N, donazione sopra N, hype train che parte e che finisce, boss sconfitto;
- **da un premio a punti canale**, scelto nella lista dei premi del canale;
- **dalla prova** nel pannello, una per figura.

### Le combo

La cosa che l'originale non ha: quando la chat manda **la stessa emote più
volte di seguito**, non se ne lanciano cento uguali. Dalla soglia in poi resta
una sola emote che **cresce** a ogni ripetizione, con un contatore «×12»;
quando per la finestra scelta nessuno la ripete, esplode nella figura scelta
per le combo, con tante emote quante sono state le ripetizioni: almeno otto,
perche' una figura di quattro non e' una figura, e al piu' quante ne ha
un'esplosione.

Una combo è una macchina a stati, pura: per ogni emote l'ultima volta che è
arrivata, quante volte, e chi l'ha mandata. Si conta una volta per persona,
se lo si sceglie: una persona sola che ripete non fa una combo della chat.

### Chi e quanto

- **Chi**: gli stessi livelli dei comandi (tutti, abbonati, VIP, moderatori);
  per le emote qui, per il comando nella scheda dei comandi.
- **Esclusi**: persone (di serie i bot di chat più comuni, e il bot stesso) ed
  emote.
- **Quanto**: massimo di emote a schermo; oltre, le nuove aspettano in una
  coda breve che perde le più vecchie (un'emote in ritardo di dieci secondi
  non dice più niente). Massimo di emote per messaggio, e doppioni sì o no.
  Un'esplosione non passa dalla coda delle emote singole: ne parte una alla
  volta, le altre aspettano in fila.

### La veste

Grandezza, variazione e limiti in pixel, durata, entrata e uscita, ombra, e un
colore che ruota («arcobaleno») mai, sempre o durante l'hype train.

## Chi fa cosa

- **Il bot** decide chi passa (livello, esclusi, comandi), e manda all'overlay
  il messaggio con le emote di Twitch già risolte (`tipo: 'muro'`), le
  esplosioni (`tipo: 'muro-esplodi'`) e l'hype train (per l'arcobaleno).
- **L'overlay** trova le emote nel testo (Twitch dal messaggio, 7TV dalla
  mappa del canale, emoji se accese), tiene combo e coda, e anima.
- **Il motore** (`src/web/public/muro.js`, `window.SB_MURO`) è lo stesso nella
  pagina dell'overlay e nello Studio: le traiettorie che vedi nell'anteprima
  sono quelle della diretta, non un'imitazione.

## Anteprima = diretta

Lo Studio mostra l'area del muro con un giro di emote d'esempio che si muovono
con le animazioni accese, con lo stesso motore: `SB_MURO.lancia` e
`SB_MURO.esplosione` costruiscono e muovono le emote sia nella pagina
dell'overlay sia sulla tela. Spento, o col movimento ridotto, il muro sulla
tela e' fermo: sei emote posate, sbiadite come ogni elemento spento. Il pannello ha un tasto
«Prova» per ogni esplosione, che la manda all'overlay vero come fa un evento.
Il cancello dell'anteprima misura l'area sulla tela e in onda.

## Le prove

`test/unita/muro.test.mjs`: ogni animazione e ogni figura, con generatori ai
due estremi e con molti semi, sotto aree larghe, alte, piccole e strette:
ogni traiettoria resta nell'area dove deve, un rimbalzo tocca il fondo a ogni
urto e non lo passa, una piramide ha i gradini giusti, una scritta ha i punti
delle sue lettere, i fuochi hanno le direzioni equidistanti. Poi le regole di
chi passa, la coda e le combo.
