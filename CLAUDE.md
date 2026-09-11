# SocialBot — memoria di progetto

Bot multi-streamer per Twitch e Kick (socialbot.live). Node ES modules, SQLite,
niente framework di troppo. **Repository pubblico**: tutto quello che sta qui
dentro lo può leggere chiunque.

## Regola assoluta: si crea DA ZERO, e chi e' collegato PARLA

Due difetti della stessa famiglia, e valgono per ogni funzione nuova.

**1. Si parte dal vuoto, non da un elenco.** Il «+» apre l'editor VUOTO. I preset
esistono per fare in fretta («manda un link in chat», «manda un suono»), non per
essere l'unica strada. Obbligare a scegliere da una tendina PRIMA di poter
costruire e' il contrario della personalizzazione: e' un catalogo.

**2. Non far scrivere a mano cio' che il programma collegato gia' sa.** Se ci si
collega a qualcosa — regia, musica, una piattaforma — la prima cosa che si fa e'
CHIEDERGLI cosa c'e' dentro, e offrirlo. Un campo di testo dove uno deve
ricopiare il nome di una scena che noi vediamo gia' e' un difetto, non una
scelta. E dopo un collegamento riuscito le schede aperte si RIDISEGNANO: se
colleghi e a video non cambia niente, per chi guarda non e' successo niente.

Corollario: una funzione nuova nasce personalizzabile **in tutto** — nome, icona,
colore, ordine, contenuto, quante volte, in che ordine. Se un pezzo di una
funzione nuova non si puo' cambiare da dentro, la funzione non e' finita.

## Regola assoluta: quello che si fa, si dice anche FUORI

Una funzione nuova nasce nel pannello, e li' la vede solo chi e' gia' dentro. Chi
sta decidendo se prendere il bot guarda la **vetrina**: se li' non c'e', per lui
quella funzione non esiste. Giorni di lavoro invisibili proprio a chi deve
scegliere.

Quindi **ogni cosa che si aggiunge va trascritta sulla pagina pubblica**, nello
stesso giro in cui la si fa, in tre lingue:

- la voce in `CAPACITA` (`src/web/vetrina-vista.js`), che dichiara **quale
  scheda** del pannello vende;
- la riga in `NOVITA.md`, con la sua destinazione `[vai: scheda]`;
- la guida o il manuale della scheda, se cambia come si fa.

`test/contratto/vetrina-capacita.test.mjs` boccia una scheda del pannello che
nessuna voce racconta. L'unica eccezione e' «Avatar 3D», che e' roba da admin e
non si compra — e sta scritta li' col suo motivo.

## Metodo di lavoro

- **Analitico, non statistico. Preciso, non a tentoni.** Prima il modello e il
  piano, poi il codice.
- **Corretto per COSTRUZIONE, non per correzione.** Il difetto non deve
  *esistere*, non «si scopre e si patcha». Una regola che regge solo se qualcuno
  si ricorda di applicarla, prima o poi cede — e quasi sempre senza dare errore.
- **Misurare prima di credere.** E per le cose che si vedono, **guardare il
  risultato reso**, non solo i numeri.
- **I cancelli confermano il piano, non lo sostituiscono.** Un cancello che non
  si è mai visto rosso è una decorazione: ogni cancello ha `--selftest`, che
  rompe una cosa per volta e pretende di accorgersene.
- **Mai ridondante.** Due controlli per la stessa domanda prima o poi dicono
  cose diverse.

## Come si scrive

- Tutto in **italiano**, anche i nomi nel codice e i messaggi di commit.
- Frasi corte e piane. Niente aforismi, niente «non X: è Y», niente svolazzi.
  Se una riga suona come scritta da una macchina, va riscritta.
- **Niente emoji** nella grafica del sito e nelle novità. Le icone stanno in
  `ICO` e si disegnano: un'emoji viene disegnata diversa su ogni sistema, e non
  è nostra. Se serve un simbolo che non c'è, si aggiunge a `ICO`.
- **Tutto è modificabile, con un editor completo.** Regola assoluta, al pari del
  niente-emoji. Se il prodotto mostra una cosa allo streamer — un tasto, un nome,
  un'icona, un colore, un testo, un indirizzo, l'ordine in cui stanno — quella
  cosa si deve poter cambiare da dentro, senza chiedere a noi. Un elenco che si
  può solo guardare è un pezzo non finito: o si rende modificabile, o è scritto
  nel memo perché ancora non lo è.
- **Le icone: le nostre SEMPRE più le sue.** Ovunque si scelga un'icona, accanto
  al nostro elenco ci va la possibilità di mettere **un'immagine sua**, caricata
  da lui. E quell'immagine deve avere un indirizzo pubblico, perché la stessa
  faccia serve fuori dal sito — per esempio sul tasto di uno Stream Deck. Un
  elenco chiuso di icone è un elenco che prima o poi non ha quella che gli serve.
- **Niente marchi altrui.** Non siamo partner di nessuno: i prodotti di altri non
  si nominano — né nel sito, né nei manuali, né nelle novità. Si descrive la cosa
  per quello che fa («una tastiera fisica di comando», «un componente che fa
  chiamate web»), che è anche più chiaro per chi non conosce quel prodotto.
- I commenti spiegano **perché**, non cosa: soprattutto il difetto che quella
  riga esiste per impedire.

## Cosa NON deve finire nei file che arrivano al browser

In `src/web/public/**` — JavaScript, CSS, HTML — **nessun commento**, tranne le
due righe della filigrana. Quello che c'è da spiegare va in `docs/` o nei file
che restano sul server. Lo verifica `node scripts/spoglia-commenti.mjs --verifica`.

## Il cervello privato

Il cervello del sito — il servizio Python che il bot raggiunge su `http://brain:8091`,
la sua sandbox, il suo pannello e tutto ciò che lo riguarda — vive in un
**repository privato a parte**, clonato accanto a questo (`LIA_DIR`, default
`../lia`; sul server `/opt/lia`, messo a posto da `server/adotta-lia.sh`). Qui non
se ne descrive niente e il suo nome non compare: né nel codice che arriva al
browser, né nelle novità, né nei manuali, né nei commenti. Le novità che lo
riguardano stanno nel suo `NOVITA.md`, che il pannello del proprietario legge da lì
e mostra insieme alle pubbliche; la pagina pubblica non ha la strada per arrivarci.

Il bot gli parla e basta: non importa nulla di suo e non legge nulla di suo. Il
lato Node di questo confine lo misura `scripts/verifica-valvola.mjs`; il lato del
cervello lo misurano i cancelli nel suo repository, che è dove quel codice vive.
`scripts/verifica-novita.mjs` tiene fermo che una riga pubblica non lo nomini.

## Collaudo

    npm test              le prove
    npm run cancelli      i cancelli statici (girano anche prima di ogni push)

Il gancio `pre-push` fa girare tutto: se qualcosa è rosso, non si spinge.

Ogni cosa che cambia per chi usa il bot va scritta in `NOVITA.md` **nello stesso
commit**, o il messaggio deve dire «Novità: nessuna (perché)».
