# La tavolozza

I colori del prodotto stanno in **un posto solo**: `src/web/public/tema.css`.
Chi ne ha bisogno li prende da lì — `var(--...)` nei fogli di stile,
`src/web/tavolozza.js` nel server e negli script che generano immagini.

Questo documento dice **da dove vengono** quei colori e **perché** la regola del
posto unico è l'unica che tiene.

## Vengono dal marchio, e sono stati misurati

Il disegno (`assets/marchio/sbot.png`) è **nero al 48%** e per il resto una
**rampa magenta**: `#a10022` → `#b10052` → `#c5008e` → `#cc00a7` → `#dc00d7`.
La media pesata dei pixel non neri è **`#ba007a`** — in OKLCH `L .52 · C .217 ·
H 350°`. Quella è la tinta d'identità: non «un magenta che somiglia», il magenta
che il marchio è.

Da lì scendono tutti gli altri, per costruzione:

| | chiaro | scuro | come |
|---|---|---|---|
| `--acc` | `#ba007a` | `#f72fa7` | stessa tonalità (350°), luminosità scelta sul contrasto del fondo |
| `--acc-600` | `#940060` | `#ff61b7` | un gradino: sul chiaro più scuro, sullo scuro più chiaro |
| `--su-acc` | `#ffffff` | `#1e0f18` | il colore **sopra** il pieno d'accento |
| `--acc-soft`, `--acc-tint`, `--acc-bordo` | | | `color-mix` sull'accento: non possono sfasarsi |

I **neutri** non erano coerenti: la carta era calda (tinta gialla, ~40°) mentre
l'accento sta a 350°, cioè quasi il complementare — due colori che si tirano.
Sono stati **ruotati sulla tonalità del marchio tenendo la stessa luminosità e
la stessa quantità di tinta di prima**: la pagina è tinta esattamente quanto era
tinta ieri, solo nella direzione giusta. Nessun contrasto è cambiato per effetto
della rotazione.

L'inchiostro fa eccezione: il marchio è nero + magenta, quindi il testo resta
**quasi neutro** (un quarto della tinta) invece di diventare malva.

## `--su-acc`: perché il bianco non basta

Sul tema chiaro l'accento è scuro e ci va il bianco sopra (6.24). Sullo scuro
l'accento **deve** essere chiaro per leggersi come testo su fondo nero — e a
quel punto il bianco sopra non si legge più (2.7). Un `color: #fff` scritto a
mano sa rispondere a un tema solo: sul vecchio tema scuro il bottone pieno era
infatti a **3.65**, sotto la soglia, e nessuno se n'era accorto.

Quindi il colore sopra il pieno è un token, e il cancello verifica che nessuno
lo riscriva a mano.

## L'alone del marchio segue il marchio

Il segno ha i contorni neri: sul fondo scuro perde il bordo e diventa una
macchia. L'alone glielo ridà. Era legato a **una classe** (`.marchio-segno`), e
il risultato prevedibile è che la vetrina — che il marchio lo disegna con una
classe sua — se l'era perso: stesso logo, stessa pagina, uno acceso e uno spento.

Ora la regola sta in `tema.css` e si aggancia **all'immagine**, non a chi la
mostra:

```css
:root[data-theme="dark"] img[src*="/icons/logo-"],
:root[data-theme="dark"] img[src*="/icons/marchio"] { filter: drop-shadow(...); }
```

Una pagina nuova che mostri il marchio ha l'alone senza doverselo ricordare. Le
guide non caricano `tema.css`: si portano via **la stessa regola** da
`tavolozza.js` (`REGOLA_MARCHIO`) invece di riscriverla.

## Chi legge la tavolozza

| chi | cosa prende |
|---|---|
| `style.css`, `anime.css`, `vetrina.css`, `pagina.css` | `var(--...)` |
| `src/web/guide.js` | i token e l'alone, inline nelle pagine composte |
| `scripts/og.mjs` | i colori dell'anteprima social |
| `scripts/marchio.mjs` | il fondo delle icone di sistema |

## Il cancello

```
node scripts/verifica-tavolozza.mjs
```

Verifica quattro cose, e ognuna nasce da un difetto vero:

1. **Un posto solo.** Nessun altro foglio dichiara un colore della tavolozza su
   `:root`. Dentro `style.css` ce n'era una copia intera — 200 righe, viola,
   invisibile perché coperta da quella buona. Ridichiarare un token su un
   elemento resta lecito (lo schermo finto della vetrina è scuro in tutti e due
   i temi): quel che non si può è avere due tavolozze che si contendono la
   radice.
2. **Le copie inevitabili combaciano.** Il colore della barra del browser, il
   manifest e la schermata di avvio devono esistere *prima* che il CSS arrivi,
   quindi una copia ci vuole. Il cancello la confronta a una a una col token che
   rispecchia.
3. **Sopra il pieno d'accento c'è `--su-acc`**, non un bianco scritto a mano. Un
   velo (`color-mix`) non conta come pieno: sopra un velo il testo resta testo.
4. **I contrasti si misurano** (WCAG, tutti e due i temi): testo 4.5, testo
   tenue 3, accento 4.5 sul fondo e sul suo velo, `--su-acc` 4.5 sul pieno.
   Una tavolozza si può cambiare, ma non fino a rendere illeggibile una scritta.

Nel passarlo sono venute fuori quattro scritte che stavano sotto soglia da prima
del cambio — testo tenue a 2.39, verde e ambra sui loro fondi — e sono state
portate al minimo con lo stesso metodo: giù di luminosità quel tanto che basta,
tinta e croma invariate.
