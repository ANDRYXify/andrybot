# Luci, ombre e ritagli

## Il principio

Un'ombra o un bagliore non e un pezzo di layout: e **inchiostro che deborda**
dal riquadro dell'elemento. Viene tagliato ogni volta che un antenato apre un
riquadro di ritaglio — `overflow` diverso da `visible`, `contain: paint`,
`clip-path`, una maschera. Il difetto "tagliato a caso" nasce sempre li: un
contenitore ritaglia per un motivo (nascondere cio che scorre fuori) e nel
farlo mangia anche la luce, che non c'entrava niente.

La regola che seguiamo, quindi, e una sola:

> **Si ritaglia solo l'asse su cui si scorre. La luce e libera sull'altro.**

`overflow-x: clip` con `overflow-y: visible` e l'unica combinazione che lo
esprime davvero: con `hidden` la specifica costringe l'altro asse ad `auto`
(e nasce un contenitore di scorrimento indesiderato), con `clip` no.

## I due difetti trovati e sistemati

**La pista della Plancia.** `.pl-pista` aveva `overflow: hidden` e
`padding: 54px 0 16px`. La piastrella a fuoco ha
`box-shadow: 0 22px 50px -16px var(--acc)` e viene ingrandita di 1,3: il
bagliore arriva a ~16 px sopra e ~73 px sotto il bordo, ma sotto c'erano 16 px
di spazio. Misurato: **tagliato di 11 px sopra e 35 px sotto**. Ora la pista
usa `overflow-x: clip; overflow-y: visible` e il bagliore respira, mentre le
piastrelle che escono di lato restano tagliate come devono.

**Il separatore dei gruppi.** Era `.pl-tile.stacco::before` a `left: -26px`,
cioe *fuori* dalla piastrella — che pero ha `overflow: hidden` (le serve, per
il riflesso che le scorre dentro). Risultato: quel separatore **non si e mai
visto**. Non era un problema di ritaglio da allentare: era un pezzo messo nel
posto sbagliato. Un separatore sta *fra* due gruppi, non appeso a una
piastrella. Ora e un elemento vero, `<span class="pl-sep">`, fratello delle
piastrelle dentro la rotaia: nessun antenato lo puo piu mangiare.

## Come si controlla

`scratchpad/luci3.mjs` gira su tutta l'applicazione (vetrina, le 24 schede
della dashboard in demo, la Plancia, la ricerca). Per ogni elemento con
`box-shadow` calcola il riquadro d'inchiostro — `blur + spread ± offset` per
lato — poi risale gli antenati e, **solo per gli elementi effettivamente
dentro il riquadro di ritaglio** (altrimenti conterebbe le piastrelle gia
fuori schermo), verifica che l'inchiostro ci stia. Oggi risponde: zero.

## Perche niente `content-visibility: auto`

E il consiglio standard per alleggerire il layout delle sezioni sotto la
piega, ma applica `contain: paint`: ritaglierebbe di nuovo tutto. Non si usa.

## Il difetto gemello: la pagina che si sposta di lato

Lo stesso ragionamento, al contrario. `.vt-scena::before` (l'alone caldo
dell'eroe) ha `inset: -30% -20% -10%`: deve debordare, e giusto cosi. Ma
debordando allungava la larghezza scorribile del documento, e la pagina si
poteva trascinare di lato di 48 px su desktop e 53 px su telefono.

La correzione non e stringere l'alone — sarebbe una toppa, e il prossimo
elemento decorativo rifarebbe il danno. E dichiarare una volta sola, alla
radice, che **l'estensione orizzontale della pagina e il viewport**:
`html { overflow-x: clip }`. `clip` e non `hidden`, cosi non nasce un
contenitore di scorrimento e `position: sticky` continua a funzionare
(verificato: la barra in alto resta incollata dopo 600 px di scorrimento).
