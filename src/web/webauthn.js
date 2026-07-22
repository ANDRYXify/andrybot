// WebAuthn (passkey) IN CASA: verifica registrazione e login SENZA librerie
// esterne. La crittografia vera (verifica firma ECDSA/RSA/EdDSA) usa il modulo
// 'crypto' di Node; qui facciamo solo il parsing delle strutture (CBOR, authData,
// chiave COSE) e i controlli del protocollo (rpIdHash, origin, challenge, flag,
// contatore anti-clone). Supporta ES256, RS256 e EdDSA (Ed25519).
//
// Modello di fiducia: la passkey si CREA solo dopo essere entrati col pass del
// sito (quindi si è già uno streamer verificato). Poi permette di RIENTRARE
// senza pass. Non usiamo l'attestation (attestation 'none'): non ci serve
// sapere il modello dell'autenticatore, solo che la firma torni.
import crypto from 'node:crypto';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest();

// -------------------------------------------------------- base64url
export function b64urlToBuf(s) {
  const t = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(t + '==='.slice((t.length + 3) % 4), 'base64');
}
export function bufToB64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function randomChallenge() { return bufToB64url(crypto.randomBytes(32)); }

// -------------------------------------------------------- CBOR (sottoinsieme)
// Decodifica interi, stringhe byte/testo, array e mappe: quanto basta per
// attestationObject e per la chiave pubblica COSE.
function cborDecode(buf, off = 0) {
  const b0 = buf[off]; const major = b0 >> 5; const ai = b0 & 0x1f; off += 1;
  let len, val;
  const readLen = () => {
    if (ai < 24) return ai;
    if (ai === 24) { const v = buf[off]; off += 1; return v; }
    if (ai === 25) { const v = buf.readUInt16BE(off); off += 2; return v; }
    if (ai === 26) { const v = buf.readUInt32BE(off); off += 4; return v; }
    if (ai === 27) { const v = Number(buf.readBigUInt64BE(off)); off += 8; return v; }
    throw new Error('CBOR: lunghezza non supportata');
  };
  switch (major) {
    case 0: return [readLen(), off];                                  // uint
    case 1: { const n = readLen(); return [-1 - n, off]; }            // negative int
    case 2: { len = readLen(); val = buf.subarray(off, off + len); return [val, off + len]; }   // byte string
    case 3: { len = readLen(); val = buf.toString('utf8', off, off + len); return [val, off + len]; } // text
    case 4: { len = readLen(); const arr = []; for (let i = 0; i < len; i++) { const [v, no] = cborDecode(buf, off); arr.push(v); off = no; } return [arr, off]; }
    case 5: { len = readLen(); const map = new Map(); for (let i = 0; i < len; i++) { const [k, no1] = cborDecode(buf, off); const [v, no2] = cborDecode(buf, no1); map.set(k, v); off = no2; } return [map, off]; }
    case 6: { const [v, no] = cborDecode(buf, off); return [v, no]; }  // tag: ignora il tag, tieni il valore
    case 7: {
      if (ai === 20) return [false, off]; if (ai === 21) return [true, off];
      if (ai === 22) return [null, off]; if (ai === 23) return [undefined, off];
      throw new Error('CBOR: valore semplice non supportato');
    }
    default: throw new Error('CBOR: tipo non supportato');
  }
}

// -------------------------------------------------------- authenticator data
function parseAuthData(buf) {
  if (!buf || buf.length < 37) throw new Error('authData troppo corto');
  const rpIdHash = buf.subarray(0, 32);
  const flags = buf[32];
  const signCount = buf.readUInt32BE(33);
  const res = { rpIdHash, flags, signCount, up: !!(flags & 0x01), uv: !!(flags & 0x04), at: !!(flags & 0x40) };
  let off = 37;
  if (res.at) {
    res.aaguid = buf.subarray(off, off + 16); off += 16;
    const credLen = buf.readUInt16BE(off); off += 2;
    res.credId = buf.subarray(off, off + credLen); off += credLen;
    const [cose] = cborDecode(buf, off);
    res.cose = cose;
  }
  return res;
}

// -------------------------------------------------------- COSE → JWK
function coseToJwk(cose) {
  if (!(cose instanceof Map)) throw new Error('chiave COSE non valida');
  const kty = cose.get(1);
  const alg = cose.get(3);
  if (kty === 2) {   // EC2
    const crv = cose.get(-1);
    if (crv !== 1) throw new Error('curva EC non supportata (serve P-256)');
    return { jwk: { kty: 'EC', crv: 'P-256', x: bufToB64url(cose.get(-2)), y: bufToB64url(cose.get(-3)) }, alg: alg || -7 };
  }
  if (kty === 3) {   // RSA
    return { jwk: { kty: 'RSA', n: bufToB64url(cose.get(-1)), e: bufToB64url(cose.get(-2)) }, alg: alg || -257 };
  }
  if (kty === 1) {   // OKP (EdDSA)
    if (cose.get(-1) !== 6) throw new Error('curva OKP non supportata (serve Ed25519)');
    return { jwk: { kty: 'OKP', crv: 'Ed25519', x: bufToB64url(cose.get(-2)) }, alg: alg || -8 };
  }
  throw new Error('tipo di chiave non supportato');
}

// verifica una firma con la chiave (JWK) secondo l'algoritmo
function verificaFirma(jwk, alg, datiFirmati, firma) {
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  if (jwk.kty === 'OKP') return crypto.verify(null, datiFirmati, key, firma);          // Ed25519
  return crypto.verify('sha256', datiFirmati, key, firma);                              // ES256 (DER) / RS256
}

// -------------------------------------------------------- clientData
function leggiClientData(clientDataJSONb64, tipoAtteso, challenge, origin) {
  const raw = b64urlToBuf(clientDataJSONb64);
  let cd;
  try { cd = JSON.parse(raw.toString('utf8')); } catch { throw new Error('clientDataJSON illeggibile'); }
  if (cd.type !== tipoAtteso) throw new Error('tipo cerimonia errato');
  if (cd.challenge !== challenge) throw new Error('challenge non corrispondente');
  if (cd.origin !== origin) throw new Error('origin non corrispondente');
  return { raw, cd };
}

// -------------------------------------------------------- REGISTRAZIONE
export function verifyRegistration({ attestationObject, clientDataJSON, challenge, origin, rpId }) {
  try {
    leggiClientData(clientDataJSON, 'webauthn.create', challenge, origin);
    const [att] = cborDecode(b64urlToBuf(attestationObject));
    const authData = att.get('authData');
    const p = parseAuthData(authData);
    if (!p.rpIdHash.equals(sha256(rpId))) throw new Error('rpId non corrispondente');
    if (!p.up) throw new Error('presenza utente non confermata');
    if (!p.at || !p.credId || !p.cose) throw new Error('nessuna credenziale nel authData');
    const { jwk, alg } = coseToJwk(p.cose);
    return { ok: true, credId: bufToB64url(p.credId), jwk, alg, signCount: p.signCount };
  } catch (e) { return { ok: false, errore: e?.message || 'registrazione non valida' }; }
}

// -------------------------------------------------------- LOGIN (assertion)
export function verifyAuthentication({ authenticatorData, clientDataJSON, signature, jwk, alg, challenge, origin, rpId, storedSignCount = 0 }) {
  try {
    const { raw } = leggiClientData(clientDataJSON, 'webauthn.get', challenge, origin);
    const authData = b64urlToBuf(authenticatorData);
    const p = parseAuthData(authData);
    if (!p.rpIdHash.equals(sha256(rpId))) throw new Error('rpId non corrispondente');
    if (!p.up) throw new Error('presenza utente non confermata');
    const datiFirmati = Buffer.concat([authData, sha256(raw)]);
    if (!verificaFirma(jwk, alg, datiFirmati, b64urlToBuf(signature))) throw new Error('firma non valida');
    // anti-clone: se l'autenticatore usa un contatore, deve crescere
    if ((p.signCount > 0 || storedSignCount > 0) && p.signCount <= storedSignCount) {
      throw new Error('contatore firma sospetto (possibile clone)');
    }
    return { ok: true, newSignCount: p.signCount };
  } catch (e) { return { ok: false, errore: e?.message || 'login non valido' }; }
}
