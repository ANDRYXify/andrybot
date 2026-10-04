<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

## La diretta in corso non esisteva nei numeri

I numeri delle dirette si sommano dai **rapporti**, e un rapporto si scrive
quando la serata finisce. Finche' eri in onda la scheda diceva zero dirette,
zero minuti, zero picco — mentre i messaggi in chat, che sono righe nel
database, salivano. Da fuori sembrava rotta, e in un certo senso lo era: stava
raccontando la settimana senza la sera che stavi facendo.

La serata in corso arriva **da fuori**, da chi la sta gia' tenendo in mano: il
rapporto, che durante la diretta tiene in memoria inizio, picco e media
(`rapporto.inCorso`). Qui non nasce una seconda contabilita' della stessa cosa,
che sarebbe un secondo posto in cui il picco puo' essere diverso.

Quello che aggiunge e' solo la sua **parte dentro la finestra**: una serata
cominciata prima dei sette giorni e ancora accesa non porta dentro le ore di
prima, porta quelle da quando comincia il periodo. Il picco e' il **piu' alto**
fra quello dei rapporti e quello di adesso, non la somma.

Nel pannello i tre riquadri che cambiano mentre sei in onda (dirette, in onda,
picco) portano il segno «adesso», e finche' la diretta c'e' la scheda si rilegge
da sola ogni mezzo minuto — e solo allora: a diretta spenta non chiede niente a
nessuno, e nemmeno con la finestra in secondo piano.

## Una serata, piu' piattaforme

Chi trasmette insieme su Twitch e su Kick fa UNA serata, non due: si apre col
primo «in onda», di qualunque piattaforma, e si chiude con l'ultimo «fine»
(`features/rapporto.js`). Dentro, ogni piattaforma tiene i suoi numeri (inizio,
tempo in onda, picco, media), e quelli della serata si ricavano da quelli senza
contare niente due volte:

- **il picco** e' il massimo della SOMMA presa nello stesso momento: a ogni
  giro si sommano gli ultimi spettatori di ogni piattaforma ancora in onda, se
  sono di questo giro (`FRESCO_MS`, sei minuti). Non e' la somma dei picchi:
  100 su Twitch alle nove e 80 su Kick alle dieci non sono mai stati 180;
- **la media** e' la somma delle medie, ognuna pesata sul tempo che quella
  piattaforma e' stata in onda. Con una sola piattaforma e' la sua media;
- **il tempo in onda** della serata va dal primo inizio all'ultima fine; quello
  di ogni piattaforma e' il suo, e se si ferma e riparte dentro la serata (Twitch
  che cade mentre Kick continua) il tratto di prima resta.

Una diretta nuova sulla stessa piattaforma e' una serata nuova solo se
nessun'altra e' in onda: se no e' la stessa serata, ripresa li'.

Nelle statistiche una serata conta una volta nelle dirette del canale e una
volta in ognuna delle sue piattaforme, con le ore e il picco di quella. I
rapporti scritti prima che il rapporto le distinguesse sono di Twitch per
costruzione: allora solo Twitch li scriveva. Nel pannello la riga «Per
piattaforma» e la colonna «Dove» compaiono solo quando c'e' qualcosa da
distinguere; il rapporto nomina le piattaforme solo quando sono piu' d'una.

Collaudi: `test/unita/rapporto-piattaforme.test.mjs` (picco come somma nello
stesso momento, media pesata, numeri vecchi e piattaforme finite fuori dalla
somma, tratti che si sommano, serata nuova), `test/unita/statistiche.test.mjs`
(una diretta nel canale e una per piattaforma; i rapporti di prima sono di
Twitch; la serata in corso per piattaforma).
