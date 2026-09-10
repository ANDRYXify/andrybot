# SocialBot — memoria di progetto

Bot multi-streamer per Twitch e Kick (socialbot.live). Node ES modules, SQLite,
niente framework di troppo. **Repository pubblico**: tutto quello che sta qui
dentro lo può leggere chiunque.

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

## Le cose di Lia restano in casa

Le cose **interne** di Lia — il suo computer, il suo schermo, il suo browser,
come ragiona, come cresce — **non vanno nelle novità pubbliche**. Non è una
questione di segretezza: non riguardano chi usa il bot, e la pagina delle novità
è pubblica e indicizzata.

In `NOVITA.md` si marcano `[privato]`: restano visibili solo al proprietario nel
suo pannello. Un giorno fatto di sole righe private non compare nemmeno come
giorno.

Se una riga descrive una funzione che lo **streamer usa** e che passa da lei, si
riscrive senza nominarla: la funzione resta documentata, il nome resta in casa.

`scripts/verifica-novita.mjs` lo tiene fermo: una riga pubblica che la nomina, o
che parla delle sue cose, è rossa finché non è marcata o riscritta.

## La valvola a senso unico

Lia può insegnare al bot; il bot non può leggere niente di lei. Non è una scelta
del codice del bot: è che **non ha la strada**. Il modello per esteso è in
`docs/BOT-E-LIA.md`, e `scripts/verifica-valvola.mjs` lo verifica.

## Collaudo

    npm test              le prove
    npm run cancelli      i cancelli statici (girano anche prima di ogni push)

Il gancio `pre-push` fa girare tutto: se qualcosa è rosso, non si spinge.

Ogni cosa che cambia per chi usa il bot va scritta in `NOVITA.md` **nello stesso
commit**, o il messaggio deve dire «Novità: nessuna (perché)».
