// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// IL FLUSSO MATROSKA DEL TRAMITE (docs/DIRETTA.md, «La beta»).
//
// Il dispositivo manda pacchetti gia' codificati (H.264, AAC o Opus) con i loro
// tempi; qui diventano un flusso Matroska in diretta, da dare a ffmpeg che li
// copia verso le piattaforme senza decodificarli. Matroska e non FLV perche'
// porta Opus come AAC senza estensioni: un solo formato per tutti i browser.
//
// Il flusso e' «senza fine»: il Segmento e i Cluster hanno la grandezza
// sconosciuta, come si fa in diretta. Un Cluster nuovo comincia a ogni
// fotogramma chiave, e comunque prima che il tempo relativo esca da 16 bit.

const ID = {
  EBML: 0x1a45dfa3, EBMLVersion: 0x4286, EBMLReadVersion: 0x42f7, EBMLMaxIDLength: 0x42f2, EBMLMaxSizeLength: 0x42f3,
  DocType: 0x4282, DocTypeVersion: 0x4287, DocTypeReadVersion: 0x4285,
  Segment: 0x18538067, Info: 0x1549a966, TimestampScale: 0x2ad7b1, MuxingApp: 0x4d80, WritingApp: 0x5741,
  Tracks: 0x1654ae6b, TrackEntry: 0xae, TrackNumber: 0xd7, TrackUID: 0x73c5, TrackType: 0x83, CodecID: 0x86,
  CodecPrivate: 0x63a2, CodecDelay: 0x56aa, SeekPreRoll: 0x56bb, Video: 0xe0, PixelWidth: 0xb0, PixelHeight: 0xba,
  Audio: 0xe1, SamplingFrequency: 0xb5, Channels: 0x9f,
  Cluster: 0x1f43b675, Timestamp: 0xe7, SimpleBlock: 0xa3,
};
export const TRACCIA = { video: 1, audio: 2 };
const SCONOSCIUTA = Buffer.from([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

function idBytes(id) {
  const b = [];
  for (let v = id; v > 0; v = Math.floor(v / 256)) b.unshift(v & 0xff);
  return Buffer.from(b);
}
function taglia(n) {
  const b = Buffer.alloc(8);
  b[0] = 0x01;
  b.writeUIntBE(Math.floor(n / 2 ** 32) & 0xffffff, 1, 3);
  b.writeUInt32BE(n >>> 0, 4);
  return b;
}
const el = (id, dati) => Buffer.concat([idBytes(id), taglia(dati.length), dati]);
function uint(id, n) {
  const b = [];
  for (let v = Math.max(0, Math.floor(n)); b.length === 0 || v > 0; v = Math.floor(v / 256)) b.unshift(v & 0xff);
  return el(id, Buffer.from(b));
}
const str = (id, s) => el(id, Buffer.from(String(s), 'utf8'));
function float(id, x) { const b = Buffer.alloc(8); b.writeDoubleBE(x); return el(id, b); }
const insieme = (id, ...figli) => el(id, Buffer.concat(figli));

// L'intestazione Opus che Matroska vuole come CodecPrivate, se il browser non
// la da' (RFC 7845, 5.1).
export function opusHead({ canali = 2, frequenza = 48000, preSkip = 312 } = {}) {
  const b = Buffer.alloc(19);
  b.write('OpusHead', 0, 'ascii');
  b[8] = 1;
  b[9] = canali;
  b.writeUInt16LE(preSkip, 10);
  b.writeUInt32LE(frequenza, 12);
  b.writeInt16LE(0, 16);
  b[18] = 0;
  return b;
}

// L'inizio del flusso: intestazione, informazioni e le due tracce.
export function testata({ video, audio }) {
  const ebml = insieme(ID.EBML, uint(ID.EBMLVersion, 1), uint(ID.EBMLReadVersion, 1), uint(ID.EBMLMaxIDLength, 4),
    uint(ID.EBMLMaxSizeLength, 8), str(ID.DocType, 'matroska'), uint(ID.DocTypeVersion, 4), uint(ID.DocTypeReadVersion, 2));
  const info = insieme(ID.Info, uint(ID.TimestampScale, 1_000_000), str(ID.MuxingApp, 'socialbot'), str(ID.WritingApp, 'socialbot'));
  const tv = insieme(ID.TrackEntry, uint(ID.TrackNumber, TRACCIA.video), uint(ID.TrackUID, 1), uint(ID.TrackType, 1),
    str(ID.CodecID, 'V_MPEG4/ISO/AVC'), el(ID.CodecPrivate, Buffer.from(video.config)),
    insieme(ID.Video, uint(ID.PixelWidth, video.larghezza), uint(ID.PixelHeight, video.altezza)));
  const opus = audio.codec === 'opus';
  const privato = opus ? (audio.config?.length ? Buffer.from(audio.config) : opusHead({ canali: audio.canali, frequenza: audio.frequenza })) : Buffer.from(audio.config);
  const ta = insieme(ID.TrackEntry, uint(ID.TrackNumber, TRACCIA.audio), uint(ID.TrackUID, 2), uint(ID.TrackType, 2),
    str(ID.CodecID, opus ? 'A_OPUS' : 'A_AAC'), el(ID.CodecPrivate, privato),
    ...(opus ? [uint(ID.CodecDelay, 6_500_000), uint(ID.SeekPreRoll, 80_000_000)] : []),
    insieme(ID.Audio, float(ID.SamplingFrequency, audio.frequenza), uint(ID.Channels, audio.canali)));
  return Buffer.concat([ebml, idBytes(ID.Segment), SCONOSCIUTA, info, insieme(ID.Tracks, tv, ta)]);
}

// Lo scrittore dei blocchi: ricorda il Cluster aperto e ne apre uno nuovo
// quando serve. `ms` e' il tempo d'uscita, gia' monotono (lo garantisce chi
// chiama).
export function creaScrittore() {
  let inizioCluster = null;
  return function blocco(traccia, ms, chiave, dati) {
    const t = Math.round(ms);
    const parti = [];
    if (inizioCluster == null || (traccia === TRACCIA.video && chiave) || t - inizioCluster > 30_000 || t < inizioCluster) {
      inizioCluster = t;
      parti.push(idBytes(ID.Cluster), SCONOSCIUTA, uint(ID.Timestamp, t));
    }
    const testa = Buffer.alloc(4);
    testa[0] = 0x80 | traccia;
    testa.writeInt16BE(t - inizioCluster, 1);
    testa[3] = chiave ? 0x80 : 0x00;
    parti.push(el(ID.SimpleBlock, Buffer.concat([testa, dati])));
    return Buffer.concat(parti);
  };
}

// I pacchetti come li manda il dispositivo: una testata di 16 byte e i dati
// ([0] tipo 1 video / 2 audio, [1] bit 0 fotogramma chiave, [4..11] tempo in
// microsecondi, [12..15] lunghezza). Il formato sta in un posto solo, che legge
// anche il browser.
export { TESTA_PACCO, leggiPacchi, scriviPacchi } from '../web/public/js/diretta-pacchi.js';
