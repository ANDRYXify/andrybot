<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->

# Questo software gira dove dice il proprietario

## Prima l'onestà, se no è fumo

Se qualcuno ha il sorgente, **non esiste modo di rendere il codice ineseguibile**.
Qualunque controllo si legge e si cancella. Non è un limite di come è scritto
questo pezzo: è una proprietà del sorgente. Chi promette il contrario mente, e chi
vende offuscatori vende tempo, non impossibilità.

Quello che si può fare è diverso, e non è poco.

## 1. Non forgiabile ≠ non cancellabile

La licenza è firmata con una chiave **privata** che non sta in nessun repository.
Nel sorgente c'è solo la **pubblica**, che può stare al sole: con la pubblica si
*verifica* una firma, non se ne *fabbrica* una. È l'asimmetria di una firma
autografa, senza il problema che qualcuno impari a imitarla.

Quindi nessuno può **fabbricarsi** una licenza. Può soltanto **togliere il
controllo** — che è un'altra cosa: è un atto deliberato, e si vede. L'impronta del
progetto (`scripts/impronta.mjs`) cambia, e dice *quale* file è stato toccato.

## 2. Legata al posto, e a scadenza

La licenza nomina il dominio (e volendo la macchina) e scade. Copiata altrove non
vale. Rifirmarla richiede la chiave privata, che è su una macchina sola.

## 3. E se lo tolgono — la parte che conta

Chi cancella il cancello **non ottiene un software pulito**. Il nome con cui questo
programma si presenta esce dalla *stessa funzione* della licenza: con una licenza
valida è l'installazione autorizzata, senza è la proprietà per esteso. Quel nome
viaggia con **ogni risposta HTTP** (`X-Licenza`).

Non c'è una riga da cancellare: c'è una **sorgente** da cui il programma prende una
cosa che usa. È lo stesso principio di tutto il resto qui dentro — il difetto non
deve *esistere*, non «si controlla».

## Come si accende (l'ordine conta)

Sulla **tua** macchina, dentro il progetto (`cd` nella cartella clonata: lo script
sta lì, non nella home), e in quest'ordine.

Prima firma la licenza — ma serve la chiave, quindi:

    node scripts/licenza.mjs --chiavi

Scrive la privata in `~/.socialbot-chiave-privata.pem` (permessi 600) **e incolla
da sé la pubblica** in `src/licenza.js`. **Fai una copia della privata al sicuro:
persa quella, non puoi più firmare licenze nuove.** In `.gitignore` ci sono già
`*.pem` e `licenza.txt`.

> **Perché la incolla lo script e non tu.** La chiave contiene dei `\n`. Incollata a
> mano va a capo davvero, la stringa si spezza in due, e il file smette di
> caricarsi — non per la licenza: per la sintassi. È successo. Chiedere a una
> persona di trascrivere una costante crittografica è chiedere un errore, e il modo
> giusto è che quella riga non la scriva nessuno a mano. Con `--niente-incolla` la
> stampa soltanto, già pronta come riga intera.
>
> `test/contratto/licenza.test.mjs` prende comunque una modifica a mano fatta male
> — costante spezzata, o chiave che non si apre — **prima** che arrivi sul server.

Poi firma la licenza del tuo server:

    node scripts/licenza.mjs --firma --dominio socialbot.live --mesi 12

Mettila nel `.env` del server come `LICENZA=...` (oppure in un file `licenza.txt`).

**Solo a quel punto** incolla la chiave pubblica in `src/licenza.js`, dentro
`CHIAVE_PUBBLICA`. Finché quella costante è vuota il bot parte lo stesso,
dichiarando di chi è: serve a non chiudere fuori il proprietario prima che si sia
fatto la chiave. Appena la incolli, il cancello è attivo — e senza licenza valida
il bot non parte.

Se sbagli l'ordine e il bot non parte, il log dice il motivo **e il rimedio**: un
blocco che non spiega come si sblocca è un blocco che ti tiene fuori da casa tua.

## Cosa non copre

- Non impedisce a nessuno di leggere il codice. Per quello serve un repository
  **privato**, ed è la leva più forte di tutte: costa zero e toglie la materia
  prima. Il resto è la cintura, non i pantaloni.
- Non impedisce a un fork determinato di girare. Rende quel fork **dimostrabile**
  (LICENSE proprietaria, impronta datata, canarini, firma in chiaro nelle risposte)
  e rende la circonvenzione un atto scelto, non un incidente.

## Il collaudo

`test/contratto/licenza.test.mjs` genera una coppia di chiavi al volo — nessun
segreto vero entra in una prova — e controlla: firma di un altro, corpo riciclato,
un byte girato, firma troncata, dominio sbagliato, scaduta, assente. E due cose che
valgono quanto il resto: che senza licenza il nome dica di chi è il software, e che
**nessuna chiave privata sia finita nel repository**.

### Un buco vero, trovato provando

La prima versione accettava una licenza con l'ultimo carattere della firma
cambiato. Non era una debolezza della crittografia: il decodificatore base64 di
Node ignora la coda che avanza, quindi due testi *diversi* davano gli stessi byte —
e la mia prova di manomissione non manometteva niente. Ora la scrittura dev'essere
l'unica possibile (si ricodifica e si confronta) e la firma deve essere lunga
esattamente 64 byte.
