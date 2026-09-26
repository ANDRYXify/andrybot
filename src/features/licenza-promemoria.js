// IL PROMEMORIA DELLA LICENZA: la licenza del server scade, e qualcuno lo deve
// sapere per tempo (docs/LICENZA-FIRMATA.md).
//
// La licenza la firma il proprietario, a mano, con la sua chiave privata che
// sta solo sul suo computer: e' una scelta, e resta cosi'. Quello che non deve
// succedere e' dimenticarsene: una licenza scaduta non spegne il server
// acceso, ma al primo riavvio (un aggiornamento, un guasto) il server non
// riparte, e il sito resta giu' finche' non arriva quella nuova.
//
// Percio' una mail, a soglie fisse prima della scadenza, che dice QUANDO
// succede e COME si rinnova, passo per passo. Una mail per soglia: le soglie
// mandate si ricordano insieme alla data di scadenza, cosi' con una licenza
// nuova il conto riparte da solo. Se il server e' rimasto spento e di soglie
// ne sono passate piu' d'una, parte solo la piu' urgente: niente raffica.
// Tutto qui e' puro: la scadenza, il tempo e cosa e' gia' partito entrano da
// fuori.
import { guscioHtml, codiceTesto } from './posta.js';

const GIORNO = 86_400_000;
export const SOGLIE = [60, 30, 14, 7, 3, 1];

export function giorniRimasti(scade, adesso = Date.now()) {
  const t = Date.parse(scade);
  return Number.isFinite(t) ? Math.ceil((t - adesso) / GIORNO) : null;
}

// Le soglie mandate valgono per QUELLA scadenza: con una licenza nuova si riparte.
export function mandateDi(memoria, scade) {
  return memoria && memoria.scade === scade && Array.isArray(memoria.mandate) ? memoria.mandate.filter((x) => Number.isInteger(x)) : [];
}

// La soglia da mandare adesso, o null. 0 vuol dire «e' scaduta».
export function daMandare({ scade, adesso = Date.now(), mandate = [] }) {
  const g = giorniRimasti(scade, adesso);
  if (g == null || g > SOGLIE[0]) return null;
  if (g <= 0) return mandate.includes(0) ? null : 0;
  const dovute = SOGLIE.filter((s) => g <= s && !mandate.includes(s));
  return dovute.length ? Math.min(...dovute) : null;
}

// Dopo aver mandato la soglia s, quelle piu' larghe non hanno piu' senso.
export function dopo(mandate, s) {
  return [...new Set([...mandate, ...SOGLIE.filter((x) => x >= s), ...(s === 0 ? [0] : [])])].sort((a, b) => b - a);
}

const escH = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const giornoDi = (scade) => new Date(scade).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });

// La mail. dominio e macchina sono quelli della licenza di adesso: la nuova si
// firma uguale.
export function mail({ scade, adesso = Date.now(), dominio = 'socialbot.live', macchina = '', codice = '' }) {
  const g = giorniRimasti(scade, adesso);
  const data = giornoDi(scade);
  const oggetto = g <= 0 ? `La licenza di ${dominio} è scaduta` : g === 1 ? `La licenza di ${dominio} scade domani` : `La licenza di ${dominio} scade fra ${g} giorni`;
  const quando = g <= 0 ? `La licenza del server è scaduta il ${data}.` : `La licenza del server scade il ${data}, ${g === 1 ? 'domani' : `fra ${g} giorni`}.`;
  const cosa = g <= 0
    ? 'Il server acceso continua a funzionare, ma al primo riavvio non riparte, e il sito resta giù finché non gli dai quella nuova.'
    : 'Fino ad allora non cambia niente. Dopo, il server acceso continua a funzionare, ma al primo riavvio (un aggiornamento, un guasto, la macchina che riparte) non riparte più, e il sito resta giù finché non gli dai la licenza nuova.';
  const comando = `node scripts/licenza.mjs --firma --dominio ${dominio} --mesi 12${macchina ? ` --macchina ${macchina}` : ''}`;
  const passi = [
    ['Sul computer dove hai la chiave privata (di solito ~/.socialbot-chiave-privata.pem), nella cartella di andrybot:', comando],
    ['Esce una riga sola: copiala tutta.', ''],
    ['Sul server, nel file /opt/andrybot/.env, metti la riga nuova al posto di quella che comincia con LICENZA=.', ''],
    ['Poi aggiorna, che riavvia il server con la licenza nuova:', 'cd /opt/andrybot && bash server/aggiorna.sh'],
    ['Per controllare: nella scheda Admin del pannello la licenza dice la data nuova.', ''],
  ];
  const nuova = 'Non trovi più la chiave privata? Cercala prima che scada: una chiave nuova si fa (node scripts/licenza.mjs --chiavi), ma poi va cambiata anche la sua metà pubblica nel codice, e serve un aggiornamento in più.';
  const codiceH = (c) => `<code style="display:block;margin:6px 0 0;padding:8px 10px;background:#f3efe6;border-radius:6px;font-size:13px;white-space:pre-wrap;word-break:break-all;">${escH(c)}</code>`;
  const corpo = `<p style="margin:0 0 12px;"><strong>${escH(quando)}</strong></p>
<p style="margin:0 0 16px;">${escH(cosa)}</p>
<p style="margin:0 0 8px;">Come la rinnovi, in cinque minuti:</p>
<ol style="margin:0 0 16px;padding-left:20px;line-height:1.6;">${passi.map(([p, c]) => `<li style="margin:0 0 8px;">${escH(p)}${c ? codiceH(c) : ''}</li>`).join('')}</ol>
<p style="margin:0;">${escH(nuova)}</p>`;
  return {
    oggetto,
    html: guscioHtml({ titolo: g <= 0 ? 'La licenza è scaduta' : 'La licenza sta per scadere', corpo, codice,
      piede: `SocialBot · ${dominio} · questa mail arriva a ${SOGLIE.join(', ')} giorni dalla scadenza della licenza. Chi la riceve si decide nella scheda Admin del pannello.` }),
    testo: `${quando}\n\n${cosa}\n\nCome la rinnovi, in cinque minuti:\n${passi.map(([p, c], i) => `${i + 1}. ${p}${c ? `\n   ${c}` : ''}`).join('\n')}\n\n${nuova}${codiceTesto(codice)}`,
  };
}
