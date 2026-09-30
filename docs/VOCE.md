<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# La voce di ogni canale

Chi guarda due canali con SocialBot oggi legge le stesse frasi: all'inizio
della diretta, per un follow, per un raid, nei giochi. Le risposte di
conversazione passano dal cervello, che conosce tono, carattere e il modo di
scrivere dello streamer; le frasi che il bot dice da solo sugli eventi invece
sono testi fissi, uno per evento, identici ovunque. E sono in italiano anche
per un canale inglese o spagnolo.

Non è una frase da cambiare: è il modello. Il bot ha **un frasario solo** e lo
usa uguale per tutti. Qui il piano per dargliene uno per canale.

## Il modello: momenti, varianti, voce

Ogni cosa che il bot dice da solo è un **momento** (`inizio-diretta`,
`follow`, `raid-arrivato`, `abbonamento`, `pubblicita-parte`, `fine-diretta`,
`gioco-vinto`...). Un momento ha:

- **varianti**, per ogni **lingua** (italiano, inglese, spagnolo) e per ogni
  **tono** (scherzoso, amichevole, serio): non una frase, una decina, scritte da
  persone, diverse davvero (non la stessa frase con una parola cambiata);
- **segnaposti** coi dati veri (`{nome}`, `{gioco}`, `{titolo}`, `{mesi}`,
  `{spettatori}`...).

Quale variante esce lo decide la **voce del canale**:

1. **Il seme del canale.** L'ordine in cui le varianti escono è un mescolamento
   fatto col nome del canale: due canali partono da frasi diverse e le girano in
   ordine diverso. Dentro un canale nessuna si ripete finché non sono uscite
   tutte. È deterministico (un hash, non `Math.random`): serve a variare, non a
   decidere se una cosa funziona.
2. **Il tono** scelto nella scheda Personalità.
3. **La lingua del canale**: quella del pannello dello streamer, o quella che
   sceglie per la chat.
4. **Gli ingredienti del canale**, quando ci sono:
   - il **nome della community** («la ciurma», «i gremlin»): un campo nuovo in
     Personalità, usato dove una frase parla a tutti;
   - le **emote del canale**: quelle che la chat usa di più (il bot le impara
     già) al posto delle faccine generiche;
   - i **tormentoni** dello streamer: frasi che dice spesso, da scegliere fra
     quelle che il bot ha imparato dalla sua chat, o scritte a mano.

## Lo streamer ha l'ultima parola

In Personalità una carta **«Le frasi del bot»**: tutti i momenti, in gruppi
(diretta, community, giochi, moderazione), ognuno con le frasi che uscirebbero
adesso nel suo canale. Per ogni momento:

- lasciare le nostre (che già cambiano col canale);
- aggiungerne di sue, che si mescolano alle nostre;
- usare solo le sue;
- spegnerlo, dove ha senso.

Con «Prova» si vede la prossima frase che uscirebbe, con dati di esempio.

## Un posto solo

Oggi le frasi stanno dove si usano, in decine di file. Si spostano in un
frasario solo (`src/features/frasario/` con un file per gruppo), e chi parla
chiede `voce.di(canale, 'follow', dati)` invece di scrivere la frase. Un
cancello controlla che:

- ogni momento abbia varianti in tre lingue e tre toni, e almeno un numero
  minimo per ognuno;
- ogni segnaposto usato da una variante esista fra i dati del momento;
- nessuna frase che esce in chat sia scritta fuori dal frasario (le chiamate
  `say()` con un testo fisso nei file del bot diventano rosse).

## In che ordine

1. Il motore (`voce.js`): scelta della variante per seme, niente ripetizioni,
   lingua, tono, ingredienti, frasi dello streamer. Prove: due canali non
   iniziano uguali; nessuna ripetizione prima del giro completo; stesso canale,
   stessa sequenza dopo un riavvio.
2. I momenti più visti per primi: inizio e fine diretta, follow, abbonamenti e
   regali, raid in arrivo e in uscita, Bit, hype train, pubblicità,
   shoutout, promemoria dei link; e l'avviso di diretta su Telegram e Discord.
3. La carta «Le frasi del bot» in Personalità, e il nome della community.
4. I giochi e il resto, a gruppi, fino a quando il cancello non trova più frasi
   fuori dal frasario.
5. Manuale (Personalità), novità, nelle tre lingue.

Il punto 2 chiude anche il difetto delle risposte in italiano ai canali inglesi
e spagnoli: la lingua fa parte della voce.

## Com'è fatto (punti 1, 2 e 3)

- **Il motore** è `src/features/voce.js`, con l'interfaccia scritta in testa:
  `voce.di(canale, momento, dati)` dà la frase o niente. Il frasario sta in
  `src/features/frasario/`, un file per gruppo (diretta, community, avvisi).
- **L'ordine del giro** è un ordinamento per impronta (canale, momento, numero
  del giro, frase): due canali partono da frasi diverse, nessuna torna prima
  che siano uscite tutte, il giro dopo non comincia dall'ultima. A che punto è
  sta nella tabella `voce_giri`, quindi un riavvio riprende dalla frase dopo.
- **Una frase è adatta se ha tutti i dati che nomina.** Un dato che a volte
  manca toglie le frasi che lo chiedono, non la voce: per questo il cancello
  pretende, in ogni lingua e tono, sei frasi che chiedono solo i dati che
  arrivano sempre e non dichiarano un genere. In chat non può finire un
  `{nome}` perché una frase senza il nome non viene scelta.
- **I segni** dentro una frase: `{nome}` un dato; `{bit|# bit|# bits}` un
  numero col suo singolare e plurale; `{o/a}` il genere di chi parla;
  `{:💜}` una faccina, che diventa un'emote allegra della chat se ce n'è una.
- **Gli avvisi** su Telegram e Discord hanno una riga della voce per diretta,
  la stessa nei due posti, col nome segnato e steso da ognuno nel suo formato.
  Un testo scritto dallo streamer per un posto vale ancora e vince.
- **I testi di prima** dell'hype train e della pubblicità sono passati una
  volta sola nelle frasi del bot: cambiati sono diventati «solo le mie»,
  svuotati «spento», quelli di serie le nostre frasi.
- **La carta «Le frasi del bot»** sta in Personalità e si salva con le
  impostazioni (`settings.voce`: il nome della community e, per momento, il
  modo e le frasi dello streamer).

## Come si porta un posto (punto 4)

1. Un momento nuovo nel frasario del suo gruppo: titolo e spiegazione per la
   carta in tre lingue, i dati con «sempre» o «a volte», i dati di prova, se
   si può spegnere, le frasi in tre lingue e tre toni.
2. Chi scriveva la frase chiama `voce.di(canale, 'momento', dati)` e tace se
   torna vuota.
3. Il file esce da `DA_PORTARE` in `scripts/verifica-voce.mjs` e `MASSIMO`
   scende di uno. Il cancello lo pretende quando il file non ha più frasi fisse.

Il cancello vede le frasi scritte dentro una chiamata che parla (`say`,
`parla`, `dillo`); non vede quelle composte prima e passate in una variabile.
Quelle sono, oggi:

- i mazzi della conversazione del cervello (`src/ai/brain.js`: saluti, «come
  va», ringraziamenti, «non lo so», le frasi su gioco, uptime e clip), e la
  firma a caso di `persona.colora`;
- gli annunci delle presenze, il rimborso del blackjack, i messaggi delle clip,
  dei contatori, dei moduli (i permessi mancanti), della console, del ponte dei
  giochi, dei plugin, il saluto al re dei Bit, il subathon;
- in `src/bot.js` l'annuncio di TikTok in chat, il «nuovo contenuto», il boss
  che arriva col raid;
- le frasi dell'arena delle emote (`src/features/arena.js`, `FRASI`: solo in
  italiano) e l'apertura dell'elenco dei giochi (`comandi-registro.js`,
  `APERTURE`);
- le frasi del negozio (`src/features/negozio.js`, `FRASI` e `frase()`): la
  lingua viene gia' da `linguaChat` e le monete da `moneta.js`, ma una frase
  sola per momento e nessun tono;
- la prova del webhook di Discord e gli avvisi dei post nuovi, che non sono
  dirette;
- le risposte dei comandi pronti che lo streamer può riscrivere: sono un
  secondo posto per le sue frasi, da unire alla carta quando si portano.
