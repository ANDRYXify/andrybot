# La penna

`src/web/public/penna.js` (`SB_PENNA`) calcola da zero i segni fatti a mano:
tratti, frecce, forme, ovali. Non disegna niente da sé: restituisce sagome
(percorsi SVG pieni) che chi la usa riempie su un canvas o in un SVG. È nostra,
senza librerie, così i segni sono nostri e uguali dappertutto.

## Un tratto

Un tratto non è una linea con uno spessore: è la sagoma piena che lascia una
punta che si muove. `tratto(guida, { larghezza, punta, seme, fino })`:

1. la guida (punti, curve di Bézier cubiche `{c: [p1, p2, p3]}` o quadratiche
   `{q: [p1, p2]}`) si ricampiona a passo costante lungo la lunghezza: ogni
   misura dipende da quanta strada ha fatto la penna, non da come è scritta la
   curva;
2. la mano trema poco e piano: uno spostamento lungo la normale fatto di
   rumore liscio, che si spegne ai due capi con un inviluppo sin(πu). Il segno
   parte e arriva ESATTAMENTE dove dice la guida: la punta di una freccia è la
   punta, non un pixel accanto;
3. lo spessore è la pressione (attacco, corpo, rilascio) per la punta:
   `pennarello` a scalpello (dipende dalla direzione del gesto), `china` quasi
   solo pressione, `matita` sottile e granulosa;
4. i due bordi hanno ognuno la sua ruvidità;
5. le estremità sono tonde e la sagoma si chiude.

Disegnare nel tempo è la stessa sagoma calcolata fino a una frazione `fino`
della strada.

## Le figure

- `freccia(guida)`: l'asta, poi le due alette che partono dalla punta esatta
  dell'asta e tornano indietro, un po' storte e diverse fra loro.
- `forma(x, y, w, h, { rag, angoli, bombatura })`: un riquadro disegnato a
  mano. Angoli spostati ognuno per conto suo (di serie fino all'1,2% del lato
  corto), lati appena curvi (0,6% della lunghezza), raggi diversi. Restituisce
  la guida chiusa (per riempire il foglio), la guida della china (che chiude
  oltre l'inizio) e `interno`, il rettangolo dove il contenuto sta di sicuro.
- `costruzione(forma)`: le quattro righe a matita che sbordano dagli angoli,
  quelle che si tirano prima di ripassare a china.
- `ovale(cx, cy, rx, ry, { giri })`: il cerchio che si fa intorno a una parola,
  poco più di un giro, col raggio che si stringe e appena inclinato.
- `percorso(guida)`: la guida come percorso SVG, per riempire una forma.

## Il seme

Tutto è a seme fisso: stesso seme, stesso segno. Il seme VARIA i segni, non
decide se sono giusti: dove parte e arriva un tratto, dove sta la punta di una
freccia, dove sta il contenuto di una forma lo dà la geometria, per
costruzione.
