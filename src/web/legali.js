// PRIVACY E TERMINI NELLE TRE LINGUE (docs/LINGUE.md, «Privacy e termini»).
//
// Qui stanno una volta sola l'indirizzo e il file di ogni pagina legale in ogni
// lingua. Li leggono il server (le rotte), la sitemap (le voci e il gruppo
// hreflang), il piede delle guide e della home (i collegamenti) e il cancello
// della SEO (quale file apre per quale indirizzo). Una traduzione esiste se c'e'
// il suo file: finche' non c'e', quella lingua rimanda all'italiano, che resta il
// testo di riferimento.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const LEGALI = {
  privacy: {
    it: { via: '/privacy', file: 'privacy.html' },
    en: { via: '/en/privacy', file: 'privacy-en.html' },
    es: { via: '/es/privacidad', file: 'privacy-es.html' },
  },
  termini: {
    it: { via: '/termini', file: 'termini.html' },
    en: { via: '/en/terms', file: 'termini-en.html' },
    es: { via: '/es/terminos', file: 'termini-es.html' },
  },
};

const PUB = fileURLToPath(new URL('./public/', import.meta.url));
const esiste = (file) => existsSync(PUB + file);

// Le lingue in cui una pagina legale c'e' davvero, con indirizzo e file.
export function legaleIn(pagina) {
  return Object.entries(LEGALI[pagina] || {})
    .filter(([, x]) => esiste(x.file))
    .map(([l, x]) => ({ l, ...x }));
}

// L'indirizzo da collegare da una pagina in lingua `l`: la traduzione se c'e',
// altrimenti l'italiano.
export function viaLegale(pagina, l) {
  const x = LEGALI[pagina]?.[l];
  return x && esiste(x.file) ? x.via : LEGALI[pagina].it.via;
}

