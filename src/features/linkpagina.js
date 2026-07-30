// Pagina pubblica /u/<login>: HTML autonomo generato dal nostro server.
//
// Perché server-rendered e non una SPA: è una pagina che vive nella bio di
// Instagram/TikTok. Deve aprirsi istantaneamente su una connessione mobile
// scadente, funzionare senza JavaScript e farsi leggere dai crawler e dalle
// anteprime dei social. Una SPA da scaricare per mostrare cinque link è il
// modo più lento di fare la cosa più semplice.
//
// NIENTE EMOJI: le icone sono SVG a tratto, monocromatiche, che prendono il
// colore del tema. Le emoji cambiano forma su ogni sistema operativo (su Linux
// diventano grigie e sfocate) e non si possono colorare: su una pagina che deve
// sembrare tua sono un difetto, non una scorciatoia.
//
// Nessuna risorsa esterna a parte le immagini che sceglie lo streamer: CSS in
// linea, nessun font remoto, nessuno script. Tutto il testo passa da esc().

// ── preset: il punto di partenza, poi il tema dell'utente sovrascrive ──
const PRESET = {
  minimal:  { bg: '#fafafa', bg2: '#f0f0f3', testo: '#18181b', tenue: '#55555f', card: '#ffffff', bordo: '#e7e7ea', acc: '#6d3bef' },
  neon:     { bg: '#07060d', bg2: '#140b26', testo: '#f4f2ff', tenue: '#a79fc4', card: 'rgba(255,255,255,.05)', bordo: 'rgba(165,104,255,.35)', acc: '#a568ff' },
  retro:    { bg: '#f5e9d0', bg2: '#e8d3ad', testo: '#2b2118', tenue: '#6b5943', card: '#fffaf0', bordo: '#d8c3a0', acc: '#c2551f' },
  sunset:   { bg: '#1b0f2b', bg2: '#4a1d3d', testo: '#fff4ed', tenue: '#d7b3c8', card: 'rgba(255,255,255,.07)', bordo: 'rgba(255,180,140,.3)', acc: '#ff8a5b' },
  glass:    { bg: '#0e1626', bg2: '#16304d', testo: '#eef4ff', tenue: '#a8bcd8', card: 'rgba(255,255,255,.08)', bordo: 'rgba(255,255,255,.16)', acc: '#5bc8ff' },
  brutal:   { bg: '#f4f4f0', bg2: '#e6e6e0', testo: '#0a0a0a', tenue: '#4a4a4a', card: '#ffffff', bordo: '#0a0a0a', acc: '#ff4d2d' },
  pastello: { bg: '#fdf2f8', bg2: '#eef2ff', testo: '#3f3f52', tenue: '#7a7a92', card: '#ffffff', bordo: '#eaddf0', acc: '#c86bb0' },
};

const PILE = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  inter: 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  serif: 'Georgia, "Times New Roman", Times, serif',
  condensato: '"Arial Narrow", "Helvetica Neue Condensed", Impact, sans-serif',
  tondo: 'Verdana, "Trebuchet MS", "Segoe UI", sans-serif',
};

// ── icone: SVG a tratto (24×24, stroke currentColor) ──
const P = {
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.8-1.7"/>',
  twitch: '<path d="M4 3h16v11l-4 4h-3l-3 3H8v-3H4z"/><path d="M11 8v4"/><path d="M15 8v4"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1" fill="currentColor" stroke="none"/>',
  tiktok: '<path d="M14 4v9a4 4 0 1 1-4-4"/><path d="M14 4a5 5 0 0 0 5 5"/>',
  discord: '<path d="M8 5.5C6 6 4.5 7 4 8.5 2.8 12 3 16 4.5 18c1 1 2.5 1.5 3.5 1L9 17"/><path d="M16 5.5c2 .5 3.5 1.5 4 3 1.2 3.5 1 7.5-.5 9.5-1 1-2.5 1.5-3.5 1L15 17"/><circle cx="9.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  spotify: '<circle cx="12" cy="12" r="9"/><path d="M7.5 9.5c3-1 6.5-.6 9 1"/><path d="M8 13c2.5-.8 5.3-.5 7.4.9"/><path d="M8.5 16c2-.6 4.2-.4 5.9.7"/>',
  x: '<path d="M4 4l16 16"/><path d="M20 4L4 20"/>',
  twitter: '<path d="M22 5.9c-.7.3-1.5.6-2.3.7A4 4 0 0 0 12 9.5v1A11 11 0 0 1 3 5s-4 9 5 13a11 11 0 0 1-6 1.5c9 5 20 0 20-11.5 0-.3 0-.6-.1-.8A7.7 7.7 0 0 0 22 5.9z"/>',
  telegram: '<path d="M21 4L3 11l5 2 2 6 3-4 5 4z"/><path d="M8 13l10-6"/>',
  kick: '<path d="M4 4h4v5h2V6h2V4h6v6h-2v4h2v6h-6v-2h-2v-3H8v5H4z"/>',
  github: '<path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.9a3.4 3.4 0 0 0-1-2.6c3-.3 5-1.6 5-6a4.7 4.7 0 0 0-1.3-3.3 3.5 3.5 0 0 0-.1-3.4S16.5.9 14 2.7a10 10 0 0 0-5 0C6.5.9 5.4 1.8 5.4 1.8a3.5 3.5 0 0 0-.1 3.4A4.7 4.7 0 0 0 4 8.5c0 4.4 2 5.7 5 6a3.4 3.4 0 0 0-1 2.6V21"/>',
  reddit: '<circle cx="12" cy="13" r="7"/><circle cx="18.5" cy="6.5" r="2"/><path d="M12 6l1-3 4 1.5"/><circle cx="9.5" cy="12.5" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="12.5" r="1" fill="currentColor" stroke="none"/><path d="M9.5 16a4 4 0 0 0 5 0"/>',
  threads: '<path d="M16 8.5c-1-1.5-2.4-2-4-2-3.5 0-5.5 2.5-5.5 5.5S8.5 17.5 12 17.5c2.6 0 4.3-1.4 4.3-3.2 0-1.6-1.3-2.6-3.3-2.6-1.5 0-2.5.7-2.5 1.7"/><circle cx="12" cy="12" r="9.5"/>',
  facebook: '<path d="M14 8h3V4.5h-3a4 4 0 0 0-4 4V11H7.5v3.5H10V21h3.5v-6.5H16l.5-3.5H13.5V9a1 1 0 0 1 .5-1z"/>',
  whatsapp: '<path d="M21 12a9 9 0 0 1-13.3 7.9L3 21l1.2-4.5A9 9 0 1 1 21 12z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5.6 0 1-.4 1-1l-1.3-.8-1 .8a5 5 0 0 1-2-2l.8-1L11 9.5c-.6 0-1 .4-2 0z"/>',
  cuore: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5C2 10.8 3.5 12.5 5 14l7 7z"/>',
  stella: '<path d="M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5L2.5 9.9 9.1 9z"/>',
  regalo: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  carrello: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  mail: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  musica: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4V8Z"/>',
  scarica: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 11 5 5 5-5"/><path d="M12 4v12"/>',
  gioco: '<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><circle cx="16" cy="11.5" r="1" fill="currentColor" stroke="none"/><circle cx="18" cy="13.5" r="1" fill="currentColor" stroke="none"/><rect x="2" y="7" width="20" height="10" rx="5"/>',
  caffe: '<path d="M17 8h1a3 3 0 0 1 0 6h-1"/><path d="M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M3 21h14"/>',
  soldi: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10"/><path d="M15 9.5c0-1.2-1.3-2-3-2s-3 .8-3 2 1.3 1.8 3 2.2 3 1 3 2.3-1.3 2-3 2-3-.8-3-2"/>',
};
const ico = (nome) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nome] || P.link}</svg>`;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Solo http(s): mai javascript: o data: dentro un href o un src.
function urlSicuro(u) {
  const v = String(u || '').trim();
  if (!/^https?:\/\//i.test(v)) return '';
  try { return new URL(v).toString(); } catch { return ''; }
}
const iniziale = (s) => (String(s || '?').trim()[0] || '?').toUpperCase();

// Embed: solo provider noti, e sempre via il loro dominio di embed. Nessun
// iframe verso un indirizzo arbitrario scelto dall'utente.
function embedSrc(u) {
  try {
    const url = new URL(u);
    const h = url.hostname.toLowerCase().replace(/^www\./, '');
    if (/(^|\.)youtube\.com$/.test(h)) { const v = url.searchParams.get('v'); return v ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}` : ''; }
    if (h === 'youtu.be') { const v = url.pathname.slice(1); return v ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v)}` : ''; }
    if (/(^|\.)spotify\.com$/.test(h)) return `https://open.spotify.com/embed${url.pathname}`;
    if (/(^|\.)twitch\.tv$/.test(h)) {
      const seg = url.pathname.split('/').filter(Boolean);
      if (seg[0] === 'videos' && seg[1]) return `https://player.twitch.tv/?video=${encodeURIComponent(seg[1])}&parent=socialbot.live&autoplay=false`;
      if (seg[0]) return `https://player.twitch.tv/?channel=${encodeURIComponent(seg[0])}&parent=socialbot.live&autoplay=false`;
    }
  } catch { /* url non valido */ }
  return '';
}

export function renderLinkPage(pagina, { login, display, avatar, baseUrl } = {}) {
  const pre = PRESET[pagina.template] || PRESET.minimal;
  const t = pagina.tema || {};
  // il tema dell'utente vince sul preset, campo per campo
  const c = {
    bg: t.bg || pre.bg, bg2: t.bg2 || pre.bg2,
    testo: t.testo || pre.testo, tenue: pre.tenue,
    card: t.card || pre.card, bordo: t.bordo || pre.bordo,
    acc: t.accent || pre.acc,
  };
  const font = PILE[t.font] || PILE.system;
  const raggio = Number.isFinite(Number(t.raggio)) ? Number(t.raggio) : 14;
  const larghezza = Number(t.larghezza) || 30;
  const aSinistra = t.allinea === 'sinistra';
  const titolo = pagina.headline || display || login;
  const descr = pagina.tagline || `Tutti i link di ${display || login}`;

  // sfondo secondo il tipo scelto
  let sfondo = `background:${c.bg}`;
  if (t.sfondoTipo === 'gradiente') sfondo = `background:linear-gradient(${Number(t.angolo) || 160}deg,${c.bg},${c.bg2})`;
  else if (t.sfondoTipo === 'immagine' && urlSicuro(t.sfondoUrl)) {
    sfondo = `background:${c.bg} url("${esc(urlSicuro(t.sfondoUrl))}") center/cover no-repeat fixed`;
  }
  const EFFETTI = {
    aurora: `body::before{content:'';position:fixed;inset:-20%;pointer-events:none;background:radial-gradient(ellipse 50% 40% at 20% 10%,${c.acc}44,transparent 70%),radial-gradient(ellipse 45% 35% at 85% 25%,${c.acc}33,transparent 70%);filter:blur(40px)}`,
    maglia: `body::before{content:'';position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(${c.bordo} 1px,transparent 1px),linear-gradient(90deg,${c.bordo} 1px,transparent 1px);background-size:44px 44px;opacity:.35;mask-image:radial-gradient(ellipse 70% 60% at 50% 30%,#000 30%,transparent 100%)}`,
    grana: `body::before{content:'';position:fixed;inset:0;pointer-events:none;opacity:.05;background-image:repeating-conic-gradient(${c.testo} 0% 0.0001%,transparent 0% 0.0002%);background-size:3px 3px}`,
    bolle: `body::before{content:'';position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle 180px at 15% 20%,${c.acc}2e,transparent 60%),radial-gradient(circle 220px at 85% 70%,${c.acc}24,transparent 60%),radial-gradient(circle 140px at 60% 15%,${c.acc}1f,transparent 60%)}`,
  };
  const effetto = EFFETTI[t.effetto] || '';

  // stile dei bottoni
  const STILI = {
    pieno: `background:${c.card};border:1px solid ${c.bordo}`,
    contorno: `background:transparent;border:2px solid ${c.bordo}`,
    vetro: `background:${c.card};border:1px solid ${c.bordo};backdrop-filter:blur(12px)`,
  };
  const stileBtn = STILI[t.stileBtn] || STILI.pieno;
  const ombra = t.ombra !== false ? 'box-shadow:0 2px 10px rgba(0,0,0,.10)' : '';
  const ANIM = {
    fade: '@keyframes ent{from{opacity:0}to{opacity:1}}',
    rise: '@keyframes ent{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    pop: '@keyframes ent{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}',
  };
  const anim = ANIM[t.anim] || '';

  // ── contenuti: i blocchi in ordine ──
  let n = 0;
  const corpo = (pagina.blocchi || []).map((b) => {
    const ritardo = `style="--d:${Math.min(n++, 12) * 45}ms"`;
    if (b.tipo === 'link') {
      const href = urlSicuro(b.url); if (!href) return '';
      return `<a class="voce${b.evidenzia ? ' spicca' : ''}" ${ritardo} href="${esc(href)}" target="_blank" rel="noopener nofollow">
        <span class="ico">${ico(b.icona)}</span>
        <span class="tx"><span class="et">${esc(b.label)}</span>${b.sotto ? `<span class="so">${esc(b.sotto)}</span>` : ''}</span>
        <span class="fre" aria-hidden="true">${ico('link') && '›'}</span>
      </a>`;
    }
    if (b.tipo === 'titolo') return `<h2 class="tit" ${ritardo}>${esc(b.testo)}</h2>`;
    if (b.tipo === 'testo') return `<p class="par" ${ritardo}>${esc(b.testo)}</p>`;
    if (b.tipo === 'separatore') return `<hr class="sep" ${ritardo}>`;
    if (b.tipo === 'social') {
      const voci = (b.voci || []).map((s) => {
        const href = urlSicuro(s.url); if (!href) return '';
        return `<a class="soc" href="${esc(href)}" target="_blank" rel="noopener nofollow" aria-label="${esc(s.icona)}">${ico(s.icona)}</a>`;
      }).filter(Boolean).join('');
      return voci ? `<div class="socrow" ${ritardo}>${voci}</div>` : '';
    }
    if (b.tipo === 'immagine') {
      const src = urlSicuro(b.url); if (!src) return '';
      return `<img class="img" ${ritardo} src="${esc(src)}" alt="${esc(b.alt || '')}" loading="lazy">`;
    }
    if (b.tipo === 'embed') {
      const src = embedSrc(b.url); if (!src) return '';
      return `<div class="emb" ${ritardo}><iframe src="${esc(src)}" loading="lazy" allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        title="contenuto incorporato"></iframe></div>`;
    }
    return '';
  }).filter(Boolean).join('\n');

  const mostraAvatar = t.avatarForma !== 'nessuno';
  const imgAvatar = pagina.avatar === 'no' ? '' : (urlSicuro(pagina.avatar) || avatar || '');

  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titolo)} · i miei link</title>
<meta name="description" content="${esc(descr).slice(0, 160)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${esc(baseUrl)}/u/${esc(login)}">
<meta name="theme-color" content="${esc(c.bg)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(titolo)}">
<meta property="og:description" content="${esc(descr).slice(0, 200)}">
<meta property="og:url" content="${esc(baseUrl)}/u/${esc(login)}">
${imgAvatar ? `<meta property="og:image" content="${esc(imgAvatar)}">` : ''}
<meta name="twitter:card" content="summary">
<link rel="icon" href="/icons/icon-192.png">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--testo:${c.testo};--tenue:${c.tenue};--acc:${c.acc};--r:${raggio}px;--w:${larghezza}rem}
  html{-webkit-text-size-adjust:100%}
  body{min-height:100dvh;${sfondo};color:var(--testo);font-family:${font};
    display:flex;flex-direction:column;align-items:center;
    padding:clamp(1.5rem,6vw,3rem) 1.25rem 2.5rem;line-height:1.5;-webkit-font-smoothing:antialiased}
  ${effetto}
  .telo{position:relative;z-index:1;width:100%;max-width:var(--w);display:flex;flex-direction:column;
    align-items:${aSinistra ? 'flex-start' : 'center'};text-align:${aSinistra ? 'left' : 'center'};gap:.3rem}
  .avatar{width:5.5rem;height:5.5rem;border-radius:${t.avatarForma === 'quadrato' ? 'calc(var(--r) * .9)' : '50%'};
    object-fit:cover;border:2px solid ${c.bordo};display:grid;place-items:center;
    font-size:2.2rem;font-weight:700;color:var(--acc);background:${c.card}}
  h1{font-size:clamp(1.35rem,5vw,1.75rem);font-weight:700;letter-spacing:-.02em;margin-top:.9rem;text-wrap:balance}
  .tag{color:var(--tenue);font-size:.95rem;max-width:26rem;margin-top:.15rem;text-wrap:pretty}
  .lista{width:100%;display:flex;flex-direction:column;gap:.6rem;margin-top:1.5rem;text-align:left}
  .voce{display:flex;align-items:center;gap:.75rem;padding:.9rem 1.05rem;border-radius:var(--r);
    ${stileBtn};${ombra};color:var(--testo);text-decoration:none;font-weight:600;font-size:1rem;
    transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .18s ease,filter .18s ease}
  .voce:hover,.voce:focus-visible{transform:translateY(-2px);border-color:var(--acc);filter:brightness(1.04)}
  .voce:focus-visible{outline:2px solid var(--acc);outline-offset:3px}
  .voce.spicca{background:var(--acc);border-color:var(--acc);color:#fff}
  .voce.spicca .ico,.voce.spicca .fre,.voce.spicca .so{color:#fff;opacity:.92}
  .ico{flex:0 0 auto;display:inline-flex;color:var(--acc)}
  .tx{flex:1;min-width:0;display:flex;flex-direction:column}
  .et{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .so{font-size:.8rem;font-weight:400;color:var(--tenue);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fre{flex:0 0 auto;color:var(--acc);font-size:1.3rem;line-height:1;transition:transform .18s ease}
  .voce:hover .fre{transform:translateX(3px)}
  .tit{width:100%;font-size:.78rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
    color:var(--tenue);margin-top:1.4rem;text-align:${aSinistra ? 'left' : 'center'}}
  .par{width:100%;font-size:.92rem;color:var(--tenue);margin-top:.7rem;text-wrap:pretty}
  .sep{width:100%;border:0;border-top:1px solid ${c.bordo};margin:1.1rem 0 .3rem}
  .socrow{width:100%;display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem;justify-content:${aSinistra ? 'flex-start' : 'center'}}
  .soc{width:2.7rem;height:2.7rem;border-radius:${raggio >= 900 ? '50%' : 'calc(var(--r) * .8)'};
    display:inline-flex;align-items:center;justify-content:center;${stileBtn};color:var(--acc);
    transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .18s ease}
  .soc:hover{transform:translateY(-2px);border-color:var(--acc)}
  .img{width:100%;border-radius:var(--r);margin-top:1rem;display:block;height:auto}
  .emb{width:100%;margin-top:1rem;border-radius:var(--r);overflow:hidden;border:1px solid ${c.bordo};aspect-ratio:16/9}
  .emb iframe{width:100%;height:100%;border:0;display:block}
  .vuoto{margin-top:1.5rem;color:var(--tenue);font-size:.95rem}
  .piede{margin-top:2.2rem;font-size:.78rem;color:var(--tenue)}
  .piede a{color:var(--tenue)}
  ${anim ? `${anim}\n  .voce,.tit,.par,.sep,.socrow,.img,.emb{animation:ent .5s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0ms)}` : ''}
  @media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important}}
</style>
</head>
<body>
  <main class="telo">
    ${mostraAvatar ? (imgAvatar
      ? `<img class="avatar" src="${esc(imgAvatar)}" alt="" width="88" height="88" loading="eager">`
      : `<div class="avatar" aria-hidden="true">${esc(iniziale(titolo))}</div>`) : ''}
    <h1>${esc(titolo)}</h1>
    ${pagina.tagline ? `<p class="tag">${esc(pagina.tagline)}</p>` : ''}
    ${corpo ? `<nav class="lista">${corpo}</nav>` : `<p class="vuoto">Questa pagina non ha ancora contenuti.</p>`}
    <p class="piede">Pagina creata con <a href="${esc(baseUrl)}/" target="_blank" rel="noopener">SocialBot</a></p>
  </main>
</body>
</html>`;
}
