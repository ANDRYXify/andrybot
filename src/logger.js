// Logger minimale con timestamp e livelli, senza dipendenze.
const ts = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

function line(level, tag, args) {
  const head = `[${ts()}] ${level.padEnd(5)} ${tag ? '[' + tag + '] ' : ''}`;
  if (level === 'ERROR') console.error(head, ...args);
  else console.log(head, ...args);
}

export function makeLog(tag = '') {
  return {
    info: (...a) => line('INFO', tag, a),
    warn: (...a) => line('WARN', tag, a),
    error: (...a) => line('ERROR', tag, a),
    debug: (...a) => { if (process.env.DEBUG) line('DEBUG', tag, a); },
  };
}

export const log = makeLog();
