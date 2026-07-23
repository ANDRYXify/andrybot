// Auguri di compleanno automatici per i membri del gruppo Telegram.
// Qui c'è solo la LOGICA pura: parsing della data, validazione, costruzione del
// messaggio e calcolo del "giorno di oggi" nel fuso italiano. La persistenza è
// nella tabella `compleanni` (db.js), l'invio lo fa telegram.inviaMessaggio.

const MESI = {
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
};
const GIORNI_MAX = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const AUGURI_DEFAULT = '🎂 Tanti auguri {menzione}! 🎉 Buon compleanno da tutta la community!';

const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function valida(giorno, mese) {
  if (!(mese >= 1 && mese <= 12)) return null;
  if (!(giorno >= 1 && giorno <= GIORNI_MAX[mese - 1])) return null;
  return { giorno, mese };
}

// Parsa una data di compleanno: "25/12", "25-12", "25.12", "25 12", "25 dicembre".
export function parseData(s) {
  const t = String(s || '').toLowerCase().trim();
  let m = t.match(/^(\d{1,2})\s*[\/\-. ]\s*(\d{1,2})$/);
  if (m) return valida(+m[1], +m[2]);
  m = t.match(/^(\d{1,2})\s+([a-zàèéìòù]+)$/);
  if (m && MESI[m[2]] !== undefined) return valida(+m[1], MESI[m[2]]);
  return null;
}

export const fmtData = (giorno, mese) => String(giorno).padStart(2, '0') + '/' + String(mese).padStart(2, '0');

// Costruisce il testo degli auguri. {menzione} = tag cliccabile (se abbiamo lo
// user id Telegram), altrimenti il nome; {nome} = solo il nome. Template grezzo
// (l'utente può usare <b>…), valori con escape HTML.
export function costruisciAuguri(template, { nome, tgUserId } = {}) {
  const nomeEsc = esc(nome || 'amico');
  const menzione = tgUserId && /^\d+$/.test(String(tgUserId))
    ? `<a href="tg://user?id=${tgUserId}">${nomeEsc}</a>`
    : nomeEsc;
  const t = (template && String(template).trim()) || AUGURI_DEFAULT;
  return t.replace(/\{(menzione|nome)\}/g, (_, k) => (k === 'menzione' ? menzione : nomeEsc));
}

// Giorno/mese/anno di OGGI nel fuso Europe/Rome (così gli auguri partono a
// mezzanotte italiana, non UTC).
export function oggiRoma() {
  const parti = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome', day: 'numeric', month: 'numeric', year: 'numeric',
  }).formatToParts(new Date());
  const val = (t) => +(parti.find((p) => p.type === t)?.value || 0);
  return { giorno: val('day'), mese: val('month'), anno: val('year') };
}
