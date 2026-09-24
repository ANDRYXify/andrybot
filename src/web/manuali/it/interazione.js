// Manuale: Manuale di sondaggi, sorteggi e penitenze. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'interazione',
  schede: ['sondaggi', 'giveaway', 'penitenze'],
  titolo: 'Manuale di sondaggi, sorteggi e penitenze | SocialBot',
  h1: 'Manuale di sondaggi, sorteggi e penitenze',
  desc: 'Le tre cose che si fanno mentre sei in diretta: chiedere alla chat, sorteggiare un premio con probabilità che decidi tu, e le penitenze a punti canale che si contano da sole.',
  aggiornata: '2026-09-04',
  corpo: [
    { p: [
      'Tre schede che servono <strong>mentre trasmetti</strong>, non prima. Si comandano quasi tutte dalla chat, perché mentre giochi non stai guardando il pannello.',
      'Hanno un tratto in comune: il bot fa la parte noiosa — contare, pesare, estrarre, ascoltare — e tu fai lo spettacolo.',
    ] },

    { h2: 'Sondaggi e predizioni' },
    { p: ['Sono i sondaggi e le predizioni <strong>veri di Twitch</strong>, quelli che compaiono sopra il player, aperti dalla chat senza toccare il pannello. Li può usare chi modera, oltre a te.'] },
    { tabella: [
      ['Comando', 'Chi', 'Cosa fa'],
      ['<code>!sondaggio Domanda | opzione | opzione</code>', 'mod e streamer', 'Apre un sondaggio. Due opzioni o più, separate da <code>|</code>.'],
      ['<code>!sondaggio chiudi</code>', 'mod e streamer', 'Chiude quello aperto.'],
      ['<code>!predizione Titolo | esito | esito</code>', 'mod e streamer', 'Apre una predizione: il pubblico punta i punti canale.'],
      ['<code>!predizione vince &lt;esito&gt;</code>', 'mod e streamer', 'Risolve. Si può indicare l\'esito per nome o per numero.'],
      ['<code>!predizione annulla</code>', 'mod e streamer', 'Annulla e <strong>rimborsa</strong> i punti a tutti.'],
    ] },
    { p: ['Durano <strong>2 minuti</strong> di base. <code>!poll</code>, <code>!prediction</code> e <code>!pronostico</code> funzionano come alias.'] },
    { p: ['Una predizione va sempre chiusa: se la lasci aperta i punti restano bloccati e il pubblico se ne accorge. Se l\'esito non è più decidibile, <code>annulla</code> è la mossa giusta — rimborsa tutti e nessuno si arrabbia.'] },

    { h2: 'Sorteggi' },
    { p: ['Uno per canale alla volta, e vive nella diretta: non sopravvive a un riavvio, di proposito. Si comanda dalla chat o dal pannello, indifferentemente.'] },
    { tabella: [
      ['Comando', 'Chi', 'Cosa fa'],
      ['<code>!giveaway &lt;premio&gt;</code>', 'mod e streamer', 'Apre il sorteggio e annuncia il premio.'],
      ['<code>!join</code>', 'tutti', 'Entra. La parola si può cambiare (fino a 20 caratteri).'],
      ['<code>!biglietti @nome N</code>', 'mod e streamer', 'Regala biglietti in più a una persona.'],
      ['<code>!estrai</code>', 'mod e streamer', 'Estrae un vincitore. <code>!estrai 3</code> ne estrae tre, senza ripescare.'],
    ] },
    { h3: 'Le probabilità le decidi tu' },
    { p: ['Ogni partecipante ha dei <strong>biglietti</strong>, e l\'estrazione è pesata: più biglietti, più probabilità — ma <strong>nessuno vince di sicuro</strong>. È la differenza fra premiare chi ti sostiene e regalare il premio al sub più veloce.'] },
    { tabella: [
      ['Chi', 'Biglietti di base', 'Limiti'],
      ['Tutti', '1', '—'],
      ['Abbonati', '2', 'da 1 a 20'],
      ['VIP', '2', 'da 1 a 20'],
      ['Moderatori', '1', 'da 1 a 20'],
      ['Bonus a mano', '—', 'con <code>!biglietti</code>, quanti vuoi'],
    ] },
    { p: ['I moderatori partono da 1 di proposito: di solito gestiscono il sorteggio, non ci partecipano. Si può alzare, se nel tuo canale è normale che giochino anche loro.'] },
    { p: ['Si può anche aprirlo <strong>solo per abbonati</strong>. In quel caso non è più un sorteggio pesato: è un sorteggio chiuso, e conviene dirlo in chat prima che qualcuno provi a entrare.'] },

    { h2: 'Penitenze a punti canale' },
    { p: [
      'Uno spettatore riscatta un premio a punti canale e sceglie una parola. Da quel momento, per il tempo che dura, il bot <strong>ti ascolta</strong> e conta.',
      'Ci sono due modi. <strong>Vieta</strong>: quella parola non la devi dire, e ogni volta che ti scappa è +1. <strong>Solo</strong>: puoi dire <em>solo</em> quella parola, e ogni frase in cui ne dici un\'altra è +1.',
    ] },
    { p: ['Durante il tempo, nell\'overlay compaiono i <strong>«+1» rossi</strong>. Alla fine, se il contatore è sopra zero, parte <strong>una</strong> penitenza — presa dalla tua lista o scelta dal bot — «moltiplicata» per quante volte ci sei cascato. Una penitenza sola, non venti: venti sarebbe una serata rovinata, una è un gioco.'] },
    { tabella: [
      ['Cosa', 'Di base', 'Limiti'],
      ['Durata', '2 minuti', 'da 1 a 15'],
      ['Su cosa', 'una parola', 'una parola o una lettera'],
      ['Modo', 'vieta', 'vieta · solo'],
    ] },
    { h3: 'Perché non sbaglia (quasi mai)' },
    { p: ['Il riconoscimento vocale sente male: è normale. La corrispondenza è quindi <strong>tollerante</strong> — una parola capita a metà ma sostanzialmente giusta conta, una parola diversa che ci somiglia per caso no. Senza questa tolleranza il gioco si romperebbe al primo rumore di sottofondo.'] },
    { p: ['Serve il microfono, quindi vale quello che vale per i comandi a voce: l\'audio resta sul tuo computer, il bot riceve solo la parola riconosciuta.'] },

    { h2: 'Quando qualcosa non parte' },
    { ul: [
      '<strong>Il sondaggio non si apre.</strong> Servono i permessi di Twitch per sondaggi e predizioni: si riautorizza dalla scheda Stato. E servono almeno due opzioni separate da <code>|</code>.',
      '<strong>Nessuno entra nel sorteggio.</strong> Controlla la parola d\'ingresso: se l\'hai cambiata, in chat va scritta quella, non <code>!join</code>.',
      '<strong>Ho estratto e ha vinto sempre lo stesso.</strong> Guarda i biglietti: con i moltiplicatori alti un gruppo piccolo di sub domina. Portali a 1 e diventa un sorteggio piatto.',
      '<strong>La penitenza non conta.</strong> Il microfono deve essere concesso al browser e la scheda dei comandi a voce deve stare aperta: è lì che gira l\'ascolto.',
      '<strong>Conta parole che non ho detto.</strong> Le lettere sono più fragili delle parole: con una lettera sola il riconoscimento sbaglia spesso. Per le penitenze lunghe conviene una parola intera.',
    ] },
  ],
  faq: [
    { d: 'I sondaggi sono quelli di Twitch o una cosa vostra?', r: 'Quelli di Twitch, veri: compaiono sopra il player come se li avessi aperti tu dalla dashboard. Il bot li apre e li chiude al posto tuo, dalla chat.' },
    { d: 'Il sorteggio resta se si riavvia qualcosa?', r: 'No, e non è un difetto: un sorteggio appartiene alla diretta in cui lo hai aperto. Se serve una raccolta che dura giorni, si fa con un comando e un contatore.' },
    { d: 'Posso estrarre più vincitori insieme?', r: 'Sì, con !estrai 3. Non ripesca: tre persone diverse.' },
    { d: 'Le penitenze funzionano senza punti canale?', r: 'Il modo previsto è il premio a punti canale, perché è quello che dà la spinta al pubblico. La prova dal pannello serve a vedere come appare in overlay.' },
    { d: 'Il bot mi ascolta sempre?', r: 'No. Ascolta solo mentre una penitenza è in corso o mentre usi i comandi a voce, e l\'audio non esce dal tuo computer: viene trasformato in testo lì e arriva solo la parola.' },
  ],
};
