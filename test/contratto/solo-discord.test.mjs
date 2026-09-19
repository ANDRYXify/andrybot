// CHI NON TRASMETTE DA NESSUNA PARTE.
//
// SocialBot e' nato per la chat di una diretta, e tutto il suo pannello lo da'
// per scontato. Ma il costruttore del server Discord funziona benissimo anche
// per chi una diretta non la fa: per lui il conto e' diverso — non ha un canale
// da collegare, e le funzioni a pagamento, che sono tutte di diretta, non le
// incontrera' mai.
//
// Qui si fissa cosa vuol dire farlo entrare senza mentirgli: un'identita' che
// non finge di essere un canale, e un pannello che non gli mostra muri su cose
// che non gli interessano.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PIATTAFORME, conDiretta, loginDiscord, piattaformaDi, nomeSu, urlCanale, eLoginNostro } from '../../src/identita.js';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const senzaCommenti = (t) => t.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const leggi = (p) => senzaCommenti(readFileSync(join(RAD, p), 'utf8'));
const SRV = leggi('src/web/server.js');
const APP = readFileSync(join(RAD, 'src/web/public/app.js'), 'utf8');

test('Discord e\' una piattaforma, ma non una dove si trasmette', () => {
  const dc = PIATTAFORME.find((p) => p.id === 'discord');
  assert.ok(dc, 'sta nell\'elenco con le altre: la forma dei login e\' una sola');
  assert.equal(dc.prefisso, 'dc.');
  assert.equal(conDiretta('discord'), false);
  assert.equal(conDiretta('twitch'), true);
  // Senza `casa` non si inventa un indirizzo pubblico: da un nome Discord non
  // si arriva a una persona, e un link che non apre niente e' peggio di niente.
  assert.equal(urlCanale('dc.andryxify'), '');
  assert.equal(urlCanale('andryxify'), 'https://www.twitch.tv/andryxify');
});

test('il canale si chiama dc.<nome>, e non puo\' collidere con nessuno', () => {
  assert.equal(loginDiscord('AndryXify'), 'dc.andryxify');
  assert.equal(piattaformaDi('dc.andryxify'), 'discord');
  assert.equal(nomeSu('dc.andryxify'), 'andryxify');
  assert.equal(eLoginNostro('dc.andryxify'), true);
  assert.equal(eLoginNostro('dc..x'), false, 'e la forma difende anche i percorsi su disco');
});

test('la porta: un terzo giro sulla stessa strada, e si riconosce dall\'id', () => {
  assert.match(SRV, /app\.get\('\/accedi\/discord'/);
  assert.match(SRV, /dcStati\.set\(state, \{ tipo: 'accesso'/, 'a dire quale giro e\' stato e\' lo stato monouso');
  assert.match(SRV, /if \(st\.tipo === 'accesso'\)/, 'e il ritorno lo distingue');
  const reg = SRV.slice(SRV.indexOf('async function registraDiscord'), SRV.indexOf('app.get(\'/accedi/discord\''));
  assert.match(reg, /dcAccesso\.perDc\(id\)\?\.login/, 'chi torna si riconosce dall\'id, non dal nome');
  assert.match(reg, /if \(!eLoginNostro\(login\)\) return/, 'e un login che non ha la forma giusta non entra');
  assert.match(reg, /doveDopoAcquisto\(req, login\)/, 'e anche da qui si puo\' comprare');
  // Niente `guilds.join` per un accesso: non c'e' nessun server in cui entrare.
  const porta = SRV.slice(SRV.indexOf("app.get('/accedi/discord'"), SRV.indexOf("app.get('/accedi'"));
  assert.ok(!/entrare: true/.test(porta), 'un permesso che non si usa non si chiede');
  assert.ok(leggi('src/web/vetrina.js').includes("'/accedi/discord'"), 'e la porta si apre a chi non ha una sessione');
});

test('il pannello non gli mostra quello che non puo\' usare', () => {
  assert.match(APP, /const SOLO_DISCORD = new Set\(\['ruoli', 'dcserver', 'pagina', 'stato', 'sottoscrizione'\]\)/);
  assert.match(APP, /const senzaDiretta = \(\) => stato\?\.piattaforma === 'discord'/);
  // Non «bloccate»: proprio assenti. A chi non trasmette un muro su «Regia» non
  // spiega niente, gli dice solo che il prodotto non e' per lui.
  const el = APP.slice(APP.indexOf('function elencoGruppi()'), APP.indexOf('function elencoGruppi()') + 600);
  assert.match(el, /schede: g\.schede\.filter\(\(\[id\]\) => SOLO_DISCORD\.has\(id\)/);
  assert.match(el, /\.filter\(\(g\) => g\.schede\.length\)/, 'e un gruppo rimasto vuoto sparisce');
  assert.match(APP, /if \(senzaDiretta\(\) && id && !SOLO_DISCORD\.has\(id\)[\s\S]{0,60}id = 'ruoli';/,
    'e nemmeno l\'indirizzo ci porta: sennò basterebbe scrivere #regia');
});

test('sul sito pubblico c\'e\' il tasto, e dice cosa NON vedra\'', async () => {
  const { vetrinaHtml } = await import('../../src/web/vetrina-vista.js');
  const h = vetrinaHtml('it', { kick: true, piani: {
    free: { nome: 'E' }, base: { nome: 'B', prezzo: 2.99, sommario: 'x' },
    addon: [{ id: 'clip', nome: 'C', sommario: 'y', prezzo: 1.99 }], bundle: [],
  } });
  assert.match(h, /href="\/accedi\/discord"/, 'il tasto c\'e\'');
  assert.match(h, /di Twitch o Kick non ti importa/, 'e la domanda e\' quella che si fa chi arriva');
  assert.match(h, /tutto quello che parla di dirette non lo vedi nemmeno/,
    'e si dice PRIMA cosa non vedra\', invece di fargli cercare le schede che mancano');
});
