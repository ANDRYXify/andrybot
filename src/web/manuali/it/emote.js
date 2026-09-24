// Manuale: Manuale delle emote 7TV. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'emote',
  schede: ['emote'],
  titolo: 'Manuale delle emote 7TV: gestirle dal pannello | SocialBot',
  h1: 'Manuale delle emote 7TV',
  desc: 'Collegare il proprio account 7TV, aggiungere e togliere emote dal set del canale, rinominarle, e caricare una GIF o un video trasformandolo in emote animata.',
  aggiornata: '2026-09-04',
  corpo: [
    { p: [
      'Le emote del tuo canale su <strong>7TV</strong> si gestiscono da qui: aggiungerle, toglierle, rinominarle, e perfino crearne di nuove da una GIF o da un video. Senza aprire 7tv.app.',
      'Le stesse emote compaiono anche nella <strong>chat a schermo</strong> del tuo overlay, quindi chi guarda le vede come le vedi tu.',
    ] },

    { h2: 'Collegare il tuo account' },
    { p: [
      'Il set di emote del canale appartiene <strong>al tuo account 7TV</strong>: solo lui può modificarlo. Per questo serve il tuo <em>token</em>, che si copia da 7tv.app e si incolla qui una volta sola.',
      'Il token <strong>resta sul server</strong> e non viene mai mandato al browser. Il bot parla solo con gli indirizzi ufficiali di 7TV, non con indirizzi che gli passi tu: non c\'è un modo per fargli chiamare qualcos\'altro.',
    ] },

    { h2: 'Le tue emote' },
    { p: ['Il set attivo del canale, come lo vede la chat. Da ogni emote puoi:'] },
    { ul: [
      '<strong>Rinominarla</strong> nel tuo canale — l\'alias. L\'emote resta quella dell\'autore, ma da te si scrive come vuoi tu.',
      '<strong>Toglierla</strong> dal set.',
    ] },
    { p: ['Le animate sono segnate con un\'etichetta, così non devi indovinare guardando un fermo immagine.'] },

    { h2: 'Aggiungerne' },
    { p: ['Tre strade, in ordine di quanto sono comode.'] },
    { tabella: [
      ['Come', 'Quando serve', 'Nota'],
      ['Cerca', 'Vuoi un\'emote che esiste già.', 'Cerca nella directory pubblica di 7TV, si aggiunge con un clic.'],
      ['Link o ID', 'L\'hai vista in un altro canale.', 'Si incolla l\'indirizzo <code>7tv.app/emotes/…</code>. L\'alias è facoltativo.'],
      ['Carica un file', 'L\'emote non esiste: la fai tu.', 'Immagine, GIF o video.'],
    ] },
    { h3: 'Caricare una GIF o un video' },
    { p: ['È la parte che di solito costa più fatica altrove, e qui la fa il bot: prendi un file e lo <strong>convertiamo noi</strong> nel formato che 7TV vuole — WebP animato, con la trasparenza dov\'era.'] },
    { ul: [
      '<strong>I video diventano emote animate.</strong>',
      '<strong>Le GIF trasparenti restano trasparenti</strong>: è il dettaglio che di solito si perde convertendo a mano.',
      'Durata massima circa <strong>6 secondi</strong>, ridimensionata in automatico.',
      'Il file può pesare fino a <strong>8 MB</strong>.',
    ] },
    { p: ['Il <strong>nome</strong> è quello con cui l\'emote nasce su 7TV (senza spazi); l\'<strong>alias</strong> è come si scrive nel tuo canale. Se lasci vuoto l\'alias, vale il nome.'] },

    { h2: 'Quando non funziona' },
    { ul: [
      '<strong>Dice che non sei collegato.</strong> Il token di 7TV scade e va rincollato: è normale, non è un guasto.',
      '<strong>Aggiungo un\'emote e in chat non si vede.</strong> Twitch e 7TV tengono la loro copia per qualche minuto. Si vede prima nell\'overlay che in chat.',
      '<strong>Il caricamento viene rifiutato.</strong> Quasi sempre è la durata: oltre i sei secondi circa 7TV non la prende. Taglia il video prima.',
      '<strong>L\'alias non si applica.</strong> Un alias già usato da un\'altra emote del set non si può ripetere: due emote con lo stesso nome in chat sarebbero indistinguibili.',
      '<strong>Il set è pieno.</strong> Quanti posti hai dipende dal tuo livello su 7TV, non da noi: si libera togliendo un\'emote.',
    ] },
  ],
  faq: [
    { d: 'Serve un abbonamento a 7TV?', r: 'No per collegare l\'account. Quanti posti ha il tuo set di emote lo decide 7TV in base al tuo livello lì.' },
    { d: 'Il mio token 7TV è al sicuro?', r: 'Resta sul server, non passa mai dal browser, e il bot lo usa solo verso gli indirizzi ufficiali di 7TV. Da 7tv.app puoi revocarlo quando vuoi.' },
    { d: 'Se tolgo un\'emote la perdo?', r: 'No: esce dal tuo set, ma resta su 7TV. Si può rimettere.' },
    { d: 'Posso trasformare una clip in emote?', r: 'Sì: carichi il video e lo convertiamo noi. Sotto i sei secondi circa, altrimenti 7TV la rifiuta.' },
    { d: 'Le emote si vedono anche nell\'overlay?', r: 'Sì, nella chat a schermo: sono le stesse del canale, lette da 7TV.' },
  ],
};
