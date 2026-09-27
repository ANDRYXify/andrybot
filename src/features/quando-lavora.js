// QUANDO LAVORA IL BOT, su qualunque chat.
//
// Le regole sono due, e valgono uguali per Twitch, Kick e YouTube:
//  · l'interruttore del bot sta sopra tutto: spento, non risponde da nessuna parte;
//  · la modalita' dice se lavora sempre o solo mentre il canale e' in diretta.
// Stanno qui, in un posto solo, perche' prima la chat di Twitch le rispettava e
// quella di Kick no: un bot spento continuava a rispondere su Kick.
//
// Le modalita' sono due. C'era anche «manuale», che a conti fatti era «sempre»
// (a decidere era gia' l'interruttore): una modalita' salvata cosi' si legge
// «sempre», e dal pannello non si puo' piu' scegliere.
export const MODALITA = ['sempre', 'live'];

export const modalitaDi = (settings) => (settings?.modalita === 'live' ? 'live' : 'sempre');

// Quello che arriva dal pannello, ripulito: 'sempre' | 'live', o null se non e'
// una modalita'. «manuale» arriva ancora da un pannello rimasto aperto da prima.
export function normModalita(v) {
  if (v === 'manuale') return 'sempre';
  return MODALITA.includes(v) ? v : null;
}

// Il bot lavora su questo canale adesso? `s` e' la riga dello streamer,
// `inDiretta` dice se il canale e' in onda sulla piattaforma da cui arriva il
// messaggio.
export function alLavoro(s, { inDiretta = false } = {}) {
  if (!s || s.status !== 'approved' || s.botEnabled === false) return false;
  return modalitaDi(s.settings) === 'live' ? inDiretta === true : true;
}
