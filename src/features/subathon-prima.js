// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LA SUBATHON DI PRIMA, portata una volta sola nella forma di oggi
// (docs/SUBATHON.md, «Novembre 2026: un orologio suo»).
//
// A ottobre la subathon girava sul conto alla rovescia (overlayStato.timer), e
// i suoi due elementi valevano spenti negli overlay in cui non erano scritti.
// Da novembre ha un orologio suo (overlayStato.subathon) e c'e' in ogni
// overlay. Questo e' l'unico posto che sa com'era prima: il codice della
// subathon non legge il conto alla rovescia, mai.
//
//  · chi aveva una sessione aperta e il conto in corsa o in pausa, senza
//    l'orologio nuovo: l'orologio della subathon prende la fine (o la pausa)
//    del conto. Il conto resta com'e': e' dello streamer, lo ferma lui;
//  · gli overlay salvati nei giorni in cui valevano spenti di serie hanno
//    `subathon: false` e `subregole: false` scritti senza che nessuno li avesse
//    spenti: si tolgono dalle basi (non dalle occasioni, che li ereditano).
//
// Una volta sola: `subathonOrologio: 2` nelle impostazioni lo dice.
export const VERSIONE = 2;
const CHIAVI = ['subathon', 'subregole'];
const obj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

// Le impostazioni nuove, o null se non c'e' niente da fare.
export function migra(settings, ora = Date.now()) {
  if (!obj(settings) || Number(settings.subathonOrologio) >= VERSIONE) return null;
  const st = obj(settings.overlayStato) ? settings.overlayStato : {};
  let stato = st;
  const sb = st.subathon;
  if (obj(sb) && Number(sb.inizio) > 0 && !('fine' in sb) && !obj(sb.pausa)) {
    const t = obj(st.timer) ? st.timer : {};
    const pausa = obj(t.pausa) && Number(t.pausa.resta) > 0 ? { resta: Number(t.pausa.resta) } : null;
    const fine = Number(t.fine) || 0;
    if (pausa) stato = { ...st, subathon: { ...sb, fine: 0, pausa } };
    else if (fine > ora) stato = { ...st, subathon: { ...sb, fine, pausa: null } };
  }
  const out = { ...settings, overlayStato: stato, subathonOrologio: VERSIONE };
  if (Array.isArray(settings.overlays)) {
    out.overlays = settings.overlays.map((o) => {
      if (!obj(o) || !obj(o.mostra) || !CHIAVI.some((k) => o.mostra[k] === false)) return o;
      const mostra = { ...o.mostra };
      for (const k of CHIAVI) if (mostra[k] === false) delete mostra[k];
      return { ...o, mostra };
    });
  }
  return out;
}
