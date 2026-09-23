// DOVE STA IL BOT, e cosa vuol dire per ogni ruolo.
//
// Il proprietario ha visto il suo server con quasi tutti i ruoli «piu' in alto del
// bot», compresi MEE6, Midjourney e i booster, e la frase «ha i pieni poteri: da
// qui puoi muovere tutto» subito sotto. Due difetti in una schermata:
//
//  · i ruoli degli altri bot non stanno «sopra»: possono stare ovunque, e non
//    si toccano per un'altra ragione (sono di un'integrazione). Chiamarli
//    «sopra» mandava a spostare il bot per niente;
//  · i pieni poteri non scavalcano l'ordine dei ruoli (docs.discord.com,
//    Permission Hierarchy): un bot da', cambia e ordina solo i ruoli piu' in
//    basso del suo piu' alto.
//
// Qui la regola unica (`postoDeiRuoli`), e che la usino tutti quelli che prima
// facevano il conto per conto loro.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { postoDeiRuoli, tipoRuolo, livelloDi } from '../../src/features/discord-ruoli.js';
import { differenzaRuoli, ruoliIntoccabili, consiglioRuoli } from '../../src/features/discord-preset.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (p) => readFileSync(join(RAD, p), 'utf8');

const GUILD = '900000000000000001';
const ruolo = (id, nome, position, extra = {}) => ({ id, nome, position, permessi: '0', ...extra });

// Il server del proprietario, come lo racconta: «moderatore» e' il piu' alto
// dopo il creatore, e il bot ce l'ha. In mezzo, ruoli di altri bot a varie
// altezze.
const SERVER = [
  ruolo(GUILD, '@everyone', 0),
  ruolo('1', 'creatore', 20),
  ruolo('2', 'moderatore', 19),
  ruolo('3', 'Server Booster', 18, { managed: true }),
  ruolo('4', 'MEE6', 17, { managed: true }),
  ruolo('5', 'UFFICIALE UAU', 12),
  ruolo('6', 'Premium Members', 11),
  ruolo('7', 'SocialBot', 2, { managed: true }),
  ruolo('8', 'Streamer', 1),
];

test('col bot sotto «moderatore», sopra di lui c\'e\' solo il creatore', () => {
  const p = postoDeiRuoli(SERVER, ['2', '7'], GUILD);
  assert.equal(p.livello, 19);
  assert.deepEqual(p.piuAlto, { id: '2', nome: 'moderatore' }, 'il piu\' alto e\' quello che gli hai dato tu, non quello di Discord');
  assert.deepEqual(p.sopra, ['creatore']);
  assert.deepEqual(p.altrui, ['Server Booster', 'MEE6'], 'gli altri bot si dicono a parte, e non come «sopra»');
  assert.equal(p.tipo.get(GUILD), 'tutti');
  assert.equal(p.tipo.get('2'), 'bot', 'il suo ruolo piu\' alto non lo puo\' dare');
  assert.equal(p.tipo.get('7'), 'bot', 'e quello di Discord nemmeno');
  for (const id of ['5', '6', '8']) assert.equal(p.gestibile(id), true, `il ruolo ${id} sta sotto: e' suo da gestire`);
});

test('col bot in fondo, i ruoli veri sopra di lui sono «sopra», quelli degli altri bot no', () => {
  const p = postoDeiRuoli(SERVER, ['7'], GUILD);
  assert.equal(p.livello, 2);
  assert.deepEqual(p.sopra, ['creatore', 'moderatore', 'UFFICIALE UAU', 'Premium Members'], 'in ordine, dall\'alto');
  assert.equal(p.sopra.includes('MEE6'), false);
  assert.equal(p.sopra.includes('SocialBot'), false, 'il suo non gli sta sopra');
  assert.equal(p.gestibile('8'), true);
});

test('alla stessa altezza non si promette niente, e senza ruoli non si da\' niente', () => {
  const pari = [ruolo(GUILD, '@everyone', 0), ruolo('a', 'Mio', 5), ruolo('b', 'Vicino', 5)];
  assert.equal(postoDeiRuoli(pari, ['a'], GUILD).tipo.get('b'), 'sopra', 'Discord ordina i pari per id, senza dire da che parte');
  const senza = postoDeiRuoli(SERVER, [], GUILD);
  assert.equal(senza.livello, 0, '@everyone sta a 0, e un bot senza ruoli sta li\'');
  assert.equal([...senza.tipo.values()].includes('gestibile'), false);
  const alRovescio = [ruolo('8', 'Streamer', 1), ruolo('2', 'moderatore', 19)];
  assert.equal(livelloDi(alRovescio, ['8', '2']).piuAlto.nome, 'moderatore', 'il piu\' alto fra quelli che ha, non il primo che capita');
});

test('un suo ruolo piu\' basso, e non di un\'integrazione, si puo\' dare', () => {
  assert.equal(tipoRuolo(ruolo('8', 'Streamer', 1), { livello: 19, miei: ['2', '8'], guildId: GUILD }), 'gestibile');
});

test('il costruttore usa la stessa regola: niente di quello che non si puo\' toccare entra fra le cose da fare', () => {
  const foto = { guild: { id: GUILD }, bot: { ruoli: ['7'], livello: 2 }, ruoli: SERVER };
  const fuori = ruoliIntoccabili(foto);
  assert.deepEqual([...fuori].sort(), [GUILD, '1', '2', '3', '4', '5', '6', '7'].sort());
  assert.equal(fuori.has('8'), false);
});

test('facendo piazza pulita, i vecchi che restano si dicono, ognuno col suo perche\'', () => {
  const foto = { guild: { id: GUILD }, caratteristiche: [], bot: { ruoli: ['7'], livello: 2 },
    ruoli: [...SERVER, ruolo('9', 'Vecchio', 1)] };
  const d = differenzaRuoli(foto, { ruoli: [] }, { togliere: true });
  assert.deepEqual(d.togli.map((x) => x.nome).sort(), ['Streamer', 'Vecchio'], 'si toglie solo quello che si puo\'');
  const per = Object.fromEntries(d.restano.map((x) => [x.nome, x.perche]));
  assert.deepEqual(per, {
    creatore: 'sopra', moderatore: 'sopra', 'UFFICIALE UAU': 'sopra', 'Premium Members': 'sopra',
    'Server Booster': 'altrui', MEE6: 'altrui', SocialBot: 'bot',
  });
  assert.equal(d.restano.some((x) => x.id === GUILD), false, '@everyone non «resta»: non se ne va mai');
  const avanti = differenzaRuoli(foto, { ruoli: [] }, { togliere: false });
  assert.deepEqual(avanti.restano, [], 'in avanti non si toglie niente, e non c\'e\' niente da dire');
});

test('una regola sola: nessuno fa piu\' il conto dell\'altezza per conto suo', () => {
  const SRV = leggi('src/web/server.js');
  assert.ok(!/fuoriPortata\(|mioLivello\(/.test(SRV), 'il server chiede a postoDeiRuoli');
  assert.ok(!/fuoriPortata\(|mioLivello\(/.test(leggi('src/features/discord-giro.js')), 'e anche il giro dei ruoli');
  assert.match(leggi('src/features/discord-api.js'), /const \{ livello \} = livelloDi\(r\.ruoli, me\.ruoli\);/, 'e la fotografia');
  assert.match(leggi('src/features/discord-preset.js'), /tipoRuolo\(r, \{ livello, miei/, 'e il costruttore');
  const i = SRV.indexOf('const poteriDelBot = async');
  const poteri = SRV.slice(i, i + 2200);
  assert.match(poteri, /postoDeiRuoli\(r\.ruoli, me\.ruoli, guild\)/);
  assert.match(poteri, /piuAlto: posto\.piuAlto\?\.nome/, 'il pannello dice qual e\' il suo ruolo piu\' alto');
});

test('nelle regole si sceglie solo quello che il bot puo\' dare', () => {
  const APP = leggi('src/web/public/app.js');
  const i = APP.indexOf('function _dcOpzioniRuolo(');
  const f = APP.slice(i, i + 1400);
  assert.match(f, /const si = x\.posto === 'gestibile';/);
  assert.match(f, /if \(!si && !qui && x\.posto !== 'sopra'\) continue;/, '@everyone e i ruoli degli altri bot non si offrono');
  assert.match(f, /\$\{si \? '' : ' disabled'\}/, 'quelli sopra il bot si vedono, ma non si scelgono');
  assert.match(f, /selected disabled>\$\{esc\(L\('Scegli il ruolo'/, 'e una regola nuova non prende un ruolo a caso');
  const SRV = leggi('src/web/server.js');
  const j = SRV.indexOf("app.post('/api/streamer/ruoli/prova'");
  assert.match(SRV.slice(j, j + 1800), /posto: posto\.tipo\.get\(String\(x\.id\)\)/, 'il server dice il posto di ognuno');
});

test('i pieni poteri non si raccontano come se scavalcassero l\'ordine dei ruoli', () => {
  const APP = leggi('src/web/public/app.js');
  const i = APP.indexOf('function _dcServeHtml(');
  const f = APP.slice(i, i + 5200);
  assert.match(f, /i pieni poteri non scavalcano l’ordine dei ruoli/);
  assert.match(f, /sopra\.length\s*\?/, 'la frase dei pieni poteri dipende da chi sta sopra');
});

// IL DOPPIONE. Il proprietario: «ha creato i ruoli Streamer, VIP… ma non mi ha
// applicato i cambiamenti». Sul suo server «moderatore» era il ruolo del bot:
// intoccabile, quindi il consiglio lo saltava e la traccia creava un secondo
// «Moderatori», vuoto, in fondo. Due ruoli per lo stesso mestiere, e le regole
// nuove che davano quello sbagliato.
const PRESET_MOD = { ruoli: [{ nome: 'Moderatori', privilegi: ['bannare'] }, { nome: 'Abbonati' }] };

test('un ruolo che fa gia\' quel mestiere e che il bot non tocca non si raddoppia', () => {
  const foto = { guild: { id: GUILD }, caratteristiche: [], bot: { ruoli: ['2'], livello: 19 }, ruoli: SERVER };
  const d = differenzaRuoli(foto, PRESET_MOD);
  assert.deepEqual(d.crea.map((x) => x.nome), ['Abbonati'], '«Moderatori» non nasce accanto a «moderatore»');
  assert.deepEqual(d.doppioni, [{ nome: 'moderatore', diventa: 'Moderatori', perche: 'bot' }]);
  assert.ok(d.fuoriPortata.includes('moderatore'), 'e si dice che non lo tocca');
  const dist = differenzaRuoli(foto, PRESET_MOD, { togliere: true });
  assert.equal(dist.restano.some((x) => x.nome === 'moderatore'), false, 'detto una volta, come doppione, e non di nuovo fra quelli che restano');
});

test('se il bot ci arriva, non e\' un doppione: e\' un ruolo da prendere, e lo dice il consiglio', () => {
  const foto = { guild: { id: GUILD }, caratteristiche: [], bot: { ruoli: ['1'], livello: 20 }, ruoli: SERVER };
  const d = differenzaRuoli(foto, PRESET_MOD);
  assert.deepEqual(d.doppioni, []);
  const c = consiglioRuoli(foto, PRESET_MOD);
  assert.deepEqual(c.prendi.map((x) => [x.nome, x.diventa]), [['moderatore', 'Moderatori']]);
  assert.deepEqual(c.doppioni, []);
});

test('il ruolo che un\'integrazione gia\' gestisce non si raddoppia nemmeno lui', () => {
  const conSub = [...SERVER, ruolo('10', 'Subscriber', 3, { managed: true })];
  const foto = { guild: { id: GUILD }, caratteristiche: [], bot: { ruoli: ['2'], livello: 19 }, ruoli: conSub };
  const d = differenzaRuoli(foto, PRESET_MOD);
  assert.deepEqual(d.crea, []);
  assert.deepEqual(d.doppioni.map((x) => [x.nome, x.perche]), [['moderatore', 'bot'], ['Subscriber', 'altrui']]);
  const c = consiglioRuoli(foto, PRESET_MOD);
  assert.deepEqual(c.crea, [], 'e il consiglio non dice «lo creo»');
  assert.deepEqual(c.doppioni.map((x) => x.diventa), ['Moderatori', 'Abbonati']);
});

test('due ruoli che fanno quel mestiere, tutti e due fuori portata: non ne nasce un terzo', () => {
  const due = [...SERVER, ruolo('11', 'mod', 15)];
  const foto = { guild: { id: GUILD }, caratteristiche: [], bot: { ruoli: ['7'], livello: 2 }, ruoli: due };
  const d = differenzaRuoli(foto, { ruoli: [{ nome: 'Moderatori' }] });
  assert.deepEqual(d.crea, []);
  assert.deepEqual(d.doppioni.map((x) => x.nome).sort(), ['mod', 'moderatore']);
});
