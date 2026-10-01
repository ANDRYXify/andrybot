// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
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
    icona: '🔴',
    url: (login) => `https://twitch.tv/${login}`,
  },
  kick: {
    etichetta: ['Diretta su Kick', 'Kick live', 'Directo en Kick'],
    nome: 'Kick',
    evento: 'kick',
    icona: '🟢',
    url: (login) => `https://kick.com/${login}`,
  },
  youtube: {
    etichetta: ['Diretta su YouTube', 'YouTube live', 'Directo en YouTube'],
    nome: 'YouTube',
    evento: 'ytlive',
    icona: '🔴',
    url: (login, d) => d?.url || `https://youtube.com/@${login}/live`,
  },
  tiktok: {
    etichetta: ['Diretta su TikTok', 'TikTok live', 'Directo en TikTok'],
    nome: 'TikTok',
    evento: 'tiktok',                     // chiave storica: NON si tocca
    icona: '🎵',
    url: (login, d) => d?.url || `https://www.tiktok.com/@${login}/live`,
  },
};

export const CHIAVI = Object.keys(PIATTAFORME);
export const eventoDi = (piattaforma) => PIATTAFORME[piattaforma]?.evento || '';

// E il contrario. Serve perché la piattaforma di una diretta NON si può ricavare
// dal login: un canale Kick arriva col suo nome e basta, senza niente che dica
// «Kick», e chiederlo al login risponderebbe «Twitch». L'evento invece lo dice
// sempre, perché nasce dalla diretta.
export const piattaformaDiEvento = (evento) => CHIAVI.find((k) => PIATTAFORME[k].evento === evento) || '';

// GLI EVENTI CHE VOGLIONO DIRE «sto andando in diretta». Si ricavano da qui e
// non si riscrivono altrove: le chiavi sono storiche e diverse fra loro
// ('live' per Twitch, 'kick', 'ytlive', 'tiktok'), quindi chi controlla
// `evento === 'live'` copre Twitch e lascia fuori tutte le altre — senza dare
// nessun errore, semplicemente non facendo la cosa.
export const EVENTI_LIVE = new Set(CHIAVI.map((p) => PIATTAFORME[p].evento).filter(Boolean));
export const eUnaDiretta = (evento) => EVENTI_LIVE.has(String(evento || ''));

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

// LA PRIMA RIGA DELL'AVVISO la sceglie la voce del canale (momento
// `avviso-diretta` del frasario), una volta per avviso: la stessa riga va a
// Telegram e a Discord, e il giro delle frasi non avanza due volte per la
// stessa diretta. Il nome pero' si scrive in grassetto in due modi diversi
// (HTML di qua, markdown di la'), quindi chi sceglie la riga mette al posto
// del nome questo segno, e ogni posto lo stende a modo suo con `stendiRiga`,
// sfuggendo il resto per il suo formato.
export const SEGNO_NOME = '\u0001';

// La riga stesa per un posto. Senza una riga della voce (un avviso composto da
// chi non l'ha chiesta) resta il nome e la piattaforma: niente parole, quindi
// niente lingua sbagliata.
export function stendiRiga(riga, sfuggi, nomeInForma, piattaforma = '') {
  const r = String(riga || '');
  if (!r.includes(SEGNO_NOME)) return r ? sfuggi(r) : [nomeInForma, sfuggi(piattaforma)].filter(Boolean).join(' · ');
  return r.split(SEGNO_NOME).map(sfuggi).join(nomeInForma);
}

// Il testo. `template` è quello personalizzato dallo streamer per quel posto:
// se c'e', vince, ed e' la sua frase, non la nostra. Un segnaposto senza dato
// sparisce insieme alla sua riga: «🎮 » da solo è peggio che niente.
//
// Senza template: l'icona della piattaforma, la riga della voce (`d.voce`),
// poi titolo, gioco e link, ognuno solo se c'e'. Nessuna parola scritta qui:
// quelle stanno nel frasario, nella lingua del canale.
//
// `conLocandina` accorcia il testo di casa, non quello scritto dallo streamer.
// Quando parte anche l'immagine, il titolo e il gioco sono GIA' disegnati
// dentro: ripeterli sotto vuol dire mandare due volte la stessa cosa e un
// messaggio alto il doppio. Resta quello che l'immagine non può fare — il nome
// nella notifica del telefono, che dell'immagine non vede niente, e un link su
// cui si possa premere, perché una foto non è cliccabile.
export function messaggio(d, template = '', { conLocandina = false } = {}) {
  if (!d) return '';
  const p = PIATTAFORME[d.piattaforma];
  const suo = template && String(template).trim();
  if (suo) {
    const valori = {
      nome: escHtml(d.display),
      titolo: escHtml(d.titolo),
      gioco: escHtml(d.gioco),
      spettatori: d.spettatori == null ? '' : String(d.spettatori),
      link: d.url,
      login: escHtml(d.login),
      piattaforma: p.nome,
    };
    const steso = suo.replace(/\{(nome|titolo|gioco|spettatori|link|login|piattaforma)\}/g, (_, k) => valori[k] ?? '');
    // via le righe rimaste vuote (o con solo un'emoji e uno spazio)
    return steso.split('\n')
      .filter((r, i, tutte) => r.trim() !== '' || (i > 0 && i < tutte.length - 1 && tutte[i - 1].trim() !== ''))
      .join('\n')
      .replace(/^[^\p{L}\p{N}<]*$/gmu, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  const riga = `${p.icona} ${stendiRiga(d.voce, escHtml, `<b>${escHtml(d.display)}</b>`, p.nome)}`;
  if (conLocandina) return `${riga} 👉 ${d.url}`;
  const corpo = [d.titolo ? `<b>${escHtml(d.titolo)}</b>` : '', d.gioco ? `🎮 ${escHtml(d.gioco)}` : ''].filter(Boolean);
  return [riga, ...(corpo.length ? ['', ...corpo] : []), '', `👉 ${d.url}`].join('\n');
}

// Le voci per il filtro delle destinazioni (Telegram) e per la dashboard.
// Si ricavano da qui: aggiungere una piattaforma non deve voler dire ricordarsi
// di aggiungerla anche a un secondo elenco, che e' esattamente il modo in cui
// una resta indietro.
export function eventiDiretta() {
  return CHIAVI.map((k) => ({ k: PIATTAFORME[k].evento, it: PIATTAFORME[k].etichetta[0], en: PIATTAFORME[k].etichetta[1], es: PIATTAFORME[k].etichetta[2] }));
}
