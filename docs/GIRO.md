<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# Il giro guidato

La prima volta che entri in una scheda, il bot te la fa vedere: a cosa serve,
cosa c'è dentro, e dove leggere di più. Passo passo, con la luce puntata sul
pezzo di cui sta parlando.

## Perché non è un elenco di tappe scritto a mano

Un tutorial invecchia peggio di un manuale. Un manuale sbagliato lo si legge
storto; un tutorial che indica un bottone che non c'è più fa concludere a chi lo
segue che **il prodotto è rotto**.

Quindi le tappe **non si scrivono**: si leggono dalla pagina nel momento in cui
il giro parte.

| tappa | da dove viene |
|---|---|
| **A cosa serve questa scheda** + la ricetta numerata | `GUIDE[scheda]` — la stessa che riempie la cartina «Come funziona», già in tre lingue |
| **una per carta**, con la luce sopra | le `.carta` visibili della scheda: titolo = il suo `h2`, riga = la sua prima frase |
| **Se ti serve di più** | `stato.aiuti[scheda]`, la guida o il manuale di quella scheda |

Se una carta sparisce, sparisce la sua tappa. Se ne nasce una, la tappa c'è
senza che nessuno la scriva. Non esiste uno stato in cui il giro punta al nulla.

### La scorciatoia, quando la frase automatica non basta

Una carta può dire la sua riga da sé:

```html
<div class="carta" data-giro="Qui decidi come parla il bot in chat.">
```

È facoltativo — senza, il giro prende la prima frase vera della carta (saltando
quelle fatte solo di pastiglie e bottoni). Serve solo dove la frase automatica
esce brutta, e si aggiunge in un attributo, senza toccare il giro.

## Quando parte

- alla **prima visita** a una scheda, dopo un indugio di 1,4 secondi — se stai
  solo sfogliando le schede non parte;
- **non parte** se stai già facendo qualcosa (un clic dentro al pannello lo
  annulla per quella visita, ma non lo segna come visto);
- **non si accavalla**: niente giro se c'è l'avviso della guida, il banner dei
  cookie o il benvenuto, e mai due giri a meno di 45 secondi l'uno dall'altro;
- **una volta sola** per scheda, ricordata in `localStorage` (`sb-giro`): nessuna
  utenza, nessun dato che esce dal browser.

Si rifà quando vuoi dal **«?»** in barra (e dal cassetto sul telefono): «Rifai il
giro di questa scheda».

## Due cose imparate misurando

**La luce insegue lo scorrimento.** La prima versione portava la carta in vista
con uno scorrimento morbido e poi posizionava il buco dopo un'attesa a occhio:
la luce cadeva **600 pixel più in basso** del bersaglio. Adesso la posizione si
ricalcola a ogni scorrimento (un fotogramma per volta), quindi non c'è nessuna
attesa da indovinare.

**Il giro non sopravvive a un cambio di scheda.** Le carte dell'altra scheda
sono nascoste: i loro riquadri diventano di larghezza zero e la luce cadrebbe
nel vuoto. Cambiando scheda il giro si chiude.

## Dove sta il codice

`src/web/public/app.js`: `tappeDi`, `apriGiro`, `disegnaTappa`, `muoviGiro`,
`chiudiGiro`, `riavviaGiro`. Lo stile in `anime.css` (`.giro-*`).
Il contratto è fissato in `test/contratto/giro.test.mjs`.
