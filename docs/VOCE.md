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
