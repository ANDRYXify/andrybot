// LA CHAT DI YOUTUBE.
//
// Twitch e Kick arrivano da soli; YouTube si chiede. Chiedere invece di
// ricevere porta due difetti che non esistono sulle altre piattaforme, ed e'
// quello che queste prove guardano.
//
// 1. IL SEGNALIBRO. Ogni risposta porta un `nextPageToken`. Senza, si
//    ricomincia da capo ogni volta: gli stessi messaggi vengono processati due
//    volte, cioe' due comandi eseguiti e due volte le monete.
// 2. IL PRIMO GIRO. La prima risposta porta la storia recente della chat. Se la
//    si processa, il bot risponde a messaggi di mezz'ora fa come se fossero
//    appena arrivati — appena entra, spara.
//
// E poi l'identita', che su YouTube e' la cosa piu' scivolosa: nel messaggio
// non c'e' nessun nome unico, solo un nome VISIBILE che due persone possono
// avere identico e un id opaco.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatYoutube } from '../../src/youtube/chat.js';
import { daMessaggioChat, canaliDi } from '../../src/youtube/messaggio.js';

const voce = (id, nome, testo, extra = {}) => ({
  id,
  snippet: { type: 'textMessageEvent', displayMessage: testo, publishedAt: '2026-09-07T10:00:00Z' },
  authorDetails: { channelId: 'UC' + nome, displayName: nome, ...extra },
});

const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));

// Un YouTube finto: dice cosa c'e' in diretta e restituisce pagine di chat.
function finto(pagine) {
  const chiesto = [];
  return {
    chiesto,
    api: {
      direttaInCorso: async () => ({ ok: true, inDiretta: true, chatId: 'CHAT1', videoId: 'V1', titolo: 'prova' }),
      messaggiChat: async (_chi, { pagina }) => {
        chiesto.push(pagina || '(niente)');
        const p = pagine[chiesto.length - 1];
        if (!p) return { ok: true, voci: [], pagina: 'fine', attesaMs: 1 };
        return { ok: true, voci: p.voci, pagina: p.pagina, attesaMs: 1 };
      },
      risolviManiglie: async () => 0,
      manigliaNota: () => '',
    },
  };
}

test('il primo giro serve solo a prendere il segnalibro: non si risponde alla storia', async () => {
  const f = finto([
    { voci: [voce('1', 'lucia', 'ciao di mezz\'ora fa')], pagina: 'p1' },
    { voci: [voce('2', 'marco', 'ciao adesso')], pagina: 'p2' },
  ]);
  const visti = [];
  const m = new ChatYoutube({ suMessaggio: (x) => visti.push(x.text), api: f.api, attesaMinMs: 1 });
  m.accendi('alfa');
  await aspetta(120);
  m.spegni('alfa');

  assert.ok(!visti.includes('ciao di mezz\'ora fa'), 'appena entra, il bot non spara sulla storia');
  assert.ok(visti.includes('ciao adesso'), 'ma quello che arriva dopo lo sente');
});

test('il segnalibro si passa indietro: niente viene letto due volte', async () => {
  const f = finto([
    { voci: [], pagina: 'p1' },
    { voci: [voce('1', 'lucia', 'uno')], pagina: 'p2' },
    { voci: [voce('2', 'lucia', 'due')], pagina: 'p3' },
  ]);
  const visti = [];
  const m = new ChatYoutube({ suMessaggio: (x) => visti.push(x.text), api: f.api, attesaMinMs: 1 });
  m.accendi('alfa');
  await aspetta(160);
  m.spegni('alfa');

  assert.equal(f.chiesto[0], '(niente)', 'la prima volta non c\'e\' segnalibro');
  assert.equal(f.chiesto[1], 'p1', 'poi si riparte da dove si era arrivati');
  assert.equal(f.chiesto[2], 'p2');
  assert.deepEqual(visti, ['uno', 'due'], 'ogni messaggio una volta sola');
});

test('quando la diretta finisce il giro non muore: torna ad aspettarla', async () => {
  let quante = 0;
  const api = {
    direttaInCorso: async () => ({ ok: true, inDiretta: true, chatId: 'CHAT1', videoId: 'V1' }),
    messaggiChat: async () => { quante += 1; return { ok: false, stato: 403, errore: 'chat finita' }; },
    risolviManiglie: async () => 0,
    manigliaNota: () => '',
  };
  const cambi = [];
  const m = new ChatYoutube({ api, attesaMinMs: 1, quandoCambia: (_l, s) => cambi.push(s.inDiretta) });
  m.accendi('alfa');
  await aspetta(80);
  const stato = m.stato('alfa');
  m.spegni('alfa');

  assert.equal(stato.acceso, true, 'il motore resta acceso');
  assert.equal(stato.inDiretta, false, 'ma sa che la chat non c\'e\' piu\'');
  assert.deepEqual(cambi.slice(0, 2), [true, false], 'e lo dice a chi mostra lo stato');
});

test('la maniglia e\' l\'identita\': due omonimi restano due persone', () => {
  const a = daMessaggioChat(voce('1', 'Mario Rossi', 'ciao'), { canale: 'alfa', maniglia: 'mario_uno' });
  const b = daMessaggioChat(voce('2', 'Mario Rossi', 'ciao'), { canale: 'alfa', maniglia: 'mario_due' });
  assert.equal(a.user, 'mario_uno');
  assert.equal(b.user, 'mario_due');
  assert.notEqual(a.user, b.user, 'se no finirebbero nello stesso portafoglio');
  assert.equal(a.display, 'Mario Rossi', 'e a schermo resta il nome che si sono scelti');
});

test('senza maniglia si ripiega sul nome visibile, ripulito', () => {
  const m = daMessaggioChat(voce('1', 'Lucia  Verdi!!', 'ciao'), { canale: 'alfa' });
  assert.equal(m.user, 'lucia_verdi');
  assert.equal(m.userId, 'UCLucia  Verdi!!');
});

test('i ruoli di YouTube diventano quelli che il bot gia\' conosce', () => {
  const padrone = daMessaggioChat(voce('1', 'io', 'ciao', { isChatOwner: true }), { canale: 'alfa', maniglia: 'io' });
  assert.equal(padrone.isBroadcaster, true);
  assert.equal(padrone.isMod, true, 'chi ha il canale puo\' tutto');

  const mod = daMessaggioChat(voce('2', 'mod', 'ciao', { isChatModerator: true }), { canale: 'alfa', maniglia: 'mod' });
  assert.equal(mod.isMod, true);
  assert.equal(mod.isBroadcaster, false);

  const sub = daMessaggioChat(voce('3', 'sub', 'ciao', { isChatSponsor: true }), { canale: 'alfa', maniglia: 'sub' });
  assert.equal(sub.isSub, true);
  assert.equal(sub.isVip, false, 'su YouTube i VIP non esistono');
});

test('nella chat passa anche roba che non e\' un messaggio, e non entra', () => {
  const iscrizione = { id: 'x', snippet: { type: 'newSponsorEvent' }, authorDetails: { channelId: 'UC1', displayName: 'x' } };
  assert.equal(daMessaggioChat(iscrizione, { canale: 'alfa' }), null);
  assert.equal(daMessaggioChat(voce('1', 'lucia', ''), { canale: 'alfa' }), null, 'e nemmeno il vuoto');
  assert.equal(daMessaggioChat(voce('1', 'lucia', 'ciao'), {}), null, 'senza canale non si sa a chi appartiene');
});

test('gli id dei canali si raccolgono senza doppioni: una chiamata, non una per messaggio', () => {
  const voci = [voce('1', 'a', 'x'), voce('2', 'a', 'y'), voce('3', 'b', 'z')];
  assert.deepEqual(canaliDi(voci), ['UCa', 'UCb']);
});

test('il messaggio porta la piattaforma da cui e\' arrivato', () => {
  const m = daMessaggioChat(voce('1', 'lucia', 'ciao'), { canale: 'alfa', maniglia: 'lucia' });
  assert.equal(m.piattaforma, 'youtube', 'e\' quello che decide dove torna la risposta');
});

// LA BORSA. La quota di YouTube non e' dello streamer, e' del progetto Google —
// cioe' di SocialBot: tutti i canali che accendono la chat spendono dalla stessa
// borsa da 10.000 unita' al giorno. Senza un tetto, due canali accesi la
// finiscono a meta' pomeriggio e la chat muore per chiunque, compreso l'avviso
// del video nuovo che passa di li'. Con il tetto, il limite si vede e si dice.
test('quando la borsa e\' vuota si smette di bussare, e lo si dice', async () => {
  let chiamate = 0;
  const api = {
    direttaInCorso: async () => { chiamate += 1; return { ok: true, inDiretta: true, chatId: 'C', videoId: 'V' }; },
    messaggiChat: async () => { chiamate += 1; return { ok: true, voci: [], pagina: 'p', attesaMs: 1 }; },
    risolviManiglie: async () => 0,
    manigliaNota: () => '',
  };
  const cambi = [];
  const m = new ChatYoutube({
    api, attesaMinMs: 1, quandoCambia: (_l, s) => cambi.push(s),
    borsa: { chiedi: () => false, fraQuantoRinnova: () => 60_000, stato: () => ({ finita: true }) },
  });
  m.accendi('alfa');
  await aspetta(60);
  const s = m.stato('alfa');
  m.spegni('alfa');

  assert.equal(chiamate, 0, 'a borsa vuota non si chiama YouTube nemmeno una volta');
  assert.equal(s.senzaQuota, true);
  assert.ok(cambi.some((x) => x.senzaQuota), 'e chi mostra lo stato lo sa');
});

test('e con la borsa piena si spende una chiamata per giro, non di piu\'', async () => {
  const spesi = [];
  const f = finto([{ voci: [], pagina: 'p1' }, { voci: [], pagina: 'p2' }]);
  const m = new ChatYoutube({
    api: f.api, attesaMinMs: 1,
    borsa: { chiedi: (n) => { spesi.push(n); return true; }, fraQuantoRinnova: () => 1, stato: () => ({ finita: false }) },
  });
  m.accendi('alfa');
  await aspetta(60);
  m.spegni('alfa');

  assert.ok(spesi.length >= 2, 'ogni giro chiede il permesso di spendere');
  assert.deepEqual([...new Set(spesi)], [1], 'una chiamata per giro');
});
