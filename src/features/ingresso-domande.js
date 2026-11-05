// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE DOMANDE DEL PRIMO INGRESSO (docs/ACCESSO-SICURO.md, passo 4). Ogni risposta
// va nell'impostazione che c'e' gia', ripulita dallo stesso pulitore del
// pannello (passato da fuori: quelli veri vivono in db.js e in voce.js). Niente
// posto nuovo, e tutto si cambia dopo. Una risposta vuota non tocca niente.
export const DOMANDE = ['nome', 'argomento', 'tono', 'genere', 'community', 'lingua', 'evita'];

export function impostazioniDaDomande(settings, risposte, { schedaPulita, normVoce, toni, generi, lingue }) {
  const s = { ...(settings || {}) };
  const r = risposte && typeof risposte === 'object' ? risposte : {};
  const testo = (k, max) => String(r[k] ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const scheda = { ...(s.scheda || {}) };
  if (testo('argomento', 240)) scheda.faccio = testo('argomento', 240);
  if (testo('evita', 240)) scheda.evita = testo('evita', 240);
  s.scheda = schedaPulita(scheda);
  if (toni.includes(r.tono)) s.tono = r.tono;
  if (generi.includes(r.genere)) s.genere = r.genere;
  if (testo('community', 60)) s.voce = normVoce({ ...(s.voce || {}), community: testo('community', 60) });
  if (lingue.includes(r.lingua)) s.preferenze = { ...(s.preferenze || {}), lingua: r.lingua };
  const nome = testo('nome', 40);
  return { settings: s, display: nome };
}
