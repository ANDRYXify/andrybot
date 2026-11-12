<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# L'aspetto su misura

Chiesto così: «inserisci la possibilità di modificare/personalizzare la
piattaforma a piacimento da parte degli utenti (magari usiamo i preset che
abbiamo anche per i social o altro così non appesantiamo il server)».

## Com'era, misurato

- Il pannello ha **una** veste, quella del marchio, in due temi (chiaro e
  scuro). Chi lo usa sceglie solo fra i due, col tasto in alto.
- I colori stanno in un posto solo (`tema.css`, `docs/TAVOLOZZA.md`): 60 token
  sulla radice, e tutto il resto li legge con `var(--…)`. È la condizione che
  rende possibile questa cosa: cambiare i token cambia tutto, insieme.
- La pagina link ha già quindici tavolozze («minimal», «neon», «retro»…) e otto
  accoppiate di caratteri, scritte dentro `features/linkpagina.js`: il pannello
  non le vede.
- Il carattere del testo passa da `--testo-font` e quello dei titoli da
  `--mano`; gli angoli da `--r-*`, il tratto da `--contorno-sp` e `--tratto-*`,
  le ombre da `--ombra-ink*` e `--salto`. Le grandezze del testo sono in `rem`
  (515 su 533): cambiare la grandezza della radice le muove tutte.

## Il modello

Due livelli, come il menù su misura (`docs/MENU.md`): la fabbrica non si tocca,
e sopra c'è la veste di chi usa il pannello.

1. **La fabbrica è una sola**: `tema.css`. Chi non sceglie niente non riceve
   niente: nessuna variabile scritta, nessun foglio in più, il pannello è
   quello di prima punto per punto.
2. **La veste è una funzione pura**: `veste(scelte, tema)` in
   `src/web/public/aspetto.js` dà le variabili da scrivere sulla radice. Lo
   stesso file lo usano il pannello e il server (come `formati.js`), quindi la
   ripulitura delle scelte è una sola e non ci sono due copie da tenere uguali.
3. **Il server non disegna niente.** Tiene le scelte ripulite (qualche
   centinaio di byte, al più 12 kB col CSS) in `settings.aspetto` del conto di
   chi è entrato, e le manda con `/api/me`. Niente fogli generati, niente
   immagini, niente file: i colori li calcola il browser e li scrive come
   proprietà sulla radice. Si salva solo quando una scelta cambia.
4. **Le scelte sono della persona, non del canale**: chi modera il canale di un
   altro si porta dietro la sua veste. Chi non ha un conto suo le tiene nel
   browser.
5. **Una veste per tema.** Il chiaro e lo scuro hanno ognuno la sua, e il tasto
   in alto passa dall'una all'altra come prima. Il tema che si *dipinge*
   (`data-theme`) lo decide il colore della pagina, non il nome del posto: una
   pagina scura messa nella veste chiara resta scura, e tutte le regole che
   guardano il tema (i contorni del marchio, i campi del browser) la seguono.
6. **I preset sono quelli della pagina link**, e stanno in un posto solo:
   `aspetto.js`. `linkpagina.js` li prende da lì. I loro sette colori
   diventano i ruoli del pannello: la pagina è la via di mezzo fra i due colori
   di sfondo, la carta e il bordo si posano sopra (le trasparenze si
   sciolgono in un colore pieno, perché nel pannello una carta copre quello
   che ha sotto).
7. **Una veste è completa.** Appena un colore è scelto, si derivano *tutti* i
   colori della radice: superfici, bordi, testi, evidenza e la sua rampa,
   inchiostro, verde, rosso e ambra coi loro fondi. Così un colore di fabbrica
   non resta mai accanto a uno scelto con cui non si legge. Un contratto conta
   i token di `tema.css`: uno nuovo che porta un colore deve essere derivato o
   dichiarato neutro, altrimenti è rosso.
8. **Si legge per costruzione.** La carta e le superfici stanno dalla stessa
   parte della pagina (tutte chiare o tutte scure), quindi un testo che si
   legge su tutte esiste sempre. La parte ha un margine: scure fino a
   luminosità 0.11, chiare da 0.26 in su. In mezzo non ci sta nessuno, perché
   lì né il bianco né il nero reggono 4.5 sopra un velo d'evidenza (fino al
   14% di colore sul fondo): una pagina di un grigio di mezzo si sposta fino
   al margine. Poi ogni colore che porta una scritta si sposta di luminosità
   quel tanto che basta: testo 7 (mai sotto 4.5), testo tenue 4.5, evidenza
   4.5 sul fondo e sul suo velo, la scritta sopra l'evidenza 4.5, verde, rosso
   e ambra 4.5 anche sul loro fondo, inchiostro 4.5 (in un punto è anche
   scritta), la rampa dell'evidenza 3. Sono le soglie del cancello della
   tavolozza, o più strette. La carta dice quale colore è stato ritoccato.
9. **Il resto della veste** vale per tutti e due i temi:

   | manopola | valori | cosa muove |
   |---|---|---|
   | carattere | di serie, e le pile della pagina link | `--testo-font` |
   | titoli | di serie (a pennarello), come il testo, e le pile | `--mano` |
   | grandezza | 85–130 % | la grandezza della radice |
   | angoli | di serie, vivi, tondi | `--r-*`, `--ang-mano*` |
   | tratto | di serie, sottile, marcato | `--contorno-sp`, `--tratto-*`, `--orlo-3` |
   | ombre | di serie, corte, nessuna | `--ombra-ink*`, `--salto` |
   | trama | di serie (carta puntinata), liscia | `--tono-carta`, `--retino-forza`, `--cinetiche-forza` |
   | puntatore | di serie (disegnato), del sistema | `--cursore`, `--cursore-mano` |
   | movimento | di serie, leggero | l'interruttore che c'era già (`SB_LEGGERO`, `docs/MOTO.md`) |

   «Di serie» non scrive niente: ripete com'era.
10. **Sotto le manopole, il CSS tuo.** Un elenco di manopole non è mai
    infinito. Un riquadro di CSS arriva per ultimo, solo nel pannello e solo
    nel browser di chi l'ha scritto. Il pannello però non è la pagina link:
    dentro ci sono chiavi e dati, e un CSS che può chiamare un altro sito può
    portarli fuori (un selettore sul valore di un campo, uno sfondo con
    `url()`). Quindi qui non passa **niente che apra una connessione**:
    `@import`, `url(`, `image-set(`, `src(`, `image(`, e la barra rovescia,
    che serve a scriverli di nascosto. Si toglie fino al punto fermo, come per
    la pagina link.
11. **Si torna sempre indietro.** «Rimetti l'aspetto di serie» toglie tutto.
    E se un CSS rende il pannello inservibile, l'indirizzo `/?aspetto=serie`
    lo apre con la veste di fabbrica senza cancellare le scelte, e porta alla
    carta. Le pagine d'ingresso non prendono mai il CSS: non ci si chiude
    fuori.
12. **Il primo disegno è già vestito.** Il pannello tiene nel browser le
    variabili già calcolate (`localStorage['aspetto']`), e `tema.js` le scrive
    prima che il foglio arrivi: niente lampo di fabbrica a ogni ricarica. Lì
    non c'è logica da sbagliare: è un elenco da copiare. Quando il server dice
    che non c'è nessuno, la veste e la copia si tolgono: la vetrina è del
    marchio. La demo (`?demo=1`) si apre sempre con la veste di serie e non
    tocca quella copia. La copia delle scelte di chi non ha un conto suo porta
    il nome di chi l'ha fatta: un'altra persona che entra dallo stesso browser
    non se la trova addosso.
13. **Si passa di mano.** «Copia la mia veste» mette le scelte negli appunti
    come testo; «Incolla una veste» le prende, le ripulisce con le stesse
    regole e le applica. Uno streamer può dare la sua ai moderatori.

## Dove si fa: la pagina «Personalizzazione»

Chiesto così: «ricordati di fare una sezione ad hoc per personalizzazione,
quindi colori menu, temi, posizione, personalizzazione etc».

Le cose della persona stavano in fondo ad «Accesso e dati», fra le
piattaforme e la cancellazione del conto: chi cercava i colori doveva sapere
che erano lì. Adesso hanno una pagina loro, **Account → Personalizzazione**
(`personalizza`), fra «Accesso e dati» e «Abbonamento». Dentro, nell'ordine in
cui una persona ci pensa:

1. **Tema e lingua**: il tema (come il dispositivo, chiaro, scuro: prima
   «come il dispositivo» si perdeva al primo tocco del tasto in alto e non si
   poteva più riavere), la lingua del pannello, e il lato del menu sul
   computer (`docs/MENU.md`).
2. **Aspetto su misura**: questa veste.
3. **Menù su misura**: le voci, l'ordine, la barra del telefono.

La lingua del bot in chat e le altre preferenze del canale restano in
«Accesso e dati»: sono del canale, non della persona.

Ci portano i due tasti nel piede della barra del menu: «Sistema il menù» alla
carta del menu, quello con la tavolozza alla carta dell'aspetto. Il piede è il
posto degli strumenti che cambiano il pannello e non sono pagine
(`docs/MENU.md`, regola 10). Ogni gesto vale subito, e l'anteprima è il
pannello stesso.

Il tasto del tema premuto («Tema chiaro» / «Tema scuro») è un tasto pieno di
serie, non un colore scritto a mano nella carta: la prima versione aveva un
fondo d'evidenza con la scritta ereditata dal tasto secondario, e nei temi
scuri erano chiaro su chiaro (contrasto 1.26). L'ha visto il cancello.

## Quello che non si fa, e perché

- **Immagini di sfondo e caratteri caricati.** Sarebbero file sul server o
  chiamate ad altri siti: la richiesta dice di non appesantire il server, e il
  punto 10 dice perché il pannello non chiama fuori.
- **Lo sfondo sfumato dei preset.** Nel pannello molte fasce restano ferme
  mentre la pagina scorre (la barra del menù, il piede, le intestazioni) e
  prendono il colore della pagina: su una sfumatura si vedrebbero le toppe. I
  due colori dello sfondo diventano uno, a metà.
- **La copertina d'avvio.** I pochi istanti col marchio prima che il pannello
  arrivi restano del marchio, come la vetrina. Prendono però il lato della
  veste (chiaro o scuro, da `data-theme`), quindi non c'è un lampo chiaro
  prima di una veste scura né il contrario.
- **Gli overlay e le pagine pubbliche** (link, negozio, donazioni, Pew): sono
  del canale e hanno già i loro editor.

## Come si misura

- `test/contratto/aspetto.test.mjs`: la ripulitura (forma, punto fermo, «di
  serie» non scrive); i preset sono gli stessi oggetti della pagina link; la
  copia dei colori di fabbrica combacia con `tema.css`; la veste è completa
  (punto 7); i contrasti reggono su tutti i preset nei due temi e su una
  griglia fissa di colori qualunque, compresi quelli scelti apposta per non
  leggersi; il CSS che chiama fuori non passa, nemmeno a strati; il salvataggio
  per persona.
- `scripts/verifica-aspetto.mjs` apre il pannello e fa i gesti: senza scelte la
  radice è pulita; ogni preset si dipinge e si legge, misurato sui colori veri
  di pagina, carta, testo e tasto; ogni manopola muove davvero qualcosa; il
  tema dipinto segue il colore; il CSS arriva per ultimo e `url(` non arriva;
  `tema.js` veste il primo disegno; l'uscita di sicurezza; il ritorno alla
  veste di serie; nessuna pagina più larga dello schermo a 130 %. Con
  `--selftest` rompe una promessa per volta e pretende il rosso.
