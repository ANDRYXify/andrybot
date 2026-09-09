# Il genere con cui il bot parla di sé

Il bot scrive in chat **con l'account dello streamer**. In italiano non si può
dire «sono apparso» senza dichiarare un genere, e finora lo dichiarava a caso:
le frasi scritte a mano erano al maschile, quelle generate dal modello
cambiavano da una risposta all'altra. In un canale di una streamer stona, e da
fuori sembra che il bot non sappia chi è.

Adesso è un'impostazione, in Personalità: **Come parla di sé**.

## Le tre scelte

| scelta | cosa fa |
|---|---|
| **Non lo dice** (predefinito) | Gira la frase per non doverlo dire: «eccomi», «ti ascolto» |
| **Femminile** | «sono apparsa», «sono tutta orecchie» |
| **Maschile** | «sono apparso», «sono tutto orecchie» |

Il predefinito è «non lo dice» perché è l'unica scelta che non può essere
sbagliata su un canale che non l'ha ancora impostata.

## Come sta scritto nel codice

Le frasi portano il genere dentro, in un marcatore:

```
'{user} hai fatto il mio nome e sono appars{o/a} ✨'
'Ciao {user}, sono {tutto/tutta} orecchie 👂'
```

A sinistra il maschile, a destra il femminile. Il marcatore non può andare a
sbattere contro i segnaposto già in uso (`{user}`, `{nome}`, `{viewers}`):
quelli non hanno la barra dentro.

Una frase sola, senza un gruppo intorno, **non si marca: si riscrive**. «Non
sono riuscito ad aggiungere il brano» è diventata «Il brano non è stato
aggiunto», che è giusta in tutti e tre i casi e non ha bisogno di niente.

## Perché «non lo dice» è una scelta vera

Il neutro non è una terza forma dell'italiano. Non si ottiene con una lettera:
si ottiene **girando la frase**. Quindi con «non lo dice» il bot non risolve il
marcatore, **scarta la frase** e ne prende una che non dichiara niente.

Perché questo funzioni, ogni gruppo di frasi deve averne almeno una senza
marcatore — altrimenti «non lo dice» sarebbe il maschile con un altro nome. Non
è una cosa da ricordarsi: `test/contratto/genere.test.mjs` legge i gruppi dal
codice e boccia quello che li marca tutti.

## Dove si applica

In tre punti, e ognuno ha una ragione diversa:

1. **Quando si sceglie la frase** (`scegli` in `brain.js`). È qui che «non lo
   dice» può fare la sua parte, perché è l'unico momento in cui esistono ancora
   delle alternative.
2. **All'uscita** (`say` e `vocePer` in `bot.js`). È una rete: una frase marcata
   che arrivasse fin lì senza passare dallo scegli stamperebbe il marcatore in
   chat, e sarebbe un difetto che si legge da fuori. Applicare l'accordo due
   volte non fa danno, perché dopo la prima passata di marcatori non ne restano.
3. **Nelle regole che arrivano al modello** (`guide.applicabili` in `db.js`).
   Quasi tutto quello che il bot dice lo scrive il modello, non un elenco di
   frasi: se non glielo si dice, sceglie da sé ogni volta. La riga sta in testa
   alle regole dello streamer e **fuori dal conto delle dodici**, altrimenti la
   sua dodicesima regola sparirebbe per far posto a questa.

Il terzo punto è quello che pesa. I primi due coprono le frasi scritte a mano,
che sono una minoranza.

## Il collaudo

`test/contratto/genere.test.mjs`, dieci prove. Le quattro che contano davvero
sono state provate rosse rimettendo il difetto:

- un gruppo con tutte le frasi marcate (che lascerebbe «non lo dice» senza via
  d'uscita);
- l'accordo tolto dall'uscita;
- il salvataggio che si dimentica il genere;
- la riga che non parte più dalle regole del modello.

Le ultime tre sono **collegamenti**, non logica. La logica funzionava anche
prima di essere collegata, ed è il collegamento che manca in silenzio: è lo
stesso difetto che teneva lo streamer fuori dai duelli.

## Quello che resta da fare

Cinque gruppi di frasi scritte a mano in `brain.js` non li legge nessuno:
`COME_VA`, `CHI_SONO`, `GRAZIE`, `IMPROVVISO`, `SPONTANEE`. Sono definiti e mai
usati — quelle risposte le scrive il modello. Non li ho marcati, perché sarebbe
lavoro su codice morto. Vanno tolti o ricollegati, ed è una decisione da
prendere: sono la personalità scritta a mano contro quella generata.

## Il carattere, sulla stessa rotaia

Il genere dice *come parla di sé*. Il carattere dice *chi è*, e lo scrive lo
streamer con parole sue: «tagliente e sarcastica, ma mai cattiva», «dolcissima,
chiama tutti tesoro». Sta in Personalità, sopra il genere, ed è un campo libero
da 300 caratteri.

Viaggia dalla stessa parte: `guide.applicabili` in `db.js`. La ragione è la
stessa — sei punti del codice chiedono le regole al modello, e una cosa messa
dove le regole nascono vale anche per il settimo, quando ci sarà. Il carattere
sta **prima** del genere, perché chi il bot è viene prima di come parla di sé, e
tutti e due stanno **prima** delle regole dello streamer e fuori dal conto delle
dodici: se consumassero un posto, la sua dodicesima regola sparirebbe per far
spazio alle nostre.

Il tono (scherzoso, amichevole, serio) resta e non va in conflitto: quello decide
il registro, il carattere decide la persona. Uno può essere scherzoso e stronzo,
o scherzoso e dolce.

### Un collaudo che non bastava

Il primo collaudo che avevo scritto chiedeva che il carattere venisse **letto**
dalle impostazioni. Togliendo la riga che lo mette davvero nell'elenco, il
collaudo restava verde: la lettura c'era ancora, e il valore finiva nel nulla.

È esattamente il difetto che questo progetto insegue — una riga che sembra fare
qualcosa e non fa niente — scritto dentro il collaudo che doveva scovarlo. Ora
chiede il percorso intero: letto, messo nell'elenco, e l'elenco restituito.
Provato rosso su tutti e tre i punti.
