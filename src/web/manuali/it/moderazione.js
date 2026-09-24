// Manuale: Manuale della moderazione: antispam e scudo anti-bot. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.

export default {
  slug: 'moderazione',
  schede: ['regole', 'scudo', 'registro'],
  titolo: 'Manuale della moderazione: antispam e scudo anti-bot | SocialBot',
  h1: 'Manuale della moderazione: antispam e scudo anti-bot',
  desc: 'Cosa filtra il bot in chat, con quali soglie vere, come cresce il timeout ai recidivi, e come lo scudo para follow-bot e hate-raid senza colpire le persone.',
  aggiornata: '2026-09-04',
  corpo: [
    { p: [
      'Tre mestieri diversi, tre schede. <em>Chat</em> tiene pulita la chat di tutti i giorni: spam, link, muri di maiuscole, flood. <em>Scudo</em> serve nei dieci minuti in cui il canale è sotto attacco: follow-bot e hate-raid. <em>Registro</em> racconta cosa è successo, e da lì si ripulisce.',
      'La regola che attraversa tutte e due: <strong>in dubbio si avvisa, non si banna</strong>. Un falso positivo qui vuol dire cacciare una persona vera, e costa più dell\'attacco.',
    ] },

    { h2: 'Chi non viene mai toccato' },
    { p: ['Prima di ogni controllo ci sono le esenzioni, e non si possono togliere: <strong>tu, i moderatori e i VIP</strong> non vengono mai filtrati. I VIP sono esenti da tutto <em>per scelta</em>: quel badge lo dai tu a chi ti fidi.'] },

    { h2: 'L\'antispam: cosa guarda' },
    { p: ['Sta in <em>Moderazione</em>, e si accende con un interruttore solo. Poi si sceglie cosa filtrare, voce per voce. Le soglie sono queste, e sono quelle vere del motore.'] },
    { tabella: [
      ['Filtro', 'Di base', 'Quando scatta'],
      ['Link', 'acceso', 'Chi è sotto il livello che scegli scrive un indirizzo non in lista bianca.'],
      ['Ripetizioni', 'acceso', 'Lo stesso messaggio ripetuto entro 40 secondi.'],
      ['Maiuscole', 'acceso', 'Almeno 12 lettere e l\'80% in maiuscolo. Le frasi corte passano.'],
      ['Menzioni', 'acceso', 'Quattro <code>@nome</code> o più nello stesso messaggio.'],
      ['Flood', 'acceso', 'Sei messaggi o più in otto secondi.'],
      ['Simboli', 'spento', 'ASCII-art, «zalgo», muri di caratteri strani.'],
      ['Messaggio lungo', 'spento', 'Oltre 350 caratteri (regolabile da 50 a 500).'],
      ['Emoji', 'spento', 'Più di 8 emoji (regolabile da 1 a 50).'],
    ] },
    { h3: 'I link e la lista bianca' },
    { p: [
      'Il livello di base è <strong>sub</strong>: abbonati, VIP e mod possono mettere link, gli altri no. Si può alzare a solo-mod o abbassare a tutti.',
      'La <strong>lista bianca</strong> tiene fino a 30 domini che passano sempre, per chiunque. È il posto giusto per il tuo Discord, il tuo sito e i social del canale: senza, il primo che condivide il tuo Discord si prende una cancellazione.',
      'Il confronto è sul <strong>dominio del link</strong>, non sul testo del messaggio. Un dominio in lista vale anche per i suoi sottodomini, e non vale per un indirizzo che se lo porta dentro al nome. Se in un messaggio ci sono più link, valgono uno per uno: uno permesso non fa passare gli altri.',
      'Un indirizzo senza <code>http://</code> e senza <code>www.</code> viene visto come link se ha un percorso (<code>sito.it/pagina</code>) o se finisce in un dominio non ambiguo. Serve a non cancellare i messaggi normali: in chat si scrive «lascia stare.io ci provo», e quello non è un indirizzo.',
    ] },
    { h3: 'Il timeout cresce da solo' },
    { p: ['Il primo messaggio filtrato viene solo <strong>cancellato</strong>, senza timeout: la maggior parte delle volte è distrazione, non malafede. Se la persona insiste, la scala sale.'] },
    { tabella: [
      ['Volta', '1ª', '2ª', '3ª', '4ª e oltre'],
      ['Cosa succede', 'solo cancellato', 'solo cancellato', 'timeout 60s', 'timeout 5 min, poi 10 min'],
    ] },
    { p: ['Il contatore <strong>si azzera dopo 10 minuti puliti</strong>: chi ha sbagliato ieri riparte da capo oggi. Il timeout crescente si può spegnere: allora il bot cancella e basta, per sempre.'] },

    { h2: 'Lo scudo anti-bot' },
    { p: ['Sta in <em>Scudo</em>, ed è spento finché non lo accendi (serve il permesso di moderazione di Twitch). Sono cinque difese, messe in ordine di quanto poco rischiano di colpire una persona vera.'] },
    { p: ['Se non ti fidi ancora, accendi la <strong>sola osservazione</strong>: lo scudo lavora normalmente e scrive nel registro cosa avrebbe fatto, senza bannare, bloccare o cancellare niente, e senza cambiare le modalità della chat. È il modo di vederlo all\'opera sul tuo canale prima di lasciarlo agire.'] },

    { h3: '1. La raffica di follow' },
    { p: ['Un attacco follow-bot sono tanti follow in pochi secondi: non serve guardarli uno per uno, basta contarli. Di base <strong>10 follow in 30 secondi</strong> fanno scattare l\'allarme (da 3 a 100 follow, da 5 a 300 secondi).'] },
    { p: ['Quando scatta, lo scudo alza il suo livello e tu vieni avvisato. La chat va <strong>ai soli follower</strong> solo se il livello arriva ad «attacco», cioè quando l\'ondata sembra fatta da una macchina. <strong>Non banna</strong>: un picco di follow può arrivare anche da una clip virale, e bannare cento persone vere sarebbe peggio dell\'attacco. Bannare l\'ondata si può accendere, ma è una scelta tua e sta scritta come tale.'] },

    { h3: '2. I nomi da bot' },
    { p: ['Una lista di account-bot noti e di forme tipiche dei nomi da follow-bot promozionale, aggiornata da sola. Chi corrisponde viene bannato (o messo in timeout, o solo segnalato: lo scegli tu — se scegli il timeout, di base dura 14 giorni).'] },
    { p: ['I <strong>bot buoni sono sempre esenti</strong> — Nightbot, StreamElements, Streamlabs, Moobot, Fossabot, Sery_Bot, Sound Alerts e una ventina d\'altri — e puoi aggiungere fino a 200 nomi tuoi da esentare, più altrettanti da considerare bot.'] },
    { p: ['Sui follow-bot certi, di base, si usa il <strong>blocco</strong> invece del ban: il blocco toglie anche il follow, quindi il numero sporco non ti resta appeso al canale.'] },

    { h3: '3. L\'account sospetto' },
    { p: ['Spento di base perché costa una domanda a Twitch per ogni follower. Se acceso, dà un punteggio da 0 a 100 guardando l\'età dell\'account (sotto 3 giorni è sospetto), la foto profilo di default, la bio vuota e la forma del nome. Si agisce sopra <strong>70</strong>.'] },

    { h3: '4. Gli account appena creati che scrivono' },
    { p: ['Twitch ha una modalità «Restricted» che nasconde i messaggi dei sospetti a tutti tranne i mod, ma <strong>non ha un\'API</strong>: nessun bot può accenderla. Questa è l\'equivalente più vicino che si può fare da fuori.'] },
    { p: ['Spento di base. Se acceso: chi ha l\'account da meno di <strong>24 ore</strong> (da 1 a 720) e non è sub, VIP o mod, si vede il messaggio <strong>trattenuto</strong>, oppure solo segnalato ai mod se preferisci lasciarlo passare. Il follow non basta: è un clic, e i follow-bot lo fanno.'] },
    { p: ['L\'avviso in chat si dice <strong>una volta per persona</strong>, non a ogni messaggio, e dice ai mod come farla scrivere: <code>!permetti nome</code>. Da lì quella persona scrive sempre, e la ritrovi fra gli esenti. Un messaggio con i <strong>Bit</strong> non si trattiene mai: è pagato.'] },

    { h3: '5. I sei livelli' },
    { p: ['Lo scudo ha sei livelli — <strong>calma</strong>, <strong>osservo</strong>, <strong>allerta</strong>, <strong>difesa</strong>, <strong>attacco</strong>, <strong>serrata</strong> — e di base si alza e si riabbassa da solo, accendendo anche lo Shield Mode di Twitch quando serve. Non devi essere davanti al computer perché funzioni: è il punto.'] },
    { p: ['Si sale in fretta e si scende <strong>un gradino per volta</strong>, riaprendo subito quello che non serve più. Con «quanto presto reagire» scegli il passo: <strong>prudente</strong>, <strong>bilanciata</strong> o <strong>aggressiva</strong>. Un picco di gente vera alza l\'attenzione, non la serranda.'] },
    { p: ['Dentro l\'assetto ci sono due cose in più. Il <strong>coro</strong>: lo stesso messaggio da <strong>4 bocche diverse</strong> (da 3 a 20) in pochi secondi non è una coincidenza, è un raid coordinato. E il <strong>blocco sul nascere</strong>: quando l\'ondata è chiaramente artificiale si agisce in blocco invece che uno alla volta, perché uno alla volta si arriva tardi.'] },

    { h2: 'Il registro: cosa è successo' },
    { p: ['La terza scheda non ha impostazioni: racconta. In cima i numeri di oggi e degli ultimi sette giorni, e quanto è rimasto da decidere.'] },
    { p: ['<strong>Da rivedere</strong> sono i casi in cui lo scudo ha avvisato senza agire: guardi e decidi tu, uno per uno, e la decisione finisce nelle tue liste.'] },
    { p: ['<strong>Gli attacchi</strong> sono una scheda per volta, non trecento righe di registro: quando è cominciato, quanto è durato, e chi c\'era diviso per giudizio — certo, probabile, sospetto, legittimo. Da lì si <strong>ripulisce</strong>: si tolgono i follower giudicati bot, mentre chi è arrivato durante l\'attacco senza nessun segnale contro resta dov\'è e non compare nemmeno nell\'elenco. Per eseguire bisogna riscrivere il numero di account: se nel frattempo è cambiato, la conferma non vale più.'] },
    { p: ['<strong>Rimaste in sospeso</strong> sono le azioni che non sono riuscite, quasi sempre perché Twitch non ha risposto. Non si perdono: si riprendono da lì.'] },
    { p: ['<strong>Pulizia follower</strong> passa in rassegna chi ti segue già e ti dice chi puzza di bot. Non banna nulla da sola.'] },

    { h2: 'Come tararlo, in pratica' },
    { ul: [
      '<strong>Canale piccolo.</strong> Antispam acceso con i filtri di base, link ai sub, lista bianca col tuo Discord. Scudo acceso con la sola raffica: 10 in 30 secondi è già giusto.',
      '<strong>Canale che cresce in fretta.</strong> Alza la raffica (20 in 30 secondi) o ti avvisa a ogni clip che gira.',
      '<strong>Sotto attacco adesso.</strong> Accendi «banna l\'ondata» e gli account appena creati. Sono le due impostazioni aggressive: si accendono per il tempo dell\'attacco e si rispengono dopo.',
      '<strong>Chat rumorosa ma amichevole.</strong> Spegni maiuscole ed emoji e lascia solo flood, ripetizioni e link: filtrare l\'entusiasmo è il modo più veloce per far sembrare ostile un canale.',
    ] },

    { h2: 'Quando sembra rotto' },
    { ul: [
      '<strong>Non modera nessuno.</strong> Controlla che l\'interruttore dell\'antispam sia acceso — è quello in cima alla carta, e quando è spento tutto il resto della carta si smorza — e che chi scrive non sia mod o VIP: quelli sono esenti sempre.',
      '<strong>Cancella cose che non dovrebbe.</strong> Guarda quale filtro: il motivo lo scrive in chat se «avvisa» è acceso. Le maiuscole scattano all\'80%, quindi «AHAHAH SIIIII» conta.',
      '<strong>Il tuo Discord viene cancellato.</strong> Mettilo in lista bianca: senza, è un link come un altro.',
      '<strong>Lo scudo non parte.</strong> Serve il permesso di moderazione di Twitch: se manca, si riautorizza dalla scheda Stato.',
      '<strong>Avvisa troppo.</strong> Non è un guasto: è la raffica tarata bassa per il tuo ritmo di crescita. Alza «quanti follow».',
    ] },
  ],
  faq: [
    { d: 'Il bot può bannare una persona vera per sbaglio?', r: 'È il rischio che tutta questa parte è costruita per evitare. Le difese sono ordinate dalla più sicura alla più aggressiva, quelle aggressive sono spente di base, e in dubbio il bot avvisa invece di agire. Le esenzioni (tu, mod, VIP, bot buoni) non si possono aggirare.' },
    { d: 'Serve dare la moderazione al bot?', r: 'No, non come si fa con gli altri bot. SocialBot agisce con i permessi che gli hai dato tu su Twitch, revocabili in qualsiasi momento: non c\'è un account estraneo da promuovere moderatore.' },
    { d: 'Lo scudo funziona se non sono davanti al PC?', r: 'Sì, ed è il motivo per cui l\'assetto automatico è acceso di base: si alza da solo durante l\'attacco e si riabbassa quando è finito.' },
    { d: 'Posso far moderare solo durante la diretta?', r: 'L\'antispam lavora sempre, perché una chat sporca a canale spento resta sporca. Se non lo vuoi, si spegne.' },
    { d: 'Che differenza c\'è fra ban e blocco?', r: 'Il ban impedisce di scrivere; il blocco toglie anche il follow. Sui follow-bot certi il bot usa il blocco, così il conteggio dei follower torna pulito.' },
  ],
};
