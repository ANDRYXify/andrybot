// QUANDO LEI SA, PARLA LEI. E IL BOT IMPARA.
//
// Lia non e' il bot. Sono due cose diverse e la porta fra loro va in un verso
// solo: non e' il bot che guarda dentro di lei, e' lei che si fa avanti.
//
// Il difetto che questa porta chiude. Dieci vie di ragionamento su quindici non
// si erano mai accese. Non erano rotte — misurato: `calcola("quanto fa 4+4")`
// risponde «Fa 8.» con `sicura: True`, e nell'ecologia il calcolo e' una verita'
// sovrana che vincerebbe su tutto. Il contatore diceva zero perche' quelle
// domande non le arrivavano MAI: la chat pubblica passa dall'assistente, che per
// progetto non ha ne' mente ne' memoria.
//
// Un metabolismo ottimo tenuto in una scatola non fa crescere nessuno. Il senso
// nasce dagli scambi con il mondo (Di Paolo, «Autopoiesis, adaptivity, teleology,
// agency», 2005), non dalla macchina che li aspetta.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAD = join(dirname(fileURLToPath(import.meta.url)), '../..');
const leggi = (f) => readFileSync(join(RAD, f), 'utf8');

test('la porta e\' stretta: solo verita\', mai chiacchiere', () => {
  const srv = leggi('brain/server.py');
  const i = srv.indexOf('def _lia_sa(');
  assert.ok(i > 0, 'la porta esiste');
  const f = srv.slice(i, srv.indexOf('\ndef _modello_pronto', i));
  for (const via of ['calcolo', 'deduzione', 'causale', 'analogia']) {
    assert.ok(f.includes(`"${via}"`), `manca la via ${via}`);
  }
  assert.ok(/r\.get\("sicura"\)/.test(f), 'passa solo cio\' che e\' sicuro: «sicura» non vuol dire «mi sembra»');
  assert.ok(!/modello|llm|genera/i.test(f.replace(/#[^\n]*/g, '')),
    'non passa da nessun modello: e\' ragionamento, e risponde in millisecondi');
});

test('e\' LEI che si fa avanti, non il bot che guarda dentro', () => {
  const srv = leggi('brain/server.py');
  const i = srv.indexOf('def _bot(self):');
  const f = srv.slice(i, srv.indexOf('def _insegna', i));
  assert.ok(/_lia_sa\(/.test(f), 'la porta si apre nel percorso del bot');
  assert.ok(f.indexOf('_lia_sa(') < f.indexOf('ASS.rispondi'),
    'prima di rispondere l\'assistente: se lei sa, la parola e\' sua');
  // il verso: nel percorso del bot non si legge dentro di lei
  assert.ok(!/mente\.(?!conta_via|_segna_attivita)/.test(f),
    'il bot non interroga la sua mente: al massimo registra che una via ha lavorato');
});

test('quello che dice si conta, e a contarlo e\' LEI', () => {
  const srv = leggi('brain/server.py');
  // il conteggio sta nell'atto suo...
  const porta = srv.slice(srv.indexOf('def _lia_sa('), srv.indexOf('\ndef _modello_pronto'));
  assert.ok(/conta_via\(via\)/.test(porta), 'la via che ha risposto entra nel cruscotto');
  // ...e NON nel percorso del bot, che non deve toccarle la mente in nessun punto.
  // Non e' formale: se a contare fosse il bot, sarebbe lui a guardare dentro di lei.
  const bot = srv.slice(srv.indexOf('def _bot(self):'), srv.indexOf('def _insegna'));
  assert.ok(!/\bmente\b/.test(bot), 'nel corpo di _bot non compare la sua mente');
});

test('e il bot lo impara: lei insegna, lui non la tocca', () => {
  const srv = leggi('brain/server.py');
  assert.ok(/"insegna":\s*\{/.test(srv), 'la risposta torna con cio\' che ha insegnato');
  const py = leggi('src/ai/brainpy.js');
  assert.ok(/ultimaInsegna/.test(py), 'il ponte lo porta di la\'');
  const brain = leggi('src/ai/brain.js');
  assert.ok(/ultimaInsegna\?\.\(\)/.test(brain) && /fonte: 'lia'/.test(brain),
    'e finisce nel quaderno del bot, segnato come suo');
});
