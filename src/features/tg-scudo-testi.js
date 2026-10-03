// © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live
// Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live
// LE PAROLE DELLO SCUDO, nelle tre lingue: il messaggio in privato, la pagina
// di verifica, gli esiti.
//
// Le dice lo scudo a chi chiede di entrare, non lo streamer: per questo stanno
// qui. La lingua e' quella di Telegram di chi chiede (language_code), e se non
// e' una delle tre quella del canale. Nessuna frase presume chi legge: niente
// «benvenuto» o «sei passato», che dicono di qualcuno se e' maschio o femmina.
import { LINGUE } from './tg-scudo.js';

const T = {
  it: {
    privato: ({ nome, gruppo, minuti }) => `Ciao ${nome}, hai chiesto di entrare in «${gruppo}». Prima una prova veloce: premi qui sotto. Hai ${minuti} minuti.`,
    tasto: 'Fai la prova',
    titolo: 'Prima di entrare',
    sotto: (g) => (g ? `Una prova veloce per entrare in «${g}».` : 'Una prova veloce per entrare nel gruppo.'),
    tempo: (m) => (m === 1 ? 'Hai ancora un minuto.' : `Hai ancora ${m} minuti.`),
    prova: 'Leggi il codice che si muove',
    provaAiuto: 'Le lettere si vedono solo mentre i puntini si muovono: guarda il riquadro un paio di secondi, poi scrivi quello che leggi.',
    provaVoce: 'Una prova in movimento: le lettere si vedono solo mentre i puntini si muovono.',
    movimento: 'Hai chiesto di vedere meno movimento: questa prova però si vede solo in movimento. Se ti dà fastidio, premi «Non riesco a vederla».',
    codice: 'Il codice',
    altra: (n) => (n === 1 ? 'Un’altra prova (ne resta una)' : `Un’altra prova (ne restano ${n})`),
    nonRiesco: 'Non riesco a vederla',
    nonRiescoAiuto: 'La tua richiesta passa agli amministratori del gruppo, e decidono loro.',
    regole: 'Le regole del gruppo',
    accetto: 'Ho letto le regole e le rispetto',
    accettoParti: ['Ho letto ', 'le regole del gruppo', ' e le rispetto'],
    domande: 'Qualche domanda',
    entra: 'Entra nel gruppo',
    attendi: 'Un momento…',
    carico: 'Preparo la prova…',
    errori: {
      vuoto: 'Scrivi il codice che leggi.',
      regole: 'Per entrare devi accettare le regole.',
      risposte: 'Rispondi a tutte le domande.',
      riprova: (n) => `Non è il codice giusto. ${n === 1 ? 'Ti resta un tentativo' : `Ti restano ${n} tentativi`} su questa prova.`,
      nuova: 'Tentativi finiti su questa prova: eccone un’altra.',
      cambiato: 'Le domande sono appena cambiate: eccole aggiornate.',
      rete: 'Non riesco a parlare con il server: riprova fra poco.',
      disegno: 'La prova non si può mostrare adesso. Premi «Non riesco a vederla»: decidono gli amministratori.',
    },
    esiti: {
      dentro: ['Ci sei', 'Fatto: adesso puoi tornare a Telegram e scrivere nel gruppo.'],
      no: ['Richiesta rifiutata', 'La prova non è andata. Puoi chiedere di nuovo di entrare fra mezz’ora.'],
      admin: ['Decidono gli amministratori', 'La tua richiesta è nelle mani degli amministratori del gruppo: ti arriverà la loro risposta.'],
      scaduta: ['Tempo scaduto', 'La prova è scaduta. Puoi chiedere di nuovo di entrare.'],
      chiusa: ['Niente da fare qui', 'Non c’è una richiesta di ingresso aperta per te. Per entrare, chiedi di nuovo dal link del gruppo.'],
      errore: ['Non è andata', 'Hai superato la prova, ma Telegram non mi ha lasciato farti entrare. Chiedi di nuovo l’ingresso: questa volta dovrebbe andare.'],
      fuori: ['Si apre dentro Telegram', 'È la prova per entrare in un gruppo Telegram: si apre da sola quando chiedi di entrare.'],
    },
    chiudi: 'Torna a Telegram',
    anteprima: 'Anteprima: è la pagina che vede chi chiede di entrare. Da qui non arriva niente a Telegram.',
    // la prova sulla porta, nel browser: l'esito e' un link da aprire
    porta: {
      apri: 'Apri Telegram',
      chiedi: 'Chiedi di entrare',
      rifai: 'Rifai la prova',
      riprova: 'Riprova',
      chiudiProva: 'Chiudi la prova',
      pronto: ['Prova superata', 'Apri Telegram ed entra nel gruppo: il link è tuo, vale per una persona e per mezz’ora.'],
      senzaLink: ['Prova superata', 'Telegram non mi ha ancora dato il link per farti entrare: riprova fra un momento.'],
      no: ['Non è andata', 'La prova non è andata. Puoi rifarla da capo.'],
      admin: ['Decidono gli amministratori', 'Apri Telegram e chiedi di entrare da qui: la richiesta arriva agli amministratori del gruppo, e decidono loro.'],
      scaduta: ['Tempo scaduto', 'La prova è scaduta. Puoi rifarla da capo.'],
      usata: ['Link già usato', 'Il link di questa prova è già stato usato. Se non sei nel gruppo, rifai la prova.'],
      chiusa: ['Questa prova non c’è più', 'Puoi rifarla da capo.'],
      troppe: ['Troppe prove da qui', 'Da questa connessione sono partite troppe prove in poco tempo: riprova fra un po’.'],
      anteprimaSpento: 'Lo scudo è spento: «Entra» porta dritto nel gruppo. La prova compare quando lo accendi.',
      vediLoStesso: 'Mostra la prova lo stesso',
      anteprimaLink: 'Anteprima: il link vero lo dà Telegram a chi supera la prova.',
      demo: 'Nella demo la prova non si apre: serve un bot Telegram collegato. Col tuo canale, qui la fai davvero. Gli esiti li guardi coi tasti del pezzo.',
    },
  },
  en: {
    privato: ({ nome, gruppo, minuti }) => `Hi ${nome}, you asked to join «${gruppo}». First a quick check: tap below. You have ${minuti} minutes.`,
    tasto: 'Take the check',
    titolo: 'Before you join',
    sotto: (g) => (g ? `A quick check to join «${g}».` : 'A quick check to join the group.'),
    tempo: (m) => (m === 1 ? 'You have one minute left.' : `You have ${m} minutes left.`),
    prova: 'Read the moving code',
    provaAiuto: 'The letters only show while the dots move: watch the box for a couple of seconds, then type what you read.',
    provaVoce: 'A moving check: the letters only show while the dots move.',
    movimento: 'You asked to see less motion, but this check only shows in motion. If it bothers you, tap «I can’t see it».',
    codice: 'The code',
    altra: (n) => (n === 1 ? 'Another check (one left)' : `Another check (${n} left)`),
    nonRiesco: 'I can’t see it',
    nonRiescoAiuto: 'Your request goes to the group admins, and they decide.',
    regole: 'The group rules',
    accetto: 'I have read the rules and I follow them',
    accettoParti: ['I have read ', 'the group rules', ' and I follow them'],
    domande: 'A few questions',
    entra: 'Join the group',
    attendi: 'One moment…',
    carico: 'Getting the check ready…',
    errori: {
      vuoto: 'Type the code you read.',
      regole: 'To join, you need to accept the rules.',
      risposte: 'Answer all the questions.',
      riprova: (n) => `That is not the right code. ${n === 1 ? 'You have one try left' : `You have ${n} tries left`} on this check.`,
      nuova: 'No tries left on this check: here is another one.',
      cambiato: 'The questions just changed: here they are, updated.',
      rete: 'I can’t reach the server: try again shortly.',
      disegno: 'The check can’t be shown right now. Tap «I can’t see it»: the admins decide.',
    },
    esiti: {
      dentro: ['You are in', 'Done: you can go back to Telegram and write in the group.'],
      no: ['Request declined', 'The check did not work out. You can ask to join again in half an hour.'],
      admin: ['The admins decide', 'Your request is in the hands of the group admins: you will get their answer.'],
      scaduta: ['Time is up', 'The check expired. You can ask to join again.'],
      chiusa: ['Nothing to do here', 'There is no open join request for you. To join, ask again from the group link.'],
      errore: ['It did not work', 'You passed the check, but Telegram did not let me add you. Ask to join again: this time it should work.'],
      fuori: ['It opens inside Telegram', 'This is the check to join a Telegram group: it opens by itself when you ask to join.'],
    },
    chiudi: 'Back to Telegram',
    anteprima: 'Preview: this is the page people see when they ask to join. Nothing reaches Telegram from here.',
    porta: {
      apri: 'Open Telegram',
      chiedi: 'Ask to join',
      rifai: 'Take the check again',
      riprova: 'Try again',
      chiudiProva: 'Close the check',
      pronto: ['Check passed', 'Open Telegram and join the group: the link is yours, it works for one person for half an hour.'],
      senzaLink: ['Check passed', 'Telegram has not given me the link to add you yet: try again in a moment.'],
      no: ['It did not work out', 'The check did not work out. You can take it again from the start.'],
      admin: ['The admins decide', 'Open Telegram and ask to join from here: the request goes to the group admins, and they decide.'],
      scaduta: ['Time is up', 'The check expired. You can take it again from the start.'],
      usata: ['Link already used', 'The link from this check has already been used. If you are not in the group, take the check again.'],
      chiusa: ['This check is gone', 'You can take it again from the start.'],
      troppe: ['Too many checks from here', 'Too many checks started from this connection in a short time: try again in a while.'],
      anteprimaSpento: 'The shield is off: «Join» leads straight into the group. The check shows up when you turn it on.',
      vediLoStesso: 'Show the check anyway',
      anteprimaLink: 'Preview: Telegram gives the real link to whoever passes the check.',
      demo: 'In the demo the check does not open: it needs a connected Telegram bot. With your channel, you take it here for real. You can look at the outcomes with the piece’s buttons.',
    },
  },
  es: {
    privato: ({ nome, gruppo, minuti }) => `Hola, ${nome}: has pedido entrar en «${gruppo}». Antes, una prueba rápida: pulsa abajo. Tienes ${minuti} minutos.`,
    tasto: 'Hacer la prueba',
    titolo: 'Antes de entrar',
    sotto: (g) => (g ? `Una prueba rápida para entrar en «${g}».` : 'Una prueba rápida para entrar en el grupo.'),
    tempo: (m) => (m === 1 ? 'Te queda un minuto.' : `Te quedan ${m} minutos.`),
    prova: 'Lee el código que se mueve',
    provaAiuto: 'Las letras solo se ven mientras los puntos se mueven: mira el recuadro un par de segundos y escribe lo que lees.',
    provaVoce: 'Una prueba en movimiento: las letras solo se ven mientras los puntos se mueven.',
    movimento: 'Has pedido ver menos movimiento, pero esta prueba solo se ve en movimiento. Si te molesta, pulsa «No consigo verla».',
    codice: 'El código',
    altra: (n) => (n === 1 ? 'Otra prueba (queda una)' : `Otra prueba (quedan ${n})`),
    nonRiesco: 'No consigo verla',
    nonRiescoAiuto: 'Tu solicitud pasa a los administradores del grupo, y deciden ellos.',
    regole: 'Las normas del grupo',
    accetto: 'He leído las normas y las respeto',
    accettoParti: ['He leído ', 'las normas del grupo', ' y las respeto'],
    domande: 'Unas preguntas',
    entra: 'Entrar en el grupo',
    attendi: 'Un momento…',
    carico: 'Preparando la prueba…',
    errori: {
      vuoto: 'Escribe el código que lees.',
      regole: 'Para entrar tienes que aceptar las normas.',
      risposte: 'Responde a todas las preguntas.',
      riprova: (n) => `No es el código correcto. ${n === 1 ? 'Te queda un intento' : `Te quedan ${n} intentos`} en esta prueba.`,
      nuova: 'Se acabaron los intentos en esta prueba: aquí tienes otra.',
      cambiato: 'Las preguntas acaban de cambiar: aquí las tienes, actualizadas.',
      rete: 'No consigo hablar con el servidor: inténtalo de nuevo en un momento.',
      disegno: 'La prueba no se puede mostrar ahora. Pulsa «No consigo verla»: deciden los administradores.',
    },
    esiti: {
      dentro: ['Ya estás dentro', 'Hecho: puedes volver a Telegram y escribir en el grupo.'],
      no: ['Solicitud rechazada', 'La prueba no ha salido bien. Puedes volver a pedir entrar dentro de media hora.'],
      admin: ['Deciden los administradores', 'Tu solicitud está en manos de los administradores del grupo: te llegará su respuesta.'],
      scaduta: ['Se acabó el tiempo', 'La prueba ha caducado. Puedes volver a pedir entrar.'],
      chiusa: ['Nada que hacer aquí', 'No hay ninguna solicitud de entrada abierta para ti. Para entrar, pídelo de nuevo desde el enlace del grupo.'],
      errore: ['No ha salido bien', 'Has superado la prueba, pero Telegram no me ha dejado meterte. Pide entrar de nuevo: esta vez debería funcionar.'],
      fuori: ['Se abre dentro de Telegram', 'Es la prueba para entrar en un grupo de Telegram: se abre sola cuando pides entrar.'],
    },
    chiudi: 'Volver a Telegram',
    anteprima: 'Vista previa: es la página que ve quien pide entrar. Desde aquí no llega nada a Telegram.',
    porta: {
      apri: 'Abrir Telegram',
      chiedi: 'Pedir entrar',
      rifai: 'Repetir la prueba',
      riprova: 'Reintentar',
      chiudiProva: 'Cerrar la prueba',
      pronto: ['Prueba superada', 'Abre Telegram y entra en el grupo: el enlace es tuyo, vale para una persona y durante media hora.'],
      senzaLink: ['Prueba superada', 'Telegram todavía no me ha dado el enlace para meterte: inténtalo de nuevo en un momento.'],
      no: ['No ha salido bien', 'La prueba no ha salido bien. Puedes repetirla desde el principio.'],
      admin: ['Deciden los administradores', 'Abre Telegram y pide entrar desde aquí: la solicitud llega a los administradores del grupo, y deciden ellos.'],
      scaduta: ['Se acabó el tiempo', 'La prueba ha caducado. Puedes repetirla desde el principio.'],
      usata: ['Enlace ya usado', 'El enlace de esta prueba ya se ha usado. Si no estás en el grupo, repite la prueba.'],
      chiusa: ['Esta prueba ya no está', 'Puedes repetirla desde el principio.'],
      troppe: ['Demasiadas pruebas desde aquí', 'Desde esta conexión han salido demasiadas pruebas en poco tiempo: inténtalo de nuevo dentro de un rato.'],
      anteprimaSpento: 'El escudo está apagado: «Entrar» lleva directo al grupo. La prueba aparece cuando lo enciendes.',
      vediLoStesso: 'Mostrar la prueba igualmente',
      anteprimaLink: 'Vista previa: el enlace de verdad lo da Telegram a quien supera la prueba.',
      demo: 'En la demo la prueba no se abre: hace falta un bot de Telegram conectado. Con tu canal, aquí la haces de verdad. Los resultados los ves con los botones de la pieza.',
    },
  },
};

export const testiScudo = (l) => T[LINGUE.includes(l) ? l : 'it'];

// Le parole fisse della pagina, gia' fatte: le funzioni non viaggiano in JSON.
// Quelle che dipendono da un numero (i tentativi che restano, le prove che
// restano) le scrive il server nella risposta a cui servono.
// Le parole della prova sulla porta: quelle fisse nella lingua della pagina,
// piu' quelle che lo streamer ha scritto nel pezzo del gruppo (`su`, gia'
// pulite da paginaTelegram). Una parola sua vale in tutte le lingue: e' sua.
export const CHIAVI_PROVA = ['titolo', 'aiuto', 'tasto', 'fattoTitolo', 'fattoTesto', 'apri', 'noTesto', 'adminTesto'];
export function testiPorta(l, { gruppo = '', su = {} } = {}) {
  const t = testiScudo(l);
  const base = testiPagina(l, { gruppo });
  const p = { ...t.porta };
  const s = su && typeof su === 'object' ? su : {};
  const tieni = (k) => (typeof s[k] === 'string' && s[k].trim() ? s[k].trim() : '');
  if (tieni('fattoTitolo') || tieni('fattoTesto')) p.pronto = [tieni('fattoTitolo') || p.pronto[0], tieni('fattoTesto') || p.pronto[1]];
  if (tieni('noTesto')) p.no = [p.no[0], tieni('noTesto')];
  if (tieni('adminTesto')) p.admin = [p.admin[0], tieni('adminTesto')];
  if (tieni('apri')) p.apri = tieni('apri');
  return {
    ...base,
    prova: tieni('titolo') || base.prova,
    provaAiuto: tieni('aiuto') || base.provaAiuto,
    entra: tieni('tasto') || base.entra,
    porta: p,
  };
}

export function testiPagina(l, { gruppo = '' } = {}) {
  const t = testiScudo(l);
  const { riprova, ...errori } = t.errori;
  return {
    titolo: t.titolo, sotto: t.sotto(gruppo),
    prova: t.prova, provaAiuto: t.provaAiuto, provaVoce: t.provaVoce, movimento: t.movimento,
    codice: t.codice, nonRiesco: t.nonRiesco, nonRiescoAiuto: t.nonRiescoAiuto,
    regole: t.regole, accetto: t.accetto, accettoParti: t.accettoParti, domande: t.domande, entra: t.entra, attendi: t.attendi, carico: t.carico,
    errori, esiti: t.esiti, chiudi: t.chiudi,
  };
}
