// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// OGNI PIATTAFORMA PER CONTO SUO, nella tabella Streamer dell'admin.
//
// Una colonna sola «permessi» guardava solo Twitch: chi stava su Kick o su
// YouTube sembrava spento. Qui ognuna dice da se' quattro cose: se e' accesa sul
// server, se lo streamer l'ha collegata, se il bot puo' parlare nella sua chat e
// quali permessi mancano. Le regole sono quelle della scheda Piattaforme dello
// streamer; qui arrivano gia' lette (token, scope, permessi), cosi' la stessa
// tabella di verita' si prova senza server.
//
// I nomi dei permessi mancanti: per Twitch gli scope come li chiede Twitch, per
// Kick e YouTube le parole del pannello (moderazione, canale, premi, chat).

const scopeDi = (t) => (Array.isArray(t?.scopes) ? t.scopes.map(String) : []);

export function piattaformeDi({ twitch = null, scopeTwitch = [], kick = {}, youtube = {} } = {}) {
  const tw = !!twitch?.accessToken;
  const swt = scopeDi(twitch);
  const tk = !!kick.pronto && !!kick.token?.accessToken;
  const ty = !!youtube.aperto && !!youtube.token?.accessToken;
  const ytChat = ty && scopeDi(youtube.token).some((s) => /force-ssl/.test(s));
  return {
    twitch: { disponibile: true, collegato: tw, chat: tw && swt.includes('chat:edit'),
      mancano: tw ? scopeTwitch.filter((s) => !swt.includes(s)) : [] },
    kick: { disponibile: !!kick.pronto, collegato: tk, chat: tk, moderazione: tk && !!kick.puoModerare,
      mancano: tk ? [...(kick.puoModerare ? [] : ['moderazione']), ...(kick.mancano || [])] : [] },
    youtube: { disponibile: !!youtube.aperto, collegato: ty, chat: ytChat,
      mancano: ty && !ytChat ? ['chat'] : [] },
  };
}
