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

// ── Icone: sagome PIENE, non contorni ──────────────────────────────────────
// Prima erano tracciati sottili a 1.8px: a 20 pixel diventavano scarabocchi
// illeggibili. Le sagome piene si riconoscono a colpo d'occhio, e ogni brand
// porta il SUO colore (Twitch viola, YouTube rosso…): è quello che rende
// un'icona riconoscibile, più della precisione del disegno.
// `c` = colore del brand ('' = usa il colore del tema).
const MARCHI = {
  link:       { c: '', d: 'M9.5 13.5a4.5 4.5 0 0 0 6.4.4l2.7-2.7a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5 1.5 1.5 1.5-1.5a2.3 2.3 0 0 1 3.3 3.3l-2.7 2.7a2.3 2.3 0 0 1-3.3 0zM14.5 10.5a4.5 4.5 0 0 0-6.4-.4l-2.7 2.7a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5-1.5-1.5-1.5 1.5a2.3 2.3 0 0 1-3.3-3.3l2.7-2.7a2.3 2.3 0 0 1 3.3 0z' },
  twitch:     { c: '#9146FF', d: 'M11.6 4.7h1.7v5.2h-1.7zm4.7 0H18v5.2h-1.7zM6 0 1.7 4.3v15.4h5.2V24l4.3-4.3h3.4L22.3 12V0zm14.6 11.1-3.5 3.5h-3.4l-3 3v-3H6.9V1.7h13.7z' },
  youtube:    { c: '#FF0000', d: 'M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8M9.8 15.4V8.6l5.9 3.4z' },
  instagram:  { c: '#E4405F', d: 'M12 2.2c3.2 0 3.6 0 4.9.1 1.2 0 1.8.3 2.2.4.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.1.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.3 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.1-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.1-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c0-1.2.3-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.1 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2m0 6.6a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4m0-1.8a5 5 0 1 1 0 10 5 5 0 0 1 0-10m6.4-.2a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0' },
  tiktok:     { c: '#FF0050', d: 'M16.6 5.8a5 5 0 0 0 3.4 1.4V10a8 8 0 0 1-3.8-1v6.1a6 6 0 1 1-6-6h.8v3a3 3 0 1 0 2.1 2.9V.9h3a5 5 0 0 0 .5 2.1 5 5 0 0 0 0 2.8' },
  discord:    { c: '#5865F2', d: 'M19.5 5A16 16 0 0 0 15.6 3.8l-.3.6a12 12 0 0 0-6.6 0l-.3-.6A16 16 0 0 0 4.5 5C2 8.7 1.3 12.3 1.6 15.9a16 16 0 0 0 4.9 2.5l.6-1a10 10 0 0 1-1.6-.8l.4-.3a11 11 0 0 0 9.4 0l.4.3a10 10 0 0 1-1.6.8l.6 1a16 16 0 0 0 4.9-2.5c.4-4.2-.6-7.8-2.1-10.9M8.6 13.7c-.9 0-1.7-.9-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.7 1.9-1.7 1.9m6.8 0c-.9 0-1.7-.9-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.7 1.9-1.7 1.9' },
  spotify:    { c: '#1DB954', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m4.6 14.4a.8.8 0 0 1-1.1.3c-3-1.8-6.8-2.2-11.2-1.2a.8.8 0 0 1-.3-1.5c4.8-1.1 9-.6 12.3 1.4a.8.8 0 0 1 .3 1m1.2-2.7a1 1 0 0 1-1.3.3c-3.4-2.1-8.6-2.7-12.6-1.5a1 1 0 1 1-.5-1.8c4.6-1.4 10.3-.7 14.2 1.7a1 1 0 0 1 .2 1.3m.1-2.8C14 8.6 7.5 8.4 3.9 9.5a1.2 1.2 0 1 1-.7-2.3C7.4 6 14.5 6.2 18.7 8.7a1.2 1.2 0 0 1-1.2 2.1' },
  x:          { c: '', d: 'M18.9 2h3.3l-7.2 8.3L23.3 22h-6.8l-5.3-7-6.1 7H1.8l7.6-8.7L1.3 2h6.9l5 6.6zm-1.2 18h1.8L6.4 3.9H4.4z' },
  twitter:    { c: '#1DA1F2', d: 'M22 5.9a8 8 0 0 1-2.4.6 4 4 0 0 0 1.8-2.2 8 8 0 0 1-2.5 1A4 4 0 0 0 12 8.6a11 11 0 0 1-8-4 4 4 0 0 0 1.2 5.3 4 4 0 0 1-1.8-.5 4 4 0 0 0 3.2 3.9 4 4 0 0 1-1.8.1 4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 17.9a11 11 0 0 0 17-9.5A8 8 0 0 0 22 5.9' },
  telegram:   { c: '#26A5E4', d: 'M22.1 3.2 2.3 10.9c-1 .4-1 1.4-.2 1.7l4.8 1.5 1.9 5.8c.2.6.4.8 1 .8.4 0 .6-.2.9-.4l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.2-.4-1.8-1.7-1.3M9.4 14.3l9-5.7-8.2 7.4z' },
  kick:       { c: '#53FC18', d: 'M3 3h5.4v5.4h2.7V5.7h2.7V3h5.4v5.4h-2.7v2.7h-2.7v1.8h2.7v2.7h2.7V21h-5.4v-2.7h-2.7v-2.7H8.4V21H3z' },
  github:     { c: '', d: 'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7 0-.7 0-.7 1.2.1 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1a2.6 2.6 0 0 1 .7-1.6c-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0C17.1 4.8 18.1 5 18.1 5c.7 1.7.3 3 .1 3.2a4.5 4.5 0 0 1 1.2 3.1c0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3' },
  reddit:     { c: '#FF4500', d: 'M22 12a2.2 2.2 0 0 0-3.7-1.5 10.8 10.8 0 0 0-5.8-1.8l1.1-3.7 3.2.7a1.6 1.6 0 1 0 .2-1.5l-4-.9-1.5 5.4a10.8 10.8 0 0 0-5.7 1.8A2.2 2.2 0 1 0 3 14.3a4 4 0 0 0 0 .6c0 3.2 3.9 5.8 8.7 5.8s8.7-2.6 8.7-5.8a4 4 0 0 0 0-.6A2.2 2.2 0 0 0 22 12M8.5 14a1.4 1.4 0 1 1 1.4-1.4A1.4 1.4 0 0 1 8.5 14m6.6 3.6a5.9 5.9 0 0 1-3.4.9 5.9 5.9 0 0 1-3.4-.9.6.6 0 0 1 .8-.8 4.8 4.8 0 0 0 2.6.6 4.8 4.8 0 0 0 2.6-.6.6.6 0 0 1 .8.8m-.2-3.6a1.4 1.4 0 1 1 1.4-1.4 1.4 1.4 0 0 1-1.4 1.4' },
  threads:    { c: '', d: 'M17.1 11.1a6.5 6.5 0 0 0-.3-.1c-.3-2.6-1.7-4-4.1-4a4.2 4.2 0 0 0-3.7 1.8l1.5 1a2.6 2.6 0 0 1 2.2-1c1.3 0 2.2.5 2.5 2a11 11 0 0 0-2.4-.1c-2.4.1-4 1.5-3.8 3.5.1 1 .6 1.8 1.5 2.4a4.6 4.6 0 0 0 2.6.6c1.4-.1 2.4-.7 3.1-1.7a5 5 0 0 0 .8-2.3c.9.5 1.5 1.3 1.7 2.2.3 1.6-.5 3.6-2.1 4.7-1.4 1-3.2 1.4-5.5 1.4-2.5 0-4.4-.8-5.6-2.4C4.1 17.7 3.5 15.4 3.5 12s.6-5.7 1.9-7.3C6.6 3.1 8.5 2.3 11 2.3c2.6 0 4.5.8 5.8 2.4a8 8 0 0 1 1.4 3l1.8-.5a10 10 0 0 0-1.8-3.7C16.5 1.4 14.1.4 11 .4h-.1C7.9.4 5.6 1.4 4 3.4 2.5 5.2 1.7 7.9 1.7 12s.8 6.8 2.3 8.6c1.6 2 3.9 3 7.1 3h.1c2.8 0 4.9-.8 6.6-2.1 2.2-1.7 3-4.5 2.6-6.6-.4-1.8-1.4-3.1-3.3-3.8m-3.5 4.7c-1.1.1-2.2-.4-2.3-1.4-.1-.8.5-1.6 2.3-1.7h.6c.7 0 1.3.1 1.9.2-.2 2.4-1.4 2.8-2.5 2.9' },
  facebook:   { c: '#1877F2', d: 'M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6a18 18 0 0 1 2.7.2v3h-1.5c-1.5 0-1.9.9-1.9 1.8V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12' },
  whatsapp:   { c: '#25D366', d: 'M17.5 14.4c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.1l-1 1.2c-.2.2-.4.3-.7.1a9 9 0 0 1-2.6-1.6 10 10 0 0 1-1.8-2.2c-.2-.3 0-.5.1-.6l.7-.8c.2-.2.1-.4 0-.6l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4a3.5 3.5 0 0 0-1.1 2.6 6 6 0 0 0 1.3 3.3 13 13 0 0 0 5.4 4.7c2.6 1 3.1.8 3.7.7a3.2 3.2 0 0 0 2.1-1.5c.3-.6.3-1.1.2-1.2s-.2-.2-.3-.2M12 22a10 10 0 0 1-5.1-1.4L2 22l1.5-4.6A10 10 0 1 1 12 22m0-22a12 12 0 0 0-10.3 18L0 24l6.3-1.6A12 12 0 1 0 12 0' },
  cuore:      { c: '#e0245e', d: 'M12 21.6 10.5 20C5.2 15.2 2 12.3 2 8.6A5.4 5.4 0 0 1 7.4 3.2c1.7 0 3.3.8 4.6 2.2A6 6 0 0 1 16.6 3.2 5.4 5.4 0 0 1 22 8.6c0 3.7-3.2 6.6-8.5 11.4z' },
  stella:     { c: '#f5b301', d: 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z' },
  regalo:     { c: '', d: 'M20 7h-2.2a3 3 0 0 0-.4-3.6A3 3 0 0 0 12 4.4 3 3 0 0 0 6.6 3.4 3 3 0 0 0 6.2 7H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1m-6.6-2.4a1.2 1.2 0 1 1 1.7 1.7 5 5 0 0 1-1.9.7 5 5 0 0 1 .2-2.4m-5.5 0a1.2 1.2 0 0 1 1.7 0 5 5 0 0 1 .8 2.4 5 5 0 0 1-2.5-.7 1.2 1.2 0 0 1 0-1.7M11 20H7v-8h4zm6 0h-4v-8h4z' },
  carrello:   { c: '', d: 'M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4m10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4M7.2 14.8h11.3a1 1 0 0 0 1-.8l2-8A1 1 0 0 0 20.5 5H6.2L5.6 2.8A1 1 0 0 0 4.6 2H2v2h1.8l2.9 11.2A1 1 0 0 0 7.2 16h11.3v-1.2z' },
  calendario: { c: '', d: 'M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 16H5V10h14zm0-12H5V6h14z' },
  mail:       { c: '', d: 'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2m0 4.2-8 5-8-5V6l8 5 8-5z' },
  musica:     { c: '', d: 'M21 3 9 5.2v10.3a4 4 0 1 0 2 3.5V7l8-1.5v7.2a4 4 0 1 0 2 3.5z' },
  video:      { c: '', d: 'M17 10.5V7a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-3.5l5 4v-11z' },
  scarica:    { c: '', d: 'M12 16 6 10h4V3h4v7h4zm-8 2h16v3H4z' },
  gioco:      { c: '', d: 'M17.5 7h-11A4.5 4.5 0 0 0 2 11.5 4.5 4.5 0 0 0 6.5 16h11a4.5 4.5 0 0 0 0-9M9 12.5H7.5V14h-2v-1.5H4v-2h1.5V9h2v1.5H9zm5.8 2a1.2 1.2 0 1 1 1.2-1.2 1.2 1.2 0 0 1-1.2 1.2m2.4-3a1.2 1.2 0 1 1 1.2-1.2 1.2 1.2 0 0 1-1.2 1.2' },
  caffe:      { c: '#FF5E5B', d: 'M18 8h-1V5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v9a6 6 0 0 0 6 6h3a6 6 0 0 0 5.9-5H18a5 5 0 0 0 0-10m0 8h-1.1a8 8 0 0 0 .1-1v-5h1a3 3 0 0 1 0 6M2 21h14v2H2z' },
  soldi:      { c: '#1d9e5e', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m1 15.9V19h-2v-1.1c-1.9-.3-3.2-1.4-3.3-3h2c.1.9 1 1.5 2.3 1.5s2.1-.5 2.1-1.3c0-.7-.5-1.1-2.2-1.5-2.4-.5-3.9-1.3-3.9-3.1 0-1.5 1.2-2.6 3-2.9V6.5h2v1.1c1.8.3 3 1.4 3.1 2.9h-2c-.1-.8-.8-1.4-2-1.4s-2 .5-2 1.2c0 .7.6 1 2.3 1.4 2.4.5 3.8 1.3 3.8 3.2 0 1.6-1.2 2.7-3.2 3z' },
};
// Il colore del brand viaggia in una VARIABILE CSS (--bc), non in un
// style="color:..." inline: uno stile inline vince su qualsiasi regola, e su un
// bottone "in evidenza" (sfondo = colore principale) l'icona restava viola su
// viola, cioe invisibile. Con la variabile il CSS puo dire "qui bianca".
const _mIco = (n, dim = 20) => {
  const m = MARCHI[n] || MARCHI.link;
  return `<svg viewBox="0 0 24 24" width="${dim}" height="${dim}" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" aria-hidden="true"${m.c ? ` style="--bc:${m.c}"` : ''}><path d="${m.d}"/></svg>`;
};

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

export function renderLinkPage(pagina, { login, display, avatar, baseUrl, anteprima } = {}) {
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
      const href = urlSicuro(b.url);
      // In ANTEPRIMA i blocchi incompleti si vedono, segnati come bozza: cosi
      // quando aggiungi qualcosa lo VEDI comparire subito, invece di credere
      // che l'editor sia rotto. Sulla pagina pubblica vengono saltati.
      if (!href || !b.label) {
        if (!anteprima) return '';
        return `<div class="voce bozza" ${ritardo}><span class="ico">${_mIco(b.icona)}</span>
          <span class="tx"><span class="et">${esc(b.label || 'Link senza etichetta')}</span>
          <span class="so">${esc(!b.label ? 'manca l\'etichetta' : 'manca l\'indirizzo')} — da completare</span></span></div>`;
      }
      return `<a class="voce${b.evidenzia ? ' spicca' : ''}" ${ritardo} href="${esc(href)}" target="_blank" rel="noopener nofollow">
        <span class="ico">${_mIco(b.icona)}</span>
        <span class="tx"><span class="et">${esc(b.label)}</span>${b.sotto ? `<span class="so">${esc(b.sotto)}</span>` : ''}</span>
        <span class="fre" aria-hidden="true">›</span>
      </a>`;
    }
    if (b.tipo === 'titolo') return b.testo ? `<h2 class="tit" ${ritardo}>${esc(b.testo)}</h2>` : (anteprima ? `<h2 class="tit bozza" ${ritardo}>titolo vuoto — da completare</h2>` : '');
    if (b.tipo === 'testo') return b.testo ? `<p class="par" ${ritardo}>${esc(b.testo)}</p>` : (anteprima ? `<p class="par bozza" ${ritardo}>testo vuoto — da completare</p>` : '');
    if (b.tipo === 'separatore') return `<hr class="sep" ${ritardo}>`;
    if (b.tipo === 'spazio') return `<div class="spazio" ${ritardo}></div>`;
    if (b.tipo === 'badge') return b.testo ? `<span class="badge2" ${ritardo}>${esc(b.testo)}</span>` : '';
    if (b.tipo === 'social') {
      const voci = (b.voci || []).map((s) => {
        const href = urlSicuro(s.url);
        if (!href) return anteprima ? `<span class="soc bozza">${_mIco(s.icona)}</span>` : '';
        return `<a class="soc" href="${esc(href)}" target="_blank" rel="noopener nofollow" aria-label="${esc(s.icona)}">${_mIco(s.icona)}</a>`;
      }).filter(Boolean).join('');
      return voci ? `<div class="socrow" ${ritardo}>${voci}</div>` : '';
    }
    if (b.tipo === 'immagine') {
      const src = urlSicuro(b.url);
      if (!src) return anteprima ? `<div class="segna" ${ritardo}>immagine da caricare</div>` : '';
      return `<img class="img" ${ritardo} src="${esc(src)}" alt="${esc(b.alt || '')}" loading="lazy">`;
    }
    if (b.tipo === 'embed') {
      const src = embedSrc(b.url);
      if (!src) return anteprima ? `<div class="segna" ${ritardo}>${b.url ? 'indirizzo non supportato (YouTube, Spotify o Twitch)' : 'video o musica da incollare'}</div>` : '';
      return `<div class="emb" ${ritardo}><iframe src="${esc(src)}" loading="lazy" allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        title="contenuto incorporato"></iframe></div>`;
    }
    return '';
  }).filter(Boolean).join('\n');

  // "Nessuna" vuol dire NESSUNA: prima cadeva sull'iniziale del nome, cioè
  // esattamente il cerchio con la lettera che si voleva togliere.
  const mostraAvatar = t.avatarForma !== 'nessuno' && pagina.avatar !== 'no';
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
  .voce.spicca .ico,.voce.spicca .ico svg,.voce.spicca .fre,.voce.spicca .so{color:#fff!important;opacity:.95}
  .ico{flex:0 0 auto;display:inline-flex;color:var(--acc)}
  .ico svg{color:var(--bc,currentColor)}
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
  .soc svg{color:var(--bc,currentColor)}
  .soc:hover{transform:translateY(-2px);border-color:var(--acc)}
  .img{width:100%;border-radius:var(--r);margin-top:1rem;display:block;height:auto}
  .emb{width:100%;margin-top:1rem;border-radius:var(--r);overflow:hidden;border:1px solid ${c.bordo};aspect-ratio:16/9}
  .emb iframe{width:100%;height:100%;border:0;display:block}
  .spazio{width:100%;height:1.6rem}
  .badge2{align-self:${'${aSinistra ? \'flex-start\' : \'center\'}'};margin-top:1rem;padding:.3rem .8rem;border-radius:999px;
    background:var(--acc);color:#fff;font-size:.8rem;font-weight:700;letter-spacing:.02em}
  .bozza{opacity:.5;border-style:dashed!important;cursor:default}
  .segna{width:100%;margin-top:1rem;padding:1.4rem;border-radius:var(--r);border:1px dashed var(--tenue);
    color:var(--tenue);font-size:.85rem;text-align:center;opacity:.7}
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
