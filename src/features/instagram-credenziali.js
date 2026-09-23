// QUALI CREDENZIALI DI INSTAGRAM, per uno streamer. Una risposta sola per tutti
// quelli che ne hanno bisogno (gli avvisi dei post nuovi, la storia della
// settimana, la prova dal pannello): prima ognuno leggeva le impostazioni per
// conto suo, e il tasto nuovo sarebbe stato il quarto modo di sbagliarle.
//
// Due strade, e si dice quale, perche' parlano con due porte diverse:
//  · 'instagram' — collegato col tasto: il token sta nella cassaforte dei token,
//    cifrato, e si parla con graph.instagram.com. L'id che le chiamate vogliono
//    e' quello dell'account professionale, e sta nelle impostazioni insieme al
//    nome: non sono segreti. Nella cassaforte, accanto al token, c'e' l'id di app,
//    quello che Meta usa quando avvisa di una revoca;
//  · 'facebook' — il token incollato a mano, come prima: sta nelle impostazioni
//    e si parla con graph.facebook.com.
// Vince il tasto: e' quello che lo streamer ha fatto apposta, e il giro del tasto
// svuota il token a mano. Un token del tasto scaduto non vale: si ricollega.
import { tokens, streamers } from '../db.js';

export function credenzialiInstagram(login, adesso = Date.now()) {
  const ig = streamers.get(login)?.settings?.instagram;
  if (ig?.via === 'instagram') {
    const t = tokens.get('instagram', login);
    if (!t?.accessToken || !ig.userId) return null;
    if (Number(t.expiresAt) && Number(t.expiresAt) <= adesso) return null;
    return { userId: String(ig.userId), token: t.accessToken, via: 'instagram' };
  }
  if (ig?.userId && ig?.token) return { userId: String(ig.userId), token: String(ig.token), via: 'facebook' };
  return null;
}
