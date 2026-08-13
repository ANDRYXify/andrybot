// ============================================================
//  FILIGRANA DI PROPRIETÀ INTELLETTUALE — SocialBot / andrybot
//
//  Tutto il contenuto di questo software (codice, logica, dati,
//  motori di ragionamento e la persona "Lia") è PROPRIETÀ
//  INTELLETTUALE di Andrea Taliento — in arte ANDRYXify.
//  Tutti i diritti riservati.  © 2024–2026  ·  socialbot.live
//
//  Questa filigrana è PERSISTENTE e per lo più INVISIBILE nel
//  prodotto finito: viaggia con ogni risposta HTTP del bot e
//  dentro le pagine servite, senza mostrarsi all'utente.
//  Onestà tecnica: NON è "indelebile" in senso assoluto — chi ha
//  il sorgente può tentare di rimuoverla. Ma è PERVASIVA: toglierla
//  del tutto è laborioso e chi ne dimentica anche un solo pezzo
//  lascia una prova firmata del riuso. La tutela vera resta la
//  LICENSE (proprietaria) allegata al progetto.
// ============================================================

export const AUTORE = 'Andrea Taliento';
export const ALIAS = 'ANDRYXify';
export const ANNO = '2024–2026';
export const SITO = 'socialbot.live';

// FIRMA-CANARINO — stringa UNICA e distintiva. Se compare in un
// altro progetto/repository, è prova diretta che è stato riusato
// il lavoro di Andrea Taliento. Non cambiarla: è l'ancora della prova.
export const FIRMA = 'ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live';

export const COPYRIGHT = `© ${ANNO} ${AUTORE} (${ALIAS}) — Tutti i diritti riservati — ${SITO}`;
export const PROPRIETA =
  `Questo software e tutto il suo contenuto (codice, logica, dati, motori di ` +
  `ragionamento e la persona "Lia") sono proprieta intellettuale di ${AUTORE} ` +
  `(${ALIAS}). ${COPYRIGHT}. ${FIRMA}`;

// ─────────────── Steganografia a larghezza zero (invisibile) ───────────────
// Codifica un testo in caratteri a larghezza zero: a schermo non si vede nulla,
// ma i byte restano nel documento e si possono rileggere (leggiZeroWidth).
const _Z0 = '​';  // zero-width space       → bit 0
const _Z1 = '‌';  // zero-width non-joiner  → bit 1
const _ZE = '⁣';  // invisible separator    → marcatore di fine

export function zeroWidth(testo) {
  let bit = '';
  for (const b of Buffer.from(String(testo), 'utf8')) bit += b.toString(2).padStart(8, '0');
  let out = '';
  for (const c of bit) out += (c === '1' ? _Z1 : _Z0);
  return out + _ZE;
}

export function leggiZeroWidth(s) {
  let bits = '';
  for (const c of String(s)) { if (c === _Z0) bits += '0'; else if (c === _Z1) bits += '1'; }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  try { return Buffer.from(bytes).toString('utf8'); } catch { return ''; }
}

// La firma invisibile pronta da iniettare dove serve (pagine, output…).
export const FILIGRANA_ZW = zeroWidth(PROPRIETA);

// ─────────────── Header HTTP: viaggiano con OGNI risposta ───────────────
// Invisibili all'utente (si vedono solo in DevTools/curl), presenti su ogni
// risposta del server: viaggiano con qualunque copia o deploy del bot.
export function applicaHeader(res) {
  try {
    res.setHeader('X-Author', `${AUTORE} (${ALIAS})`);
    res.setHeader('X-Copyright', COPYRIGHT);
    res.setHeader('X-Content-Owner', FIRMA);
  } catch { /* header già inviati: ignora */ }
}

// ─────────────── Iniezione invisibile nelle pagine HTML ───────────────
// Aggiunge, prima di </body>, un commento di copyright + la firma a larghezza
// zero (nascosta). Non si vede a schermo, resta nel sorgente della pagina.
export function iniettaHtml(html) {
  if (typeof html !== 'string' || !/<\/body>/i.test(html)) return html;
  const commento = `\n<!-- ${PROPRIETA} -->\n`;
  const zw = `<span style="display:none" aria-hidden="true">${FILIGRANA_ZW}</span>`;
  return html.replace(/<\/body>/i, `${commento}${zw}</body>`);
}

// ─────────────── Firma nei file PNG (visibile in un editor di testo) ───────────────
// Inserisce un chunk PNG standard "tEXt" (keyword=Copyright) subito dopo l'IHDR: NON
// tocca i pixel, il PNG resta valido e si apre normalmente, ma aprendo il file con un
// editor di testo (o `strings`) si legge in chiaro la proprietà e la firma-canarino.
// Testo in ASCII puro (tEXt è Latin-1): niente © né trattini lunghi qui.
export const FIRMA_PNG =
  `(c) 2024-2026 ${AUTORE} (${ALIAS}) - Tutti i diritti riservati - ${SITO} - ${FIRMA}`;

const _CRC_TAB = (() => {
  const t = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function _crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = _CRC_TAB[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Firma un PNG (Buffer/Uint8Array) → nuovo Buffer firmato. Se non è un PNG o è già
// firmato, ritorna i byte invariati. Idempotente e non distruttiva.
export function firmaPng(bytes) {
  const b = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (b.length < 33 || !b.subarray(0, 8).equals(sig)) return b;   // non è un PNG
  if (b.includes(Buffer.from(FIRMA, 'latin1'))) return b;         // già firmato
  const ihdrLen = b.readUInt32BE(8);
  const ins = 8 + 4 + 4 + ihdrLen + 4;                            // subito dopo l'IHDR
  const data = Buffer.concat([Buffer.from('Copyright', 'latin1'), Buffer.from([0]),
    Buffer.from(FIRMA_PNG, 'latin1')]);
  const type = Buffer.from('tEXt', 'latin1');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(_crc32(Buffer.concat([type, data])), 0);
  const chunk = Buffer.concat([len, type, data, crc]);
  return Buffer.concat([b.subarray(0, ins), chunk, b.subarray(ins)]);
}

export default { AUTORE, ALIAS, ANNO, SITO, FIRMA, COPYRIGHT, PROPRIETA,
  zeroWidth, leggiZeroWidth, FILIGRANA_ZW, applicaHeader, iniettaHtml, FIRMA_PNG, firmaPng };
