// GLI AVVISI «È LIVE», PER QUALUNQUE PIATTAFORMA.
//
// Prima una notifica di diretta ERA Twitch: si costruiva dall'oggetto stream di
// Helix, e il filtro delle destinazioni Telegram conosceva un solo evento
// chiamato «live». Aggiungere Kick voleva dire riscrivere lo stesso giro una
// seconda volta, e YouTube una terza — cioè tre posti dove ricordarsi le stesse
// cose, e due dove dimenticarsele.
//
// Qui una diretta è: una PIATTAFORMA, uno streamer, un titolo, un link. Chi la
// manda (Telegram, Discord) non deve sapere da dove viene.
//
// COMPATIBILITÀ, che qui non è un dettaglio: la chiave «live» continua a
// significare TWITCH. Gli streamer hanno già scelto a mano quali eventi vanno
// in quale gruppo e in quale topic; cambiare il significato di una chiave già
// salvata cambierebbe il comportamento sotto i piedi a tutti, in silenzio.
// Le piattaforme nuove portano chiavi nuove.

export const PIATTAFORME = {
  twitch: {
    etichetta: ['Diretta su Twitch', 'Twitch live', 'Directo en Twitch'],
    nome: 'Twitch',
    evento: 'live',                       // chiave storica: NON si tocca
    url: (login) => `https://twitch.tv/${login}`,
    predefinito: '🔴 <b>{nome}</b> è in diretta!\n\n<b>{titolo}</b>\n🎮 {gioco}\n\n👉 {link}',
  },
  kick: {
    etichetta: ['Diretta su Kick', 'Kick live', 'Directo en Kick'],
    nome: 'Kick',
    evento: 'kick',
    url: (login) => `https://kick.com/${login}`,
    predefinito: '🟢 <b>{nome}</b> è in diretta su <b>Kick</b>!\n\n<b>{titolo}</b>\n\n👉 {link}',
  },
  youtube: {
    etichetta: ['Diretta su YouTube', 'YouTube live', 'Directo en YouTube'],
    nome: 'YouTube',
    evento: 'ytlive',
    url: (login, d) => d?.url || `https://youtube.com/@${login}/live`,
    predefinito: '🔴 <b>{nome}</b> è in diretta su <b>YouTube</b>!\n\n<b>{titolo}</b>\n\n👉 {link}',
  },
  tiktok: {
    etichetta: ['Diretta su TikTok', 'TikTok live', 'Directo en TikTok'],
    nome: 'TikTok',
    evento: 'tiktok',                     // chiave storica: NON si tocca
    url: (login, d) => d?.url || `https://www.tiktok.com/@${login}/live`,
    predefinito: '🎵 <b>{nome}</b> è in diretta su <b>TikTok</b>!\n\n👉 {link}',
  },
};

export const CHIAVI = Object.keys(PIATTAFORME);
export const eventoDi = (piattaforma) => PIATTAFORME[piattaforma]?.evento || '';

const escHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// La forma di una diretta. Tutto facoltativo tranne piattaforma e login: una
// piattaforma può non dirci il gioco o gli spettatori, e va bene — il messaggio
// non deve mostrare un buco al posto di un dato che non esiste.
export function diretta({ piattaforma, login, display = '', titolo = '', gioco = '', spettatori = null, url = '', id = '' }) {
  const p = String(piattaforma || '').toLowerCase();
  if (!PIATTAFORME[p] || !login) return null;
  return {
    piattaforma: p,
    login: String(login).toLowerCase(),
    display: display || login,
    titolo: String(titolo || ''),
    gioco: String(gioco || ''),
    spettatori: Number.isFinite(Number(spettatori)) ? Number(spettatori) : null,
    url: url || PIATTAFORME[p].url(String(login).toLowerCase()),
    id: String(id || ''),
  };
}

// Il testo. `template` è quello personalizzato dallo streamer (vuoto = quello
// della piattaforma). Un segnaposto senza dato sparisce insieme alla sua riga:
// «🎮 » da solo è peggio che niente.
export function messaggio(d, template = '') {
  if (!d) return '';
  const p = PIATTAFORME[d.piattaforma];
  const valori = {
    nome: escHtml(d.display),
    titolo: escHtml(d.titolo || (p.nome + ' · in diretta')),
    gioco: escHtml(d.gioco),
    spettatori: d.spettatori == null ? '' : String(d.spettatori),
    link: d.url,
    login: escHtml(d.login),
    piattaforma: p.nome,
  };
  const t = (template && String(template).trim()) || p.predefinito;
  const steso = t.replace(/\{(nome|titolo|gioco|spettatori|link|login|piattaforma)\}/g, (_, k) => valori[k] ?? '');
  // via le righe rimaste vuote (o con solo un'emoji e uno spazio)
  return steso.split('\n')
    .filter((r, i, tutte) => r.trim() !== '' || (i > 0 && i < tutte.length - 1 && tutte[i - 1].trim() !== ''))
    .join('\n')
    .replace(/^[^\p{L}\p{N}<]*$/gmu, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Le voci per il filtro delle destinazioni (Telegram) e per la dashboard.
// Si ricavano da qui: aggiungere una piattaforma non deve voler dire ricordarsi
// di aggiungerla anche a un secondo elenco, che e' esattamente il modo in cui
// una resta indietro.
export function eventiDiretta() {
  return CHIAVI.map((k) => ({ k: PIATTAFORME[k].evento, it: PIATTAFORME[k].etichetta[0], en: PIATTAFORME[k].etichetta[1], es: PIATTAFORME[k].etichetta[2] }));
}
