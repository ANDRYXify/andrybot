// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I FILE DI TESTO CHE I CONTROLLI CERCANO IN CIMA AL SITO (docs/SEO.md, «I file
// in cima al sito»): ai.txt, ads.txt, humans.txt. Puri: il server li serve, le
// prove li leggono cosi' come sono.
//
// Una politica, un posto: ai.txt non e' una seconda politica scritta a mano, e'
// robots.txt detto per chi raccoglie dati per le IA. Le stesse porte chiuse,
// lette dallo stesso file: se robots.txt cambia, cambia anche lui.

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

// ai.txt (la proposta di Spawning, scritta come robots.txt): cosa chi raccoglie
// dati per le IA puo' leggere. Le stesse regole di robots.txt per tutti.
export function aiTxt(robots, base) {
  const regole = regoleRobots(robots);
  return [
    '# ai.txt — cosa possono leggere i sistemi di intelligenza artificiale.',
    `# Le stesse regole di ${base}/robots.txt: la vetrina pubblica si legge, le aree private no.`,
    `# Per sapere cos'è questo sito: ${base}/llms.txt`,
    'User-Agent: *',
    ...regole.map((r) => `${r.k}: ${r.v}`),
    '',
  ].join('\n');
}

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
