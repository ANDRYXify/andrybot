# Un moto solo, che risponde a una domanda sola

> «Tutte le animazioni del sito ad ora sono incoerenti e troppo lente e
> macchinose… ad ora sparisce la pagina e poi ricompare rimbalzando, scattando
> o raddoppiando l'animazione.»

## Il difetto, contato

Cambiare **sotto-scheda dentro la stessa pagina** — da *Personalità* a
*Conoscenza*, che sono due schede dello stesso «Il bot» — faceva partire
**ventisette animazioni**: esattamente le stesse di un cambio di pagina intero.

| | animazioni che partono |
|---|---|
| cambio sotto-scheda (stessa famiglia) | **27** |
| cambio sezione (pagina diversa) | 25 |

Numeri quasi identici per due gesti che non hanno niente in comune. La
sensazione di «raddoppio» era letterale: partivano insieme la transizione di
vista, la comparsa a scaglioni delle carte, e la testata che si riscriveva
lettera per lettera — **anche quando il titolo era lo stesso titolo**.

## La regola

**Il moto risponde a: quanto è cambiato?**

| cosa è cambiato | cosa si muove |
|---|---|
| un valore (interruttore, cursore) | niente, o 120ms di colore |
| **il contenuto filtrato, stessa pagina** | **uno scambio da 150ms, e basta** |
| la pagina | uno scorrimento con direzione, ~220ms |
| qualcosa è arrivato (avviso, alert) | la sua entrata |

Non è una preferenza estetica: è che **due gesti diversi devono sentirsi
diversi**. Se cambiare scheda dentro una pagina costa quanto cambiare pagina,
l'interfaccia sta mentendo su cosa è successo.

## Cosa è cambiato

**Lo scambio dentro una famiglia non passa più dal cambio pagina.**
`vaiAScheda` si biforca: se la scheda nuova sta nella stessa famiglia di quella
vecchia, non c'è transizione di vista, non c'è comparsa da riarmare, non c'è
testata da rivelare da capo. Solo le carte nuove che salgono di quattro pixel in
150 millisecondi.

**Il titolo uguale non si riscrive.** Se il testo dell'`h1` è identico a prima,
prende la classe `fermo` e le sue lettere non rifanno l'animazione d'ingresso.
Prima «Il bot» si riscriveva lettera per lettera ogni volta che passavi da una
scheda all'altra dello stesso bot.

**La scala dei tempi si è accorciata di circa la metà.** Era tarata per stupire
alla prima visita, non per un gesto che si ripete cento volte al giorno:

| | prima | adesso |
|---|---|---|
| `--t-lieve` | 290ms | **120ms** |
| `--t-medio` | 414ms | **220ms** |
| `--t-pieno` | 621ms | **320ms** |
| `--t-scena` | 808ms | **420ms** |
| lo scambio | — | **150ms** |

**Il contenuto non rimbalza più.** Le curve `--molla-*` sforano oltre l'1
(rimbalzano): giuste per un accento, sbagliate per una pagina intera che si
muove. Il contenuto usa ora `--ease-entrata`, che arriva e si ferma. Le molle
restano dove servono: i pulsanti, le levette.

## Il risultato, contato

| | prima | adesso |
|---|---|---|
| cambio sotto-scheda | 27 animazioni | **3** |
| cambio sezione | 25 | 25, ma è **una** transizione coordinata |

## Il cancello

`t_moto.mjs` verifica che:
- cambiare sotto-scheda **non avvii** nessuna transizione di vista e resti sotto
  le sei animazioni;
- la testata non torni in stato «entra» e il titolo uguale porti `fermo`;
- cambiare sezione avvii **una** transizione, con la sua direzione;
- i tempi restino nel budget (nessuno sopra il mezzo secondo);
- nessuna curva con rimbalzo sia usata sul contenuto.

L'ultimo controllo è quello che regge tutti gli altri: è facile aggiungere
un'animazione in più, e ogni volta la somma cresce senza che nessuno se ne
accorga. Il gate conta.
