# Il controller

Quattro difetti, tutti misurati con un gamepad finto (`navigator.getGamepads`
sostituito): `scratchpad/t_pad3.mjs`.

## 1. Il pad nascondeva l'anello e poi ci puntava

`segnaPad()` chiamava `SB_CURSORE_VIS(false)`, che mette `body.senza-cursore` e
quindi `opacity: 0 !important` su `#an-cursore-ring`. Subito dopo,
`aggiornaAnello()` chiamava `SB_CURSORE.versoElemento()` per **spostare
quell'anello** sull'elemento a fuoco. L'anello si muoveva davvero: era
invisibile. Da qui «col controller non si muove il cursore».

La causa vera e che `senza-cursore` voleva dire due cose diverse — «il puntatore
non c'e» e «nessuno sta guidando il cursore» — e tre moduli se la contendevano
(`cinema.js` la mette sulla navigazione da tastiera, `plancia.js` sulle
levette, `pilota.js` su ogni input del pad).

Adesso la decisione sta in **una regola sola**, e dice quello che intende:

```css
body.senza-cursore:not(.nav-indiretta) #an-cursore-ring, … ,
body.plancia-on #an-cursore-ring, … { opacity: 0 !important; }
```

Quando la navigazione e **indiretta** (pad o frecce) l'anello *e* l'indicatore
di fuoco, quindi si vede. Dentro la Plancia no: li il fuoco lo mostrano le
piastrelle. `pilota.js` non tocca piu la visibilita: un padrone solo.

## 2. Due moduli sullo stesso tasto

`plancia.js` e `pilota.js` interrogano lo stesso gamepad in due cicli separati.
Con la Plancia **chiusa** il ciclo di `plancia.js` reagiva comunque al tasto A
(per aprire la console), mentre `pilota.js` lo usava per cliccare l'elemento a
fuoco. Premendo A succedevano **tutte e due le cose**: verificato: la Plancia si
apriva *e* pilota cliccava.

Il protocollo ora e esplicito: **la Plancia possiede il pad quando e aperta, il
pilota quando e chiusa.** L'unica eccezione e A-per-aprire, che resta a
`plancia.js` ma solo se il pilota non e attivo (`SB_PILOTA.stato()`). Con il
pilota attivo la console si apre col tasto Menu, che era gia mappato li.

## 3. Gli indici valevano anche quando non volevano dire niente

Il codice leggeva `axes[3]`, `buttons[12..15]` eccetera senza guardare
`gamepad.mapping`. La specifica dice che quegli indici hanno un significato
**solo** con `mapping === 'standard'`; con qualunque altro pad sono numeri a
caso — e molti controller riportano i **grilletti** su assi che a riposo stanno
a **−1**.

Misurato: con `mapping` non standard e assi a `-1`, la pagina **scorreva da sola
di 380 px** senza toccare niente. Ecco «si muove random tutto».

Ora tutto cio che dipende dagli indici e sotto `mapping === 'standard'`. Restano
sempre validi solo gli assi 0 e 1 (levetta sinistra), che sono universali.

## 4. Nessuna zona morta vera

`if (Math.abs(ry) > 0.3) scrollBy(0, ry * 16)` — una soglia secca. Appena la
levetta la supera di un soffio la pagina parte a `0,3 × 16 = 4,8 px` per
fotogramma, e una levetta consumata sta a riposo proprio li intorno.

Adesso c'e una zona morta **con riscalatura**, quella standard:

```js
function zonaMorta(v, soglia) {
  var a = Math.abs(v);
  if (!(a > soglia)) return 0;
  return (v < 0 ? -1 : 1) * (a - soglia) / (1 - soglia);
}
```

Appena sopra la soglia la risposta riparte da **zero**, non da 0,3. Piu due
cose: la velocita e legata al **tempo** e non ai fotogrammi (su uno schermo a
120 Hz scorreva il doppio), e lo scorrimento e `behavior: 'instant'` — con
`html { scroll-behavior: smooth }` ogni micro-scorrimento veniva animato e il
movimento risultava molle.

## Il puntatore: la levetta guida il cursore

Navigare saltando da un elemento all'altro va bene per una lista, ma su una
pagina vera e scomodo: se il salto non trova quello che vuoi, sei bloccato.

La mossa giusta non e costruire un secondo sistema accanto al cursore: il
cursore **e gia guidato da `pointermove`**. Quindi il pad diventa una **sorgente
di puntatore**, e tutto cio che gia reagisce al mouse — l'anello che si deforma
sugli elementi, il campo magnetico dello sfondo, gli stati degli elementi —
reagisce a lui senza sapere che c'e un controller.

`muoviPuntatore()` tiene una posizione `pX,pY`, la limita alla finestra e
manda i veri eventi `pointerover` / `pointerenter` / `pointermove` /
`pointerout` / `pointerleave` sull'elemento sotto. Se sotto c'e qualcosa di
interattivo, chiede all'anello di posarcisi sopra (`versoElemento`); se no lo
lascia libero. A preme: `pointerdown`, `pointerup`, `focus`, `click` nel punto.

**La velocita e al quadrato della pendenza** (`forza * forza`): vicino al centro
si muove piano e si prende la mira, a fondo corsa vola. Il fondo scala e legato
al lato piu lungo della finestra (`×1,15` al secondo) cosi il tocco e lo stesso
su qualunque schermo, ed e legato al **tempo**, non ai fotogrammi.

I comandi restano completi:

| | |
| --- | --- |
| levetta sinistra | muove il **puntatore** |
| tasti direzionali | **saltano** da un elemento all'altro (utile nei moduli) |
| A | clicca dov'e il puntatore, o attiva l'elemento a fuoco |
| levetta destra | scorre |
| LB / RB | sezione precedente / successiva |
| Menu | apre la Plancia |

## Un difetto trovato mentre lo si costruiva

L'anello restava invisibile anche dopo le correzioni. Con una sonda su
`SB_CURSORE_VIS` si e visto il perche: `plancia.js` chiamava `(false)` **a ogni
fotogramma** e `pilota.js` `(true)` a ogni fotogramma. Si contendevano lo stesso
interruttore sessanta volte al secondo.

Quella chiamata era anche **inutile**: la classe `plancia-on` gia nasconde
l'anello via CSS. Tolta: la regola dichiarativa decide, nessuno la contraddice
a mano. Verificato — opacita **1** mentre si muove la levetta e anche tre
secondi dopo averla mollata.

## Il difetto che rendeva vano tutto il resto

«Il cursore sparisce, non morpha, col controller non va nulla.» I miei collaudi
passavano, quindi mi mancava una condizione. Era in `cinema.js`, tre righe:

```js
function avvia() {
  sfondo();
  if (menoMoto || leggero) return;                     // ← 1 e 2
  if (matchMedia('(pointer: fine)').matches) motore(); // ← 3
}
```

Tre cancelli, e bastava uno solo:

1. **«riduci animazioni»** attivo nel sistema operativo — comunissimo;
2. **dispositivo giudicato debole**: basta che il browser dichiari `deviceMemory
   ≤ 4` o `hardwareConcurrency ≤ 2`, oppure risparmio dati, oppure rete lenta;
3. **nessun puntatore «fine»** — e un **controller non e un puntatore fine**.

In ognuno di quei casi il motore del cursore **non partiva affatto**: l'anello
non veniva nemmeno creato, e `window.SB_CURSORE` restava lo stub inerte

```js
{ versoElemento: function () { return false; }, libera: function () {} }
```

Da cui, esattamente: il cursore **sparisce** (l'elemento non esiste), **non
morpha** (`versoElemento` risponde `false` e basta), e col controller **non va
nulla** — i clic partivano, ma senza vedere dove stavi puntando.

### La correzione

L'anello ha due ruoli, e li stavamo trattando come uno solo. Come **decorazione**
deve rispettare «riduci animazioni» e i dispositivi deboli. Come **indicatore
del puntatore e del fuoco** per chi naviga col pad o da tastiera **deve esistere
sempre**: non e un vezzo, e il puntatore.

Quindi il motore parte **sempre**, e cio che «riduci animazioni» e i dispositivi
deboli spengono e la **fisica**, non l'esistenza:

```js
var secco = menoMoto || leggero;
function integra(m, meta, dt, w, z) {
  if (secco) { m.p = meta; m.v = 0; return meta; }   // niente molle: si posa e basta
  …
}
```

Il campo ambientale dello sfondo — quello si e pura decorazione — resta spento
quando `secco`. E il cancello `pointer: fine` sparisce: l'anello nasce a
`(-200,-200)`, fuori schermo, e resta invisibile finche qualcosa non lo guida;
il tocco e gia ignorato a parte. Non serviva un permesso, bastava non muoverlo.

### Collaudo

`scratchpad/t_cursore.mjs` guida il puntatore col pad finto fino a un bersaglio
e controlla che l'anello **esista, si veda, si deformi e ci arrivi** — in tutte
e cinque le condizioni:

| condizione | prima | dopo |
| --- | --- | --- |
| normale | funziona | funziona |
| «riduci animazioni» | **anello assente** | c'e, opacita 1, si deforma |
| dispositivo debole | **anello assente** | c'e, opacita 1, si deforma |
| nessun puntatore fine (solo pad) | **anello assente** | c'e, opacita 1, si deforma |
| tutte e tre insieme | **anello assente** | c'e, opacita 1, si deforma |

## Collaudo

`scratchpad/t_pad3.mjs`, con gamepad finto:

1. l'anello del fuoco ha **opacita 1** mentre si usa il pad;
2. premendo A la Plancia **non** si apre (un gestore solo);
3. levetta ferma a 0,30: la pagina si muove di **0 px**;
4. pad non standard con assi a −1: **0 px** e nessuna finestra che si apre;
5. i tasti direzionali muovono ancora il fuoco (non ho rotto la navigazione).

`scratchpad/t_punt.mjs`, sul puntatore:

1. la levetta genera veri `pointermove` e il puntatore si sposta;
2. si ferma ai bordi della finestra, non esce;
3. portandolo sul bersaglio, `elementFromPoint` **e** il bersaglio, l'anello e
   li sopra con opacita 1, e premendo A il bersaglio riceve il clic;
4. i tasti direzionali muovono ancora il fuoco.
