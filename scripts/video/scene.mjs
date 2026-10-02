// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I TUTORIAL, come dati (docs/VIDEO.md). La regia (regia.mjs) li fa sul
// pannello demo vero e li registra.
//
// Un tutorial e' { id, titolo, sotto, passi }. I passi:
//   { didascalia: 'testo', titolo? }   cambia la didascalia; resta finche' non ne arriva un'altra
//   { vai: 'scheda', zona? }           apre una scheda dal menu (e una sua parte)
//   { clic: 'selettore' }              va li' col cursore e clicca
//   { scrivi: 'selettore', testo }     clicca nel campo, lo svuota e scrive una lettera alla volta
//   { scorri: 'selettore' }            scorre finche' quella cosa sta a meta' schermo
//   { guarda: ms }                     si ferma a guardare
// Ogni passo puo' avere `solo: 'pc' | 'tel'` se vale per uno schermo soltanto.
// I selettori sono quelli veri del pannello: se un selettore non c'e' piu', la
// regia si ferma e lo dice, invece di registrare un video sbagliato.

export const SCENE = [
  {
    id: 'monete',
    titolo: 'Le monete del tuo canale',
    sotto: 'come arrivano, a chi no, e quando smettono',
    passi: [
      { didascalia: 'Nel pannello: Giochi & classifiche, parte «Monete e classifica».' },
      { vai: 'giochi' },
      { clic: '[data-sotto="monete"]' },
      { scorri: '#pt-auto' },
      { didascalia: 'Arrivano anche da sole: coi messaggi, con la presenza, con le serie. Un clic e le spegni tutte.' },
      { guarda: 1200 },
      { scorri: '#pt-noComandi' },
      { didascalia: 'Un «!monete» ogni cinque minuti non è partecipare: i comandi possono non contare.' },
      { clic: '#pt-noComandi' },
      { scorri: '#pt-stopMin' },
      { didascalia: 'Chi resta in lurk cala, e dopo il tempo che scegli si ferma. Riparte appena scrive.' },
      { scrivi: '#pt-stopMin', testo: '45' },
      { scorri: '#pt-conti' },
      { didascalia: 'I conti di una diretta di due ore, con le regole che stai scegliendo.' },
      { guarda: 1800 },
      { scorri: '#btn-doppio' },
      { didascalia: 'L\'ora doppia: per mezz\'ora tutto vale il doppio. In chat i mod scrivono !doppio.' },
      { clic: '#btn-doppio' },
      { guarda: 1500 },
      { scorri: '#btn-salva-punti' },
      { clic: '#btn-salva-punti' },
      { didascalia: 'Salvato. I bot non prendono mai niente: non è un\'impostazione.' },
      { guarda: 1600 },
    ],
  },
  {
    id: 'pagina-link',
    titolo: 'La tua pagina link',
    sotto: 'in trenta secondi',
    passi: [
      { didascalia: 'Nel pannello: Pagina link.' },
      { vai: 'pagina' },
      { didascalia: 'Una pagina sola con tutti i tuoi link, la diretta e le donazioni.' },
      { scrivi: '#lp-headline', testo: 'Andry · streamer' },
      { didascalia: 'Il titolo che si legge in cima. L\'anteprima cambia mentre scrivi.' },
      { scrivi: '#lp-tagline', testo: 'Ogni sera alle nove' },
      { guarda: 1200 },
      { clic: '[data-lptab="aspetto"]' },
      { didascalia: 'Un tema con un clic: colori, caratteri, bottoni e movimento.' },
      { clic: '[data-lptema]' },
      { guarda: 1500 },
      { clic: '[data-lpvista="schermo"]', solo: 'pc' },
      { didascalia: 'E com\'è su un computer.', solo: 'pc' },
      { guarda: 1500 },
    ],
  },
  {
    id: 'negozio',
    titolo: 'Il negozio del canale',
    sotto: 'si compra con le monete, in chat',
    passi: [
      { didascalia: 'Nel pannello: Negozio.' },
      { vai: 'negozio', zona: 'articoli' },
      { didascalia: 'Effetti, VIP, canzoni, cose da consegnare: si pagano con le monete del canale.' },
      { guarda: 1500 },
      { vai: 'negozio', zona: 'pagina' },
      { didascalia: 'E una pagina sua, con gli articoli e il modo di comprarli.' },
      { guarda: 2000 },
    ],
  },
];
