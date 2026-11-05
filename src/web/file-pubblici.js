// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I FILE DI TESTO CHE I CONTROLLI CERCANO IN CIMA AL SITO (docs/SEO.md, «I file
// in cima al sito» e «Le IA»): robots.txt, ai.txt, ads.txt, humans.txt,
// tdmrep.json. Puri: il server li serve, le prove li leggono cosi' come sono.

// Le righe Disallow/Allow di robots.txt per «User-agent: *», nell'ordine.
export function regoleRobots(robots) {
  const out = [];
  let tutti = false;
  for (const grezza of String(robots || '').split(/\r?\n/)) {
    const riga = grezza.replace(/#.*$/, '').trim();
    if (!riga) continue;
    const [chiave, ...resto] = riga.split(':');
    const k = chiave.trim().toLowerCase(), v = resto.join(':').trim();
    if (k === 'user-agent') { tutti = v === '*'; continue; }
    if (tutti && (k === 'disallow' || k === 'allow')) out.push({ k: k === 'allow' ? 'Allow' : 'Disallow', v });
  }
  return out;
}

// LE IA (docs/SEO.md, «Le IA: sapere tutto, non imparare da noi»). Due famiglie
// di programmi, due regole:
//  · chi RACCOGLIE DATI PER ADDESTRARE un modello non legge niente, da nessuna
//    parte: nemmeno la vetrina, perche' da una pagina pubblica di un canale si
//    risale a persone, e non si sceglie pagina per pagina cosa insegna;
//  · chi RISPONDE ALLE PERSONE (cerca e cita, come un motore di ricerca) legge
//    le pagine di SocialBot per saperne tutto e consigliarlo, e le pagine dei
//    canali solo di chi lo ha permesso (`settings.ia.pagine`, spento di serie).
// I nomi sono quelli che i loro padroni pubblicano; uno nuovo si aggiunge qui.
export const IA_ADDESTRANO = Object.freeze(['GPTBot', 'Google-Extended', 'Applebot-Extended', 'ClaudeBot', 'anthropic-ai', 'CCBot',
  'meta-externalagent', 'FacebookBot', 'Bytespider', 'Amazonbot', 'cohere-ai', 'cohere-training-data-crawler', 'Diffbot', 'Omgilibot',
  'ImagesiftBot', 'AI2Bot', 'PanguBot', 'Timpibot', 'Webzio-Extended', 'img2dataset']);
export const IA_RISPONDONO = Object.freeze(['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot',
  'Claude-User', 'DuckAssistBot', 'MistralAI-User', 'YouBot']);

// Le vie dei canali, per dominio: sul sito /u/<canale> (pagina link, colpi),
// /won/<canale>, /dona/<canale>; sui domini corti la pagina e' /<canale>.
export const VIE_CANALI = Object.freeze({ sito: Object.freeze(['/u/', '/won/', '/dona/']), corto: Object.freeze(['/']) });
const CANALE = /^[a-z0-9_]{2,25}$/;

// robots.txt per un dominio. `base`: le regole per tutti (src/web/robots-base.txt
// sul sito); `vie`: dove stanno le pagine dei canali; `canali`: chi permette alle
// IA che rispondono di leggerle. Una pagina di canale si apre a quelle IA solo
// se il canale e' nell'elenco: «Allow» piu' lungo del «Disallow», che per lo
// standard (RFC 9309) vince.
export function robotsTxt({ base = '', vie = VIE_CANALI.sito, canali = [] } = {}) {
  const regole = regoleRobots(base).filter((r) => r.k === 'Disallow');
  const aperti = [...new Set(canali.map((c) => String(c).toLowerCase()).filter((c) => CANALE.test(c)))].sort();
  const pagine = [];
  for (const c of aperti) for (const v of vie) pagine.push(`Allow: ${v}${c}$`, `Allow: ${v}${c}/`);
  const chiusi = vie.includes('/') ? ['Disallow: /'] : vie.map((v) => `Disallow: ${v}`);
  return [
    String(base).replace(/\s+$/, ''),
    '',
    '# Le IA che raccolgono dati per addestrarsi: niente, da nessuna parte.',
    ...IA_ADDESTRANO.map((u) => `User-agent: ${u}`),
    'Disallow: /',
    '',
    '# Le IA che rispondono alle persone: tutto quello che racconta SocialBot,',
    '# e le pagine dei canali solo di chi lo ha permesso.',
    ...IA_RISPONDONO.map((u) => `User-agent: ${u}`),
    ...regole.map((r) => `Disallow: ${r.v}`),
    ...chiusi,
    ...pagine,
    ...(vie.includes('/') ? [] : ['Allow: /']),
    '',
  ].join('\n');
}

// ai.txt (la proposta di Spawning): e' la dichiarazione per l'addestramento, e
// qui l'addestramento e' vietato ovunque, testi e immagini compresi.
export function aiTxt(base) {
  return [
    '# ai.txt — questo sito non si usa per addestrare sistemi di intelligenza artificiale.',
    `# Chi risponde alle persone trova cos'è SocialBot in ${base}/llms.txt; le regole per ogni programma sono in ${base}/robots.txt.`,
    'User-Agent: *',
    'Disallow: /',
    '',
  ].join('\n');
}

// TDMRep (W3C, Text and Data Mining Reservation Protocol): la riserva dei
// diritti di estrazione di testo e dati che la direttiva europea 2019/790
// (art. 4) chiede in forma leggibile da una macchina.
export const TDM_REP = Object.freeze([{ location: '/*', 'tdm-reservation': 1 }]);

// ads.txt (IAB Tech Lab, 1.1): il sito non vende spazi pubblicitari, e lo dice.
// La riga segnaposto e' quella che lo standard prescrive per «nessun venditore
// autorizzato»: chi spaccia il nostro dominio per vendere pubblicita' viene
// smentito dal file, invece di trovare il vuoto.
export function adsTxt(base) {
  const dominio = String(base).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return [
    `# ads.txt di ${dominio}: questo sito non mostra pubblicità e non autorizza nessuno a venderne.`,
    'placeholder.example.com, placeholder, DIRECT, placeholder',
    `ownerdomain=${dominio}`,
    '',
  ].join('\n');
}

// humans.txt (humanstxt.org): chi c'e' dietro il sito.
export function humansTxt(base, { aggiornato = '' } = {}) {
  return [
    '/* TEAM */',
    '  Autore: Andrea Taliento (ANDRYXify)',
    '  Sito: https://andryxify.it',
    '  Da: Italia',
    '',
    '/* SITE */',
    ...(aggiornato ? [`  Ultimo aggiornamento: ${aggiornato}`] : []),
    `  Novità: ${base}/novita`,
    '  Lingue: italiano, inglese, spagnolo',
    '  Fatto con: Node.js, Express, SQLite',
    `  Sicurezza: ${base}/.well-known/security.txt`,
    '',
  ].join('\n');
}
