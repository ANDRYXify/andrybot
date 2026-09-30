// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// Installa i ganci di git del repository (.githooks/) puntandoci core.hooksPath.
// Idempotente: rilanciarlo non fa danni. Si disinstalla con
//   git config --unset core.hooksPath
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('.githooks/pre-push')) {
  console.error('non trovo .githooks/pre-push: sei nella cartella del progetto?');
  process.exit(1);
}
try {
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
  console.log('Ganci installati: da adesso `git push` esegue prima le prove e i cancelli.');
  console.log('Per toglierli: git config --unset core.hooksPath');
} catch (e) {
  console.error('non riesco a impostare i ganci:', e?.message || e);
  process.exit(1);
}
