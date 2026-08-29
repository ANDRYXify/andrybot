// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprieta intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live


const $ = (id) => document.getElementById(id);
const b64urlToBuf = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
};
const bufToB64url = (buf) => {
  let bin = ''; const u = new Uint8Array(buf);
  for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const post = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.errore || ('errore ' + r.status));
  return d;
};

async function sblocca(auto) {
  const msg = $('msg'); const btn = $('btn');
  msg.className = 'msg'; msg.textContent = '';
  if (!window.PublicKeyCredential) { if (!auto) { msg.className = 'msg err'; msg.textContent = 'Questo dispositivo non supporta le passkey.'; } return; }
  btn.disabled = true;
  try {
    const opt = await post('/api/passkey/login/inizio');
    const cred = await navigator.credentials.get({ publicKey: {
      challenge: b64urlToBuf(opt.challenge),
      rpId: opt.rpId,
      allowCredentials: [],
      userVerification: opt.userVerification || 'preferred',
      timeout: opt.timeout || 60000,
    } });
    await post('/api/passkey/login/fine', {
      id: cred.id,
      authenticatorData: bufToB64url(cred.response.authenticatorData),
      clientDataJSON: bufToB64url(cred.response.clientDataJSON),
      signature: bufToB64url(cred.response.signature),
    });
    msg.className = 'msg ok'; msg.textContent = 'Sbloccato!';
    location.href = '/';
  } catch (e) {
    btn.disabled = false;
    if (auto) return;
    msg.className = 'msg err';
    msg.textContent = (e && e.name === 'NotAllowedError') ? 'Operazione annullata.' : ('Non riuscito: ' + (e.message || e));
  }
}
$('btn').addEventListener('click', () => sblocca(false));

const inApp = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if (inApp) window.addEventListener('load', () => setTimeout(() => sblocca(true), 250));
