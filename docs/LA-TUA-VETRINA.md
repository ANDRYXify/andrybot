# La tua vetrina, nel pannello

«La tua vetrina» raccoglie quello che il mondo vede di te fuori dalla chat.
Dentro ci sono quattro lavori diversi, e ognuno ha il suo posto. (La pagina
pubblica di SocialBot è un'altra cosa: sta in `docs/VETRINA.md`.)

| lavoro | dove | cosa c'è |
|---|---|---|
| farti trovare | Pagina link, Donazioni | la pagina link e la diretta in prima pagina; la pagina delle donazioni col suo conto e le offerte |
| dire quando sei in onda | La tua settimana, Grafiche social | i giorni, i calendari, l'immagine da mandare |
| collegare i social | I tuoi social, in cima | Instagram e TikTok col tasto, il canale YouTube |
| annunciare | I tuoi social, sotto | un riquadro per ogni cosa da annunciare, e gli altri siti coi loro feed |

## Com'era, e perché si è cambiato

La scheda si chiamava «Avvisi» ed era divisa in sotto-schede, una per rete. I
riquadri comuni (i feed, un rimando a Discord, la promo in chat) stavano fuori
dalle sotto-schede, e quindi comparivano identici sotto ognuna. Il tasto di
Instagram stava dentro il riquadro dell'annuncio, al terzo posto, sotto un
riquadro che spiegava ancora come arrangiarsi senza le API ufficiali: era vero
prima del tasto, e ne diceva il contrario.

Adesso:

- **I tuoi social** è una pagina sola. In cima «I tuoi account», dove ogni rete
  dice com'è messa (collegata, da ricollegare, manca un permesso) con il tasto
  per rimediare. Sotto un riquadro per ogni annuncio. In fondo «Altri siti», per
  chi non ha un tasto. Gli annunci su Discord si scelgono nella sezione Discord:
  qui c'è una riga che ci porta, non un riquadro.
- **La promo social in chat** è una cosa che il bot dice da solo in chat, come
  «si fa vivo da solo»: sta nel riquadro Personalità e si salva con lui.
- **La pagina delle donazioni** si modifica nella scheda Donazioni. L'editor è
  lo stesso della pagina link, ma ogni pagina ha la sua casa (`lp-box` e
  `lp-box-dona`): quando si apre in una, l'altra si svuota, così non esistono
  mai due editor con gli stessi id.
- **La diretta in prima pagina** sta accanto alla pagina link, non in Stato.

## Le cose che si ripetevano in ogni scheda

- «Apri tutto / Riduci tutto» compare solo dove i riquadri sono almeno quattro:
  con meno, aprirli uno per uno è altrettanto rapido.
- «Come funziona» si apre da solo la prima volta che entri in una scheda, e
  resta aperto per quella visita. Dalla volta dopo resta chiuso finché non lo
  apri tu: la tua scelta, aperto o chiuso, vince sempre.

## Cosa lo tiene

`test/contratto/riordino-vetrina.test.mjs`: gli account in cima, l'ordine dei
riquadri, nessun riquadro ripetuto, nessuna sotto-scheda, la promo con la
personalità, la diretta in prima pagina con la pagina link, il vecchio testo
su Instagram che non torna. `test/contratto/donazioni.test.mjs` tiene le due
case dell'editor.

## L'icona della pagina

Nella scheda del browser, e sulla schermata home di chi la salva, la pagina link
(e quella delle donazioni) ha come icona la foto che mostra in alto: quella
caricata, o quella di Twitch servita dalla nostra origine. Chi ha scelto di non
mostrare nessuna foto tiene l'icona del sito: l'icona dice di chi è la pagina,
e non si mette una faccia che la pagina stessa ha tolto. Sta in
`src/features/linkpagina.js`, e il test è in
`test/contratto/anteprima-link.test.mjs`.

