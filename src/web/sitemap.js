// LA SITEMAP, MENO IL DATABASE.
//
// Le voci che non vengono dal database (home nelle tre lingue, guide, manuali,
// novita', sostegno, privacy, termini) le compone questa funzione, e la chiamano
// in due: il server, che ci aggiunge le pagine degli streamer e la manda ai
// motori, e il cancello SEO (scripts/verifica-seo.mjs), che apre ogni pagina
// elencata e pretende che sia quella che dice di essere. Un elenco solo: se una
// pagina entra nella sitemap, il cancello la guarda da se'.
//
// UNA DATA E' QUELLA VERA, O NON C'E'. Prima tutte le pagine senza una data loro
// dicevano «oggi», a ogni richiesta: Google impara che su questo sito lastmod non
// vuol dire niente, e smette di guardarlo anche dove e' giusto. La home cambia
// quando cambia il prodotto (l'ultima novita' pubblica), privacy e termini dicono
// da se' quando li si e' cambiati (la stessa data che legge chi li apre), e chi
// non lo dice non ha lastmod.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VIA_LINGUA } from './vetrina-vista.js';
import { urlGuide } from './guide.js';
import { urlManuali } from './manuali.js';

export function dataDichiarata(publicDir, nome) {
  try { return (readFileSync(join(publicDir, nome), 'utf8').match(/class="aggiornato-il" datetime="(\d{4}-\d{2}-\d{2})"/) || [])[1]; }
  catch { return undefined; }
}

// `alt` e' il gruppo delle lingue della pagina ({ it: url, en: url, ... }): chi
// ce l'ha lo dichiara intero, con l'italiano come x-default.
export function vociPubbliche({ base, pubbliche, sostieni, publicDir }) {
  const home = Object.fromEntries(Object.entries(VIA_LINGUA).map(([l, via]) => [l, base + via]));
  const voci = Object.values(home).map((u) => ({ u, p: '1.0', f: 'weekly', alt: home, m: pubbliche[0]?.data }));
  for (const g of [...urlGuide(pubbliche), ...urlManuali()]) voci.push({ u: g.loc, p: g.prio, f: g.freq, m: g.lastmod, alt: g.alt });
  // L'indirizzo che si dichiara e' quello vero: dichiararne uno che rimanda
  // vorrebbe dire far indicizzare un rimbalzo.
  voci.push({ u: sostieni, p: '0.4', f: 'yearly' });
  voci.push({ u: `${base}/privacy`, p: '0.3', f: 'yearly', m: dataDichiarata(publicDir, 'privacy.html') });
  voci.push({ u: `${base}/termini`, p: '0.3', f: 'yearly', m: dataDichiarata(publicDir, 'termini.html') });
  return voci;
}

const escXml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function sitemapXml(voci) {
  const lingue = (alt) => (alt && Object.keys(alt).length > 1 ? Object.entries(alt)
    .map(([l, u]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${escXml(u)}"/>`)
    .concat(alt.it ? [`    <xhtml:link rel="alternate" hreflang="x-default" href="${escXml(alt.it)}"/>`] : [])
    .join('\n') + '\n' : '');
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`
    + voci.map((v) => `  <url>\n    <loc>${escXml(v.u)}</loc>\n`
      + lingue(v.alt)
      + (v.m ? `    <lastmod>${v.m}</lastmod>\n` : '')
      + `    <changefreq>${v.f}</changefreq>\n    <priority>${v.p}</priority>\n  </url>`).join('\n')
    + `\n</urlset>\n`;
}
