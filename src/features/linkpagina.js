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
  twitch:     { c: '#9146FF', d: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z' },
  youtube:    { c: '#FF0000', d: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  instagram:  { c: '#E4405F', d: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077' },
  tiktok:     { c: '#FF0050', d: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  discord:    { c: '#5865F2', d: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z' },
  spotify:    { c: '#1DB954', d: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z' },
  x:          { c: '', d: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z' },
  twitter:    { c: '#1DA1F2', d: 'M21.543 7.104c.015.211.015.423.015.636 0 6.507-4.954 14.01-14.01 14.01v-.003A13.94 13.94 0 0 1 0 19.539a9.88 9.88 0 0 0 7.287-2.041 4.93 4.93 0 0 1-4.6-3.42 4.916 4.916 0 0 0 2.223-.084A4.926 4.926 0 0 1 .96 9.167v-.062a4.887 4.887 0 0 0 2.235.616A4.928 4.928 0 0 1 1.67 3.148 13.98 13.98 0 0 0 11.82 8.292a4.929 4.929 0 0 1 8.39-4.49 9.868 9.868 0 0 0 3.128-1.196 4.941 4.941 0 0 1-2.165 2.724A9.828 9.828 0 0 0 24 4.555a10.019 10.019 0 0 1-2.457 2.549z' },
  telegram:   { c: '#26A5E4', d: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z' },
  kick:       { c: '#53FC18', d: 'M1.333 0h8v5.333H12V2.667h2.667V0h8v8H20v2.667h-2.667v2.666H20V16h2.667v8h-8v-2.667H12v-2.666H9.333V24h-8Z' },
  github:     { c: '', d: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12' },
  reddit:     { c: '#FF4500', d: 'M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z' },
  threads:    { c: '', d: 'M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z' },
  facebook:   { c: '#1877F2', d: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z' },
  whatsapp:   { c: '#25D366', d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z' },
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

// Serve per la chat di Twitch: ha due temi e va scelto quello del tema pagina,
// altrimenti su uno sfondo nero appare un rettangolo bianco accecante.
const eScuro = (v) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(v || '').trim());
  if (!m) return true;
  const s = m[1].length === 3 ? m[1].split('').map((x) => x + x).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
};

// Attributi comuni degli iframe incorporati. allow=: senza "autoplay" e
// "encrypted-media" i player di Spotify e Twitch non partono nemmeno quando
// glielo chiedi tu.
const IFRAME = `loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms"`;

// ── Contenuti incorporati ───────────────────────────────────────────────────
// Regola di sicurezza: mai un iframe verso un indirizzo scelto dall'utente. Si
// riconosce il provider dall'indirizzo che ha incollato e si ricostruisce NOI
// l'URL di embed, con ogni pezzo passato da encodeURIComponent (così un id non
// può aggiungere parametri suoi, tipo un altro &parent=).
const pezzo = (s) => encodeURIComponent(String(s || '').slice(0, 160));

// Twitch e Kick pretendono parent=<dominio che ospita la pagina>. Lo ricaviamo
// dal nostro baseUrl invece di scriverlo a mano: se il dominio cambia, i player
// non si spengono. Twitch accetta più parent, quindi passiamo anche il www.
function domini(baseUrl) {
  let h = 'socialbot.live';
  try { h = new URL(baseUrl || '').hostname || h; } catch { /* baseUrl assente */ }
  return [...new Set([h, h.startsWith('www.') ? h.slice(4) : 'www.' + h])];
}
const conParent = (base, dom) => base + (base.includes('?') ? '&' : '?') + dom.map((h) => 'parent=' + pezzo(h)).join('&');

// Ritorna { src, formato } oppure null. Il formato decide le proporzioni: un
// brano Spotify è una barra bassa, uno short è verticale, un video è 16:9.
// Mettere tutto in 16:9 lasciava mezzo schermo nero sotto un player audio.
function embedSrc(u, dom = ['socialbot.live']) {
  try {
    const url = new URL(u);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const h = url.hostname.toLowerCase().replace(/^www\./, '');
    const seg = url.pathname.split('/').filter(Boolean);

    // YouTube: video, short, diretta, playlist, CANALE INTERO
    if (/(^|\.)youtube(-nocookie)?\.com$/.test(h)) {
      const lista = url.searchParams.get('list');
      const v = url.searchParams.get('v')
        || (['shorts', 'live', 'embed', 'v'].includes(seg[0]) ? seg[1] : '');
      if (v) return { src: `https://www.youtube-nocookie.com/embed/${pezzo(v)}${lista ? `?list=${pezzo(lista)}` : ''}`, formato: seg[0] === 'shorts' ? 'verticale' : 'video' };
      if (lista) return { src: `https://www.youtube-nocookie.com/embed/videoseries?list=${pezzo(lista)}`, formato: 'video' };
      // Il canale non ha un embed suo, ma la playlist dei CARICAMENTI sì: ha lo
      // stesso id del canale con UC→UU. Risultato: un player con tutti i video
      // del canale, l'ultimo per primo.
      if (seg[0] === 'channel' && /^UC[\w-]{6,}$/.test(seg[1] || '')) {
        return { src: `https://www.youtube-nocookie.com/embed/videoseries?list=UU${pezzo(seg[1].slice(2))}`, formato: 'video' };
      }
      if (String(seg[0] || '').startsWith('@') || ['c', 'user'].includes(seg[0])) {
        // Qui ci si arriva solo se il server non è riuscito a ricavare l'id del
        // canale (nome sbagliato, o YouTube che non risponde).
        return { motivo: 'canale YouTube non trovato: controlla il nome, oppure incolla l\'indirizzo che contiene /channel/UC…' };
      }
      return null;
    }
    if (h === 'youtu.be' && seg[0]) return { src: `https://www.youtube-nocookie.com/embed/${pezzo(seg[0])}`, formato: 'video' };

    // Spotify: brano, album, playlist, artista, episodio, podcast (anche i link
    // localizzati /intl-it/track/…)
    if (/(^|\.)spotify\.com$/.test(h)) {
      const i = String(seg[0] || '').startsWith('intl-') ? 1 : 0;
      const tipo = seg[i], id = seg[i + 1];
      if (!['track', 'album', 'playlist', 'artist', 'episode', 'show'].includes(tipo) || !id) return null;
      // Le altezze sono quelle che Spotify stesso consiglia: 152 per il brano,
      // 232 per un episodio o un podcast, 380 per album e playlist. Sbagliarle
      // non taglia solo il contenuto: e l'altezza a decidere QUALE impaginazione
      // usa Spotify, quindi con 380 su un episodio esce la scheda grande e sotto
      // avanza il vuoto.
      const f = tipo === 'track' ? 'compatto' : (tipo === 'episode' || tipo === 'show' ? 'medio' : 'alto');
      return { src: `https://open.spotify.com/embed/${tipo}/${pezzo(id)}`, formato: f };
    }

    // Twitch: diretta di un canale, VOD, clip
    if (/(^|\.)twitch\.tv$/.test(h)) {
      if (h === 'clips.twitch.tv' && seg[0]) return { src: conParent(`https://clips.twitch.tv/embed?clip=${pezzo(seg[0])}&autoplay=false`, dom), formato: 'video' };
      if (seg[1] === 'clip' && seg[2]) return { src: conParent(`https://clips.twitch.tv/embed?clip=${pezzo(seg[2])}&autoplay=false`, dom), formato: 'video' };
      if (seg[0] === 'videos' && seg[1]) return { src: conParent(`https://player.twitch.tv/?video=${pezzo(seg[1])}&autoplay=false`, dom), formato: 'video' };
      if (seg[0]) return { src: conParent(`https://player.twitch.tv/?channel=${pezzo(seg[0])}&autoplay=false`, dom), formato: 'video' };
      return null;
    }

    // Kick
    if (/(^|\.)kick\.com$/.test(h) && seg[0]) return { src: `https://player.kick.com/${pezzo(seg[0])}?autoplay=false`, formato: 'video' };

    // TikTok: il singolo video, oppure il PROFILO intero (griglia degli ultimi
    // video, che TikTok chiama "creator embed")
    if (/(^|\.)tiktok\.com$/.test(h)) {
      const i = seg.indexOf('video');
      const id = i >= 0 ? seg[i + 1] : (seg[0] === 'embed' && /^\d+$/.test(seg[seg.length - 1] || '') ? seg[seg.length - 1] : '');
      if (/^\d{5,}$/.test(String(id))) return { src: `https://www.tiktok.com/embed/v2/${pezzo(id)}`, formato: 'verticale' };
      const utente = (seg.find((s) => s.startsWith('@')) || '').slice(1);
      if (/^[\w.-]{1,30}$/.test(utente)) return { src: `https://www.tiktok.com/embed/@${pezzo(utente)}`, formato: 'pagina' };
      return null;
    }

    // Instagram: post, reel e video. Il PROFILO non si può incorporare: è
    // Instagram che non lo permette, non una mancanza nostra. Meglio dirlo che
    // mostrare un riquadro bianco.
    if (/(^|\.)instagram\.com$/.test(h)) {
      if (['p', 'reel', 'reels', 'tv'].includes(seg[0]) && seg[1]) {
        const tipo = seg[0] === 'reels' ? 'reel' : seg[0];
        return { src: `https://www.instagram.com/${tipo}/${pezzo(seg[1])}/embed`, formato: 'alto' };
      }
      return { motivo: 'Instagram non permette di incorporare un profilo: incolla un post o un reel' };
    }

    // Facebook: la pagina intera, col plugin ufficiale
    if (/(^|\.)facebook\.com$/.test(h) && seg.length && seg[0] !== 'plugins') {
      const pagina = `https://www.facebook.com/${seg.map(pezzo).join('/')}`;
      return { src: `https://www.facebook.com/plugins/page.php?href=${pezzo(pagina)}&tabs=timeline&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=true`, formato: 'pagina' };
    }

    // X/Twitter: la timeline richiede il loro script, non un iframe
    if (/(^|\.)(x|twitter)\.com$/.test(h)) {
      return { motivo: 'X non permette di incorporare un profilo senza i suoi script: meglio un link' };
    }

    // SoundCloud: brano, playlist o profilo (il widget accetta l'indirizzo
    // normale; un profilo o un set hanno bisogno di più spazio di un brano)
    if (/(^|\.)soundcloud\.com$/.test(h) && seg.length) {
      const grande = seg.length === 1 || seg.includes('sets');
      return { src: `https://w.soundcloud.com/player/?url=${pezzo(`https://soundcloud.com/${seg.map(pezzo).join('/')}`)}&visual=false&hide_related=true`, formato: grande ? 'alto' : 'compatto' };
    }

    // Apple Music (della query tengo solo l'id del brano: il resto non serve e
    // sarebbe roba arbitraria dentro il nostro URL)
    if (h === 'music.apple.com' && seg.length >= 2) {
      const i = url.searchParams.get('i');
      return { src: `https://embed.music.apple.com/${seg.map(pezzo).join('/')}${/^\d+$/.test(String(i)) ? `?i=${pezzo(i)}` : ''}`, formato: 'alto' };
    }

    // Deezer
    if (/(^|\.)deezer\.com$/.test(h)) {
      const i = String(seg[0] || '').length === 2 ? 1 : 0;    // /it/album/123
      const tipo = seg[i], id = seg[i + 1];
      if (['track', 'album', 'playlist', 'artist', 'episode', 'show'].includes(tipo) && /^\d+$/.test(String(id))) {
        return { src: `https://widget.deezer.com/widget/auto/${tipo}/${pezzo(id)}`, formato: tipo === 'track' ? 'compatto' : 'alto' };
      }
      return null;
    }

    // Vimeo
    if (/(^|\.)vimeo\.com$/.test(h)) {
      const id = seg.find((s) => /^\d+$/.test(s));
      return id ? { src: `https://player.vimeo.com/video/${pezzo(id)}`, formato: 'video' } : null;
    }
  } catch { /* indirizzo non valido */ }
  return null;
}

// Blocco "diretta": il player del canale, sempre lì. Serve a non dover
// accendere e spegnere un cartello "sono live": quando la diretta parte si vede
// da sé, quando è finita il player dice che il canale è offline.
function direttaSrc(b, dom, login) {
  const canale = String(b.canale || login || '').trim();
  if (!/^[\w.-]{1,60}$/.test(canale)) return null;
  const auto = b.autoplay === true;
  // muto di default: un player che parte a volume pieno dentro la bio di
  // Instagram è una sorpresa che si chiude, non si guarda.
  const muto = b.muto !== false;
  if (b.piattaforma === 'kick') {
    return { src: `https://player.kick.com/${pezzo(canale)}?autoplay=${auto}&muted=${muto}`, chat: '' };
  }
  if (b.piattaforma === 'youtube') {
    // YouTube vuole l'id del canale (UC…), non il nome utente
    return { src: `https://www.youtube-nocookie.com/embed/live_stream?channel=${pezzo(canale)}&autoplay=${auto ? 1 : 0}&mute=${muto ? 1 : 0}`, chat: '' };
  }
  return {
    src: conParent(`https://player.twitch.tv/?channel=${pezzo(canale)}&autoplay=${auto}&muted=${muto}`, dom),
    chat: b.chat ? conParent(`https://www.twitch.tv/embed/${pezzo(canale)}/chat`, dom) : '',
  };
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
  // L'arrotondamento scelto NON vale per i riquadri incorporati: quel valore
  // arriva fino alla forma a pillola, e un video 16:9 con gli angoli mangiati
  // diventa una compressa. Qui il raggio si ferma a 16px (e se hai scelto
  // spigoli vivi restano vivi).
  const raggioEmb = Math.min(Math.max(raggio, 0), 16);
  const larghezza = Number(t.larghezza) || 30;
  const aSinistra = t.allinea === 'sinistra';
  const titolo = pagina.headline || display || login;
  const descr = pagina.tagline || `Tutti i link di ${display || login}`;
  const dom = domini(baseUrl);          // parent= dei player Twitch/Kick
  const scuro = eScuro(c.bg);           // decide il tema della chat incorporata
  const disp = ['colonna', 'rivista', 'sezioni'].includes(t.disposizione) ? t.disposizione : 'colonna';
  const mov = ['nessuno', 'dolce', 'cinema'].includes(t.movimento) ? t.movimento : 'dolce';
  // Titoli "parola per parola": ogni parola è un pezzo a sé, così può entrare
  // con un attimo di ritardo sulla precedente. Si fa qui, a mano, perché farlo
  // in pagina vorrebbe dire JavaScript su una pagina che deve aprirsi subito.
  const parole = (s) => String(s || '').split(/\s+/).filter(Boolean)
    .map((w, i) => `<span class="pa" style="--i:${Math.min(i, 20)}">${esc(w)}</span>`).join(' ');

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
    // Un cielo di puntini che respira: tre strati di stelle di grandezza diversa
    // che si spostano piano. Sta tutto in due gradienti ripetuti, nessuna immagine.
    stelle: `body::before{content:'';position:fixed;inset:-10%;pointer-events:none;opacity:.55;
      background-image:radial-gradient(1.5px 1.5px at 20% 30%,${c.testo},transparent),radial-gradient(1px 1px at 70% 60%,${c.testo},transparent),radial-gradient(2px 2px at 45% 80%,${c.acc},transparent),radial-gradient(1px 1px at 85% 15%,${c.testo},transparent);
      background-size:180px 180px,120px 120px,260px 260px,90px 90px;
      animation:cielo 90s linear infinite}
      @keyframes cielo{to{background-position:180px 180px,-120px 120px,260px -260px,-90px 90px}}`,
    // Onde lente sul fondo: due ellissi sfocate che salgono e scendono.
    onde: `body::before{content:'';position:fixed;left:-20%;right:-20%;bottom:-30%;height:80%;pointer-events:none;
      background:radial-gradient(ellipse 60% 50% at 30% 100%,${c.acc}33,transparent 70%),radial-gradient(ellipse 55% 45% at 75% 100%,${c.acc}22,transparent 70%);
      filter:blur(30px);animation:onda 14s ease-in-out infinite alternate}
      @keyframes onda{to{transform:translateY(-8%) scaleX(1.1)}}`,
    // Griglia in prospettiva, tipo videogioco anni ottanta.
    griglia: `body::before{content:'';position:fixed;left:-50%;right:-50%;bottom:0;height:55%;pointer-events:none;opacity:.5;
      background-image:linear-gradient(${c.acc}66 1px,transparent 1px),linear-gradient(90deg,${c.acc}66 1px,transparent 1px);
      background-size:60px 60px;transform:perspective(320px) rotateX(62deg);transform-origin:bottom;
      mask-image:linear-gradient(to top,#000,transparent 75%)}`,
  };
  const effetto = EFFETTI[t.effetto] || '';

  // stile dei bottoni
  const STILI = {
    pieno: `background:${c.card};border:1px solid ${c.bordo}`,
    contorno: `background:transparent;border:2px solid ${c.bordo}`,
    vetro: `background:${c.card};border:1px solid ${c.bordo};backdrop-filter:blur(12px)`,
  };
  const stileBtn = STILI[t.stileBtn] || STILI.pieno;
  // Ombra a DUE strati: una stretta che stacca il bordo dal fondo e una larga e
  // morbida che dà la distanza. È la differenza fra "un riquadro con l'ombra" e
  // una cosa che sembra appoggiata sopra la pagina.
  const ombra = t.ombra !== false
    ? 'box-shadow:0 1px 2px rgba(0,0,0,.10),0 8px 24px -8px rgba(0,0,0,.22)'
    : '';
  const ANIM = {
    fade: '@keyframes ent{from{opacity:0}to{opacity:1}}',
    rise: '@keyframes ent{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    pop: '@keyframes ent{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}',
  };
  const anim = ANIM[t.anim] || '';

  // ── contenuti: i blocchi in ordine ──
  let n = 0;
  const pezzi = (pagina.blocchi || []).map((b) => {
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
    if (b.tipo === 'titolo') return b.testo ? `<h2 class="tit" ${ritardo}>${parole(b.testo)}</h2>` : (anteprima ? `<h2 class="tit bozza" ${ritardo}>titolo vuoto — da completare</h2>` : '');
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
      // "risolto" è l'indirizzo che il server ha ricavato al salvataggio (oggi
      // solo i canali YouTube): se c'è vale quello, altrimenti quello scritto.
      const e = embedSrc(b.risolto || b.url, dom);
      if (!e || !e.src) {
        if (!anteprima) return '';
        const motivo = e?.motivo
          || (b.url ? 'indirizzo non riconosciuto: YouTube, Spotify, Twitch, TikTok, Instagram, Facebook, Kick, SoundCloud, Apple Music, Deezer o Vimeo' : 'video, musica o pagina da incollare');
        return `<div class="segna" ${ritardo}>${esc(motivo)}</div>`;
      }
      const forma = b.formato && b.formato !== 'auto' ? b.formato : e.formato;
      // altezza scelta a mano: vince su tutto, comprese le proporzioni
      const alt = Number(b.altezza) > 0
        ? `data-fisso="1" style="height:${Math.min(1200, Math.round(b.altezza))}px;aspect-ratio:auto;--d:${Math.min(n - 1, 12) * 45}ms"`
        : ritardo;
      return `${b.titolo ? `<h2 class="tit" ${ritardo}>${esc(b.titolo)}</h2>` : ''}
        <div class="emb f-${esc(forma)}" ${alt}><iframe src="${esc(e.src)}" ${IFRAME}
        title="${esc(b.titolo || 'contenuto incorporato')}"></iframe></div>`;
    }
    if (b.tipo === 'eroe') {
      const img = urlSicuro(b.img);
      const cta = urlSicuro(b.url);
      if (!b.titolo && !img) return anteprima ? `<div class="segna" ${ritardo}>copertina: metti un titolo o un'immagine</div>` : '';
      return `<section class="eroe a-${esc(b.altezza || 'media')}${img ? ' con-img' : ''}${b.fissa ? ' fissa' : ''}" ${img ? `style="--sf:url('${esc(img)}');--d:${Math.min(n - 1, 12) * 45}ms"` : ritardo}>
        <div class="eroe-in">
          ${b.titolo ? `<h2 class="eroe-t">${parole(b.titolo)}</h2>` : ''}
          ${b.sotto ? `<p class="eroe-s">${esc(b.sotto)}</p>` : ''}
          ${cta && b.etichetta ? `<a class="eroe-b" href="${esc(cta)}" target="_blank" rel="noopener nofollow">${esc(b.etichetta)}</a>` : ''}
        </div>
      </section>`;
    }
    if (b.tipo === 'numeri') {
      const voci = (b.voci || []).filter((v) => v.n || v.etichetta);
      if (!voci.length) return anteprima ? `<div class="segna" ${ritardo}>numeri: aggiungi almeno una voce</div>` : '';
      return `<div class="numeri" ${ritardo}>${voci.map((v) => `<div class="num">
        <span class="num-n">${esc(v.n)}</span><span class="num-e">${esc(v.etichetta)}</span></div>`).join('')}</div>`;
    }
    if (b.tipo === 'faq') {
      const voci = (b.voci || []).filter((v) => v.d);
      if (!voci.length) return anteprima ? `<div class="segna" ${ritardo}>domande: scrivine almeno una</div>` : '';
      // <details>: si aprono e si chiudono da sole, senza una riga di script
      return `<div class="faq" ${ritardo}>${voci.map((v) => `<details class="faq-v">
        <summary>${esc(v.d)}</summary><p>${esc(v.r)}</p></details>`).join('')}</div>`;
    }
    if (b.tipo === 'conto') {
      if (!b.quando) return anteprima ? `<div class="segna" ${ritardo}>conto alla rovescia: manca la data</div>` : '';
      return `<div class="conto" ${ritardo} data-quando="${esc(b.quando)}" data-finito="${esc(b.finito || '')}">
        ${b.titolo ? `<span class="conto-t">${esc(b.titolo)}</span>` : ''}
        <span class="conto-n"><time datetime="${esc(b.quando)}">${esc(b.quando.replace('T', ' · '))}</time></span>
      </div>`;
    }
    if (b.tipo === 'scritta') {
      if (!b.testo) return anteprima ? `<div class="segna" ${ritardo}>scritta che scorre: manca il testo</div>` : '';
      const sp = { lenta: 34, media: 22, veloce: 13 }[b.velocita] || 22;
      // quattro copie e uno spostamento del 50%: il giro si chiude senza salti
      const uno = `<span>${esc(b.testo)}</span>`;
      return `<div class="marq" ${ritardo} style="--sp:${sp}s"><div class="marq-in">${uno.repeat(4)}</div></div>`;
    }
    if (b.tipo === 'griglia') {
      const tessere = (b.voci || []).map((v) => {
        const img = urlSicuro(v.img);
        if (!img && !v.titolo) return '';
        const href = urlSicuro(v.url);
        const dentro = `${img ? `<img src="${esc(img)}" alt="${esc(v.titolo || '')}" loading="lazy">` : ''}
          ${v.titolo || v.testo ? `<span class="tess-tx">${v.titolo ? `<span class="tess-t">${esc(v.titolo)}</span>` : ''}${v.testo ? `<span class="tess-s">${esc(v.testo)}</span>` : ''}</span>` : ''}`;
        return href
          ? `<a class="tessera" href="${esc(href)}" target="_blank" rel="noopener nofollow">${dentro}</a>`
          : `<div class="tessera">${dentro}</div>`;
      }).filter(Boolean).join('');
      if (!tessere) return anteprima ? `<div class="segna" ${ritardo}>griglia: aggiungi almeno una tessera</div>` : '';
      return `<div class="griglia" ${ritardo}>${tessere}</div>`;
    }
    if (b.tipo === 'diretta') {
      const dv = direttaSrc(b, dom, login);
      if (!dv) return anteprima ? `<div class="segna" ${ritardo}>diretta: manca il nome del canale</div>` : '';
      const chat = dv.chat ? dv.chat + (scuro ? '&darkpopout' : '') : '';
      return `${b.titolo ? `<h2 class="tit" ${ritardo}>${esc(b.titolo)}</h2>` : ''}
        <div class="emb f-video" ${ritardo}><iframe src="${esc(dv.src)}" ${IFRAME}
        title="${esc(b.titolo || 'diretta')}"></iframe></div>
        ${chat ? `<div class="emb f-chat" ${ritardo}><iframe src="${esc(chat)}" ${IFRAME} title="chat della diretta"></iframe></div>` : ''}`;
    }
    return '';
  });
  // Se una copertina è "fissa", tutto quello che viene dopo diventa un foglio a
  // sé (.dopo) che le scorre sopra. Il taglio si fa PRIMA di scartare i pezzi
  // vuoti, altrimenti gli indici non corrispondono più ai blocchi.
  const iFissa = (pagina.blocchi || []).findIndex((b) => b?.tipo === 'eroe' && b.fissa);
  // I blocchi larghi "metà" o "un terzo" vanno in fila fra loro: è così che si
  // affiancano le cose invece di impilarle. Si uniscono quelli CONSECUTIVI,
  // che è quello che uno si aspetta guardando l'elenco dei contenuti.
  // L'involucro .bl serve quando il blocco ha una larghezza sua o un'entrata
  // sua: senza, il pezzo resta esattamente com'era (niente involucri inutili).
  const involucro = (html, b, i) => {
    const ent = b?.entrata && b.entrata !== 'auto' ? ' e-' + esc(b.entrata) : '';
    if (!ent) return html;
    return `<div class="bl${ent}" style="--d:${Math.min(i, 12) * 45}ms">${html}</div>`;
  };
  // Quante colonne su dodici prende ogni larghezza. Dodici perché si divide per
  // 2, 3, 4 e 6: tutte le frazioni che uno si aspetta cadono esatte.
  const COLONNE = { piena: 12, treQuarti: 9, dueTerzi: 8, meta: 6, terzo: 4, quarto: 3 };
  // Le righe le compone il SERVER, non il "vai a capo quando non ci stai" del
  // browser: sappiamo già quanto è largo ogni blocco, quindi possiamo dire con
  // certezza quali stanno insieme e quanto spazio avanza. E se la pagina è
  // centrata, una riga incompleta la centriamo davvero invece di lasciarla
  // schiacciata a sinistra.
  const inFile = (da, a) => {
    const fuori = [];
    let riga = [], usate = 0;
    const chiudi = () => {
      if (!riga.length) return;
      const avanzo = 12 - usate;
      const scarto = aSinistra ? 0 : Math.floor(avanzo / 2);
      fuori.push(`<div class="fila">${riga.map((r, k) =>
        `<div class="cel s-${r.col}" style="grid-column:${k === 0 ? 1 + scarto : 'auto'}/span ${r.col}">${r.html}</div>`).join('\n')}</div>`);
      riga = []; usate = 0;
    };
    for (let i = da; i < a; i++) {
      if (!pezzi[i]) continue;
      const b = pagina.blocchi[i] || {};
      const html = involucro(pezzi[i], b, i);
      // In anteprima ogni pezzo si porta dietro il suo numero, così cliccandolo
      // l'editor sa quale comando aprire. display:contents = l'involucro non
      // esiste per l'impaginazione, quindi non sposta niente di un pixel.
      const seg = anteprima ? `<div class="sel-b" data-b="${i}" style="display:contents">${html}</div>` : html;
      const col = COLONNE[b.larghezza] || 12;
      if (col >= 12) { chiudi(); fuori.push(seg); continue; }
      if (usate + col > 12) chiudi();      // non ci sta: si va a capo QUI, non a caso
      riga.push({ html: seg, col }); usate += col;
    }
    chiudi();
    return fuori.join('\n');
  };
  const corpo = iFissa >= 0
    ? inFile(0, iFissa + 1) + `\n<div class="dopo">${inFile(iFissa + 1, pezzi.length)}</div>`
    : inFile(0, pezzi.length);

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
${/* per l'anteprima nelle chat vale molto di più la copertina della foto profilo:
     è larga, si vede, e fa sembrare il link una pagina vera invece di un avatar */
  ''}${(() => {
    const cop = (pagina.blocchi || []).find((b) => b?.tipo === 'eroe' && b.img);
    const og = urlSicuro(cop?.img) || imgAvatar;
    return og ? `<meta property="og:image" content="${esc(og)}">
<meta name="twitter:image" content="${esc(og)}">` : '';
  })()}
<meta name="twitter:card" content="${(pagina.blocchi || []).some((b) => b?.tipo === 'eroe' && b.img) ? 'summary_large_image' : 'summary'}">
<link rel="icon" href="/icons/icon-192.png">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--testo:${c.testo};--tenue:${c.tenue};--acc:${c.acc};--r:${raggio}px;--w:${larghezza}rem}
  html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;overflow-x:hidden}
  @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
  ::selection{background:var(--acc);color:#fff}
  /* la barra di scorrimento intonata al tema, non quella grigia di sistema */
  *{scrollbar-width:thin;scrollbar-color:${c.acc}88 transparent}
  ::-webkit-scrollbar{width:9px;height:9px}
  ::-webkit-scrollbar-thumb{background:${c.acc}88;border-radius:9px}
  ::-webkit-scrollbar-track{background:transparent}
  :focus-visible{outline:2px solid var(--acc);outline-offset:3px;border-radius:6px}
  body{min-height:100dvh;${sfondo};color:var(--testo);font-family:${font};
    display:flex;flex-direction:column;align-items:center;
    /* env(safe-area-inset-*): sui telefoni con la tacca e la barra in fondo il
       contenuto non finisce più sotto di esse */
    padding:calc(clamp(1.5rem,6vw,3rem) + env(safe-area-inset-top)) calc(1.25rem + env(safe-area-inset-right))
            calc(2.5rem + env(safe-area-inset-bottom)) calc(1.25rem + env(safe-area-inset-left));
    line-height:1.5;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  ${effetto}
  .telo{position:relative;z-index:1;width:100%;max-width:var(--w);display:flex;flex-direction:column;
    align-items:${aSinistra ? 'flex-start' : 'center'};text-align:${aSinistra ? 'left' : 'center'};gap:.3rem}
  /* la foto profilo con un anello sfumato che gira piano: due righe di CSS che
     fanno la differenza fra "un'immagine tonda" e un profilo curato */
  .avatar{width:5.5rem;height:5.5rem;border-radius:${t.avatarForma === 'quadrato' ? 'calc(var(--r) * .9)' : '50%'};
    object-fit:cover;display:grid;place-items:center;position:relative;
    font-size:2.2rem;font-weight:700;color:var(--acc);background:${c.card};
    border:2px solid transparent;
    background-image:linear-gradient(${c.card},${c.card}),conic-gradient(from 0deg,${c.acc},${c.bordo},${c.acc});
    background-origin:border-box;background-clip:padding-box,border-box;
    box-shadow:0 6px 22px -8px ${c.acc}80}
  /* sulla FOTO il trucco del bordo sfumato non si può usare (l'immagine ci sta
     sopra): lì l'anello lo fa un'ombra piena */
  img.avatar{background-image:none;border:0;box-shadow:0 0 0 2px ${c.acc},0 6px 22px -8px ${c.acc}80}
  h1{font-size:clamp(1.35rem,5vw,1.75rem);font-weight:700;letter-spacing:-.02em;margin-top:.9rem;text-wrap:balance}
  .tag{color:var(--tenue);font-size:.95rem;max-width:26rem;margin-top:.15rem;text-wrap:pretty}
  .lista{width:100%;display:flex;flex-direction:column;gap:.6rem;margin-top:1.5rem;text-align:left}
  .voce{display:flex;align-items:center;gap:.75rem;padding:.9rem 1.05rem;border-radius:var(--r);
    ${stileBtn};${ombra};color:var(--testo);text-decoration:none;font-weight:600;font-size:1rem;
    transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .18s ease,filter .18s ease}
  .voce:hover,.voce:focus-visible{transform:translateY(-2px);border-color:var(--acc);filter:brightness(1.04);
    box-shadow:0 1px 2px rgba(0,0,0,.10),0 14px 30px -12px ${c.acc}66}
  .voce:active{transform:translateY(0) scale(.994)}
  .voce:focus-visible{outline:2px solid var(--acc);outline-offset:3px}
  .voce.spicca{background:var(--acc);border-color:var(--acc);color:#fff;position:relative;overflow:hidden}
  /* una luce che passa sopra il bottone principale: si nota appena, ed è
     esattamente il motivo per cui l'occhio ci finisce sopra */
  .voce.spicca::after{content:'';position:absolute;top:0;bottom:0;width:45%;left:-60%;
    background:linear-gradient(100deg,transparent,rgba(255,255,255,.28),transparent);
    transform:skewX(-18deg);pointer-events:none}
  @media (prefers-reduced-motion:no-preference){.voce.spicca::after{animation:luce 4.5s ease-in-out 1.2s infinite}}
  @keyframes luce{0%{left:-60%}35%,100%{left:130%}}
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
  .soc:hover{transform:translateY(-3px) scale(1.06);border-color:var(--acc);box-shadow:0 10px 20px -10px ${c.acc}99}
  .soc:active{transform:translateY(0) scale(.96)}
  .tessera img{transition:transform .4s cubic-bezier(.22,.9,.3,1)}
  a.tessera:hover img{transform:scale(1.06)}
  a.tessera:active{transform:translateY(-1px) scale(.99)}
  .img{width:100%;border-radius:var(--r);margin-top:1rem;display:block;height:auto}
  .emb{width:100%;margin-top:1rem;border-radius:${raggioEmb}px;overflow:hidden;border:1px solid ${c.bordo};aspect-ratio:16/9}
  .emb iframe{width:100%;height:100%;border:0;display:block}
  /* proporzioni per tipo di contenuto: un brano non è un video, e uno short
     nemmeno. Con un 16/9 forzato restava mezzo riquadro vuoto. */
  .emb.f-video{aspect-ratio:16/9}
  .emb.f-quadrato{aspect-ratio:1/1}
  .emb.f-verticale{aspect-ratio:9/16;max-width:22rem;align-self:center}
  .emb.f-compatto{aspect-ratio:auto;height:152px}   /* un brano */
  .emb.f-medio{aspect-ratio:auto;height:232px}      /* un episodio, un podcast */
  .emb.f-alto{aspect-ratio:auto;height:380px}       /* album, playlist */
  .emb.f-pagina{aspect-ratio:auto;height:26rem}     /* profili e pagine: una vetrina, non un video */
  /* Blocchi affiancati su una riga da DODICI colonne. Ogni blocco prende
     esattamente le colonne della sua frazione: un terzo resta un terzo anche se
     è da solo, e le colonne che avanzano restano libere. */
  .fila{display:grid;grid-template-columns:repeat(12,1fr);gap:.6rem;width:100%;margin-top:1rem;align-items:start}
  .cel{min-width:0;display:flex;flex-direction:column}
  .cel > *{margin-top:0}
  .bl{width:100%;min-width:0}
  .bl > *{margin-top:0}
  /* Sul telefono dodici colonne non hanno senso: si passa a due. Le cose grandi
     prendono la riga intera, i terzi e i quarti stanno in due per riga. */
  @media (max-width:640px){
    .fila{grid-template-columns:repeat(2,1fr)}
    .cel{grid-column:auto/span 2!important}
    .cel.s-3,.cel.s-4{grid-column:auto/span 1!important}
  }
  .emb.f-chat{aspect-ratio:auto;height:26rem;margin-top:.5rem}
  /* ── copertina: l'apertura della pagina, non un bottone ── */
  .eroe{position:relative;width:100%;margin-top:1rem;border-radius:var(--r);overflow:hidden;
    display:grid;place-items:${aSinistra ? 'center start' : 'center'};padding:clamp(1.4rem,5vw,2.6rem);
    min-height:16rem;border:1px solid ${c.bordo};background-color:${c.card};
    background-image:linear-gradient(135deg,${c.acc}33,${c.bg2})}
  /* la foto sta in uno strato suo: così può muoversi in parallasse senza
     trascinarsi dietro il testo */
  .eroe.con-img::before{content:'';position:absolute;inset:-10% 0;z-index:0;
    background-image:var(--sf);background-size:cover;background-position:center}
  .eroe.a-bassa{min-height:10rem}
  .eroe.a-piena{min-height:min(76vh,34rem)}
  /* copertina FISSA: resta ferma e il resto della pagina le scorre sopra, come
     un foglio che si alza. Perché funzioni il resto dev'essere un foglio VERO,
     con lo sfondo della pagina: sennò si vedrebbe la copertina attraverso i
     buchi fra un blocco e l'altro. Di qui il contenitore .dopo. */
  .eroe.fissa{position:sticky;top:0;z-index:0;margin-top:0;border-radius:0;border-left:0;border-right:0}
  .dopo{width:100%;display:flex;flex-direction:column;gap:.6rem;position:relative;z-index:1;
    ${sfondo};padding:1.4rem clamp(.8rem,3vw,1.4rem) 1.5rem;margin-top:1.5rem;
    border-radius:1.6rem 1.6rem 0 0;box-shadow:0 -20px 45px rgba(0,0,0,.28)}
  /* velo scuro solo se c'è una foto: serve a leggere il testo sopra l'immagine */
  .eroe.con-img::after{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(to top,${c.bg}dd,${c.bg}55 55%,transparent)}
  .eroe-in{position:relative;z-index:2;display:flex;flex-direction:column;gap:.45rem;max-width:34rem;
    align-items:${aSinistra ? 'flex-start' : 'center'}}
  .pa{display:inline-block}
  /* scritta che scorre in continuo: un blocco di carattere, non un bottone */
  .marq{width:100%;margin-top:1.2rem;overflow:hidden;
    -webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);
    mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
  /* niente gap ma padding: così metà contenitore è esattamente due copie e il
     giro si chiude senza scatti */
  .marq-in{display:flex;width:max-content;animation:marq var(--sp,22s) linear infinite}
  .marq-in span{white-space:nowrap;padding-right:2.5rem;font-size:clamp(1.7rem,7vw,3.6rem);font-weight:800;
    letter-spacing:-.03em;line-height:1.1;color:var(--acc)}
  @keyframes marq{to{transform:translateX(-50%)}}
  .marq:hover .marq-in{animation-play-state:paused}
  .eroe-t{font-size:clamp(1.6rem,6vw,2.6rem);font-weight:800;letter-spacing:-.03em;line-height:1.05;text-wrap:balance}
  .eroe-s{color:var(--tenue);font-size:1rem;text-wrap:pretty}
  .eroe-b{margin-top:.6rem;padding:.7rem 1.3rem;border-radius:var(--r);background:var(--acc);color:#fff;
    text-decoration:none;font-weight:700;transition:transform .18s cubic-bezier(.34,1.56,.64,1)}
  .eroe-b:hover{transform:translateY(-2px)}
  /* ── griglia di tessere: contenuti da guardare, non righe da leggere ── */
  .griglia{width:100%;margin-top:1rem;display:grid;grid-template-columns:repeat(auto-fill,minmax(8.5rem,1fr));gap:.6rem}
  .tessera{display:flex;flex-direction:column;border-radius:var(--r);overflow:hidden;${stileBtn};${ombra};
    color:var(--testo);text-decoration:none;
    transition:transform .18s cubic-bezier(.34,1.56,.64,1),border-color .18s ease}
  a.tessera:hover{transform:translateY(-3px);border-color:var(--acc)}
  .tessera img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}
  .tess-tx{display:flex;flex-direction:column;gap:.1rem;padding:.6rem .7rem;text-align:left}
  .tess-t{font-weight:700;font-size:.9rem;line-height:1.2}
  .tess-s{font-size:.78rem;color:var(--tenue)}
  /* numeri in fila: follower, anni di dirette, ore in diretta… */
  .numeri{width:100%;margin-top:1.2rem;display:flex;flex-wrap:wrap;gap:.6rem;
    justify-content:${aSinistra ? 'flex-start' : 'center'}}
  .num{flex:1 1 7rem;min-width:6rem;padding:.9rem .6rem;border-radius:var(--r);${stileBtn};text-align:center;
    display:flex;flex-direction:column;gap:.15rem}
  .num-n{font-size:clamp(1.4rem,5vw,2.1rem);font-weight:800;letter-spacing:-.03em;color:var(--acc);line-height:1}
  .num-e{font-size:.76rem;color:var(--tenue);text-transform:uppercase;letter-spacing:.06em}
  /* domande frequenti: si aprono da sole, nessuno script */
  .faq{width:100%;margin-top:1rem;display:flex;flex-direction:column;gap:.45rem}
  .faq-v{border-radius:var(--r);${stileBtn};overflow:hidden}
  .faq-v summary{cursor:pointer;padding:.85rem 1rem;font-weight:600;list-style:none;display:flex;align-items:center;gap:.5rem}
  .faq-v summary::-webkit-details-marker{display:none}
  .faq-v summary::after{content:'';margin-left:auto;width:.5rem;height:.5rem;flex:0 0 auto;
    border-right:2px solid var(--acc);border-bottom:2px solid var(--acc);transform:rotate(45deg);
    transition:transform .2s cubic-bezier(.34,1.56,.64,1)}
  .faq-v[open] summary::after{transform:rotate(-135deg)}
  .faq-v p{padding:0 1rem .9rem;color:var(--tenue);font-size:.92rem;text-wrap:pretty}
  /* conto alla rovescia */
  .conto{width:100%;margin-top:1.2rem;padding:1.1rem 1rem;border-radius:var(--r);${stileBtn};text-align:center;
    display:flex;flex-direction:column;gap:.3rem}
  .conto-t{font-size:.76rem;text-transform:uppercase;letter-spacing:.08em;color:var(--tenue)}
  .conto-n{font-size:clamp(1.3rem,5vw,2rem);font-weight:800;letter-spacing:-.02em;color:var(--acc);
    font-variant-numeric:tabular-nums}
  .spazio{width:100%;height:1.6rem}
  .badge2{align-self:${aSinistra ? 'flex-start' : 'center'};margin-top:1rem;padding:.3rem .8rem;border-radius:999px;
    background:var(--acc);color:#fff;font-size:.8rem;font-weight:700;letter-spacing:.02em}
  .bozza{opacity:.5;border-style:dashed!important;cursor:default}
  .segna{width:100%;margin-top:1rem;padding:1.4rem;border-radius:var(--r);border:1px dashed var(--tenue);
    color:var(--tenue);font-size:.85rem;text-align:center;opacity:.7}
  .vuoto{margin-top:1.5rem;color:var(--tenue);font-size:.95rem}
  .piede{margin-top:2.2rem;font-size:.78rem;color:var(--tenue)}
  .piede a{color:var(--tenue)}
  /* ── disposizione: come stanno insieme i contenuti ─────────────────────── */
  /* Regola valida ovunque: i MEDIA non si stringono mai. Un player Twitch o un
     profilo TikTok dentro una colonna da 15rem diventa un francobollo con le
     barre di scorrimento — che è esattamente com'era. */
  ${disp === 'rivista' ? `
  .telo{max-width:min(66rem,100%)}
  @media (min-width:760px){
    .lista{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem;align-items:start}
    .lista > .tit,.lista > .sep,.lista > .par,.lista > .eroe,.lista > .spazio,.lista > .socrow,
    .lista > .griglia,.lista > .segna,.lista > .emb,.lista > .img,.lista > .marq{grid-column:1/-1}
    .tit{margin-top:2rem;padding-bottom:.5rem;border-bottom:1px solid ${c.bordo}}
    .griglia{grid-template-columns:repeat(auto-fill,minmax(11rem,1fr))}
  }
  @media (min-width:1100px){.lista{grid-template-columns:repeat(3,minmax(0,1fr))}}` : ''}
  ${disp === 'sezioni' ? `
  .telo{max-width:min(54rem,100%)}
  .lista{gap:2.4rem;margin-top:3rem}
  .tit{font-size:clamp(1.8rem,6vw,3.2rem);text-transform:none;letter-spacing:-.035em;color:var(--testo);
    font-weight:800;line-height:1.05;margin-top:3.5rem;text-wrap:balance}
  .par{font-size:clamp(1.05rem,2.4vw,1.25rem);margin-top:1.2rem;max-width:36rem;line-height:1.6}
  .voce{padding:1.35rem 1.5rem;font-size:1.1rem}
  .et{font-size:1.1rem}
  .griglia{grid-template-columns:repeat(auto-fill,minmax(12rem,1fr));gap:1rem}
  .eroe{margin-top:2rem}
  .sep{margin:2.5rem 0 .5rem}
  h1{font-size:clamp(2rem,8vw,3.4rem)}` : ''}

  /* ── movimento ───────────────────────────────────────────────────────────
     I contenuti entrano MENTRE SCORRI, con animation-timeline: nessun
     JavaScript, nessuna libreria. Dove il browser non la conosce resta la
     comparsa a cascata di prima (che parte al caricamento).
     In anteprima la comparsa a tempo è spenta — rifarla a ogni tasto premuto
     faceva sembrare l'editor rotto — ma quella allo scorrimento resta, così
     l'effetto si vede davvero mentre scorri l'anteprima. */
  ${mov !== 'nessuno' && anim ? `${anim}
  ${anteprima ? '' : `.voce,.tit,.par,.sep,.socrow,.img,.emb,.eroe,.griglia,.marq{animation:ent .5s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0ms)}`}
  @supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){
    .voce,.tit,.par,.img,.emb,.eroe,.griglia,.socrow,.marq{animation:ent .6s cubic-bezier(.16,1,.3,1) both;
      animation-delay:0ms;animation-timeline:view();animation-range:entry 0% cover 22%}
  }}` : ''}
  /* Entrata scelta blocco per blocco: vince su quella della pagina. Anima
     l'involucro, e il pezzo dentro sta fermo (sennò si animerebbero in due). */
  @keyframes e-sfuma{from{opacity:0}to{opacity:1}}
  @keyframes e-sali{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
  @keyframes e-scala{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
  @keyframes e-sinistra{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
  @keyframes e-destra{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
  @keyframes e-ruota{from{opacity:0;transform:rotate(-4deg) scale(.94)}to{opacity:1;transform:none}}
  .bl[class*="e-"] > *{animation:none!important}
  .bl.e-nessuna,.bl.e-nessuna > *{animation:none!important}
  ${['sfuma', 'sali', 'scala', 'sinistra', 'destra', 'ruota'].map((k) =>
    `.bl.e-${k}{animation:e-${k} .6s cubic-bezier(.16,1,.3,1) both;animation-delay:var(--d,0ms)}`).join('\n  ')}
  @supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){
    ${['sfuma', 'sali', 'scala', 'sinistra', 'destra', 'ruota'].map((k) =>
    `.bl.e-${k}{animation-delay:0ms;animation-timeline:view();animation-range:entry 0% cover 25%}`).join('\n    ')}
  }}
  ${mov === 'cinema' ? `
  @keyframes par{from{transform:translateY(-7%)}to{transform:translateY(7%)}}
  @keyframes zoomin{from{transform:scale(1.14)}to{transform:scale(1)}}
  @keyframes suPa{from{opacity:0;transform:translateY(.7em) rotate(1.2deg)}to{opacity:1;transform:none}}
  /* le parole entrano una dopo l'altra, non tutte insieme */
  .eroe-t .pa,.tit .pa{animation:suPa .6s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i) * 55ms)}
  @supports (animation-timeline:view()){@media (prefers-reduced-motion:no-preference){
    .eroe.con-img::before{animation:par linear both;animation-timeline:view();animation-range:cover 0% cover 100%}
    .tessera img,.img{animation:zoomin linear both;animation-timeline:view();animation-range:entry 0% cover 40%}
    .eroe-t .pa,.tit .pa{animation:suPa .6s cubic-bezier(.16,1,.3,1) both;animation-delay:0ms;
      animation-timeline:view();animation-range:entry calc(0% + var(--i) * 2.5%) entry calc(60% + var(--i) * 2.5%)}
  }}
  .tit{overflow:hidden}` : ''}
  @media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important}}
  ${anteprima ? `
  /* solo in anteprima: si vede che ogni pezzo si può cliccare per aprirne i comandi */
  .sel-b:hover > *{outline:2px dashed var(--acc);outline-offset:4px;cursor:pointer}
  .sel-b.tocca > *{outline:2px solid var(--acc);outline-offset:4px}` : ''}
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
${corpo.includes('class="conto"') ? `<script>
/* Conto alla rovescia. La data e scritta senza fuso orario di proposito: il
   fuso lo mette il browser di chi guarda, che e l'unico a sapere il suo. */
(function () {
  var c = document.querySelectorAll('.conto');
  function pezzo(n, s) { return n + s; }
  function giro() {
    for (var i = 0; i < c.length; i++) {
      var t = new Date(c[i].getAttribute('data-quando')).getTime();
      var n = c[i].querySelector('.conto-n');
      if (!t || !n) continue;
      var d = t - Date.now();
      if (d <= 0) { n.textContent = c[i].getAttribute('data-finito') || 'ora!'; continue; }
      var s = Math.floor(d / 1000), g = Math.floor(s / 86400), o = Math.floor(s % 86400 / 3600),
          m = Math.floor(s % 3600 / 60), q = s % 60;
      n.textContent = (g ? pezzo(g, 'g ') : '') + pezzo(o, 'h ') + pezzo(m, 'm ') + pezzo(q, 's');
    }
  }
  giro(); setInterval(giro, 1000);
})();
</script>` : ''}
${corpo.includes('<iframe') ? `<script>
/* L'altro script: TikTok e Instagram
   dicono da soli quanto sono alti, con un messaggio al genitore. Senza, il
   riquadro resta dell'altezza che abbiamo indovinato noi e sotto avanza il
   vuoto. Chi non lo manda (Spotify, Twitch) resta com'e: per quelli c'e il
   cursore dell'altezza. Nessuna libreria, nessuna richiesta, 15 righe. */
addEventListener('message', function (e) {
  if (['https://www.tiktok.com', 'https://www.instagram.com'].indexOf(e.origin) < 0) return;
  var d = e.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
  if (!d || typeof d !== 'object') return;
  var h = parseInt(d.height || (d.details && d.details.height) || 0, 10);
  if (!(h > 120 && h < 2000)) return;
  var f = document.querySelectorAll('.emb iframe');
  for (var i = 0; i < f.length; i++) {
    var box = f[i].parentNode;
    if (f[i].contentWindow === e.source && !box.getAttribute('data-fisso')) {
      box.style.height = h + 'px'; box.style.aspectRatio = 'auto';
    }
  }
});
</script>` : ''}
</body>
</html>`;
}
