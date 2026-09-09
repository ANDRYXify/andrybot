// IL GENERE CON CUI IL BOT PARLA DI SE'.
//
// Il bot scrive con l'account dello streamer, e in italiano non si puo' dire
// «sono apparso» senza dichiarare un genere. Finora lo dichiarava a caso: le
// frasi scritte a mano erano al maschile, e quelle generate dal modello
// cambiavano da una risposta all'altra. In un canale di una streamer stona, e
// da fuori sembra che il bot non sappia chi e'.
//
// COME FUNZIONA. Le frasi portano il genere dentro, in un marcatore:
//
//     'hai fatto il mio nome e sono appars{o/a} ✨'
//     'sono {tutto/tutta} orecchie'
//
// A sinistra il maschile, a destra il femminile. Il marcatore non puo' andare a
// sbattere contro i segnaposto ({user}, {nome}): quelli non hanno la barra.
//
// «Neutro» non e' una terza forma dell'italiano, e fingere che lo sia darebbe
// frasi sgrammaticate. E' la scelta di NON dirlo: con «neutro» si scarta la
// frase che dichiara un genere e se ne prende una che non lo fa. Perche' resti
// una scelta possibile e non una speranza, ogni gruppo di frasi deve averne
// almeno una senza marcatore — e c'e' un collaudo che lo pretende.
//
// L'accordo si applica anche all'USCITA, quando il bot parla. E' una rete: se
// una frase marcata arriva fin li' senza essere passata dallo scegli, in chat
// non finisce mai il marcatore. Applicarlo due volte non fa danno, perche' dopo
// la prima passata di marcatori non ne restano.

export const GENERI = ['neutro', 'femminile', 'maschile'];
export const GENERE_PREDEFINITO = 'neutro';

// {maschile/femminile} — niente barre né graffe dentro le due forme
const MARCATORE = /\{([^{}/]*)\/([^{}/]*)\}/g;

export const valido = (g) => GENERI.includes(g);
export const normalizza = (g) => (valido(g) ? g : GENERE_PREDEFINITO);

// Legge il genere dalle impostazioni di un canale, comunque siano fatte.
export const genereDi = (settings) => normalizza(settings?.genere);

export function dichiaraGenere(testo) {
  MARCATORE.lastIndex = 0;
  return MARCATORE.test(String(testo ?? ''));
}

// Risolve i marcatori. Con 'neutro' esce il maschile, che e' la forma non
// marcata dell'italiano: ci si arriva solo se un gruppo non aveva nessuna frase
// senza genere, e in chat e' meglio una frase al maschile che un marcatore.
export function accorda(testo, genere) {
  const f = normalizza(genere) === 'femminile';
  return String(testo ?? '').replace(MARCATORE, (_, m, fm) => (f ? fm : m));
}

// Sceglie da un gruppo rispettando il genere. Con 'neutro' guarda prima le
// frasi che non dichiarano niente.
export function scegliAccordando(gruppo, genere, sorte = Math.random) {
  const tutte = (Array.isArray(gruppo) ? gruppo : []).filter((x) => typeof x === 'string');
  if (!tutte.length) return '';
  const g = normalizza(genere);
  const mute = g === 'neutro' ? tutte.filter((t) => !dichiaraGenere(t)) : [];
  const fra = mute.length ? mute : tutte;
  return accorda(fra[Math.floor(sorte() * fra.length)], g);
}

// La riga da dare al modello, che altrimenti sceglie da se' ogni volta.
export function istruzioneGenere(genere) {
  const g = normalizza(genere);
  if (g === 'femminile') return 'Quando parli di te stessa usa il FEMMINILE (es. "sono contenta", "sono apparsa").';
  if (g === 'maschile') return 'Quando parli di te stesso usa il MASCHILE (es. "sono contento", "sono apparso").';
  return 'Non dichiarare un genere per te stesso: gira la frase in modo che non serva (es. "eccomi", "ti ascolto") invece di scrivere "contento" o "contenta".';
}
