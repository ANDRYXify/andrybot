// Manuale: Manuale degli strumenti. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md. Come e' fatto il QR, e
// perche' si legge, sta in docs/STRUMENTI.md.

export default {
  slug: 'strumenti',
  schede: ['qr', 'misure'],
  titolo: 'Manuale degli strumenti: QR su misura, emote e badge | SocialBot',
  h1: 'Manuale degli strumenti',
  desc: 'Un QR con le tue forme, i tuoi colori e il tuo logo, che si legge davvero. Ed emote e badge alle misure che chiede Twitch, partendo da un\'immagine sola.',
  aggiornata: '2026-09-26',
  corpo: [
    { p: [
      'Nel menù del pannello, sotto <em>Strumenti</em>, ci sono le cose che servono intorno alla diretta: il <strong>QR su misura</strong> e le <strong>emote e i badge</strong> alle misure di Twitch.',
      'Tutti e due lavorano nel tuo browser. Le immagini che prepari per emote e badge non passano dal nostro server; il logo del QR ci arriva solo se premi <em>Salva lo stile</em>, per ritrovarlo la volta dopo.',
    ] },

    { h2: 'QR su misura', scheda: 'qr' },
    { p: [
      'In cima scrivi dove porta il QR. I tasti sotto lo riempiono per te con la tua <strong>pagina link</strong> o il tuo canale, ma puoi scriverci qualunque indirizzo o testo.',
      'Nel QR c\'è proprio quello che hai scritto, senza passaggi da noi: non scade, e funziona finché funziona il link che ci hai messo.',
    ] },
    { h3: 'Forme e colori' },
    { tabella: [
      ['Cosa', 'Scelte', 'Nota'],
      ['I quadratini', 'Quadrati, morbidi, puntini, a penna', 'Nei morbidi si arrotondano solo gli angoli liberi, così i gruppi restano uniti. A penna ogni quadratino è tracciato a mano, ed è sempre lo stesso tratto per il tuo canale.'],
      ['Gli occhi', 'Quadrati, morbidi, tondi, a penna', 'Sono i tre quadri grandi agli angoli: servono al telefono per trovare il codice.'],
      ['I colori', 'Cinque accoppiate pronte, o i tuoi', 'Quadratini, fondo e occhi hanno ognuno il suo colore.'],
    ] },
    { h3: 'Il logo al centro' },
    { p: [
      'Puoi mettere al centro <strong>la tua foto</strong> (quella del canale) o <strong>un\'immagine</strong> tua, PNG, JPG o WebP. Se è pesante la rimpiccioliamo noi.',
      'Un logo copre una parte del codice, e il QR la recupera con i suoi codici di riserva. Per questo, quando c\'è un logo, usiamo la correzione più alta, e il logo non prende mai più della <strong>metà</strong> di quello che si può correggere: l\'altra metà resta per un graffio, un riflesso, una piega della carta. Non tocca mai gli occhi né gli altri segni fissi.',
      'Il cursore <em>Grandezza del logo</em> va dal più piccolo al più grande che quel link permette. Più il link è lungo, più il codice è fitto e meno posto resta: con un link lungo il logo può non starci.',
    ] },
    { h3: 'La cornice con la frase' },
    { p: ['Se scrivi una frase (fino a 40 caratteri, tipo «Inquadrami»), il QR prende una cornice tracciata a penna e la frase sotto, scritta a mano.'] },
    { h3: 'Come sappiamo che si legge' },
    { p: ['Un QR personalizzato si rompe facilmente: basta un colore troppo chiaro o un logo troppo grande, e il telefono non lo legge più. Qui le regole sono dentro il disegno:'] },
    { ul: [
      '<strong>Contrasto.</strong> Fra quadratini e fondo misuriamo la differenza di luce vera, non dei numeri del colore, e deve arrivare ad almeno 0,55 su 1. Il fondo deve essere il più chiaro dei due: molti lettori non leggono i QR in negativo.',
      '<strong>Margine.</strong> Intorno restano i quattro quadratini vuoti che la norma chiede: senza, il telefono non capisce dove finisce il codice.',
      '<strong>Forme.</strong> Ogni forma copre il centro del suo quadratino, che è il punto dove il telefono guarda.',
      '<strong>Occhi.</strong> I tre anelli di ogni occhio sono la stessa forma in scala, così il telefono lo riconosce da qualunque verso; i quadri piccoli dentro il codice seguono gli occhi. Gli occhi quadrati, quelli di serie, li legge proprio qualunque lettore.',
    ] },
    { p: [
      'Poi lo <strong>rileggiamo</strong>: prendiamo i pixel dell\'anteprima, guardiamo il centro di ogni quadratino e decodifichiamo come un lettore vero, correzione degli errori compresa. Se il testo che ne esce non è identico a quello che hai scritto, i tasti per scaricare restano spenti e sotto ti diciamo cosa cambiare. La stessa prova si ripete sull\'immagine grande, prima di scaricarla.',
      'La rilettura vede il disegno dritto e a fuoco: non sa come lo stamperai. Per la stampa tieni il QR ad almeno <strong>2 cm</strong> di lato, e di più se va inquadrato da lontano: una regola comoda è un decimo della distanza.',
    ] },
    { h3: 'Scaricarlo e salvarlo' },
    { ul: [
      '<strong>PNG</strong> a 1024, 2048 o 4096 pixel. Il più grande è per la stampa.',
      '<strong>SVG</strong>: un disegno che si ingrandisce senza perdere niente, col logo e il carattere della frase dentro il file.',
      '<strong>Salva lo stile</strong>: lo ritrovi la volta dopo, e lo usano le <em>Grafiche social</em> per il QR che mettono nelle immagini, senza cornice. Se lì il QR con il tuo stile non si rileggesse, le Grafiche usano quello semplice.',
    ] },

    { h2: 'Emote e badge', scheda: 'misure' },
    { p: ['Twitch chiede ogni emote in tre misure, <strong>112, 56 e 28</strong> pixel, e ogni badge in tre, <strong>72, 36 e 18</strong>. Qui carichi un\'immagine sola e le hai tutte, pronte da caricare su Twitch.'] },
    { h3: 'Rimpicciolite bene' },
    { p: ['Rimpicciolire un\'immagine vuol dire fare la media dei suoi pixel. Se la media si fa sui numeri del colore, come fanno molti programmi, i bordi fra due colori si scuriscono e i contorni sottili spariscono. Noi la facciamo sulla luce vera, e teniamo conto della trasparenza: un bordo trasparente non sporca di nero i pixel vicini.'] },
    { h3: 'Se non è quadrata' },
    { ul: [
      '<strong>Intera</strong>: l\'immagine entra tutta, e dove avanza resta trasparente.',
      '<strong>Riempi</strong>: riempie il quadrato e taglia quello che esce, tenendo il centro.',
    ] },
    { h3: 'Come si vedono in chat' },
    { p: ['Sotto le tre misure le vedi come in chat, sul fondo scuro e su quello chiaro: l\'emote a 28 pixel accanto al testo, il badge a 18 prima del nome. Sugli schermi più fitti il browser prende le misure grandi, come fa Twitch.'] },
    { h3: 'Pesi e download' },
    { p: ['Twitch accetta emote fino a <strong>1 MB</strong> e badge fino a <strong>25 KB</strong>: se una misura li supera, te lo diciamo. Ogni misura si scarica da sola, oppure tutte insieme in uno zip.'] },

    { h2: 'Quando non funziona' },
    { ul: [
      '<strong>I tasti per scaricare il QR sono spenti.</strong> Sotto l\'anteprima c\'è scritto perché: di solito sono i colori troppo vicini, o un logo che con quel link non ci sta.',
      '<strong>Il logo non ci sta.</strong> Il link è troppo lungo: accorcialo. L\'indirizzo della tua pagina link è già corto.',
      '<strong>La tua foto non compare.</strong> È quella del canale, e a volte non arriva subito: riprova, o carica un\'immagine.',
      '<strong>Voglio cambiare il logo caricato.</strong> Quando è scelto <em>Un\'immagine</em>, sotto c\'è <em>Cambia immagine</em>.',
      '<strong>La misura grande delle emote è sgranata.</strong> L\'immagine di partenza è piccola: parti da almeno quattro volte la misura più grande.',
      '<strong>Una GIF animata esce ferma.</strong> Qui si prende il primo fotogramma: le emote animate si preparano a parte.',
    ] },
  ],
  faq: [
    { d: 'Il QR scade?', r: 'No. Dentro c\'è solo il link che hai scritto, senza passaggi da noi: funziona finché funziona quel link.' },
    { d: 'Posso fare un QR per un sito che non è il mio canale?', r: 'Sì: nel campo in cima scrivi qualunque indirizzo o testo.' },
    { d: 'Quanto grande lo devo stampare?', r: 'Almeno 2 cm di lato. Se va inquadrato da lontano, circa un decimo della distanza: per tre metri, trenta centimetri.' },
    { d: 'Perché col logo il QR ha più quadratini?', r: 'Col logo usiamo la correzione più alta, che aggiunge codici di riserva: sono loro a recuperare la parte che il logo copre.' },
    { d: 'Le immagini delle emote finiscono sul vostro server?', r: 'No: si rimpiccioliscono nel tuo browser, e da lì le scarichi.' },
  ],
};
