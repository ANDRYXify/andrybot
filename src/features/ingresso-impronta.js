// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// L'IMPRONTA MINIMA DI CHI E' ENTRATO (docs/ACCESSO-SICURO.md, «La sessione
// legata»). Due cose e basta: la FAMIGLIA (il motore del browser e il gruppo
// del sistema, mai la versione) e la RETE abbreviata (/16, /48).
//
// La famiglia e' il motore, non il nome che il browser dice di se'. Chi su un
// iPhone tocca «versione desktop» si presenta come Safari per Mac; chi su
// Android chiede il sito per computer si presenta come Linux. Il motore e il
// gruppo del sistema restano gli stessi: per questo il gruppo «apple» tiene
// insieme iOS, iPadOS e macOS, e «linux-android» tiene insieme i due. Su iOS
// ogni browser e' WebKit, qualunque nome porti (CriOS, FxiOS, EdgiOS).
//
// Il giudizio e' uno solo: la famiglia cambiata e' un'anomalia, la rete cambiata
// no. Con solo la famiglia (il modello vieta impronte piu' fini), «due reti con
// due browser diversi» vuol dire due famiglie, e quella regola e' gia' questa.

export function motoreDi(ua) {
  const u = String(ua || '');
  if (!/^Mozilla\/5\.0 /.test(u)) return 'altro';                    // curl, script, librerie
  if (/\b(iPhone|iPad|iPod)\b/.test(u)) return 'webkit';               // su iOS e' tutto WebKit
  if (/\bFirefox\/\d|\bFxiOS\//.test(u)) return 'gecko';
  if (/\b(?:Headless)?(Chrome|Chromium|CriOS|Edg|OPR|SamsungBrowser|YaBrowser)\/\d/.test(u)) return 'chromium';
  if (/\bAppleWebKit\/\d/.test(u) && /\bSafari\/\d|\bMobile\//.test(u)) return 'webkit';
  return 'altro';
}

export function sistemaDi(ua) {
  const u = String(ua || '');
  if (!/^Mozilla\/5\.0 /.test(u)) return 'altro';
  if (/\bCrOS\b/.test(u)) return 'chromeos';
  if (/\b(iPhone|iPad|iPod|Macintosh|Mac OS X)\b/.test(u)) return 'apple';
  if (/\bWindows\b/.test(u)) return 'windows';
  if (/\b(Android|Linux|X11)\b/.test(u)) return 'linux-android';
  return 'altro';
}

export const famigliaDi = (ua) => ({ motore: motoreDi(ua), sistema: sistemaDi(ua) });

// La rete abbreviata: i primi due byte di un IPv4, i primi tre gruppi di un
// IPv6. Un IPv4 dentro un IPv6 (::ffff:1.2.3.4) e' un IPv4.
export function reteDi(ip) {
  let s = String(ip || '').trim().toLowerCase();
  const m4 = /^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(s);
  if (m4) return `${m4[1]}.${m4[2]}.0.0/16`;
  if (!s.includes(':')) return '';
  s = s.split('%')[0];
  const [testa, coda = ''] = s.split('::');
  const a = testa ? testa.split(':') : [];
  const b = s.includes('::') ? (coda ? coda.split(':') : []) : [];
  const pieni = s.includes('::') ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b] : a;
  if (pieni.length !== 8 || pieni.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return '';
  return pieni.slice(0, 3).map((g) => g.replace(/^0+(?=.)/, '')).join(':') + '::/48';
}

export const improntaDi = ({ ua, ip }) => ({ ...famigliaDi(ua), rete: reteDi(ip) });

// Il giudizio: la famiglia diversa da quella legata chiude la sessione.
// Cambiare rete, o la versione del browser, non chiude niente.
export function giudica(riga, adesso) {
  if (!riga) return { anomalia: false };
  if (riga.motore !== adesso.motore) return { anomalia: true, perche: 'motore' };
  if (riga.sistema !== adesso.sistema) return { anomalia: true, perche: 'sistema' };
  return { anomalia: false, reteCambiata: riga.rete !== adesso.rete };
}

