// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA TUA DIRETTA IN PRIMO PIANO: quanto rilievo ha un avviso in un posto.
//
// Il gruppo e il server sono di chi li ha collegati. Le dirette degli amici e
// della community ci passano come ospiti: prima arrivavano identiche a quelle
// di casa, con la carta grande, il suono, il messaggio fissato e il ruolo
// chiamato. Con cinque amici in diretta il gruppo suonava cinque volte, e
// l'ultimo fissato si prendeva la cima del gruppo anche mentre il padrone di
// casa era in onda.
//
// La regola, in un posto solo, per Telegram e per Discord:
//   · l'avviso di CASA (lo streamer del canale, su qualunque piattaforma) ha
//     tutto: carta, suono, fissato dove il posto fissa, ruolo chiamato, e
//     l'anteprima grande quando la carta non c'e';
//   · l'avviso di un OSPITE, in un posto che riceve anche le dirette di casa,
//     arriva in sordina: niente carta, niente suono, mai fissato, nessun ruolo
//     chiamato, anteprima piccola. Si legge, ma non ruba la scena;
//   · in un posto che riceve SOLO gli altri, o con la levetta spenta, gli
//     ospiti restano PARI: lì non c'e' nessuna diretta di casa da proteggere.
//
// Il rilievo non sceglie DOVE va un avviso (lo decidono la matrice e la lista
// di chi annunciare): sceglie COME arriva dove va gia'.

// Il posto riceve le dirette di casa? Il filtro «di chi» vuoto vuol dire tutti.
// Non si guarda il filtro degli eventi: l'ospite che arriva qui ha gia' passato
// quello, ed e' lo stesso evento (la diretta) che usa la casa.
export const ospitaCasa = (posto, casa) => {
  const l = String(posto?.streamer || '').split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
  return !l.length || l.includes(String(casa || '').toLowerCase());
};

// I tre rilievi. Congelati: chi li riceve li legge e basta.
export const RILIEVI = Object.freeze({
  casa: Object.freeze({ ruolo: 'casa', carta: true, suona: true, fissa: true, chiama: true, piccola: false, anteprima: 'grande' }),
  ospite: Object.freeze({ ruolo: 'ospite', carta: false, suona: false, fissa: false, chiama: false, piccola: true, anteprima: 'piccola' }),
  // come e' sempre stato: nessuna preferenza sull'anteprima
  pari: Object.freeze({ ruolo: 'pari', carta: true, suona: true, fissa: true, chiama: true, piccola: false, anteprima: '' }),
});

// casa: lo streamer del canale. chi: di chi e' la diretta. posto: la
// destinazione (Telegram o Discord, tutte e due hanno `streamer`). risalto: la
// levetta della sezione, accesa di serie.
//
// Con la levetta spenta tutto torna com'era, casa compresa: «spento» deve
// voler dire «come prima», non «quasi come prima».
export function rilievo({ casa, chi, posto, risalto = true }) {
  if (!risalto) return RILIEVI.pari;
  const c = String(casa || '').toLowerCase();
  const di = String(chi || '').toLowerCase();
  if (!di || di === c) return RILIEVI.casa;
  return ospitaCasa(posto, c) ? RILIEVI.ospite : RILIEVI.pari;
}
