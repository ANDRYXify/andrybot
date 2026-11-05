// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live

(function (radice) {
  'use strict';
  const LINGUA = (() => {
    const q = new URLSearchParams(location.search).get('lang');
    const n = String(q || navigator.language || 'it').slice(0, 2).toLowerCase();
    return ['it', 'en', 'es'].includes(n) ? n : 'it';
  })();
  document.documentElement.lang = LINGUA;
  const L = (it, en, es) => (LINGUA === 'en' ? en : LINGUA === 'es' ? es : it);

  const el = (tag, attr, ...figli) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attr || {})) {
      if (v === false || v == null) continue;
      if (k === 'testo') e.textContent = v;
      else if (k === 'classe') e.className = v;
      else if (k.startsWith('su')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const f of figli.flat()) if (f != null && f !== false) e.append(f.nodeType ? f : document.createTextNode(String(f)));
    return e;
  };

  async function chiama(via, corpo, metodo) {
    const r = await fetch(via, {
      method: metodo || (corpo === undefined ? 'GET' : 'POST'),
      headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.codice || d.errore || ('http-' + r.status)); e.codice = d.codice || d.errore || ''; e.stato = r.status; throw e; }
    return d;
  }

  const ERRORI = {
    sbagliato: () => L('Il codice non è giusto. Controlla e riprova.', 'That code is not right. Check it and try again.', 'El código no es correcto. Revísalo y vuelve a intentarlo.'),
    troppe: () => L('Troppi tentativi. Aspetta qualche minuto e riprova.', 'Too many tries. Wait a few minutes and try again.', 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'),
    sessione: () => L('La pagina è scaduta. Rientra dall’inizio.', 'This page has expired. Start again from the beginning.', 'La página ha caducado. Vuelve a entrar desde el principio.'),
    scaduta: () => L('Ci hai messo un po’: riprova.', 'That took a while: try again.', 'Has tardado un poco: vuelve a intentarlo.'),
    passkey: () => L('La passkey non è andata. Riprova, o scegli un altro modo.', 'The passkey did not work. Try again, or pick another way.', 'La passkey no ha funcionado. Vuelve a intentarlo o elige otra forma.'),
    indirizzo: () => L('Questa mail non sembra giusta.', 'This email does not look right.', 'Este correo no parece correcto.'),
    invio: () => L('La mail non è partita. Riprova fra poco.', 'The email did not go out. Try again shortly.', 'El correo no ha salido. Vuelve a intentarlo en un rato.'),
    misura: () => L('La password va da 8 a 128 caratteri.', 'The password must be 8 to 128 characters.', 'La contraseña va de 8 a 128 caracteres.'),
    password: () => L('Hai già usato la password: scegli un’altra prova.', 'You already used the password: choose another check.', 'Ya usaste la contraseña: elige otra prueba.'),
    presa: () => L('Questa mail la usa già un altro accesso.', 'This email is already used by another account.', 'Este correo ya lo usa otro acceso.'),
    prova: () => L('Il controllo del browser non è andato: ricarica la pagina e riprova.', 'The browser check did not go through: reload the page and try again.', 'La comprobación del navegador no ha ido bien: recarga la página y vuelve a intentarlo.'),
    conto: () => L('Questo accesso adesso non apre nessun pannello.', 'This account does not open any panel right now.', 'Este acceso ahora no abre ningún panel.'),
    mail: () => L('Il codice per mail adesso non si può usare.', 'Email codes cannot be used right now.', 'Ahora no se pueden usar códigos por correo.'),
    annullata: () => L('Operazione annullata.', 'Cancelled.', 'Operación cancelada.'),
    supporto: () => L('Questo dispositivo non sa usare le passkey: scegli un altro modo.', 'This device cannot use passkeys: pick another way.', 'Este dispositivo no puede usar passkeys: elige otra forma.'),
  };
  const errore = (e) => {
    if (e && e.name === 'NotAllowedError') return ERRORI.annullata();
    const c = e && (e.codice || e.message);
    return (ERRORI[c] || (() => L('Qualcosa non ha funzionato. Riprova.', 'Something went wrong. Try again.', 'Algo no ha funcionado. Vuelve a intentarlo.')))();
  };

  const daB64 = (s) => {
    const t = String(s).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(t + '==='.slice((t.length + 3) % 4));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  };
  const aB64 = (buf) => {
    let bin = ''; const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const segni = () => {
    const ua = navigator.userAgent || '';
    return {
      webdriver: navigator.webdriver === true,
      senzaTesta: /HeadlessChrome/.test(ua),
      senzaLingue: !(navigator.languages && navigator.languages.length),
      senzaMotore: /Chrome\//.test(ua) && !/Edg\/|OPR\/|SamsungBrowser/.test(ua) && typeof radice.chrome === 'undefined',
    };
  };
  const zeri = (u) => {
    let n = 0;
    for (const b of u) { if (b === 0) { n += 8; continue; } return n + Math.clz32(b) - 24; }
    return n;
  };
  async function risolvi(sfida, bit) {
    const enc = new TextEncoder();
    for (let base = 0; ; base += 64) {
      const lotto = [];
      for (let i = 0; i < 64; i++) lotto.push(crypto.subtle.digest('SHA-256', enc.encode(sfida + ':' + (base + i))));
      const h = await Promise.all(lotto);
      for (let i = 0; i < 64; i++) if (zeri(new Uint8Array(h[i])) >= bit) return String(base + i);
    }
  }
  async function prova(scopo) {
    const s = await chiama('/api/ingresso/sfida', { scopo, segni: segni() });
    return { sfida: s.sfida, numero: await risolvi(s.sfida, s.bit) };
  }

  async function passkeyUsa(inizio, fine) {
    if (!radice.PublicKeyCredential) throw Object.assign(new Error('supporto'), { codice: 'supporto' });
    const o = await chiama(inizio, {});
    const c = await navigator.credentials.get({ publicKey: {
      challenge: daB64(o.challenge), rpId: o.rpId, userVerification: o.userVerification || 'preferred', timeout: o.timeout || 60000,
      allowCredentials: (o.allowCredentials || []).map((x) => ({ type: 'public-key', id: daB64(x.id) })),
    } });
    return chiama(fine, { id: c.id, authenticatorData: aB64(c.response.authenticatorData), clientDataJSON: aB64(c.response.clientDataJSON), signature: aB64(c.response.signature) });
  }
  async function passkeyCrea(inizio, fine, nome) {
    if (!radice.PublicKeyCredential) throw Object.assign(new Error('supporto'), { codice: 'supporto' });
    const o = await chiama(inizio, {});
    const c = await navigator.credentials.create({ publicKey: {
      challenge: daB64(o.challenge), rp: o.rp, user: { ...o.user, id: daB64(o.user.id) },
      pubKeyCredParams: o.pubKeyCredParams, authenticatorSelection: o.authenticatorSelection, timeout: o.timeout, attestation: o.attestation,
    } });
    return chiama(fine, { attestationObject: aB64(c.response.attestationObject), clientDataJSON: aB64(c.response.clientDataJSON), nome });
  }

  radice.SB_INGRESSO = { LINGUA, L, el, chiama, errore, prova, segni, risolvi, passkeyUsa, passkeyCrea };
})(window);
