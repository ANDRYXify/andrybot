// UN PENSIERO ALLA VOLTA.
//
// Il cervello e' UN modello su UNA macchina. Due richieste insieme non vanno al
// doppio della velocita': si dimezzano la CPU a vicenda e sbagliano il tempo
// tutte e due. Dal vivo si vedeva cosi' — i grafici a 800%, otto core saturi, e
// nessuna risposta che esce. Non era il modello che non ce la faceva: erano tre
// domande che si ostacolavano.
//
// Due regole, e la seconda conta quanto la prima:
//  1. uno per volta; chi arriva mentre e' occupato usa il suo ripiego, perche'
//     mettersi in fila davanti a una scadenza vuol dire arrivare tardi con piu'
//     passi;
//  2. il lavoro di SFONDO (sogno, studio, iniziativa) si fa da parte quando c'e'
//     una conversazione viva, anche se in quell'istante nessuno sta pensando.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const src = readFileSync(join(RAD, 'src/ai/brainpy.js'), 'utf8');

test('il cancello e\' UNO, e sta dove passano tutti', () => {
  // Se il guardiano stesse in ognuno dei nove punti che chiamano il cervello,
  // il decimo se lo dimenticherebbe.
  assert.ok(/export async function rispondi\(\{[^}]*sfondo/s.test(src),
    'rispondi() e\' la porta, e sa distinguere chi ha chiesto dal rimuginare');
  assert.ok(/if \(pensando > 0\)[\s\S]{0,300}return null/.test(src), 'occupato: si ritira, non si accoda');
  // la parola «coda» sta nel commento che spiega perche' la coda non c'e':
  // il divieto va chiesto al CODICE, non al testo intorno.
  const codice = src.replace(/\/\/[^\n]*/g, '');
  assert.ok(!/queue|setTimeout\([^)]*riprova/i.test(codice),
    'e non si accoda: davanti a una scadenza la fila fa solo arrivare tardi');
  assert.ok(/pensando\+\+/.test(src) && /finally \{ pensando--/.test(src),
    'e il contatore torna giu\' anche se la richiesta esplode');
});

test('il lavoro di sfondo si fa da parte con una conversazione viva', () => {
  assert.ok(/sfondo && Date\.now\(\) - ultimaPersona < RISPETTO_MS/.test(src),
    'non basta «nessuno sta pensando adesso»: fra una domanda e l\'altra il sogno si prendeva gli otto core');
  assert.ok(/if \(!sfondo\) ultimaPersona = Date\.now\(\)/.test(src),
    'e il momento si segna solo quando a chiedere e\' una persona');
});

test('chi rimugina lo dichiara, e chi aspetta no', () => {
  const brain = readFileSync(join(RAD, 'src/ai/brain.js'), 'utf8');
  // di sfondo e' il lavoro che NESSUNO VEDE. L'iniziativa in chat non lo e':
  // e' parlato che si vede, e lo streamer l'ha acceso apposta.
  const studio = brain.slice(brain.indexOf("modo: 'studio'") - 200, brain.indexOf("modo: 'studio'") + 200);
  assert.ok(/sfondo: true/.test(studio), 'lo studio delle lacune e\' lavoro di sfondo');
  // la risposta in chat: qualcuno sta aspettando, e non si dichiara sfondo
  const i = brain.indexOf('IL CERVELLO PARLA');
  const chat = brain.slice(i, brain.indexOf('FALLBACK quando il modello', i));
  assert.ok(!/sfondo: true/.test(chat), 'la risposta a una persona non e\' mai lavoro di sfondo');
});

test('quando il cervello non risponde, chi ha chiesto non resta a bocca asciutta', () => {
  const brain = readFileSync(join(RAD, 'src/ai/brain.js'), 'utf8');
  const i = brain.indexOf('IL CERVELLO PARLA');
  const tratto = brain.slice(i, brain.indexOf('FALLBACK quando il modello', i));
  assert.ok(/if \(web\) return/.test(tratto),
    'se il materiale c\'era, si dice quello invece di tacere: la domanda aveva una risposta, solo non vestita bene');
});
