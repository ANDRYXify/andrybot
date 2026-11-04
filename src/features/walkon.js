// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL WALK-ON (docs/WALKON.md): l'entrata in scena di chi e' sub.
//
// Qui il modello: le regole dello streamer ripulite (`normWalkon`), chi ha i
// requisiti (`requisiti`, con «non lo so» tenuto distinto dal «no»), il tipo
// di un file letto dai suoi primi byte (`tipoDaiByte`), e il servizio che fa
// partire un walk-on al primo messaggio della diretta, uno alla volta.
// Le garanzie (una riga per persona, una entrata per diretta, una decisione
// sulla versione vista) stanno nello schema: db.js, `walkon`.

export const WALKON = Object.freeze({
  tipi: Object.freeze(['immagine', 'video', 'audio']),
  pesoMb: [1, 30], durataFile: [1, 30], durata: [2, 30], durataImmagine: [1, 30], attesa: [0, 600], perDiretta: [1, 500],
  volume: [0, 100], testoMax: [0, 200], voci: 50, persone: 200, motivi: 10, comando: 'walkon', titolo: 120, dida: 400, riga: 200, motivo: 300,
});
export const LINGUE = ['it', 'en', 'es'];

// I testi di serie: la pagina (titolo, presentazione) e la riga in chat.
// {canale} e {nome} si riempiono dove servono.
export const TESTI_DI_SERIE = Object.freeze({
  it: Object.freeze({ titolo: 'La tua entrata in scena da {canale}', dida: 'Sei sub? Scegli cosa succede in diretta la prima volta che scrivi in chat: un effetto del canale, o un\'immagine, un video, un audio tuo. Prima che vada in onda lo guarda un moderatore.', riga: 'Fate largo: entra in scena {nome}!' }),
  en: Object.freeze({ titolo: 'Your entrance on {canale}', dida: 'Subscribed? Choose what happens on stream the first time you write in chat: one of the channel\'s effects, or an image, a video, a sound of your own. A moderator checks it before it goes live.', riga: 'Make way: {nome} takes the stage!' }),
  es: Object.freeze({ titolo: 'Tu entrada en escena en {canale}', dida: '¿Eres sub? Elige qué pasa en el directo la primera vez que escribes en el chat: un efecto del canal, o una imagen, un vídeo, un audio tuyo. Antes de salir al aire lo revisa un moderador.', riga: '¡Abran paso: {nome} entra en escena!' }),
});
export const MOTIVI_DI_SERIE = Object.freeze([
  Object.freeze({ it: 'Non è adatto alla diretta.', en: 'It is not right for the stream.', es: 'No es adecuado para el directo.' }),
  Object.freeze({ it: 'Il volume è troppo alto.', en: 'The volume is too loud.', es: 'El volumen está demasiado alto.' }),
  Object.freeze({ it: 'Contiene un marchio o materiale di altri.', en: 'It contains someone else\'s brand or material.', es: 'Contiene una marca o material de otros.' }),
]);

const oggetto = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : null);
const testo = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const intero = (v, [lo, hi], def) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
export const formaComando = (c) => String(c ?? '').toLowerCase().replace(/^!+/, '').replace(/[^a-z0-9_àèéìòù-]/g, '').slice(0, 25);

// «pippo» e' su Twitch, «kick:pippo» su Kick: si confrontano come piattaforma:login
export function formaPersona(v) {
  const s = String(v ?? '').trim().toLowerCase().replace(/^@/, '');
  const m = /^(?:(twitch|kick):@?)?([a-z0-9_.-]{1,40})$/.exec(s);
  return m ? (m[1] || 'twitch') + ':' + m[2] : '';
}

function normTesti(t) {
  const o = oggetto(t) || {};
  const out = {};
  for (const l of LINGUE) {
    const x = oggetto(o[l]) || {};
    out[l] = { titolo: testo(x.titolo, WALKON.titolo), dida: testo(x.dida, WALKON.dida), riga: testo(x.riga, WALKON.riga) };
  }
  return out;
}
function normMotivi(m) {
  if (!Array.isArray(m)) return MOTIVI_DI_SERIE.map((x) => ({ ...x }));
  return m.map((x) => oggetto(x) || {}).map((x) => Object.fromEntries(LINGUE.map((l) => [l, testo(x[l], WALKON.motivo)])))
    .filter((x) => LINGUE.some((l) => x[l])).slice(0, WALKON.motivi);
}

// LE REGOLE DELLO STREAMER, ripulite. Di serie spento; ogni pezzo e' suo.
export function normWalkon(x) {
  const o = oggetto(x) || {};
  const chi = oggetto(o.chi) || {}, eff = oggetto(o.effetti) || {}, file = oggetto(o.file) || {}, tes = oggetto(o.testo) || {}, par = oggetto(o.partenza) || {}, riga = oggetto(o.riga) || {};
  const tipi = Array.isArray(file.tipi) ? WALKON.tipi.filter((t) => file.tipi.includes(t)) : [...WALKON.tipi];
  return {
    attivo: o.attivo === true,
    chi: {
      subTwitch: chi.subTwitch !== false,
      livello: intero(chi.livello, [1, 3], 1),
      subKick: chi.subKick !== false,
      vip: chi.vip === true,
      mod: chi.mod === true,
      persone: [...new Set((Array.isArray(chi.persone) ? chi.persone : String(chi.persone || '').split(/[\s,;]+/)).map(formaPersona).filter(Boolean))].slice(0, WALKON.persone),
    },
    effetti: {
      attivo: eff.attivo !== false,
      voci: [...new Set((Array.isArray(eff.voci) ? eff.voci : []).map(formaComando).filter(Boolean))].slice(0, WALKON.voci),
      senzaApprovazione: eff.senzaApprovazione === true,
    },
    file: {
      attivo: file.attivo !== false,
      tipi,
      pesoMb: intero(file.pesoMb, WALKON.pesoMb, 8),
      durataSec: intero(file.durataSec, WALKON.durataFile, 10),
    },
    testo: { attivo: tes.attivo !== false, max: intero(tes.max, WALKON.testoMax, 80) },
    partenza: { modo: par.modo === 'comando' ? 'comando' : 'messaggio', comando: formaComando(par.comando) || WALKON.comando },
    attesaSec: intero(o.attesaSec, WALKON.attesa, 20),
    perDiretta: intero(o.perDiretta, WALKON.perDiretta, 30),
    durataSec: intero(o.durataSec, WALKON.durata, 8),
    durataImmagineSec: intero(o.durataImmagineSec, WALKON.durataImmagine, 5),
    volume: intero(o.volume, WALKON.volume, 80),
    riga: { attiva: riga.attiva !== false },
    testi: normTesti(o.testi),
    motivi: normMotivi(o.motivi),
  };
}

// Cosa si puo' scegliere davvero adesso: gli effetti del canale accesi (solo
// immagini, video e audio: il walk-on sta nel suo posto) e i file accesi.
export const TIPI_EFFETTO = Object.freeze(['immagine', 'video', 'audio']);
export function effettoOfferto(cfg, comando, eff) {
  const c = formaComando(comando);
  return !!(cfg?.effetti?.attivo && c && cfg.effetti.voci.includes(c) && eff && TIPI_EFFETTO.includes(eff.tipo) && eff.file);
}
export const fileAperti = (cfg) => !!(cfg?.file?.attivo && cfg.file.tipi.length);

// Un testo dello streamer nella lingua chiesta, o quello di serie.
export function testoDi(cfg, lingua, chiave, valori = {}) {
  const l = LINGUE.includes(lingua) ? lingua : 'it';
  const base = cfg?.testi?.[l]?.[chiave] || TESTI_DI_SERIE[l][chiave] || '';
  return String(base).replace(/\{(nome|canale)\}/g, (m, k) => (valori[k] != null && valori[k] !== '' ? String(valori[k]) : m));
}
export function motivoIn(motivo, lingua) {
  if (motivo && typeof motivo === 'object') return motivo[lingua] || motivo.it || motivo.en || motivo.es || '';
  return String(motivo || '');
}

// IL LIVELLO DEL SUB dai distintivi di Twitch: la versione del distintivo
// «subscriber» dice anche il livello (2xxx il secondo, 3xxx il terzo).
// «founder» e' un sub del primo. 0 se non e' sub.
export function livelloDaBadge(badges) {
  const s = String(badges || '');
  const m = /(?:^|,)subscriber\/(\d+)/.exec(s);
  if (m) { const v = Number(m[1]); return v >= 3000 ? 3 : v >= 2000 ? 2 : 1; }
  return /(?:^|,)founder\//.test(s) ? 1 : 0;
}
// La persona dei Pew: l'id su Twitch, k:<id> su Kick, niente altrove.
export function personaDi(piattaforma, userId) {
  const id = String(userId ?? '').trim();
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return '';
  const p = piattaforma || 'twitch';
  return p === 'twitch' ? id : p === 'kick' ? 'k:' + id : '';
}
// La prova che porta un messaggio in chat: tutto si sa (i distintivi ci sono).
export function provaDaMessaggio(msg) {
  const piattaforma = msg?.piattaforma || 'twitch';
  const livello = piattaforma === 'twitch' ? (livelloDaBadge(msg?.tags?.badges) || (msg?.isSub ? 1 : 0)) : null;
  return { piattaforma, login: String(msg?.user || '').toLowerCase(), sub: !!msg?.isSub, livello, vip: !!msg?.isVip, mod: !!(msg?.isMod || msg?.isBroadcaster) };
}

// CHI PUO'. 'si', 'no' o 'non-so': una prova con un pezzo che non si sa
// (null) non diventa mai un «no» per quel pezzo.
export function requisiti(cfg, prova) {
  const c = cfg?.chi || {};
  const p = prova || {};
  const piattaforma = p.piattaforma === 'kick' ? 'kick' : 'twitch';
  if (p.login && (c.persone || []).includes(piattaforma + ':' + String(p.login).toLowerCase())) return 'si';
  let nonSo = false;
  const guarda = (v) => { if (v === true) return true; if (v == null) nonSo = true; return false; };
  if (piattaforma === 'twitch' && c.subTwitch) {
    if (p.sub === true) {
      if (p.livello == null) nonSo = true; else if (p.livello >= (c.livello || 1)) return 'si';
    } else if (guarda(p.sub)) return 'si';
  }
  if (piattaforma === 'kick' && c.subKick && guarda(p.sub)) return 'si';
  if (c.vip && guarda(p.vip)) return 'si';
  if (c.mod && guarda(p.mod)) return 'si';
  return nonSo ? 'non-so' : 'no';
}

// IL TIPO DAI BYTE (docs/WALKON.md, «Il file»): i primi byte dicono cos'e', il
// nome e il tipo dichiarato dal browser no. Torna { famiglia, mime } o null.
export function tipoDaiByte(testa) {
  const b = Buffer.isBuffer(testa) ? testa : Buffer.alloc(0);
  const a = (i, j) => b.toString('latin1', i, j);
  if (b.length < 12) return null;
  if (b[0] === 0x89 && a(1, 4) === 'PNG') return { famiglia: 'immagine', mime: 'image/png' };
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { famiglia: 'immagine', mime: 'image/jpeg' };
  if (a(0, 6) === 'GIF87a' || a(0, 6) === 'GIF89a') return { famiglia: 'immagine', mime: 'image/gif' };
  if (a(0, 4) === 'RIFF') {
    const f = a(8, 12);
    if (f === 'WEBP') return { famiglia: 'immagine', mime: 'image/webp' };
    if (f === 'WAVE') return { famiglia: 'audio', mime: 'audio/wav' };
    if (f === 'AVI ') return { famiglia: 'video', mime: 'video/x-msvideo' };
    return null;
  }
  if (a(4, 8) === 'ftyp') {
    const marca = a(8, 12);
    if (marca === 'avif' || marca === 'avis') return { famiglia: 'immagine', mime: 'image/avif' };
    if (/^(heic|heix|hevc|mif1|msf1)$/.test(marca)) return null;
    if (marca === 'M4A ' || marca === 'M4B ') return { famiglia: 'audio', mime: 'audio/mp4' };
    return { famiglia: 'video', mime: marca === 'qt  ' ? 'video/quicktime' : 'video/mp4' };
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { famiglia: 'video', mime: 'video/webm' };
  if (a(0, 4) === 'OggS') return { famiglia: 'audio', mime: 'audio/ogg' };
  if (a(0, 4) === 'fLaC') return { famiglia: 'audio', mime: 'audio/flac' };
  if (a(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return { famiglia: 'audio', mime: 'audio/mpeg' };
  return null;
}

// La mail: un indirizzo, o niente.
export const mailOk = (s) => typeof s === 'string' && s.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z0-9-]{2,}$/i.test(s);

// Quello che una riga mostra a chi modera e a chi l'ha fatta: un elenco di
// campi scritto qui, campo per campo. La mail non sta nella riga (sta in
// walkon_posta), e questo e' il secondo motivo per cui non puo' uscire.
export function rigaPubblica(r, { file = '' } = {}) {
  if (!r) return null;
  return {
    id: r.id, piattaforma: r.piattaforma, login: r.login, nome: r.nome, lingua: r.lingua, scelta: r.scelta, effetto: r.effetto,
    fileTipo: r.file_tipo, fileDurata: r.file_durata, haFile: !!r.file, file: r.file && file ? file : '', testo: r.testo,
    stato: r.sospeso ? 'sospeso' : r.stato, statoVero: r.stato, sospeso: !!r.sospeso, versione: r.versione, verificato: !!r.verificato,
    motivo: r.motivo, creato: r.creato, aggiornato: r.aggiornato, deciso: r.deciso, decisoDa: r.deciso_da,
  };
}

// Cosa va in scena: la carta col media e la riga. null se adesso non si puo'
// (un effetto tolto dalla scelta, un file che non c'e' piu').
export function payloadWalkon(cfg, riga, { effettoDi, payloadEffetto, urlFile, id = '' } = {}) {
  if (!cfg || !riga) return null;
  const dImm = cfg.durataImmagineSec * 1000, dMax = cfg.durataSec * 1000;
  let media = null, durata = 0;
  if (riga.scelta === 'effetto') {
    const eff = effettoDi?.(riga.effetto);
    if (!effettoOfferto(cfg, riga.effetto, eff)) return null;
    const p = payloadEffetto?.(eff);
    if (!p?.url) return null;
    media = { tipo: p.tipo, url: p.url, ...(p.suonoUrl ? { suonoUrl: p.suonoUrl } : {}), ...(p.chroma ? { chroma: p.chroma } : {}) };
    durata = p.tipo === 'immagine' ? Math.min(dImm, dMax) : Math.min(Number(p.durata) || dMax, dMax);
  } else {
    if (!riga.file || !TIPI_EFFETTO.includes(riga.file_tipo)) return null;
    media = { tipo: riga.file_tipo, url: urlFile?.(riga.file) || '' };
    if (!media.url) return null;
    durata = riga.file_tipo === 'immagine' ? Math.min(dImm, dMax) : Math.min(Number(riga.file_durata) || dMax, dMax);
  }
  const nome = testo(riga.nome || riga.login, 40);
  const t = cfg.testo.attivo ? testo(riga.testo, cfg.testo.max).replace(/\{nome\}/g, nome) : '';
  // `durata` e' quanto resta in scena (la fila conta su questa); un video
  // finisce alla sua fine vera, e `tetto` e' il massimo dello streamer
  return { tipo: 'walkon', id, nome, testo: t, media, durata: Math.max(1000, Math.round(durata)), tetto: dMax, volume: cfg.volume };
}

// IL SERVIZIO: il messaggio in chat che fa partire il walk-on, e la fila.
// `store` e' db.walkon; il resto arriva da chi lo crea (bot.js), cosi' le
// prove lo usano con dei finti.
export function creaServizioWalkon({ store, impostazioni, effettoDi, payloadEffetto, urlFile, emit, inOnda, overlay, occasione, linguaChat = () => 'it', display = (l) => l, ora = () => Date.now(), log = null } = {}) {
  const visti = new Map();   // canale|persona -> la prova dell'ultimo messaggio (i distintivi), per quando si salva
  const file = new Map();    // canale -> { coda, libero, timer }
  const cfgDi = (l) => normWalkon(impostazioni?.(l));

  function ricorda(login, persona, prova) {
    if (visti.size > 20000) visti.delete(visti.keys().next().value);
    visti.delete(login + '|' + persona);
    visti.set(login + '|' + persona, { ...prova, ts: ora() });
  }
  // gli ultimi distintivi visti (vip, mod, sub) di una persona: null se mai visti
  const distintivi = (login, persona) => visti.get(String(login) + '|' + String(persona)) || null;

  function gira(login) {
    const f = file.get(login);
    if (!f || f.timer) return;
    const adesso = ora();
    if (adesso < f.libero) {
      f.timer = setTimeout(() => { f.timer = null; gira(login); }, f.libero - adesso);
      f.timer.unref?.();
      return;
    }
    const v = f.coda.shift();
    if (!v) { file.delete(login); return; }
    // si rilegge: tolto, rifiutato o cambiato mentre aspettava, non parte
    const r = store.get(login, v.persona);
    if (!r || r.stato !== 'approvato' || r.sospeso || r.versione !== v.versione) { gira(login); return; }
    try { emit(login, v.payload); } catch (e) { log?.warn?.(`walk-on #${login}:`, e?.message || e); }
    const cfg = cfgDi(login);
    if (cfg.riga.attiva && v.parla) {
      const t = testoDi(cfg, linguaChat(login), 'riga', { nome: v.payload.nome, canale: display(login) });
      if (t) { try { v.parla(t); } catch { /* la chat puo' non esserci */ } }
    }
    f.libero = adesso + v.payload.durata + cfg.attesaSec * 1000;
    if (f.coda.length) gira(login);
  }

  // Un messaggio in chat. Torna cosa e' successo (per le prove e per il registro).
  function suMessaggio(login, msg, parla = null) {
    if (!msg || msg.isSelf) return 'no';
    const cfg = cfgDi(login);
    if (!cfg.attivo) return 'spento';
    const persona = personaDi(msg.piattaforma, msg.userId);
    if (!persona) return 'nessuno';
    const prova = provaDaMessaggio(msg);
    ricorda(login, persona, prova);
    if (cfg.partenza.modo === 'comando') {
      const parola = String(msg.text || '').trim().split(/\s+/)[0];
      if (!parola.startsWith('!') || formaComando(parola) !== cfg.partenza.comando) return 'comando';
    }
    const r = store.get(login, persona);
    if (!r) return 'senza';
    const req = requisiti(cfg, prova);
    if (req === 'no') { if (r.stato !== 'rifiutato') store.sospendi(login, persona, true); return 'sospeso'; }
    if (req !== 'si') return 'non-so';
    if (r.sospeso) store.sospendi(login, persona, false);
    if (!r.verificato) store.verificato(login, persona);
    if (r.stato !== 'approvato') return r.stato;
    if (!inOnda?.(login)) return 'fuori-onda';
    if (!overlay?.(login)) return 'senza-overlay';
    const occ = occasione?.(login);
    if (!occ) return 'fuori-onda';
    if (store.entrato(login, occ, persona)) return 'gia';
    const payload = payloadWalkon(cfg, r, { effettoDi: (c) => effettoDi?.(login, c), payloadEffetto: (e) => payloadEffetto?.(login, e), urlFile: (f) => urlFile?.(login, f), id: occ + ':' + persona });
    if (!payload) return 'media';
    if (!store.entra(login, occ, persona, { tetto: cfg.perDiretta, ora: ora() })) return store.entrato(login, occ, persona) ? 'gia' : 'tetto';
    const f = file.get(login) || { coda: [], libero: 0, timer: null };
    file.set(login, f);
    f.coda.push({ persona, versione: r.versione, payload, parla });
    gira(login);
    return 'in-scena';
  }

  // la prova per quando si salva dalla pagina: su Twitch la sottoscrizione la
  // dice Helix (chi chiama la passa in `sub`), il resto i distintivi visti
  function provaPerPagina(login, persona, { piattaforma, login: chiLogin, sub } = {}) {
    const d = distintivi(login, persona);
    const p = { piattaforma, login: chiLogin, sub: null, livello: null, vip: d ? d.vip : null, mod: d ? d.mod : null };
    if (sub) { p.sub = sub.sub; p.livello = sub.sub ? sub.livello : 0; } else if (d) { p.sub = d.sub; p.livello = d.livello; }
    return p;
  }

  return { suMessaggio, provaPerPagina, distintivi, cfgDi, inFila: (l) => file.get(l)?.coda.length || 0 };
}

// LA MAIL DELL'ESITO, nella lingua con cui la persona ha salvato.
const MAIL = {
  it: { approvato: 'Il tuo walk-on da {canale} è approvato', rifiutato: 'Il tuo walk-on da {canale} non è stato approvato', ciao: 'Ciao {nome},',
    si: 'il tuo walk-on è stato approvato: entrerà in scena la prossima volta che scrivi in chat durante una diretta.', no: 'il tuo walk-on non è stato approvato.', motivo: 'Il motivo: {motivo}',
    pagina: 'La tua pagina: {link}', fine: 'Questa mail ti arriva una volta sola: il tuo indirizzo è già stato cancellato.' },
  en: { approvato: 'Your walk-on on {canale} is approved', rifiutato: 'Your walk-on on {canale} was not approved', ciao: 'Hi {nome},',
    si: 'your walk-on has been approved: it will take the stage the next time you write in chat during a stream.', no: 'your walk-on was not approved.', motivo: 'The reason: {motivo}',
    pagina: 'Your page: {link}', fine: 'You get this email only once: your address has already been deleted.' },
  es: { approvato: 'Tu walk-on en {canale} está aprobado', rifiutato: 'Tu walk-on en {canale} no ha sido aprobado', ciao: 'Hola {nome}:',
    si: 'tu walk-on ha sido aprobado: entrará en escena la próxima vez que escribas en el chat durante un directo.', no: 'tu walk-on no ha sido aprobado.', motivo: 'El motivo: {motivo}',
    pagina: 'Tu página: {link}', fine: 'Este correo te llega una sola vez: tu dirección ya ha sido borrada.' },
};
export function mailEsito({ esito, motivo = '', lingua = 'it', canale = '', nome = '', link = '' }) {
  const m = MAIL[LINGUE.includes(lingua) ? lingua : 'it'];
  const r = (s) => String(s).replace(/\{(\w+)\}/g, (x, k) => ({ canale, nome, motivo, link }[k] ?? x));
  const si = esito === 'approvato';
  const righe = [r(m.ciao), '', r(si ? m.si : m.no)];
  if (!si && motivo) righe.push(r(m.motivo));
  righe.push('', r(m.pagina), '', m.fine);
  return { oggetto: r(si ? m.approvato : m.rifiutato), testo: righe.join('\n') };
}
