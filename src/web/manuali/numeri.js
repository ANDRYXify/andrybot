// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// I numeri dei giochi, ricavati dal catalogo che usa il motore: il manuale dei
// giochi li mostra, non li ricopia. Stanno qui perche' li usa il manuale in
// ogni lingua.
import { CATALOGO, giocoDi, valoriDi, valutaResa, presenzaOraria, MANCHE_TIPI, SLOT_TRIS, parteDi } from '../../features/giochi-conf.js';

export { presenzaOraria, MANCHE_TIPI };

// I tris della slot come li paga il motore: la parte del tris di 💎 a parole
// e quanto fa con i valori di base.
export const SLOT = Object.fromEntries(Object.entries(SLOT_TRIS).map(([k, f]) => [k, { parte: parteDi(f)[0], fattore: f }]));

// I numeri dei giochi li legge dal catalogo, che e' quello da cui li legge il
// motore: scritti a mano, al primo ribilancio avrebbero mentito.
export const DI_SERIE = (id) => valoriDi({}, id);
export const RESA = (id) => valutaResa(giocoDi(id).resa, DI_SERIE(id), { mancheMinuti: 15 });
export const CIFRA = (n) => Number(n).toLocaleString('it-IT');
// «1 frase», «2 frasi»: il numero decide la parola.
const quante = (n, uno, tanti) => `${CIFRA(n)} ${n === 1 ? uno : tanti}`;
// Le due attese di un gioco, come le legge chi gioca.
export const ATTESE = (id) => {
  const v = DI_SERIE(id);
  const parti = [];
  if (v.attesaTesta) parti.push(`${ATTESA(v.attesaTesta)} a testa`);
  if (v.attesaTutti) parti.push(`${ATTESA(v.attesaTutti)} per tutti`);
  return parti.join(', ') || '—';
};
export const ATTESA = (s) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s}s`);
const TIPO_PARAM = { monete: 'monete', secondi: 'secondi', percento: 'su 100' };
export function righeRegole() {
  const righe = [['Gioco', 'Impostazione', 'Di base', 'Limiti']];
  for (const g of CATALOGO) {
    for (const p of g.param) {
      const base = p.tipo === 'elenco' ? `${quante(p.def.length, 'frase', 'frasi')} di serie`
        : p.tipo === 'tabella' ? `${quante(p.def.length, 'riga', 'righe')} di serie`
          : p.tipo === 'scelta' ? p.scelte.find(([k]) => k === p.def)[1][0]
            : p.tipo === 'scelte' ? 'tutte'
            : `${CIFRA(p.def)} ${TIPO_PARAM[p.tipo] || ''}`.trim();
      const limiti = p.tipo === 'elenco' || p.tipo === 'tabella' ? `fino a ${quante(p.max, 'riga', 'righe')}`
        : p.tipo === 'scelta' || p.tipo === 'scelte' ? p.scelte.map(([, e]) => e[0]).join(', ')
          : `${CIFRA(p.min)}–${CIFRA(p.max)}`;
      righe.push([g.nome[0], p.eti[0], base, limiti]);
    }
  }
  return righe;
}
export function righePesca() {
  const t = DI_SERIE('pesca').pescato;
  const tot = t.reduce((s, r) => s + r[2], 0);
  return [['Preda', 'Monete', 'Quante volte su 100'], ...t.map(([n, v, w]) => [n, CIFRA(v), CIFRA(Math.round((w / tot) * 1000) / 10)])];
}

// I PREZZI dei piani e degli extra, letti dal listino che vende
// (features/abbonamenti.js): il manuale dell'account li mostra, non li ricopia.
// Scritti a mano, al primo ritocco del listino avrebbero detto un prezzo che
// Stripe non addebita. Il listino carica config.js, che senza .env parte lo
// stesso con i suoi valori di serie: leggere i prezzi non chiede niente.
import { BASE, ADDON, BUNDLE, addonById, bundleById } from '../../features/abbonamenti.js';

export const EURO = (n) => '€' + Number(n).toFixed(2).replace('.', ',');
export const PREZZO_BASE = () => EURO(BASE.prezzo);
export const PREZZO_ADDON = (id) => EURO(addonById(id).prezzo);
// Un pacchetto curato: il suo prezzo e quello pieno dei suoi extra presi uno per uno.
export const PREZZO_BUNDLE = (id) => ({ prezzo: EURO(bundleById(id).prezzo), pieno: bundleById(id).prezzoPienoTesto });
// Gli extra che si vendono a parte: non i ritirati (sono nell'Essenziale) e non
// quelli gia' compresi nel Base.
export const ADDON_IN_VENDITA = () => ADDON.filter((a) => !a.ritirato && !a.inclusoBase);
export const BUNDLE_IN_VENDITA = () => BUNDLE.filter((b) => !b.ritirato);
