// I manuali: cosa fa cosa, e come.
//
// Le guide servono a chi non ha ancora il bot; questi servono a chi ce l'ha e
// sta configurando. Sono materiale di consultazione: tabelle, numeri veri,
// nessuna presentazione. Vivono come contenuto pubblico — stessa forma delle
// guide, stesso guscio — perche' chi valuta il bot deve poter vedere PRIMA cosa
// sa fare davvero, e perche' una pagina che risponde a "come funziona !slot"
// vale piu' di dieci righe di vetrina.
//
// I numeri qui dentro non sono decorativi: sono quelli del motore. Se cambiano
// li', qui devono cambiare — e il cancello verifica-manuali.mjs controlla che
// non manchi niente di quello che il motore sa fare.
import { GUIDE, paginaDoc, paginaManuali } from './guide.js';

const OGGI = '2026-09-02';

const GIOCHI = {
  slug: 'giochi',
  schede: ['giochi'],
  titolo: 'Manuale dei giochi e delle monete | SocialBot',
  h1: 'Manuale dei giochi e delle monete',
  desc: 'Come si guadagnano le monete del canale, cosa fa ogni comando di gioco, quanto costa e quanto paga, e come inventarsi un gioco proprio.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'La chat ha una <strong>moneta</strong>: si guadagna guardando e scrivendo, si spende nei giochi. Il nome lo scegli tu (di base sono «monete»), e da <em>Giochi</em> nel pannello decidi quanto vale ogni cosa.',
      'Qui c\'è tutto: come entrano le monete, cosa fa ogni comando con i numeri veri, e come costruirti un gioco che non c\'è.',
    ] },

    { h2: 'Come si guadagnano le monete' },
    { p: ['Ci sono <strong>tre entrate</strong>, e si sommano.'] },
    { tabella: [
      ['Entrata', 'A chi', 'Quando', 'Di base'],
      ['Messaggio', 'a chi scrive', 'al massimo una volta al minuto', '2 monete'],
      ['Presenza', 'a chi è in chat, anche in silenzio', 'ogni giro (5 minuti)', '5 monete'],
      ['Partecipazione', 'in più, a chi ha scritto in quel giro', 'ogni giro (5 minuti)', '5 monete'],
    ] },
    { p: [
      'Presenza e partecipazione valgono <strong>solo mentre sei in diretta</strong> (si può togliere). Le monete per messaggio no: quelle arrivano anche a canale spento.',
      'Poi ci sono i <strong>moltiplicatori</strong>, letti dai distintivi dei messaggi — quindi senza una sola domanda in più a Twitch: <strong>abbonati ×1,5</strong> e <strong>VIP ×1,25</strong>. Con i valori di base: chi guarda e scrive prende 10 monete ogni cinque minuti (120 all\'ora), un abbonato 15 (180 all\'ora), un VIP 13.',
    ] },
    { h3: 'Chi guarda in silenzio' },
    { p: ['Chi resta in lurk continua a guadagnare, ma <strong>gradualmente meno</strong>: un gradino a ogni giro senza partecipare, fino a un minimo sotto il quale non si scende. Chi torna a scrivere <strong>risale subito a quota piena</strong>, senza recuperare niente.'] },
    { tabella: [
      ['Giri in silenzio', '0', '1', '2', '3', '4', '5 e oltre'],
      ['Monete', '5', '4', '4', '3', '2', '2'],
    ] },
    { p: ['Non scende a zero perché la presenza vale sempre qualcosa: è la differenza fra premiare chi c\'è e premiare chi tiene una macro che scrive in chat.'] },

    { h2: 'Tutto quello che puoi cambiare' },
    { p: ['Da <em>Giochi</em> nel pannello. Fra parentesi il minimo e il massimo che il server accetta.'] },
    { tabella: [
      ['Impostazione', 'Di base', 'Limiti', 'Cosa fa'],
      ['Nome della moneta', 'monete', '20 caratteri', 'Come la chiama il bot in chat.'],
      ['Per messaggio', '2', '0–1000', 'Monete a chi scrive. A 0 questa entrata si spegne.'],
      ['Ogni quanti secondi', '60', '5–3600', 'Ogni quanto può ripetersi quella sopra, per persona.'],
      ['Per presenza', '5', '0–10.000', 'Monete a giro a chi è in chat.'],
      ['Per partecipazione', '5', '0–10.000', 'In più, a chi ha scritto in quel giro.'],
      ['Moltiplicatore sub', '1,5', '1–10', 'Quanto vale un abbonato.'],
      ['Moltiplicatore VIP', '1,25', '1–10', 'Quanto vale un VIP.'],
      ['Passo del lurk', '0,15', '0–1', 'Quanto cala a ogni giro di silenzio.'],
      ['Minimo del lurk', '0,35', '0–1', 'Sotto questa quota non si scende.'],
      ['Solo in diretta', 'sì', '—', 'Se toglierlo, presenza e partecipazione valgono anche a canale spento.'],
      ['Premio quiz', '25', '0–100.000', 'Chi indovina una manche.'],
      ['Premio duello', '15', '0–100.000', 'Chi vince un duello.'],
      ['Costo slot', '10', '0–100.000', 'Quanto costa una giocata.'],
      ['Vincita slot', '200', '0–1.000.000', 'Il tris pieno (le altre vincite si scalano da qui).'],
      ['Coppia slot', '20', '0–100.000', 'Due simboli uguali.'],
      ['Quanti in classifica', '5', '3–10', 'Righe mostrate da !classifica.'],
    ] },

    { h2: 'I comandi pronti' },
    { p: ['Funzionano appena i giochi sono accesi, senza configurare niente. <code>!giochi</code> li elenca in chat.'] },
    { tabella: [
      ['Comando', 'Anche', 'Cosa fa', 'Attesa'],
      ['<code>!dado</code>', '<code>!roll</code>', 'Tira un dado. <code>!dado 2d20</code> per tirarne altri.', '3s a testa'],
      ['<code>!moneta</code>', '<code>!coin</code>', 'Testa o croce.', '3s a testa'],
      ['<code>!8ball</code>', '<code>!palla8</code>', 'Risponde a una domanda. Serve la domanda.', '3s a testa'],
      ['<code>!monete</code>', '<code>!punti</code> <code>!bilancio</code>', 'Quante ne hai.', '—'],
      ['<code>!classifica</code>', '<code>!top</code>', 'I primi del pubblico.', '—'],
      ['<code>!classifica mod</code>', '<code>!classificamod</code> <code>!classificastaff</code> <code>!topmod</code>', 'I primi dello staff.', '—'],
      ['<code>!slot</code>', '—', 'Macchinetta: paghi, giri, forse vinci.', '5s a testa'],
      ['<code>!duello @nome</code>', '<code>!duel</code>', 'Sfida chi è in chat. Vince uno dei due.', '15s di canale'],
      ['<code>!trivia</code>', '<code>!quiz</code>', 'Apre una domanda per tutti.', '15s di canale'],
      ['<code>!manche</code>', '<code>!gioca</code>', 'Apre una manche a caso fra i sei tipi.', '10s di canale'],
      ['<code>!pesca</code>', '<code>!fish</code>', 'Cala la canna. Può uscire di tutto.', '60s a testa'],
      ['<code>!roulette</code>', '<code>!rul</code>', 'Punti su rosso, nero, verde o un numero.', '5s a testa'],
      ['<code>!furto @nome</code>', '<code>!rapina</code>', 'Provi a rubare. Se ti beccano, paghi.', '45s a testa'],
      ['<code>!regala @nome 50</code>', '<code>!dona</code>', 'Passi monete a qualcun altro.', '—'],
    ] },

    { h3: 'Slot' },
    { p: ['Paghi il costo (10 di base) e girano tre simboli. Le vincite si scalano tutte dalla «vincita slot» (200 di base):'] },
    { tabella: [
      ['Esito', 'Vinci', 'Con i valori di base'],
      ['Tris di 💎', 'la vincita piena', '200'],
      ['Tris di 7️⃣', 'il 75%', '150'],
      ['Qualsiasi altro tris', 'il 40%', '80'],
      ['Due uguali', 'la coppia', '20'],
      ['Niente', '—', 'perdi il costo'],
    ] },
    { p: ['Se non hai abbastanza monete il bot te lo dice e non ti fa giocare.'] },

    { h3: 'Roulette' },
    { p: [
      'Si scrive <code>!roulette 50 rosso</code> oppure <code>!roulette 50 17</code>. Vanno bene anche <em>nero</em>, <em>verde</em> e i nomi inglesi.',
      'È una roulette europea: 37 caselle, lo zero è verde.',
    ] },
    { tabella: [
      ['Punti su', 'Se esce', 'Ti torna'],
      ['Un numero (0–36)', 'quel numero', '36 volte la puntata'],
      ['Rosso o nero', 'quel colore', '2 volte la puntata'],
      ['Verde', 'lo zero', '14 volte la puntata'],
    ] },

    { h3: 'Pesca' },
    { p: ['Una volta al minuto a testa. Non è a caso puro: ogni preda ha il suo peso, e più vale meno esce.'] },
    { tabella: [
      ['Preda', 'Monete', 'Quanto è probabile'],
      ['Un pesciolino', '15', 'molto comune'],
      ['Un granchio', '30', 'comune'],
      ['Una ciabatta o una lattina', '0', 'comune'],
      ['Un polpo', '60', 'raro'],
      ['Un pesce spada', '120', 'raro'],
      ['Uno stivale pieno di monete', '250', 'molto raro'],
      ['Uno scrigno del tesoro', '500', 'rarissimo'],
    ] },

    { h3: 'Duello' },
    { p: [
      'Si sfida <strong>solo chi è in chat</strong> — chi ha parlato negli ultimi trenta minuti. Serviva: prima si poteva sfidare un nome inventato, e le monete finivano su un profilo che non esisteva.',
      'Vince uno dei due a testa o croce, e il vincitore prende il premio duello (15 di base). Un duello alla volta per canale.',
    ] },

    { h3: 'Furto' },
    { p: [
      'Una prova ogni 45 secondi a testa, e solo su chi ha almeno 20 monete. Va a buon fine <strong>45 volte su 100</strong>: prendi fra 10 e 150 monete (mai più di quante ne ha la vittima).',
      'Se ti beccano paghi una multa fra 10 e 60 monete — <strong>alla vittima</strong>, non al nulla.',
    ] },

    { h2: 'Le manche automatiche' },
    { p: [
      'Una manche è una domanda aperta a tutta la chat: chi risponde per primo prende il premio quiz (25 di base). Si aprono da sole ogni tanto (da <em>Giochi</em> scegli ogni quanti minuti, da 1 a 360, e se solo in diretta) oppure a mano con <code>!manche</code>.',
      'I tipi sono sei, e il bot ne pesca uno che riesca a costruire:',
    ] },
    { tabella: [
      ['Tipo', 'Come funziona', 'Tempo', 'Materiale tuo'],
      ['Quiz', 'Una domanda, si risponde in chat.', '45s', 'le tue domande'],
      ['Reflex', 'Il primo che scrive la parola vince.', '30s', 'le tue parole'],
      ['Numero', 'Ha pensato un numero: indovinatelo.', '40s', '—'],
      ['Anagramma', 'Lettere mescolate da rimettere a posto.', '45s', 'le tue parole'],
      ['Sequenza', 'Una sequenza di simboli da ripetere.', '30s', 'i tuoi simboli'],
      ['Domanda tua', 'Domanda e risposte scritte da te.', 'da 10s a 5 min', 'domanda + risposte'],
    ] },
    { p: ['Il materiale che aggiungi non sostituisce quello di serie: quando ce n\'è di tuo, il bot lo pesca <strong>due volte su tre</strong>, così la chat non impara le domande a memoria.'] },

    { h2: 'Le classifiche' },
    { p: [
      'Sono <strong>due</strong>, e sono separate apposta: <code>!classifica</code> è quella del pubblico, <code>!classifica mod</code> quella dello staff. Senza la divisione i moderatori — che stanno in chat tutto il giorno — occupavano i primi posti e la gara del pubblico non esisteva più.',
      'Chi è staff lo dice Twitch, non «chi ha guadagnato mentre era moderatore»: se promuovi qualcuno, le sue monete si spostano nella classifica giusta. <code>!classifica tutti</code> mostra la vecchia vista unica.',
    ] },

    { h2: 'Il premio in VIP' },
    { p: [
      'Ogni settimana (o ogni mese) il bot può dare il <strong>VIP</strong> ai primi della classifica del pubblico: da 1 a 5 persone, e il VIP dura fino al premio successivo.',
      'Chi ha già il VIP <strong>per sempre</strong> viene saltato e il posto scorre al successivo: dargli un premio a scadenza significherebbe togliergli quello che aveva. Si può disattivare, ma è acceso di base.',
    ] },

    { h2: 'Inventare un gioco tuo' },
    { p: [
      'I giochi pronti sono un punto di partenza, non il confine. Nella scheda <em>Giochi</em> c\'è <strong>«Inventa un gioco tuo»</strong>: da lì costruisci un gioco come costruisci un comando, con un innesco, delle condizioni e delle azioni — è un <a href="/manuale/moduli">Modulo</a> a tutti gli effetti, e può muovere le monete.',
      'Sei ricette partono già scritte: le apri, cambi i numeri e le parole, ed è tuo.',
    ] },
    { tabella: [
      ['Ricetta', 'Cosa fa', 'Cosa cambi di solito'],
      ['Macchinetta a monete', 'Costa una cifra fissa, e una volta su N paga.', 'costo, premio, probabilità'],
      ['Scommessa', 'Punti quanto vuoi tu: <code>!scommetti 100</code>.', 'probabilità e moltiplicatore'],
      ['Furto', 'Ruba a un altro, e se fallisce paga.', 'quanto si ruba, quanto si rischia'],
      ['Regala monete', 'Passa monete a qualcun altro.', 'il testo'],
      ['Quante monete ho', 'Risponde con il saldo e la posizione.', 'il testo'],
      ['Dai monete (mod)', 'Un moderatore accredita monete a mano.', 'chi può usarlo'],
    ] },
    { p: [
      'Le due cose che rendono un gioco un gioco sono nelle condizioni: il <strong>costo</strong> (che può essere una cifra fissa o quella scritta da chi gioca, con <code>$arg1</code>) e la <strong>probabilità</strong>, con il ramo <strong>«altrimenti»</strong> per quando va male.',
      'Nei testi hai <code>$mossa</code> (quante monete si sono mosse davvero) e <code>$bersaglio</code> (su chi): servono a raccontare quello che è successo — a chi ha 5 monete non se ne possono togliere 80, e il messaggio deve dire la verità.',
    ] },

    { h2: 'Quando qualcosa non va' },
    { ul: [
      '<strong>Le monete non salgono.</strong> Presenza e partecipazione valgono solo in diretta: a canale spento restano solo quelle per messaggio. E i giochi devono essere accesi nella scheda <em>Giochi</em>.',
      '<strong>Un comando non risponde.</strong> Se hai un tuo comando con lo stesso nome, vince il tuo: è voluto. Cambiagli nome, o togli il tuo.',
      '<strong>«Non è in chat».</strong> Duello e furto valgono su chi ha parlato di recente: è quello che impedisce di creare monete dal nulla con un nome inventato.',
      '<strong>La classifica dello staff è vuota.</strong> Si riempie quando il bot rilegge chi sono i moderatori: succede da solo, e comunque prima di ogni premio VIP.',
      '<strong>Ho cambiato un premio e non cambia niente.</strong> I valori si applicano alla giocata successiva, non a quella in corso.',
    ] },
  ],
  faq: [
    { d: 'Posso spegnere solo un gioco?', r: 'I comandi pronti si accendono e si spengono insieme, dalla scheda Giochi. Per averne uno diverso — o solo alcuni — la strada è crearteli: un comando tuo con lo stesso nome ha la precedenza su quello pronto.' },
    { d: 'Le monete si possono togliere a qualcuno?', r: 'Sì, dal pannello puoi aggiustare il saldo di chiunque, in più o in meno, senza passare dalla chat. Serve quando qualcuno bara o quando vuoi premiare a mano.' },
    { d: 'Le monete valgono anche su Kick?', r: 'Sì: la chat è una sola per il bot. Un comando può anche essere limitato a una piattaforma sola, se preferisci.' },
    { d: 'Come si chiama la moneta?', r: 'Come vuoi tu: fino a venti caratteri, dalla scheda Giochi. Il bot userà quel nome ovunque, anche nei messaggi dei giochi pronti.' },
  ],
};

const MODULI = {
  slug: 'moduli',
  schede: ['moduli'],
  titolo: 'Manuale dei moduli: automazioni della chat | SocialBot',
  h1: 'Manuale dei moduli',
  desc: 'Quando succede qualcosa, se valgono certe condizioni, allora il bot fa. Inneschi, condizioni, azioni e variabili dei moduli di SocialBot, uno per uno.',
  aggiornata: OGGI,
  corpo: [
    { p: [
      'Un <strong>modulo</strong> è un\'automazione che ti costruisci: <strong>QUANDO</strong> succede qualcosa, <strong>SE</strong> valgono certe condizioni, <strong>ALLORA</strong> il bot fa una o più cose.',
      'Con i moduli si fanno i comandi che ti mancano, le risposte automatiche, i giochi a monete, i saluti agli eventi, i timer, e i collegamenti verso servizi tuoi. Un modulo è <strong>dati</strong>, mai codice: quello che può fare è l\'elenco di azioni qui sotto, e nient\'altro. È il motivo per cui puoi costruirci sopra senza poter rompere niente — tuo o di altri.',
    ] },

    { h2: 'QUANDO: i sei inneschi' },
    { tabella: [
      ['Innesco', 'Parte quando', 'Cosa gli dai'],
      ['Comando', 'qualcuno scrive <code>!nome</code> in chat', 'il nome (senza <code>!</code>) e gli alias'],
      ['Parola', 'in un messaggio compare un testo', 'il testo, e se deve <em>contenerlo</em>, <em>esserlo</em> o <em>iniziare</em> così'],
      ['Evento', 'succede qualcosa sul canale', 'quale evento (sotto)'],
      ['Timer', 'ogni tot minuti', 'i minuti, e se vuoi un minimo di messaggi nuovi'],
      ['Manuale', 'solo quando lo lanci tu', 'niente: si lancia da «Prova» o da fuori'],
      ['Voce', 'lo dici a voce mentre streammi', 'la frase da riconoscere'],
    ] },
    { h3: 'Gli eventi' },
    { tabella: [
      ['Evento', 'Quando'],
      ['Nuovo follow', 'qualcuno inizia a seguirti'],
      ['Sub / resub', 'qualcuno si abbona o rinnova'],
      ['Raid', 'un altro canale ti manda i suoi spettatori'],
      ['Bits / cheer', 'qualcuno manda dei bit'],
      ['Riscatto punti canale', 'qualcuno riscatta un premio dei punti Twitch'],
      ['Primo messaggio di un utente', 'qualcuno scrive per la prima volta nel tuo canale'],
      ['Sei andato in live', 'la diretta comincia'],
      ['Fine live', 'la diretta finisce'],
      ['Gesto webcam (mani/volto)', 'la webcam riconosce un gesto o un\'espressione'],
    ] },
    { p: ['Il timer non parla nel vuoto: se chiedi un minimo di messaggi nuovi, il modulo tace quando la chat è ferma. È la differenza fra un promemoria e un bot che parla da solo davanti a nessuno.'] },

    { h2: 'SE: le condizioni' },
    { p: ['Sono tutte facoltative, e si sommano: passano <strong>tutte</strong> o il modulo non parte.'] },
    { tabella: [
      ['Condizione', 'Cosa fa', 'Limiti'],
      ['Chi può', 'da tutti, solo abbonati, solo VIP, solo moderatori', 'scala: tutti &lt; sub &lt; VIP &lt; mod'],
      ['Piattaforme', 'solo Twitch, solo Kick, o dove vuoi', 'se non scegli, vale ovunque'],
      ['Solo in diretta', 'il modulo tace a canale spento', '—'],
      ['Solo offline', 'il contrario: solo a canale spento', '—'],
      ['Monete richieste', 'serve almeno quel saldo, ma non si paga', '0–1.000.000'],
      ['Costo', 'quante monete si pagano per usarlo', '0–1.000.000, oppure una variabile'],
      ['Attesa', 'quanto aspetta prima di poter ripartire, per tutti', 'secondi'],
      ['Attesa a testa', 'quanto aspetta la stessa persona', '0–86.400 secondi'],
      ['Probabilità', 'quante volte su cento parte', '0–100'],
      ['Messaggio se non basta', 'cosa dice a chi non ha abbastanza monete', '300 caratteri'],
    ] },
    { h3: 'In che ordine vengono controllate' },
    { p: ['L\'ordine non è un dettaglio: decide <strong>quando si paga</strong>.'] },
    { tabella: [
      ['1', 'Chi può usarlo'],
      ['2', 'La piattaforma'],
      ['3', 'Diretta accesa o spenta'],
      ['4', 'Monete richieste e costo — qui si <em>controlla</em>, non si paga'],
      ['5', 'L\'attesa di tutti'],
      ['6', 'L\'attesa della singola persona'],
      ['7', 'Il pagamento: qui le monete escono davvero'],
      ['8', 'La probabilità'],
    ] },
    { p: ['Quindi si paga <strong>dopo</strong> le attese e <strong>prima</strong> del dado: chi gioca paga la giocata anche quando perde — che è come funziona una giocata — ma non paga se il comando era in attesa. Dopo il pagamento hai <code>$costo</code> (quanto è uscito) e <code>$saldo</code> (quanto è rimasto) da usare nei testi.'] },

    { h2: 'ALLORA: le quattordici azioni' },
    { p: ['Si eseguono <strong>in fila</strong>, fino a otto per modulo. Se una fallisce, le altre vanno avanti lo stesso: un webhook spento non deve spegnere il messaggio in chat.'] },
    { tabella: [
      ['Azione', 'Cosa fa', 'Cosa le dai', 'Serve'],
      ['Scrivi in chat', 'manda un messaggio', 'il testo (fino a 400 caratteri)', '—'],
      ['Fai partire un effetto', 'lancia un tuo effetto o suono', 'quale effetto', 'un effetto già creato'],
      ['Dai o togli punti', 'muove le monete del canale', 'aggiungi/togli/imposta, a chi, quanto', '—'],
      ['Contatore', 'tiene un numero che cresce', 'nome, e se incrementare, azzerare o impostare', '—'],
      ['Crea una clip', 'salva una clip del momento', 'un testo da dire (facoltativo)', 'il permesso clip'],
      ['Cambia categoria Twitch', 'cambia il gioco del canale', 'il gioco, anche da <code>$args</code>', 'il permesso di modifica canale'],
      ['Cambia titolo stream', 'cambia il titolo', 'il testo (fino a 140 caratteri)', 'il permesso di modifica canale'],
      ['Metti una canzone in coda', 'aggiunge un brano su Spotify', 'il brano, anche da <code>$args</code>', 'add-on Musica e Spotify collegato'],
      ['Annuncio in chat (/announce)', 'un messaggio evidenziato in chat', 'il testo e il colore', 'il permesso annunci'],
      ['Shoutout (banner)', 'lo shoutout ufficiale di Twitch', 'chi, o il nome dopo il comando, o chi ha raidato', 'il permesso shoutout'],
      ['Mostra testo sull\'overlay', 'scrive a schermo nella diretta', 'il testo e per quanto', 'l\'overlay in scena'],
      ['Timeout in chat', 'mette in pausa chi ha scritto', 'i secondi', 'il permesso di moderazione'],
      ['Aspetta', 'una pausa prima dell\'azione dopo', 'i secondi (fino a 30)', '—'],
      ['Chiama un webhook', 'manda i dati a un indirizzo tuo', 'l\'URL, e se usare la risposta', 'un servizio tuo'],
    ] },
    { h3: 'Dai o togli punti' },
    { p: [
      'È l\'azione che trasforma un modulo in un gioco. <em>Aggiungi</em> e <em>togli</em> spostano, <em>imposta</em> mette una cifra esatta.',
      'Il destinatario può essere <strong>chi ha scritto</strong>, il <strong>nome dopo il comando</strong>, <strong>uno a caso</strong> fra chi ha parlato di recente, o un <strong>nome fisso</strong>. La quantità può essere un numero o una variabile: <code>$random(10,50)</code>, <code>$arg1</code>.',
      'Dopo, <code>$mossa</code> dice quante monete si sono mosse <strong>davvero</strong> e <code>$bersaglio</code> su chi. Sono la stessa cifra per tutte le azioni che seguono: senza, un furto toglierebbe una somma alla vittima e ne darebbe un\'altra al ladro.',
    ] },
    { h3: 'Chiama un webhook' },
    { p: [
      'Manda il contesto in JSON a un indirizzo tuo. Se rispondi con <code>{"reply": "testo"}</code> e hai spuntato «usa la risposta», il bot scrive quel testo in chat — con le variabili già espanse.',
      'Accetta solo <code>http</code> e <code>https</code>, e <strong>non può puntare dentro una rete privata</strong>: gli indirizzi interni sono rifiutati sia scritti direttamente sia dopo aver risolto il nome, e un redirect non aggira il controllo. Cinque secondi di tempo, risposta letta fino a 10 KB.',
    ] },

    { h2: 'Il ramo ALTRIMENTI' },
    { p: [
      'È quello che succede <strong>quando il dado non passa</strong>. Ha senso solo con una probabilità sotto il 100%: il pannello non lo lascia salvare altrimenti, perché un modulo che sembra fare due cose e ne fa una sola è peggio di un errore.',
      'Le azioni del ramo «altrimenti» sono le stesse quattordici, e il costo è già stato pagato: la giocata persa può raccontarlo con <code>$costo</code> e <code>$saldo</code>.',
    ] },

    { h2: 'Le variabili' },
    { p: ['Si scrivono nei testi e diventano quello che valgono. Una variabile che non esiste sparisce, non lascia scritto il suo nome. Non c\'è nessun modo di eseguire codice: sono sostituzioni, e basta.'] },
    { h3: 'Chi scrive e cosa dice' },
    { tabella: [
      ['<code>$user</code>', 'chi ha scritto'],
      ['<code>$touser</code>', 'il nome scritto dopo il comando (o chi scrive, se manca)'],
      ['<code>$target</code>', 'come <code>$touser</code>'],
      ['<code>$args</code>', 'tutto quello che c\'è dopo il comando'],
      ['<code>$arg1</code>', 'la prima parola dopo il comando (poi <code>$arg2</code>, <code>$arg3</code>…)'],
      ['<code>$canale</code>', 'il nome del tuo canale'],
    ] },
    { h3: 'La diretta adesso' },
    { tabella: [
      ['<code>$uptime</code>', 'da quanto sei in diretta (vuoto se offline)'],
      ['<code>$gioco</code>', 'la categoria attuale'],
      ['<code>$titolo</code>', 'il titolo attuale'],
      ['<code>$spettatori</code>', 'quanti stanno guardando ora'],
    ] },
    { h3: 'Le persone' },
    { tabella: [
      ['<code>$followage</code>', 'da quanto ti segue chi scrive, o il nome dopo il comando'],
      ['<code>$ore</code>', 'ore guardate sul tuo canale (anche <code>$oreguardate</code>, <code>$watchtime</code>)'],
      ['<code>$chattercaso</code>', 'uno a caso fra chi ha scritto di recente'],
      ['<code>$cita</code>', 'una citazione a caso fra quelle salvate'],
      ['<code>$giocotarget</code>', 'l\'ultima categoria di chi nomini dopo il comando'],
      ['<code>$titolotarget</code>', 'l\'ultimo titolo di chi nomini dopo il comando'],
    ] },
    { h3: 'Le monete' },
    { tabella: [
      ['<code>$punti</code>', 'quante ne ha chi scrive'],
      ['<code>$punti(nome)</code>', 'quante ne ha un altro'],
      ['<code>$monete</code>', 'come si chiama la tua moneta'],
      ['<code>$posizione</code>', 'in che posizione è chi scrive'],
      ['<code>$top(3)</code>', 'i primi tre, già scritti'],
      ['<code>$costo</code>', 'quanto è costato questo modulo'],
      ['<code>$saldo</code>', 'quanto è rimasto dopo il pagamento'],
      ['<code>$mossa</code>', 'quante monete ha mosso l\'ultima azione punti'],
      ['<code>$bersaglio</code>', 'su chi le ha mosse'],
    ] },
    { h3: 'Quando l\'innesco è un evento' },
    { tabella: [
      ['<code>$raider</code>', 'chi ti ha raidato'],
      ['<code>$viewers</code>', 'quanti ne ha portati'],
      ['<code>$mesi</code>', 'da quanti mesi è abbonato'],
      ['<code>$bits</code>', 'quanti bit ha mandato'],
      ['<code>$premio</code>', 'quale premio ha riscattato'],
      ['<code>$gesto</code>', 'il gesto riconosciuto dalla webcam'],
      ['<code>$emozione</code>', 'l\'espressione riconosciuta'],
    ] },
    { h3: 'Data e ora' },
    { tabella: [
      ['<code>$data</code>', 'la data di oggi'],
      ['<code>$ora</code>', 'che ore sono'],
      ['<code>$giorno</code>', 'che giorno della settimana è'],
    ] },
    { h3: 'Le funzioni' },
    { tabella: [
      ['<code>$random(1,100)</code>', 'un numero fra due'],
      ['<code>$random(6)</code>', 'un numero da 1 a 6'],
      ['<code>$decimale(1,2)</code>', 'un numero con la virgola'],
      ['<code>$misura(1,50,cm)</code>', 'un numero con l\'unità che vuoi'],
      ['<code>$pick(a|b|c)</code>', 'una a caso fra queste (anche <code>$scegli</code>)'],
      ['<code>$count(nome)</code>', 'quanto vale un contatore'],
      ['<code>$titolo($args)</code>', 'cambia il titolo mentre scrivi il messaggio'],
      ['<code>$categoria($args)</code>', 'cambia la categoria mentre scrivi il messaggio'],
    ] },
    { h3: 'Quelle a caso' },
    { p: ['Danno un valore nuovo <strong>a ogni volta che compaiono</strong>: due <code>$dado</code> nella stessa frase danno due numeri diversi.'] },
    { tabella: [
      ['<code>$dado</code>', 'da 1 a 6'],
      ['<code>$moneta</code>', 'testa o croce'],
      ['<code>$sino</code>', 'sì o no'],
      ['<code>$random</code> <code>$numero</code>', 'da 0 a 100'],
      ['<code>$percentuale</code>', 'da 0% a 100%'],
      ['<code>$livello</code>', 'da 1 a 100'],
      ['<code>$altezza</code>', 'da 1,40 m a 2,10 m'],
      ['<code>$peso</code>', 'da 40 a 130 kg'],
      ['<code>$lunghezza</code>', 'da 1 a 30 cm'],
      ['<code>$grandezza</code>', 'da 1 a 50 cm'],
      ['<code>$eta</code>', 'da 1 a 99 anni'],
      ['<code>$temperatura</code>', 'da -10 a 45 °C'],
      ['<code>$velocita</code>', 'da 1 a 320 km/h'],
      ['<code>$distanza</code>', 'da 1 a 1000 km'],
      ['<code>$soldi</code> <code>$euro</code>', 'da 0 a 100.000 €'],
      ['<code>$colore</code>', 'un colore'],
      ['<code>$animale</code>', 'un animale'],
      ['<code>$emoji</code>', 'una emoji'],
    ] },

    { h2: 'Tre esempi' },
    { h3: 'Un comando con una risposta viva' },
    { esempio: 'QUANDO   comando  !abbraccia\nALLORA   scrivi in chat\n         $user abbraccia $touser per $random(3,30) secondi.' },
    { h3: 'Un saluto ai raid, con lo shoutout' },
    { esempio: 'QUANDO   evento  Raid\nALLORA   scrivi in chat\n         Benvenuti! $raider è arrivato con $viewers persone.\nALLORA   shoutout  (a chi ha raidato)' },
    { h3: 'Una scommessa' },
    { esempio: 'QUANDO   comando  !scommetti\nSE       costo $arg1 · probabilità 45\nALLORA   dai punti  a chi scrive  +$arg1\nALLORA   scrivi in chat\n         $user punta $costo $monete e vince! Ora ne ha $punti.\nALTRIMENTI  scrivi in chat\n         $user punta $costo $monete e perde tutto. Ne restano $saldo.' },
    { p: ['Nel terzo: il costo è la cifra scritta da chi gioca, si paga sempre, e la vincita raddoppia perché la puntata era già uscita.'] },

    { h2: 'Limiti e sicurezza' },
    { ul: [
      'Otto azioni per modulo, e la fila si ferma lì.',
      'Un messaggio in chat arriva a 400 caratteri, un titolo a 140.',
      'Una pausa può durare al massimo 30 secondi.',
      'Un\'azione punti può muovere al massimo un milione di monete per volta.',
      'I webhook non possono raggiungere una rete privata, non seguono i redirect e hanno cinque secondi di tempo.',
      'Le variabili sono sostituzioni di testo: nessun codice viene eseguito, né tuo né di chi scrive in chat.',
      'Il bot non innesca sé stesso: quello che dice non fa ripartire i tuoi moduli.',
    ] },

    { h2: 'Lanciare un modulo da fuori' },
    { p: [
      'Ogni canale ha una <strong>chiave</strong> (la vede solo il proprietario, mai un moderatore). Con quella, un programma tuo — un\'estensione, un pulsante dello Stream Deck, uno script — può far scrivere il bot o lanciare un modulo.',
      'Si manda una <code>POST</code> all\'indirizzo del canale con la chiave nell\'intestazione <code>Authorization</code>, e nel corpo cosa fare: un messaggio, un effetto, o un modulo. Trenta richieste al minuto. Una chiave sbagliata riceve un 404, senza dire perché.',
    ] },

    { h2: 'Quando un modulo non parte' },
    { ul: [
      '<strong>Controlla l\'ordine delle condizioni.</strong> Se c\'è un\'attesa in corso il modulo tace <em>prima</em> di pagare: sembra rotto e invece sta aspettando.',
      '<strong>La probabilità è quella che sembra?</strong> Con 20 su 100, quattro volte su cinque non succede niente — e senza il ramo «altrimenti» quel silenzio è indistinguibile da un guasto.',
      '<strong>Ti manca un permesso.</strong> Categoria, titolo, annunci, shoutout e clip li fa Twitch: se il permesso non c\'è, il bot lo dice in chat una volta e va avanti. Si riautorizza dalla dashboard.',
      '<strong>Hai un comando pronto con lo stesso nome?</strong> Vince il tuo, sempre. Se volevi quello pronto, cambia nome al tuo.',
      '<strong>Provalo.</strong> Il tasto «Prova» esegue il modulo saltando tutte le condizioni: se funziona lì, il problema è in una condizione, non in un\'azione.',
    ] },
  ],
  faq: [
    { d: 'Che differenza c\'è fra un comando e un modulo?', r: 'Un comando è un modulo con l\'innesco più semplice. Nel pannello i comandi hanno una schermata più corta perché la maggior parte delle volte basta quella; quando serve di più — condizioni, più azioni, un costo — è lo stesso motore.' },
    { d: 'Un modulo può fare più cose di seguito?', r: 'Sì, fino a otto azioni in fila, e puoi metterci una pausa in mezzo. Se una fallisce le altre continuano, così un servizio esterno spento non porta giù il resto.' },
    { d: 'Posso usare i moduli per fare un gioco a monete?', r: 'È esattamente quello per cui c\'è l\'azione punti, insieme al costo e alla probabilità. Nella scheda Giochi trovi sei ricette già scritte da cui partire.' },
    { d: 'I moduli funzionano anche su Kick?', r: 'Sì. Se vuoi, ogni modulo può essere limitato a una piattaforma sola; se non scegli niente vale ovunque.' },
    { d: 'Che succede se scrivo una variabile che non esiste?', r: 'Sparisce dal testo, senza lasciare il suo nome in chat e senza errori. Conviene comunque provare il modulo prima di lasciarlo agli spettatori.' },
  ],
};

export const MANUALI = [GIOCHI, MODULI];

// A QUALE SCHEDA DEL PANNELLO SERVE OGNI PAGINA.
//
// Non e' un elenco a parte: ogni guida e ogni manuale dichiara le schede a cui
// serve, accanto al proprio contenuto. Chi scrive una pagina nuova sa a chi
// serve — meglio di chiunque la legga sei mesi dopo — e il pannello la trova da
// se'. Il manuale vince sulla guida: chi e' gia' dentro il prodotto vuole il
// riferimento, non l'introduzione.
export function aiutiPerScheda() {
  const out = {};
  const metti = (pagine, base, tipo) => {
    for (const p of pagine) for (const s of p.schede || []) out[s] = { titolo: p.h1, via: `${base}/${p.slug}`, tipo };
  };
  metti(GUIDE, '/guide', 'guida');
  metti(MANUALI, '/manuale', 'manuale');
  return out;
}

export function paginaManuale(slug) {
  const m = MANUALI.find((x) => x.slug === slug);
  return m ? paginaDoc(m) : null;
}

export function paginaIndiceManuali() {
  return paginaManuali(MANUALI);
}

// Le voci per la sitemap: una fonte sola, come per le guide.
export function urlManuali(sito = 'https://socialbot.live') {
  return [
    { loc: `${sito}/manuale`, lastmod: MANUALI.map((m) => m.aggiornata).sort().pop(), freq: 'monthly', prio: '0.7' },
    ...MANUALI.map((m) => ({ loc: `${sito}/manuale/${m.slug}`, lastmod: m.aggiornata, freq: 'monthly', prio: '0.7' })),
  ];
}
