// I numeri dei giochi, ricavati dal catalogo che usa il motore: il manuale dei
// giochi li mostra, non li ricopia. Stanno qui perche' li usa il manuale in
// ogni lingua.
import { CATALOGO, giocoDi, valoriDi, valutaResa, presenzaOraria, MANCHE_TIPI } from '../../features/giochi-conf.js';

export { presenzaOraria, MANCHE_TIPI };

// I numeri dei giochi li legge dal catalogo, che e' quello da cui li legge il
// motore: scritti a mano, al primo ribilancio avrebbero mentito.
export const DI_SERIE = (id) => valoriDi({}, id);
export const RESA = (id) => valutaResa(giocoDi(id).resa, DI_SERIE(id), { mancheMinuti: 15 });
export const CIFRA = (n) => Number(n).toLocaleString('it-IT');
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
      const base = p.tipo === 'elenco' ? `${p.def.length} frasi di serie`
        : p.tipo === 'tabella' ? `${p.def.length} righe di serie`
          : p.tipo === 'scelta' ? p.scelte.find(([k]) => k === p.def)[1][0]
            : p.tipo === 'scelte' ? 'tutte'
            : `${CIFRA(p.def)} ${TIPO_PARAM[p.tipo] || ''}`.trim();
      const limiti = p.tipo === 'elenco' || p.tipo === 'tabella' ? `fino a ${p.max} righe`
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
