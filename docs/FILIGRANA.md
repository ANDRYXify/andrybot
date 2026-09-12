# La filigrana: dove sta la firma

Il sorgente si legge, e chi legge può copiare. La firma serve a due cose: dire
di chi è questo software a chiunque lo apra, e restare addosso a una copia
abbastanza da poterlo **dimostrare**. Nessuno strato da solo è indelebile —
chi ha il sorgente può togliere una riga — ma gli strati sono tanti, stanno in
posti diversi e uno di loro non sta nei file: sta in quello che il bot fa.

## Gli strati

- **Righe di testa** in ogni sorgente, e la costante `FIRMA` in `src/watermark.js`:
  una stringa che non esiste in nessun altro progetto. Se compare altrove, il
  lavoro è stato riusato.
- **Intestazioni HTTP** su ogni risposta del server (`X-Author`, `X-Copyright`,
  `X-Content-Owner`): viaggiano con qualunque copia o deploy.
- **Pagine servite**: un commento di copyright e una firma a larghezza zero
  prima di `</body>`. A schermo non si vede niente, nel sorgente della pagina c'è.
- **Immagini PNG**: un chunk `tEXt` con il copyright subito dopo l'intestazione.
  I pixel non cambiano, `strings` lo legge.
- **Meta e dati strutturati**: `<meta name="copyright">` in ogni pagina pubblica,
  e nello schema.org della vetrina un nodo `Person` (`#autore`) a cui `WebSite` e
  `SoftwareApplication` puntano come `author` e `copyrightHolder`. Lo leggono i
  motori di ricerca, e resta nella copia della pagina.
- **La licenza firmata** (`docs/LICENZA-FIRMATA.md`): il nome con cui il software
  si presenta esce da `licenza.firma()`, e senza licenza valida quel nome dice
  di chi è. Non si toglie il cancello senza cambiare il nome.
- **La marca nel database**: all'avvio il bot scrive in `stato_vivo`, canale
  `[proprieta]`, la firma, il copyright e il nome con cui si sta presentando.
  Un archivio copiato dice da chi è stato scritto e con quale licenza girava.
- **L'impronta datata** del progetto (`scripts/impronta.mjs`): la prova di quando
  esisteva cosa.
- **La frase-canarino**, sotto.

## La frase-canarino

Il proprietario sceglie una frase. Nel codice c'è solo la sua impronta
(`CANARINO` in `src/watermark.js`: sha256 della frase normalizzata, salata con la
`FIRMA`); dall'impronta la frase non si ricava. Qualunque installazione di questo
bot che senta quella frase in una chat risponde con il copyright, la `FIRMA` e il
nome con cui si sta presentando. Davanti a testimoni, un bot copiato dice di chi è.

Per accenderla:

    node scripts/firma-canarino.mjs

Chiede la frase senza mostrarla mentre la scrivi, stampa l'impronta e non salva
niente. L'impronta va incollata in `CANARINO`, poi commit e deploy. La frase
resta con te: almeno tre parole, che nessuno scriverebbe per caso. Finché
`CANARINO` è vuota il canarino dorme.

Per usarla: scrivi la frase nella chat del canale dove gira il bot sospetto.
Maiuscole, punteggiatura e spazi non contano. Risponde una volta al minuto per
canale, sulla stessa piattaforma da cui è arrivata la frase, prima di qualunque
altra cosa faccia con il messaggio. Se la frase dovesse girare, se ne sceglie
un'altra e si rifà l'impronta.

## Cosa non copre

Un fork che ha letto tutto e ha tolto tutto. Ma ogni strato tolto è una scelta,
e il canarino è l'unico che si prova **da fuori**, senza accesso al server, con
la chat come testimone.

## Il collaudo

`test/unita/canarino.test.mjs`: la normalizzazione, l'impronta (esadecimale,
salata, non contiene la frase), il sonno con `CANARINO` vuota, il riconoscimento
della frase scritta in modi diversi e di nient'altro, la risposta senza
ripetizioni, il gancio in `src/bot.js` (prima di tutto, con la voce del
messaggio, una volta al minuto per canale), la marca nel database, i dati
strutturati validi, e che lo script non salvi mai la frase.
