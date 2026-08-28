// Sonda del CONTRATTO 7TV — parla con 7TV VERO, quindi vive fuori da `npm test`
// (le prove devono girare offline e uguali a se stesse).
//
// Esiste perche' 7TV ha spostato la creazione delle emote senza preavviso:
// `createEmote` e' sparita dallo schema GraphQL e il caricamento e' morto in
// silenzio, scoperto da chi lo usava. Questa sonda chiede a 7TV, adesso, se le
// tre porte che usiamo sono ancora dove le abbiamo lasciate.
//
// Uso: node scripts/verifica-7tv.mjs   (esce 1 se il contratto e' cambiato)

const GQL = 'https://7tv.io/v3/gql';
const REST4 = 'https://7tv.io/v4';

const esiti = [];
const dice = (ok, msg, extra = '') => esiti.push({ ok, msg, extra });

const chiedi = async (query) => {
  const r = await fetch(GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'SocialBot/1.0' },
    body: JSON.stringify({ query }),
  });
  return r.json();
};

// ---- 1. lettura: il set di un canale si legge ancora da REST v3 -----------
{
  const r = await fetch('https://7tv.io/v3/emote-sets/global', { headers: { 'User-Agent': 'SocialBot/1.0' } });
  const j = r.ok ? await r.json() : null;
  dice(Array.isArray(j?.emotes) && j.emotes.length > 0 && !!j.emotes[0]?.id && !!j.emotes[0]?.name,
    'le emote di un set si leggono da /v3/emote-sets con { id, name }');
}

// ---- 2. set: aggiungi/togli/rinomina sono ancora su GraphQL v3 ------------
{
  const j = await chiedi('{ __type(name:"EmoteSetOps"){ fields { name args { name } } } }');
  const f = (j?.data?.__type?.fields || []).find((x) => x.name === 'emotes');
  const args = (f?.args || []).map((a) => a.name).sort().join(',');
  dice(args === 'action,id,name',
    'emoteSet(id).emotes(id, action, name) regge aggiungi/togli/rinomina', args);
}

// ---- 3. creazione: NON e' piu' su GraphQL --------------------------------
{
  const j = await chiedi('{ __schema { mutationType { fields { name } } } }');
  const nomi = (j?.data?.__schema?.mutationType?.fields || []).map((x) => x.name);
  dice(!nomi.includes('createEmote'),
    'createEmote resta fuori da GraphQL (se torna, la scelta va rivista)');
}

// ---- 4. creazione: la porta e' REST v4 multipart con parte `metadata` -----
// Senza credenziali si arriva fino al controllo di identita': e' esattamente il
// punto che ci serve, perche' dimostra che forma e percorso sono ancora giusti.
{
  const senza = new FormData();
  senza.append('file', new Blob([new Uint8Array([0])], { type: 'image/webp' }), 'p.webp');
  const a = await fetch(`${REST4}/emotes`, { method: 'POST', body: senza });
  const ta = await a.text();
  dice(/missing metadata/i.test(ta), 'senza `metadata` 7TV rifiuta (la parte serve davvero)', ta.slice(0, 80));

  const con = new FormData();
  con.append('metadata', new Blob([JSON.stringify({ name: 'sonda', tags: [], flags: 0 })], { type: 'application/json' }));
  con.append('file', new Blob([new Uint8Array([0])], { type: 'image/webp' }), 'p.webp');
  const b = await fetch(`${REST4}/emotes`, { method: 'POST', body: con });
  const tb = await b.text();
  dice(b.status === 401 && /not logged in/i.test(tb),
    'con `metadata` la richiesta passa la forma e si ferma solo sull\'identita\'', `HTTP ${b.status} ${tb.slice(0, 60)}`);
}

const rossi = esiti.filter((e) => !e.ok);
for (const e of esiti) console.log((e.ok ? '  ✓ ' : '  ✗ ') + e.msg + (e.extra && !e.ok ? `  → ${e.extra}` : ''));
console.log(rossi.length
  ? `\n${rossi.length} cose sono cambiate da 7TV: il caricamento o la gestione emote vanno rifatti.`
  : '\n7TV e\' dove l\'abbiamo lasciata. ✓');
process.exit(rossi.length ? 1 : 0);
