# Il banco di regia

L'editor degli overlay: com'è fatto e perché.

## Il difetto di partenza

Misurato sullo Studio com'era, a 1440×950:

| | |
|---|---|
| comandi nella pagina | 165 |
| fuori dalla prima schermata | **150** (il 91%) |
| dove cominciava la tela | 1543px |
| dove cominciavano le proprietà | 2564px |

L'ultimo numero è quello che decide. Fra la tela e i comandi che la modificano
c'erano **più di mille pixel su uno schermo alto 950**: non una questione di
preferenze, ma l'impossibilità aritmetica di vedere quello che stai cambiando
mentre lo cambi.

Il difetto non era il numero di comandi — un editor ne ha legittimamente tanti —
ma che fossero disposti come **un testo da leggere dall'alto in basso** invece
che come un banco su cui lavorare.

## La regola

**Il banco occupa l'altezza dello schermo e non scorre mai.** Se un pannello ha
più roba di quanta ne entra, scorre quel pannello — non la pagina. La tela non
può uscire dal campo visivo, perché è l'unico posto dove si vede l'effetto di
quello che si sta facendo.

Adesso, alla stessa misura: **28 comandi su 28 raggiungibili senza scorrere**, e
la pagina è passata da 2282px a 541.

## Com'è disposto

```
┌─ Overlay [▾] · Nuovo… · Copia link OBS ·─────── Salva overlay ─┐
├─ annulla/ripeti · allineamenti · griglia · zoom ─────────────────┤
│  ┌─ livelli ─┐                                                    │
│  │         │              t e l a              ┌─ proprietà ─┐    │
│  └─────────┘          (tutta l'area)          └───────────┘    │
├─ X · Y · dimensione · rotazione ─────────────────────────────┤
```

**In cima, il selettore dell'overlay.** È la prima domanda che si fa chi apre il
banco — *quale* overlay sto modificando — e prima la risposta stava in un'altra
carta, sopra, fuori dal banco. Accanto ci sono le tre cose che si fanno su un
overlay intero: crearne uno nuovo, copiarne il link OBS, salvarlo.

**La tela prende tutta l'area.** I pannelli non gliela tolgono: le galleggiano
sopra. Con le colonne fisse di prima la tela restava un francobollo fra due
barre sempre presenti, anche quando non servivano — e su una finestra normale
erano 456 pixel di larghezza spesi in pannelli che il più delle volte stanno
fermi.

**I pannelli si spostano.** Ognuno ha un'intestazione che fa da maniglia, si
può arrotolare, e ricorda dove l'hai messo fra una sessione e l'altra. Restano
sempre dentro la scena: senza il limite si può spingere un pannello fuori dai
bordi e non riprenderlo più.

- **I livelli**, con le coordinate e l'occhio per accendere e spegnere. È anche
  l'ordine di sovrapposizione.
- **La tela**, in scala reale: lo stage è 1920×1080 virtuali, ridotto con una
  trasformazione. Così ogni misura in pixel resta proporzionata a quello che
  uscirà davvero in OBS.
- **Le proprietà** del livello **selezionato**. I novanta campi di alert, chat e
  widget non stanno più tutti nella stessa pagina: se ne vedono una decina,
  quelli che riguardano ciò che hai in mano. Quando non c'è selezione il
  pannello resta al suo posto e dice cosa fare — un pannello che appare e
  scompare farebbe ballare la tela a ogni clic.
- **In basso** le coordinate esatte. Non è un dettaglio: trascinare va bene per
  la posizione approssimativa, ma «X 120, Y 64» scritto e modificabile è l'unico
  modo di allineare due cose davvero.

Su schermo stretto (sotto i 760px) i pannelli galleggianti coprirebbero la tela:
tornano in colonna sotto di essa, e la tela resta comunque tutta in vista.

### Trascinare non può essere l'unico modo

**Doppio clic sull'intestazione e il pannello torna al suo posto.** È
l'alternativa al trascinamento richiesta dalla WCAG 2.2 — criterio 2.5.7,
*Dragging Movements*: ogni funzione che si ottiene trascinando deve potersi
ottenere anche con un solo puntatore senza trascinamento. Ed è anche il modo di
recuperare un pannello finito in un angolo scomodo.

Il tasto per arrotolare è 26×26 pixel: sopra il minimo di 24×24 del criterio
2.5.8, *Target Size (Minimum)*.

## Via i «modelli»

C'erano due nomi per la stessa cosa. Un **modello** era «una configurazione di
aspetto e disposizione salvata con un nome»; un **overlay** è «una
configurazione di aspetto e disposizione, con un link OBS». La differenza vera
era solo il link — e un modello senza link non serve a niente, perché un overlay
esiste per essere messo in OBS.

Tenerne uno solo **toglie un concetto** invece di aggiungerne. Chi voleva salvare
un look da riusare adesso duplica l'overlay, che era già possibile e fa la stessa
cosa in modo più diretto.

I cinque preset pronti — Viola classico, Neon, Minimal chiaro, Retro arcade,
Manga — restano, ma cambiano ruolo: non sono più qualcosa da «applicare» a un
overlay esistente (col rischio di cancellare senza volerlo il lavoro fatto),
sono il **punto di partenza** quando ne crei uno nuovo. La domanda «parti da»
è nella stessa finestra in cui gli dai il nome, e il preset viene cotto dentro
l'overlay appena nato: da quel momento è roba sua, non c'è più nessun legame da
mantenere.

## I difetti di posizionamento

Il direttore ha segnalato che «la chat portata sull'estremo lato destro va a
schiacciarsi». Misurando tutti e quattro gli elementi in nove posizioni sono
emersi **due** difetti, di cui il secondo nessuno aveva notato.

### La chat si schiacciava

Confermato e quantificato: da **53 pixel di larghezza a 9**, con l'altezza che
passava da 18 a 177 perché il testo andava a capo una lettera per riga.

La causa: un elemento in posizione assoluta senza larghezza dichiarata la ricava
dallo spazio che resta fra il suo bordo sinistro e il bordo destro del
contenitore. A `left: 100%` quello spazio è **zero**, quindi si comprime al
minimo possibile. Il `translate(-100%)` successivo lo riportava dentro, ma ormai
era schiacciato.

Con `width: max-content` la larghezza dipende dal contenuto e non da dove si
trova — che è l'unica cosa sensata per un elemento che si può spostare ovunque.

### L'editor era «poco preciso», e c'era un motivo

Le animazioni di entrata degli alert (`slide`, `pop`, `zoom`, `flip`) dichiarano
una transizione **sul transform**: giusto, è così che entrano in scena in OBS.
Ma il posizionamento usa lo **stesso** transform.

Risultato: trascinando un elemento nell'editor, quello **inseguiva il puntatore
con quattro decimi di secondo di ritardo**. E con `pop`, la cui curva è
`cubic-bezier(.2, 1.5, .4, 1)`, girava intorno al punto invece di fermarcisi.

Il comportamento del trascinamento dipendeva da **quale animazione avevi scelto
per gli alert**, che non ha alcun senso. Nell'editor il transform non si anima
più: qui si posiziona, le animazioni si guardano col pulsante di prova.

### Una cosa che sembrava un difetto e non lo era

L'alert risultava sforare dalla tela di 43-48px in tutte le posizioni laterali.
Non è vero: il test stava misurando **durante** la transizione, e poi — tolta
quella — stava misurando la corsa fra sé stesso e l'app, che riscrive la
posizione dal proprio stato salvato. I valori oscillavano fra 4 e 80 pixel a
ogni ripetizione, che è il segno che si stava misurando rumore.

Resta quindi **non verificato** se l'alert sfori davvero ai bordi: per accertarlo
serve muoverlo attraverso l'API dell'editor, non scrivendogli addosso lo stile.

## Il collaudo

- `t_banco.mjs`: che i tre pannelli siano visibili insieme, che il banco non
  sfori dalla finestra e che i comandi siano raggiungibili senza scorrere.
- `t_preciso.mjs`: che l'elemento **segua** il puntatore invece di inseguirlo,
  per ognuna delle cinque animazioni, e che la chat non si schiacci ai bordi.
- `t_posiz.mjs`: la larghezza di tutti e quattro gli elementi in nove posizioni.

## Quattro difetti trovati misurando questa disposizione

### La tela stava larga, non intera

`scalaAnteprima()` scalava lo stage sulla **sola larghezza**. Andava bene finché
la tela era un riquadro 16:9 in una colonna; con la tela che prende tutta
un'area larga e bassa, uno stage scalato sulla larghezza risultava **766px alto
in un riquadro alto 399** — e siccome il riquadro centra il contenuto, la parte
che sporgeva in alto non era nemmeno raggiungibile scorrendo.

Adesso il riquadro si misura sul box vero, in tutti e due i versi:

```css
.ovl-tela { container-type: size; place-content: safe center; }
.ovl-tela #ovl-preview { width: calc(min(100cqw, 100cqh * 16 / 9) * var(--ovl-zoom)); }
```

`safe center` è la seconda metà della regola: centra finché ci sta, e appena il
contenuto sfora torna ad allinearsi all'inizio, così niente finisce in una zona
irraggiungibile. Vale solo sopra i 760px, dove la tela è un box di dimensione
certa; sotto, in colonna, si torna alla larghezza semplice.

### L'intestazione dei livelli spariva al primo clic

`_rendiLivelli()` riscriveva l'`innerHTML` del pannello — e con esso
l'intestazione che ne è la maniglia. Bastava selezionare un elemento e il
pannello dei livelli non si poteva più né spostare né arrotolare.

La regola, adesso scritta una volta sola: **chi veste un pannello gli dà un
corpo, e chi lo riempie scrive nel corpo**, mai nella radice.

```js
const _corpoPan = (el) => (el ? (el.querySelector(':scope > .pan-corpo') || el) : null);
```

### L'ispettore perdeva l'intestazione quando non c'era selezione

Una regola scritta prima che i pannelli avessero un'intestazione nascondeva
*tutto* tranne il messaggio «niente selezionato» — cappello compreso. Ora
cambia solo il contenuto del corpo: l'intestazione resta, perché è l'identità
del pannello e la sua maniglia.

### Il pannello poteva scendere sotto il fondo

Il limite del trascinamento teneva dentro solo 34px di intestazione, quindi un
pannello si poteva spingere per due terzi sotto il bordo. Adesso resta **intero**
dentro la scena; e siccome il suo `max-height` è già l'altezza della scena meno
24px, un pannello che non ci sta non esiste.

## Cosa è cambiato in numeri

Misurato a 1440×950, sulla stessa pagina:

| | prima | adesso |
|---|---|---|
| larghezza dell'area di lavoro | 1003px | 1400px |
| altezza della testata | 176px | 112px |
| la tela | 509×286 | **765×430** |

Più del doppio di superficie di lavoro, senza togliere un comando.

## Precisione

- **Frecce** per spostare la selezione di un pixel, **Maiusc+frecce** per dieci.
- **Esc durante un trascinamento** riporta l'elemento dov'era e chiude lì: è la
  via d'uscita che ci si aspetta a metà di un gesto sbagliato. Fuori da un
  trascinamento, Esc deseleziona — la stessa regola detta in un posto solo, con
  `_inTrascinamento` a dire quale dei due casi è.
- **Alt** durante il trascinamento sospende l'aggancio alle guide.
- **Canc** riporta l'elemento alla posizione standard.
- **Ctrl+Z / Ctrl+Y** annulla e ripete.

## Una pagina sola

Le sotto-schede — *Disposizione · I tuoi overlay · Aspetto* — sono sparite.
Erano una divisione dello stesso lavoro: per cambiare il colore di un alert e
poi rimetterlo a posto sulla tela bisognava cambiare scheda due volte.

L'ordine adesso è quello in cui si lavora:

1. **il banco**, alto quanto lo schermo, che è il motivo per cui si apre la sezione;
2. **i tuoi overlay**, col link OBS e la ricetta per OBS;
3. **l'aspetto**, quattro sezioni richiudibili — alert, chat, widget, CSS.

E il pannello delle proprietà porta un pulsante **«Colori, font, animazione…»**
che apre la sezione dell'elemento selezionato: dalla tela ai suoi colori in un
clic, senza cercarla.

## Il telefono

Il banco lavora in orizzontale. In verticale sotto i 620px, al suo posto compare
un cartello che dice di girare il telefono — **le altre carte restano**, così dal
telefono si copia comunque il link OBS e si cambiano testi e colori. In
orizzontale il banco c'è tutto: su uno schermo basso (sotto i 560px) la guida si
richiude, l'intestazione si stringe e la tela viene 477×268 su un iPhone messo
di lato.

## Il salvataggio

La barra in fondo — «hai modifiche non salvate» — esisteva anche quando il
pulsante **Salva** era lì, a venti pixel di distanza: due modi per fare la
stessa cosa, e quello più invadente copriva la pagina.

La regola adesso è una sola: **la barra offre un salvataggio che non hai già
sotto gli occhi.** Se il pulsante è nella parte visibile della pagina la barra
non c'è; se scorri e lo perdi di vista, torna. Si ripensa a ogni scorrimento e a
ogni ridimensionamento, perché è quello che cambia la risposta.

E se te ne vai con delle modifiche in sospeso — cambiando sezione, o chiudendo
la scheda del browser — te lo si chiede prima: **Salva ed esci · Esci senza
salvare · Resta qui**. La domanda sta su un solo passaggio, l'unico da cui si
cambia sezione, e prima di rientrarci azzera la condizione che l'ha fatta
scattare: non può ripetersi in cerchio.

### Un pulsante che urlava

`.btn.testo` — la variante quieta — era **nominata in nove regole e definita in
nessuna**. Chi la usava non otteneva un pulsante discreto: cadeva sul fondo
predefinito di `.btn`, cioè il colore d'accento, e diventava il pulsante più
gridato della finestra. Era il caso di «Annulla» nella barra di salvataggio: la
via d'uscita era la cosa più vistosa dello schermo.

Adesso `.btn.testo` esiste davvero: trasparente, testo tenue, e si accende
appena al passaggio del mouse.

## La barra in cima è «I miei overlay»

Le miniature degli overlay — un rettangolo con dei puntini a mostrare dove stanno
le cose — erano un secondo elenco della stessa lista che il menu in cima già
dava, e occupavano una fascia di pagina per dire meno di quanto dicano i nomi.
Sono sparite. Restano i **nomi**, nel menu, e accanto le quattro cose che si
fanno a un overlay intero: **Nuovo… · Rinomina · Duplica · Elimina**.

### Il link OBS sta nascosto

Il link è una **chiave**: chi ce l'ha può far comparire cose nel tuo overlay. Un
campo che lo mostrava in chiaro, largo quanto la carta, era un rischio ogni
volta che si condivideva lo schermo o si apriva la dashboard in diretta.

Adesso è un campo `password` in sola lettura: si vede che c'è, non si legge, e
il tasto accanto **lo copia lo stesso**. Un secondo tasto lo apre in una scheda.
La sicurezza non toglie l'uso.

## Ancora più tela

Tre tagli, tutti alla cornice e nessuno ai comandi:

| | prima | adesso |
|---|---|---|
| testata di sezione | 112px | 27px |
| guida sopra il banco | 49px | 0 (a richiesta) |
| barre e piede del banco | 140px | 122px |
| **la tela** | 797×448 | **925×520** |

La **guida** non sta più aperta sopra l'area di lavoro: c'è un **?** nella barra
che la apre e la richiude. Mentre lavori quei pixel sono tela; quando ti serve
la spiegazione, la spiegazione c'è. È la stessa idea dei pannelli galleggianti:
niente occupa spazio in permanenza per un uso occasionale.

Sommando tutto il percorso, dalla disposizione a colonne di partenza: la tela è
passata da **509×286 a 925×520** — tre volte e un terzo la superficie.

## Le icone erano tutte spostate a sinistra

Il direttore ha notato che le icone dei riquadri sembravano decentrate. Misurate
tutte e 65 dentro il loro `viewBox`, il disegno era a posto: gli scarti massimi
erano mezza unità su ventiquattro. Il difetto era altrove.

`.h-ico` e `.b-ico` portano un `margin-right` — serve a staccare l'icona dal
testo che le segue in un titolo o in un pulsante. Ma il margine **segue l'icona
anche dove testo non ce n'è**: in un riquadro che centra il suo contenuto, mezzo
margine di troppo a destra sposta tutto a sinistra. Erano **3,55px su un
riquadro da 38** nelle carte della vetrina, e 2,8px nei tasti del banco, nei
livelli, nell'occhio, nelle destinazioni Telegram.

Il difetto era già noto a metà: c'erano **cinque regole sparse** che rimettevano
`margin: 0` in cinque contesti diversi, una per ogni volta che qualcuno se n'era
accorto. Ogni nuovo riquadro nasceva sbagliato finché qualcuno non aggiungeva la
sesta. Adesso l'elenco è **uno solo**, e c'è la classe `.ico-sola` per chi ne
crea un altro.

Il collaudo che lo tiene: si scorre l'intera applicazione — vetrina più 24
sezioni — si cercano i contenitori che hanno dentro **soltanto** un'icona, e si
misura lo scarto fra il centro dell'icona e il centro del contenitore. Prima:
sei fuori centro. Adesso: zero.

## Contatori: una sezione che era due

`pannelloContatori()` emetteva `pannello('moduli', …)`, lo stesso identificatore
di `pannelloModuli()`: due `<section id="scheda-moduli">` nello stesso documento.

Funzionava per caso — entrambe prendevano la classe `visibile` insieme, quindi
si vedevano tutte e due — ma **tutto ciò che cerca la sezione per id o con
`querySelector` ne trovava solo la prima**: la barra di salvataggio non vedeva
il pulsante dei contatori, e la comparsa non animava le sue carte.

I contatori sono carte della sezione Comandi, non una seconda sezione: adesso
`carteContatori()` restituisce le carte e `pannelloModuli()` le include.
