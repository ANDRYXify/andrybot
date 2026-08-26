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

## Collaudo

`scratchpad/t_pad3.mjs`, con gamepad finto:

1. l'anello del fuoco ha **opacita 1** mentre si usa il pad;
2. premendo A la Plancia **non** si apre (un gestore solo);
3. levetta ferma a 0,30: la pagina si muove di **0 px**;
4. pad non standard con assi a −1: **0 px** e nessuna finestra che si apre;
5. la levetta muove ancora il fuoco (non ho rotto la navigazione).
