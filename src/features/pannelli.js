// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I PANNELLI DI TWITCH (docs/STRUMENTI.md, «Pannelli»): quello che si salva in
// `settings.pannelli`, ripulito. Lo stile e' della serie, i pannelli portano
// solo titolo, sottotitolo, icona, dove porta e descrizione. Il disegno e i testi precompilati
// stanno in src/web/public/pannelli.js; le costanti sono le stesse, e
// test/unita/pannelli.test.mjs controlla che restino uguali.

export const W = 320;
export const ALTEZZE = [80, 100, 160];
export const TEMI = ['pagina', 'carta', 'notte', 'miei'];
export const FORME = ['penna', 'netta', 'piena'];
export const CARATTERI = ['archivo', 'serif', 'pennarello', 'gothic'];
export const TIPI = ['chi', 'programma', 'social', 'discord', 'dona', 'comandi', 'regole', 'libero'];
export const ICONE = { chi: 'utente', programma: 'calendario', social: 'globo', discord: 'chat', dona: 'cuore', comandi: 'lista', regole: 'scudo', libero: 'stella' };
// Le icone fra cui si sceglie: tutte chiavi del set del pannello (ICO in app.js).
export const ICONE_SCELTA = ['utente', 'faccina', 'calendario', 'globo', 'chat', 'cuore', 'lista', 'scudo', 'stella',
  'giochi', 'musica', 'cuffie', 'monitor', 'fotocamera', 'video', 'trofeo', 'corona', 'megafono', 'dado', 'fulmine', 'libro', 'telefono', 'giveaway'];
export const MAX = { voci: 12, titolo: 40, sottotitolo: 50, link: 300, testo: 1000, comandi: 12 };
// I colori di serie del tema «I miei colori»: quelli del tema «Notte».
export const MIEI_BASE = { fondo: '#151216', testo: '#f4eef2', accento: '#b8237f' };

const riga = (x, n) => String(x == null ? '' : x).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const testo = (x, n) => String(x == null ? '' : x).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
function indirizzo(u) {
  const s = String(u || '').trim();
  if (!s || s.length > MAX.link) return '';
  try { const x = new URL(s); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; }
}
const esa = (v, base) => (/^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : base);

export function normPannelli(v) {
  const s = v && typeof v === 'object' ? v : {};
  const st = s.stile && typeof s.stile === 'object' ? s.stile : {};
  const stile = {
    tema: TEMI.includes(st.tema) ? st.tema : 'pagina',
    forma: FORME.includes(st.forma) ? st.forma : 'penna',
    carattere: CARATTERI.includes(st.carattere) ? st.carattere : 'archivo',
    altezza: ALTEZZE.includes(Number(st.altezza)) ? Number(st.altezza) : 100,
    icone: st.icone !== false,
    // la freccina sui pannelli che portano da qualche parte: spenta di serie,
    // una serie gia' caricata su Twitch non cambia da sola
    freccia: st.freccia === true,
    colori: {
      fondo: esa(st.colori?.fondo, MIEI_BASE.fondo),
      testo: esa(st.colori?.testo, MIEI_BASE.testo),
      accento: esa(st.colori?.accento, MIEI_BASE.accento),
    },
  };
  const voci = [], ids = new Set();
  for (const x of Array.isArray(s.voci) ? s.voci : []) {
    if (voci.length >= MAX.voci) break;
    if (!x || typeof x !== 'object') continue;
    const tipo = TIPI.includes(x.tipo) ? x.tipo : 'libero';
    // l'id tiene il seme della penna: lo stesso pannello, lo stesso bordo
    const base = String(x.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || tipo;
    let id = base, n = 2;
    while (ids.has(id)) id = `${base}-${n++}`;
    ids.add(id);
    voci.push({
      id, tipo,
      titolo: riga(x.titolo, MAX.titolo),
      sottotitolo: riga(x.sottotitolo, MAX.sottotitolo),
      icona: ICONE_SCELTA.includes(x.icona) ? x.icona : ICONE[tipo],
      link: indirizzo(x.link),
      // porta alla SUA pagina (/u/<login>/p/<id>) invece che al link scritto.
      // «Sostienimi» no: ha gia' la pagina delle donazioni.
      pagina: x.pagina === true && tipo !== 'dona',
      testo: testo(x.testo, MAX.testo),
    });
  }
  return { stile, voci };
}

// I COMANDI CHE CHIUNQUE PUO' USARE, per il pezzo «comandi» delle pagine
// (src/features/linkpagina.js): dai moduli accesi del canale, quelli con un
// comando e senza un ruolo minimo (quelli dei moderatori non si pubblicano),
// ne' un «Per chi: solo…» (quello di Tizio non e' di chiunque; «tutti tranne
// Tizio» invece si').
// Cosa fanno: la risposta in chat, ma solo se e' una frase fissa. Con una
// variabile dentro, in pagina si leggerebbe il segnaposto ($user) e non quello
// che il bot dira' davvero: meglio niente.
const MAX_COMANDI_PAGINA = 40;
export function comandiPubblici(moduli, max = MAX_COMANDI_PAGINA) {
  const pulito = (x) => String(x || '').trim().replace(/^!+/, '').toLowerCase().replace(/\s+/g, '').slice(0, 30);
  const visti = new Set(), out = [];
  for (const m of Array.isArray(moduli) ? moduli : []) {
    if (!m || !m.attivo || m.trigger?.tipo !== 'comando') continue;
    const tier = m.condizioni?.tier;
    if (tier && tier !== 'tutti') continue;
    if (m.condizioni?.chi && m.condizioni.chi.modo !== 'tranne') continue;
    const comando = pulito(m.trigger.comando);
    if (!comando || visti.has(comando)) continue;
    visti.add(comando);
    const grezzi = Array.isArray(m.trigger.alias) ? m.trigger.alias : String(m.trigger.alias || '').split(/[\s,]+/);
    const alias = [...new Set(grezzi.map(pulito).filter((a) => a && a !== comando))].slice(0, 5);
    const msg = (Array.isArray(m.azioni) ? m.azioni : []).find((a) => a?.tipo === 'messaggio' && String(a.testo || '').trim());
    const frase = msg ? String(msg.testo).replace(/\s+/g, ' ').trim() : '';
    out.push({ comando, alias, cosa: frase && !/\$[a-zA-Z(]|\{/.test(frase) ? frase.slice(0, 200) : '' });
  }
  return out.sort((a, b) => a.comando.localeCompare(b.comando)).slice(0, Math.max(0, max));
}

// LA PAGINA DIETRO UN PANNELLO SI APRE solo se un pannello salvato ci porta:
// esiste, e chi lo ha salvato ha scelto «Apre la sua pagina». Un pannello
// tolto, o che porta a un indirizzo, si porta via la sua pagina senza
// cancellarla: se torna, torna com'era.
export function portaAllaPagina(salvati, id) {
  return normPannelli(salvati).voci.some((v) => v.id === String(id || '') && v.pagina);
}
