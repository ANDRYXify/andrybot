<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Gli avvisi che leggono la diretta

Chiesto così: «in base al titolo o alla categoria che la live presenta,
sarebbe carino se gli alert si adattassero e sembrassero una frase omogenea,
tipo "Oh guarda, oggi pincopallo parlerà" (in base alla categoria che il bot
vede, qui ha inserito "parlerà" perché c'era just chatting o simili) "ma non
sembra troppo sicuro di cosa" (qui ha letto il titolo "boh" e si è mosso di
conseguenza) "andiamo a schiarirgli le idee!" Con link e informazioni della
stream».

## Il modello

L'avviso di diretta (Telegram, Discord: `src/features/avvisi.js`) ha una prima
riga scelta dal frasario (`avviso-diretta`), poi titolo, gioco e link. La riga
oggi non sa niente della diretta: dice «è in diretta su Twitch» qualunque cosa
succeda. La frase smart **è quella prima riga**, costruita dalla diretta. Il
resto dell'avviso (titolo, gioco, link, locandina) resta com'è: «con link e
informazioni della stream».

Una frase è fatta di quattro pezzi, scritti per stare insieme:

    [apertura] [attività] [umore], [chiusa]
    «Oh guarda, oggi Luna» «parlerà» «ma non sembra troppo sicura di cosa»: «andiamo a schiarirle le idee!»

- **L'attività viene dalla categoria.** Una categoria appartiene a una
  *classe* (chiacchiere, musica, arte, programmazione, cucina, sport, in
  giro, gioco); ogni classe ha i suoi verbi («parlerà», «suonerà»,
  «disegnerà», «programmerà», «giocherà a {gioco}»). Una categoria che non si
  riconosce è un gioco: «giocherà a {gioco}». Senza categoria: «è in diretta».
- **L'umore viene dal titolo**, e porta con sé la chiusa: le due metà di una
  stessa idea non si scelgono separate, se no «promette scintille… portatevi
  una tisana». Gli umori:
  - *incerto*: titolo vuoto, «boh», «?», «test», una parola senza lettere →
    «ma non sembra troppo sicur{o/a} di cosa» · «andiamo a schiarirgli le idee!»;
  - *domanda*: finisce con «?» → «e ha una domanda per voi» · «venite a rispondere!»;
  - *prima volta*: «prima volta», «first time», «blind», «primera vez» → «per
    la prima volta» · «venite a vedere come se la cava!»;
  - *sfida*: «ranked», «torneo», «speedrun», «boss», «finale» → «e punta in
    alto» · «fate il tifo!»;
  - *festa*: «compleanno», «subathon», «anniversario», «festa» → «e si
    festeggia» · «venite a festeggiare!»;
  - *calma*: «chill», «relax», «tranquill» → «con calma» · «portatevi una tisana!»;
  - *carica*: tre «!» o tutto maiuscolo → «e promette scintille» · «non perdetevela!»;
  - *normale*: tutto il resto → niente, o «e ha già le idee chiare» · «vi
    aspetta in chat!».
  Il primo umore che combacia vince, nell'ordine scritto: è una regola, non un
  punteggio. Il titolo **non entra** nella frase: sta già sotto, nell'avviso, e
  ripeterlo farebbe un avviso alto il doppio.
- **La forma**: `[apertura] [attività][umore]. [chiusa]`: la chiusa è una
  frase a sé, così ogni umore attacca all'attività come vuole («, ma…», « e…»,
  « per la prima volta»).
- **La diretta di un altro** (la community, gli amici): il genere non si sa, e
  si dice neutro.
- **L'apertura viene dal tono del canale** (scherzoso, amichevole, serio: lo
  stesso del frasario), e può portare `{community}`.
- **Il genere** è quello del canale (`settings.genere`, `src/ai/genere.js`):
  i pezzi portano i marcatori `{o/a}`; col neutro si sceglie una variante che
  non dichiara niente, e ogni pezzo ne ha almeno una (il collaudo lo pretende,
  come per il frasario).
- **Varia, ma non a caso**: la variante di ogni pezzo la sceglie l'hash della
  diretta (`id` della diretta e canale). Lo stesso avviso riscritto dopo
  (spettatori, locandina) dice la stessa frase; la diretta dopo, un'altra.
- **Tre lingue**: quella della chat del canale, come il resto dell'avviso.

## Di chi è

Tutto dello streamer (`settings.avvisiSmart`):

- acceso o spento (di serie acceso: è la prima riga, non un messaggio in più);
- le classi: per ognuna i suoi verbi, e le categorie che le appartengono
  (oltre a quelle di serie, che si possono togliere);
- gli umori: le parole che li riconoscono, le frasi e le chiuse, per lingua;
  se ne aggiungono di nuovi (una parola → una frase e una chiusa);
- le aperture per tono;
- la prova nel pannello: titolo e categoria scritti a mano, la frase che ne
  esce, in tutte e tre le lingue e coi tre generi.

Un posto con un testo suo (template) usa il suo testo, come oggi; ci trova il
segnaposto `{frase}` per mettere la frase dove vuole (Telegram e Discord).
Nel pannello: scheda Social, carta «L'avviso di diretta che legge la diretta».

## Garanzie

- La frase è sempre una frase: nessun pezzo vuoto, nessun marcatore rimasto,
  nessuno spazio doppio o punteggiatura doppia (test su tutte le combinazioni
  classe × umore × tono × genere × lingua).
- Il gioco entra accorciato, e la frase si sfugge per il posto (HTML su
  Telegram, markdown su Discord) da `stendiRiga`, come la riga del frasario.
- Stessa diretta, stessa frase; nessun `Math.random`.
