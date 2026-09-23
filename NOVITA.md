# Novità

Cosa è cambiato nel bot, in ordine di tempo. Una riga per cosa, scritta per chi
lo usa: se non si vede da fuori, qui non ci va.

Una riga che comincia con `[importante]` è una **capacità nuova**: una funzione,
un gioco, un collegamento che prima non c'era e che cambia cosa puoi fare. Non
lo sono le correzioni e le rifiniture, anche quando sono tante. Le importanti
escono per prime nella finestra delle novità e in cima alla loro giornata qui
sotto, in un riquadro loro. Si scrive nello stesso commit della riga, in fondo
alla giornata di oggi come tutte le altre.

Una riga che comincia con `[privato]` resta in casa: non arriva alla pagina
pubblica, all'API aperta né alla sitemap, e la vede solo il proprietario nel suo
pannello. Un giorno fatto di sole righe private non compare nemmeno come giorno:
la data, da sola, direbbe che è successo qualcosa.

Ci vanno **tutte le cose interne del cervello privato** — il suo computer, il suo schermo, il
suo browser, come ragiona, come cresce. Non riguardano chi usa il bot, e questa
pagina è pubblica e indicizzata. Se una riga descrive invece una funzione che lo
streamer *usa*, si riscrive senza nominarla: la funzione resta documentata e il
nome resta in casa. Non è una cosa da ricordarsi:
`scripts/verifica-novita.mjs` boccia una riga pubblica che la nomina.

## 2026-09-23

- I ruoli che il costruttore crea adesso vanno a qualcuno: «Streamer» a te che hai il server, gli altri a moderatori, VIP e abbonati. [vai: dcserver]
- Il giro dei ruoli non partiva per chi usa il nostro bot, e i ruoli non arrivavano mai: adesso parte. [vai: ruoli]
- Anche gli appuntamenti sul calendario si allineano col nostro bot, e non si spengono più insieme ai ruoli. [vai: dcavvisi]
- Ogni ruolo della traccia dice a chi va, e lo cambi tu: a te, a chi modera, ai VIP, agli abbonati, o a nessuno. [vai: dcserver]
- Quando qualcosa non riesce, il costruttore dice su cosa: quale canale, quale regola, quale porta. [vai: dcserver]
- «In diretta» nasce come stanza dove si ascolta: parli tu e chi modera, gli altri ti sentono. [vai: dcserver]
- Le tracce creano l'angolo AFK e lo impostano, se il tuo server non ne ha già uno. [vai: dcserver]
- Scegliere un'immagine per un ruolo che c'è già non blocca più la costruzione con un falso «il server è cambiato». [vai: dcserver]
- Il cambio di categoria, a voce, in chat o da Telegram, non scambia più «diablo 4» per «Diablo»: conta ogni parola che dici, e capisce numeri romani e sigle come «gta 5» o «cs2». [vai: ascolto]
- Nei Ruoli si sceglie solo un ruolo che il bot può dare davvero. Il pannello dice qual è il suo ruolo più alto e chi gli sta sopra, senza contare i ruoli degli altri bot. [vai: ruoli]
- Il costruttore non crea più un secondo «Moderatori» accanto al tuo «moderatore»: se il ruolo c'è già e il bot non ci arriva, te lo dice. [vai: dcserver]
- Facendo piazza pulita, i ruoli vecchi che restano li vedi prima, ognuno col suo perché: stanno sopra il bot, oppure sono di un altro bot. [vai: dcserver]
- [importante] La settimana ha una scheda sua: scrivi una volta i giorni, gli orari e cosa fai, e da lì li prendono la grafica e i calendari. [vai: settimana]
- Con un tasto la mandi su Telegram, nei canali di Discord e nella storia di Instagram. Compaiono solo i servizi che hai collegato. [vai: settimana]
- Anche il Programma del tuo canale Twitch può riceverla, e si rimette in pari da solo quando cambi la settimana. [vai: settimana]
- Nella grafica della settimana i giorni seguono la lingua del pannello: in inglese non esce più «LUN MAR MER». [vai: grafiche]
- Due tasti «Vai a…», nel calendario di Discord e negli avvisi, non portavano da nessuna parte: adesso ci portano. [vai: dcavvisi]
- I tasti di CONSOLify funzionano davvero da una tastiera fisica, icone comprese: fino a oggi ogni pressione si perdeva per strada. [vai: consolify]
- Con i giochi che dicono da soli quando muori, il contatore adesso sale davvero: il loro messaggio non arrivava fino a me. [vai: moduli]
- [importante] Instagram si collega con un tasto, come TikTok: scegli con che account entrare, e niente più ID e token da copiare dal sito di Meta. Serve un account professionale. [vai: notifiche]
- Il collegamento con Instagram si rinnova da solo prima di scadere, e se togli l'app dal tuo Instagram lo cancello subito. [vai: notifiche]
- Se a Instagram o al bot di Discord manca un permesso, o un collegamento si è rotto, lo vedi subito nella sua scheda, con il tasto per rimediare. [vai: notifiche]
- Quando il pannello ti chiede una conferma o un nome, lo fa con la sua finestra e nella tua lingua: niente più finestre grigie del browser, che sul telefono sembravano un avviso di sistema.
- Le scorciatoie si leggono coi tasti del tuo computer, ⌘ sul Mac e Ctrl su Windows, e sul telefono non compaiono. L'editor dell'overlay si usa anche col dito. [vai: alert]
- Se il browser non lascia copiare, il testo compare già selezionato, col tasto giusto per il tuo dispositivo, anche nel segnalibro delle citazioni. Prima alcune copie fallivano senza dirlo.
- Il tasto che toglie l'audio a una sorgente non resta più vuoto quando l'audio è spento, e i titoli del calendario e dei ruoli hanno di nuovo la loro icona.
- [importante] «Avvisi» diventa «I tuoi social»: in cima i tuoi account, ognuno con il suo stato e il tasto per collegarlo, e sotto cosa annunciare quando pubblichi. Niente più riquadri ripetuti. [vai: notifiche]
- La pagina delle donazioni si modifica dalla scheda Donazioni, e la tua diretta in prima pagina si accende dalla Pagina link. [vai: donazioni]
- La promo dei tuoi social in chat si accende insieme alla personalità del bot, accanto a «si fa vivo da solo». [vai: personalita]
- «Come funziona» si apre da solo la prima volta che entri in una scheda, poi resta chiuso finché non lo apri tu.
- [importante] La prima schermata del tuo server Discord si scrive da sola: ogni canale in mostra ha già la sua faccina e la sua riga, nella lingua del nome. Quelle che scrivi tu restano tue. [vai: dcentra]
- Nei giorni della settimana scrivi un gioco o un titolo: mentre scrivi compaiono le categorie di Twitch, e sotto ogni giorno leggi quale andrà sul Programma. [vai: settimana]
- Il synthwave delle grafiche è in prospettiva vera: il sole sorge dietro il titolo e le linee del pavimento escono da tutto l'orizzonte. [vai: grafiche]
- Otto temi animati nuovi per le grafiche, fra cui vaporwave, pioggia al neon, notte di stelle, sakura e lo-fi, e tredici stili pronti con l'anteprima fatta coi tuoi testi. [vai: grafiche]
- Nelle grafiche scegli il carattere e lo stile del titolo, la forma delle righe, e per le scene animate cosa si vede, la velocità e quanto si nota. [vai: grafiche]
- Le scritte delle grafiche si leggono sempre, anche sopra le scene che si muovono, e GIF e video ricominciano senza scatti. Col QR, niente più righe coperte. [vai: grafiche]
- Nella scheda del browser la tua pagina link ha come icona la tua foto, quella che mostra in alto, invece di quella di SocialBot. [vai: pagina]
- Il titolo di ogni scheda si vede subito, anche al primo caricamento, e sul telefono il pannello non scivola più di lato.
- Stato ti dice come va adesso: in diretta vedi da quanto, chi ti guarda e cosa succede in chat; fuori onda, quando è la prossima e com’è andata l’ultima. [vai: stato]
- Piattaforme, passkey, moderatori, codici delle mail e i tuoi dati hanno una scheda loro, «Il tuo account». Il pre-addestramento sta in Conoscenza. [vai: account]
- Sul computer il menù sta sempre a sinistra, con tutte le schede: un clic e ci sei, e vedi sempre dove sei.
- Mentre una scheda carica, al posto di «Caricamento…» vedi la forma di quello che sta arrivando.
- Il pannello si apre e cambia scheda più in fretta, soprattutto sul telefono: prepara solo la scheda che stai guardando.
- Le «×» che tolgono un amico o una fonte si prendono col dito anche sul telefono.
- Nello Studio un elemento si sposta di quanto lo trascini anche appena scelto: la tela non cambia più misura sotto il dito. [vai: alert]
- A diretta appena chiusa, Stato non dice più «in diretta»: quando Twitch risponde, vale quello che dice Twitch. [vai: stato]
- Scrivere nelle Grafiche è di nuovo fluido, anche dopo esserci entrati più volte, e «Salva» o «Scarica» partono una volta sola. [vai: grafiche]
- Le grafiche escono anche in verticale per le storie, 1080×1920: lo sfondo copre tutto lo schermo e le scritte stanno lontane dalle barre di Instagram. [vai: grafiche]
- La settimana mandata nella storia di Instagram non esce più tagliata ai lati: alla storia va la versione verticale, a Telegram e Discord il post. [vai: settimana]
- [importante] Nuovo nelle Grafiche: con «Metti nella storia» la grafica che vedi va nella tua storia di Instagram, già in verticale. Se Instagram non è collegato, il tasto per collegarlo è lì. [vai: grafiche]
- [importante] La storia «Live ora» può partire da sola quando vai in diretta su Twitch: accendila nelle Grafiche, nel riquadro della storia, e se non parte te lo dico. [vai: grafiche]
- Settimana e «Live ora» hanno ognuna il suo titolo: quello della settimana non finisce più sulla grafica della diretta. [vai: grafiche]
- Nelle Grafiche i tasti hanno di nuovo il contorno, come nel resto del pannello, e in Statistiche il periodo scelto non perde il bordo. [vai: grafiche]
- Cambiare scheda è più svelto, soprattutto sul telefono, e nello Studio l'anteprima dal vivo riparte quando ci torni. [vai: alert]
- Nello Studio la tela è molto più grande: il menù si apre dal tasto in alto e lascia la larghezza al lavoro, e i nomi dei livelli non si tagliano più. [vai: alert]
- Pubblicità in chat: il preavviso adesso parte davvero, «sono tornato» arriva quando la pausa finisce, e i secondi nei messaggi sono sempre quanto dura la pausa. [vai: regia]
- Chi ha l'account nuovo non viene più cacciato dallo scudo: l'avviso esce una volta sola, e un mod lo fa scrivere con !permetti nome. Un messaggio con i Bit non viene mai trattenuto. [vai: scudo]
- [importante] Ogni gioco ha le sue regole da cambiare: costi, premi, attese, probabilità, testi e cosa si pesca, con accanto quanto rende. Di serie il banco vince sempre un po' e la pesca rende quanto la presenza. [vai: giochi]
- [importante] La chat in solo emote per due minuti, o per il tempo che dici: la accendono i mod con !soloemote 5m, un tuo Modulo o la chat con !sblocca, e poi torna com'era da sola. [vai: moduli]
- [importante] Quattro manche nuove: impiccato, più o meno, calcolo veloce e rebus con le emoji. Scegli tu quali girano da sole, e con !manche impiccato ne apri una per nome. [vai: giochi]
- [importante] Duelli con la posta: !duello @nome 50, l'altro accetta o rifiuta e chi vince prende la posta dell'altro. Arriva anche la morra cinese contro il bot, per ridere o con una puntata. [vai: giochi]
- [importante] Abbracci, bacini e il batti il cinque in chat: ogni tanto, a sorpresa, viene un cinque perfetto. Chi scrive !nococcole non ne riceve. [vai: giochi]
- [importante] Due giochi da fare insieme: il colpo di gruppo, dove più siete più è facile scappare col bottino, e il boss, che la chat batte a colpi di !colpisci con la barra della vita sull'overlay. [vai: giochi]
- La finestra delle novità non ti rimostra più le stesse righe: ognuna esce una volta. Le cose nuove più grosse stanno in cima, «In evidenza», anche nella pagina delle novità.

## 2026-09-19

- [importante] La tua settimana finisce sul calendario del server Discord: chi ti segue vede quando torni e mette il promemoria. [vai: dcavvisi]
- Il palinsesto non te lo richiedo: leggo quello che hai già scritto per la grafica della settimana. [vai: dcavvisi]
- Se cambi la programmazione, o arriva l'ora legale, gli appuntamenti si rimettono a posto da soli. [vai: dcavvisi]
- Gli appuntamenti che scrivi a mano tu non li tocco: Discord non me lo lascia fare, e va benissimo così. [vai: dcavvisi]
- Se hai invitato il bot prima del calendario, te lo dico subito e ti dico come rimediare, invece di provarci a vuoto. [vai: dcavvisi]
- Da ogni scheda salti a quelle accanto senza tornare al menù: prima la barra c'era solo in alcune. [vai: effetti]
- [importante] Quando parte la pubblicità lo dico in chat: fra poco, adesso, e quando torno. [vai: regia]
- Se mi mancano i permessi per farlo te lo dico subito, con il posto dove concederli. [vai: regia]
- I tre messaggi li scrivi tu, e ognuno si spegne per conto suo. [vai: regia]
- Per la fine Twitch non manda niente: conto i secondi che mi ha detto, e se mi riavvio nel mezzo sto zitta invece di salutarti tardi. [vai: regia]
- Ogni ruolo può avere il suo segno accanto al nome: un'emoji, o un'immagine tua. [vai: dcserver]
- La tinta la scegli tu: un colore, una sfumatura fra due, o l'olografico. [vai: dcserver]
- L'immagine che scegli non la tengo: la rimpicciolisco io, la mando a Discord e la scordo. [vai: dcserver]
- Quello che il tuo server non può ancora fare te lo dico prima, invece di fartelo scoprire da un rifiuto. [vai: dcserver]
- Le tracce del server adesso arrivano con la porta d'ingresso e il filtro già scritti, sui canali che la traccia ha. [vai: dcentra]
- Se sei partito dal tuo server, un tasto te li scrive su misura: poi li cambi come vuoi. [vai: dcentra]
- La porta nasce accesa solo dove Discord la prenderebbe, e dove non ci arriva te lo dice invece di farti scoprire il rifiuto. [vai: dcentra]
- [importante] Il filtro del tuo server Discord si scrive da qui: le tue parole, le liste che Discord tiene aggiornate da sé, lo spam e le raffiche di menzioni. [vai: dcfiltro]
- Per ogni regola scegli cosa succede quando scatta, e chi non tocca: i tuoi moderatori passano sempre. [vai: dcfiltro]
- Le regole che hai già non te le riscrivo: te le leggo, e cambio solo quello che è diverso. [vai: dcfiltro]
- Adesso i comandi rispondono anche a te: il bot scrive col tuo account, e per sbaglio scartava i messaggi tuoi come se fossero i suoi. [vai: moduli]
- Il tasto del Discord in chat portava a un indirizzo con i due punti attaccati dentro: adesso il link finisce dove finisce, e si apre. [vai: ruoli]
- [importante] Gli avvisi su Discord adesso hanno una scheda loro: quanti canali vuoi, e per ognuno quali avvisi, di chi, con che parole. [vai: dcavvisi]
- Puoi far chiamare un ruolo quando parte l'avviso: sveglia quello e nessun altro, mai il server intero per una parola scritta per sbaglio. [vai: dcavvisi]
- Le dirette degli amici e della community arrivano anche sul server Discord, con la levetta separata da quella di Telegram. [vai: dcavvisi]
- Se lo chiedi, a diretta chiusa l'avviso diventa «ha finito la diretta»: non resta un «sono in onda» appeso fino a domani. [vai: dcavvisi]
- I menù a tendina non vengono più tagliati dal riquadro che li contiene: si aprono interi, e scorrerli non li fa sparire. [vai: ruoli]
- La scheda Discord è in ordine: il collegamento, chi prende quale ruolo, la porta d'ingresso. Una carta, una cosa. [vai: ruoli]
- Sul sito, chi cerca un bot solo per il suo Discord lo trova subito sotto ai tasti di registrazione. [vai: pagina]
- Ogni ruolo dato o tolto adesso lascia scritto il perché nel registro del tuo server, invece di una riga muta. [vai: ruoli]
- Il costruttore sa fare anche canali annunci, forum con i tag, media e palco, con lentezza e durata dei fili. [vai: dcserver]
- Le impostazioni del tuo server Discord si cambiano da qui: chi può scrivere appena entra, il filtro delle immagini, i canali di sistema e regole, l'angolo AFK. [vai: dcserver]
- Il freno d'emergenza c'è: metti in pausa tutti gli inviti con una spunta, e li riapri quando vuoi. [vai: dcserver]
- Chi un canale non ce l’ha entra con Discord e basta: costruisce il suo server da qui, e di dirette e overlay non vede nemmeno le schede. [vai: dcserver]
- Dalla scheda di Discord adesso copi l’indirizzo della tua porta d’ingresso e la apri, invece di leggerla dentro una frase. [vai: ruoli]
- Sostenere il progetto ha un indirizzo solo, corto, e dal sito ci si arriva: prima la pagina esisteva e non ci portava nessuno.
- Prima di mandarti su Twitch adesso ti chiedo con quale account: lo stesso riquadro per «Inizia gratis» e per «Attiva». [vai: sottoscrizione]
- La pagina per collegare il Discord si apre a chiunque, anche senza account, e prima di mandarti da Discord ti dice in tre righe cosa succede. [vai: ruoli]
- Ti serve solo la parte di Discord? Adesso c’è scritto sul sito che si può fare e che è gratis. [vai: dcserver]
- Adesso ti dico quali dei tuoi ruoli Discord terrei e come li chiamerei, affiancati a quelli della traccia. Rinominarli tiene dentro chi ce l’aveva, cancellarli lo toglie a tutti. [vai: dcserver]
- Se «!discord» non risponde in chat, la scheda ti dice quale delle tre cose manca invece di lasciartelo indovinare. [vai: ruoli]
- [importante] La porta del tuo server Discord si scrive da qui: quanto si aspetta prima di poter scrivere, cosa legge chi arriva, e le domande che gli aprono i canali. [vai: dcentra]
- Ogni risposta apre dei canali e dà un ruolo, scegliendoli per nome: valgono anche quelli che la traccia deve ancora creare. [vai: dcentra]
- Se Discord la porta non la prenderebbe, te lo dico prima di scriverla: quanti canali mancano, o che al server serve il tipo Community. [vai: dcentra]
- Chi aveva già risposto alle domande non ricomincia da capo: si rifanno solo quelle che hai cambiato. [vai: dcentra]
- La modalità distruttiva adesso si vede anche dalla scheda della porta: fascia rossa, tasto rosso e il tempo che scorre, da tutte e due. [vai: dcentra]
- Passare fra «Il server» e «Chi entra» non chiede più di salvare: sono due metà della stessa traccia, e uscendo davvero te lo ricorda lo stesso. [vai: dcentra]
- Le impostazioni del server adesso arrivano davvero al server: il pannello le scriveva nella traccia e per strada si perdevano. [vai: dcserver]
- Niente più spiegazioni per cose che hai già fatto: i permessi te li chiedo solo se mancano davvero. [vai: ruoli]
- Entrare nel tuo Discord adesso è un indirizzo solo: si apre, si dice a Discord chi si è, e si è dentro. Poi il codice in chat e i ruoli arrivano da soli. [vai: ruoli]
- Quello che il bot risponde quando gli chiedono del Discord lo scrivi tu: cinque frasi, col nome di chi scrive e il link dentro. [vai: ruoli]
- Vuoi che gestisca tutto il server? C’è un tasto che lo riporta su Discord come amministratore, e prima ti dice per bene cosa comporta. [vai: ruoli]
- Accanto al tasto «Attiva» adesso scegli il canale, Twitch o Kick, e un clic basta ancora. Entri da lì e al pagamento ritrovi i pacchetti che avevi già spuntato. [vai: sottoscrizione]
- Apri il sito e si vede prima, soprattutto dalla seconda volta: quello che non è cambiato il browser adesso se lo tiene, invece di richiederlo tutto da capo ogni volta.
- [importante] I ruoli del tuo server Discord li dà il bot, in base a quello che succede su Twitch: chi ti segue, chi è abbonato, chi c'è sempre. Scrivi la regola, il resto lo fa lui. [vai: ruoli]
- Chi ti guarda si collega da solo: scrive !discord in chat e segue due passi. Tocca solo chi si è collegato, e solo i ruoli che hai nominato tu. [vai: ruoli]
- Il rapporto di fine diretta adesso conta anche i Bit della serata e ti dice chi ne ha messi di più. Chi ha cheerato in anonimo conta nel totale e resta senza nome. [vai: dirette]
- Il premio VIP automatico adesso può pescare dai Bit invece che dalle monete: lo scegli tu, e vale la classifica vera di Twitch. [vai: giochi]
- Chi guida i Bit diventa il re: tiene una corona accanto al nome nella chat a schermo, e quando torna a scrivere il bot lo saluta con la frase che hai scritto. [vai: giochi]
- La classifica dei Bit puoi metterla in scena: la scegli dallo Studio come ogni altro elemento, dici di quando e quante righe, e si aggiorna da sola quando arriva un cheer. [vai: alert]
- [importante] Collegare Discord adesso è un tasto: ti manda a scegliere il server dall'elenco e torni a posto. Niente bot da creare, niente id da copiare. [vai: ruoli]
- Un VIP a premio adesso dura DIRETTE, non giorni: se salti una settimana ti aspetta. E le gare sono due, monete e Bit, che vanno avanti insieme. [vai: giochi]
- Ogni posizione ha il nome che le dai tu — re, principe, cavaliere — e la sua durata: al primo posto puoi dare cinque dirette e al terzo una. [vai: giochi]
- [importante] Categorie e canali del tuo Discord li scegli da qui: parti da una traccia pronta o fagli leggere il server che hai già, e lui lo mette su. [vai: dcserver]
- Prima di toccare niente ti fa vedere l'elenco esatto di quello che farebbe. Va solo in avanti: quello che non è nella traccia resta dov'è, e te lo dice. [vai: dcserver]
- Dentro ogni canale scrivi chi può fare cosa, con parole normali: «tutti — non può — scrivere». I permessi che non nomini nessuno li tocca. [vai: dcserver]
- Alcuni tasti comparivano quando non servivano a niente: «Scollega tutto» senza niente da scollegare, «Ferma la diretta» senza diretta. Adesso restano via finché non servono.
- Dalla privacy della pagina donazioni il tasto «Torna alla pagina» riportava alla pagina link. Adesso torna dov'eri, e quell'informativa parla della pagina giusta.
- In fondo alla pagina delle donazioni c'è il collegamento ai tuoi link: chi arriva da un link diretto trova anche il resto. [vai: donazioni]
- Nel costruttore Discord una categoria non risulta più «mai usata»: quel conto non esiste, e adesso ti dice quanti canali ha dentro e da quanto tacciono. [vai: dcserver]
- C'è una pagina per dare una mano al progetto, su socialbot.live/sostieni: quanto vuoi tu, una volta sola, senza iscriverti a niente.
- Vuoi che il server diventi esattamente la traccia? C'è una modalità apposta: la accendi tu, dura dieci minuti e si spegne da sola, e intanto la pagina cambia colore. [vai: dcserver]
- Quando stai per cancellare un canale in cui si parlava ancora, o più di dieci cose insieme, ti chiedo di scrivere il nome del server: su Discord non tornano. [vai: dcserver]
- Di ogni passaggio del costruttore resta scritto chi è stato e cosa ha fatto, coi nomi di quello che è sparito. È l'unico posto dove quei nomi restano. [vai: dcserver]
- Quando incolli il link della pagina per dare una mano al progetto, l'anteprima adesso parla di quella pagina invece che del bot in generale.
- La pagina per dare una mano al progetto si apriva solo a chi era già entrato: da fuori dava «non c'è niente qui». Adesso si apre a tutti.
- Il puntatore disegnato c'era solo sulla vetrina. Adesso è su ogni pagina del sito, 404 compreso.
- Su Discord l'avviso di diretta lo scrive il bot nel canale che scegli: non devi più creare un webhook a mano. Chi ce l'ha già lo tiene. [vai: notifiche]
- Un canale in sola lettura non zittisce più il bot: «sono-in-onda» resta di sola lettura per le persone, e lui ci scrive. [vai: dcserver]
- Il bot adesso può dare ai ruoli anche i poteri di moderazione, così «Moderatori» nasce già con i suoi: se l'avevi invitato prima, rifallo. [vai: ruoli]
- Dal costruttore decidi anche i ruoli: nome, colore, se stanno a parte, e cosa possono fare. Le tracce ne portano già quattro. [vai: dcserver]
- In piazza pulita spariscono anche i ruoli che non sono nella traccia, e si cancellano per ultimi: se qualcosa va storto non resti senza privilegi. [vai: dcserver]
- Quello che il bot non può toccare adesso te lo dice prima: i ruoli sopra di lui, e i privilegi che non ha da passare. [vai: dcserver]
- Quando una cosa non riesce, il messaggio parla di quella cosa: se non è riuscito a cancellare un canale non ti manda più a guardare i ruoli.
- I canali che il bot non vede o non può gestire adesso restano fuori dall'elenco, e te li dice prima: non ti promette più cose che poi non riescono. [vai: dcserver]
- In fondo alla home c'è un invito a dare una mano al progetto, al posto di un link perso fra privacy e termini.

## 2026-09-18

- Un contatore nuovo lo fai dal banco di regia, senza cambiare scheda: premi «Aggiungi», gli dai un comando e compare sulla tela già acceso. [vai: alert]
- Vuoi provarlo senza toccare l'overlay che hai già in OBS? Il banco te ne fa una copia, stesso layout e link suo, col contatore acceso solo lì. [vai: alert]
- L'annulla dello Studio non riporta più indietro anche l'elemento spostato un attimo prima: ogni cosa ha il suo passo. [vai: alert]
- Su un widget piccolo la maniglia per ingrandire finiva sotto quella del perimetro: ci cliccavi e invece di ingrandirlo gli davi una cornice. Adesso lì non c'è, e la dimensione la cambi dal pannello. [vai: alert]
- Il lucchetto tiene davvero: prima le maniglie restavano lì, e con quelle un elemento bloccato si poteva ancora ingrandire o girare. [vai: alert]
- Se il bot riparte mentre sei in onda la serata non si perde più: prima i numeri dicevano zero minuti, e quella diretta finiva senza lasciare il suo rapporto. [vai: statistiche]
- Quando parla di sua iniziativa non si intromette più fra due che stanno parlando: prende l'ultima cosa detta a tutti, e se non ce n'è una sta zitto. [vai: personalita]
- Nel rapporto di fine diretta le clip hanno il loro titolo vero, con quanto durano: prima c'era scritto solo perché il bot le aveva fatte, tipo «modulo». [vai: dirette]
- Parla di meno ma meglio: si aggiunge a un discorso vero fra due persone, non a una riga qualsiasi, e quando parte ha il taglio di uno della chat invece che di chi presenta la serata. [vai: personalita]
- Tutto quello che fa salire un contatore da solo sta in un posto suo: nei Comandi trovi CONTATORify, accanto ai contatori che muove. [vai: moduli]
- Le schermate di morte adesso stanno in comune: cerchi il gioco, la prendi e non insegni niente. Se una non ti prende bene la sistemi, e la sistemi per tutti. [vai: moduli]
- Counter-Strike e Dota dicono loro quante volte sei morto: metti un file nella cartella del gioco e il contatore sale da se', senza riconoscere niente. [vai: moduli]
- Muori e il numero sale da solo: fai vedere al bot la schermata di morte del gioco una volta, e poi ci pensa lui mentre giochi. L'immagine dello schermo non esce dal tuo computer. [vai: moduli]
- Mentre sei in onda le Statistiche si aggiornano da sole: la diretta di adesso conta già fra le dirette, coi suoi minuti e il suo picco, invece di comparire solo a fine serata. [vai: statistiche]
- Chi manda bit non viene più preso per spam: cinque «5 bit» di fila sono cinque messaggi uguali per forza, e adesso il filtro lo sa. [vai: regole]
- Le cose che il bot dice da solo non si accumulano più mentre la chat è ferma o la diretta è spenta: prima tornavano tutte insieme appena si riaccendeva. [vai: personalita]
- Il bot non spara più una riga appena si riavvia: se non si ricorda quando ha parlato l'ultima volta, conta da adesso. Se il processo ripartiva spesso, sembrava impazzito. [vai: personalita]
- Il bot fa il portiere del gruppo Telegram: chi entra non può scrivere finché non preme un tasto, e chi non risponde in tempo esce (e può rientrare). Lo accendi tu, ed è spento finché non lo fai. [vai: telegram]
- Per le sere diverse dalle altre ci sono le occasioni: un'aggiunta sopra l'overlay che hai già. La accendi e compare, la spegni e torna tutto com'era, e in OBS non tocchi niente. [vai: alert]
- Le occasioni partono da un modello che guardi prima di sceglierlo: subathon, torno subito, serata speciale, o una vuota da farsi da sé. [vai: alert]
- Nella colonna dei livelli la posizione scritta adesso è quella vera anche appena apri lo Studio. [vai: alert]
- I livelli mostrano quello che c'è in questo overlay, non più la lista intera con dentro anche lo spento. Il resto sta sotto «Aggiungi», dove trovi anche cartelli e immagini. [vai: alert]
- Lo Studio si muove più svelto: trascinare un elemento costa quasi la metà di prima. [vai: alert]

## 2026-09-17

- Le presenze si contano diretta dopo diretta: chi resta in chat almeno dieci minuti è presente, e le dirette di fila fanno una serie con un bonus in monete che cresce. Con !serie ognuno vede la sua. [vai: giochi]
- Il bot saluta chi scrive per la prima volta e chi torna dopo settimane, con le parole che scegli tu nella scheda Giochi. Se hai già un Modulo sul primo messaggio, vince il tuo. [vai: giochi]
- Nella scheda Memoria trovi chi c'è sempre: le serie di presenze più lunghe del canale. [vai: memoria]
- Ogni diretta finita lascia il suo rapporto nella scheda «Dirette», con durata, picco di spettatori, chat, follower, sub, raid, presenti, clip e donazioni. Un puntino ti dice quando ce n'è uno nuovo. [vai: dirette]
- Il rapporto può arrivarti appena chiudi, su Telegram in privato o via mail: l'indirizzo lo scrivi tu e vale dopo la conferma. [vai: dirette]
- I Moduli comandano la regia: un comando, la voce o un raid cambiano scena, mutano una fonte o la transizione nel programma con cui mandi in onda. Tre modelli pronti: torno subito, sono tornato, raid. [vai: moduli]
- Il marchio adesso esiste anche in vettoriale, pronto per il giorno che i programmi di posta mostreranno il nostro logo accanto al mittente. [vai: dirette]
- La pagina d’ingresso adesso pesa un settimo: chi arriva per leggere non si scarica più tutto il pannello, e il listino è già lì senza aspettare.
- L’hype train adesso sta nella scena: livello, barra, quanto manca e chi spinge di più. Il bot lo dice in chat quando parte, quando sale e quando finisce. [vai: alert]
- Puoi mettere in scena scritte e immagini tue: il titolo della serata, le regole, il logo, un «torno subito». Le trascini dove vuoi, fino a otto. [vai: alert]
- Un elemento con lo sfondo a zero diventava una lastra colorata invece di sparire. Adesso «senza sfondo» vuol dire davvero senza niente dietro. [vai: alert]
- Il rapporto di fine diretta dice anche a che livello è arrivato l’hype train e chi l’ha spinto. [vai: dirette]
- Gli eventi più lunghi venivano registrati a metà e il rapporto non riusciva più a rileggerli. Adesso ci stanno interi. [vai: dirette]
- La pagina d’ingresso è scesa ancora: adesso si porta dietro solo le animazioni che usa davvero, non quelle di tutto il pannello.
- Un’automazione può chiedere quanti Bit sono arrivati: sotto la soglia non parte, e con una fascia per scaglione scrivi una scala. Vale anche per gli spettatori di un raid e i mesi di un sub. [vai: moduli]
- Quando il treno è nell’ultimo quarto della salita il bot dice quanti punti mancano al livello dopo. Una volta per livello, e la frase la scrivi tu. [vai: alert]
- «!bit» dice chi ha messo più Bit oggi, questa settimana, questo mese o da sempre. E a chi non è sul podio dice a che posto è. [vai: moduli]
- Telegram adesso ha una scheda sua, nel gruppo nuovo «Le tue community»: era una voce dentro le notifiche, con dentro più roba di tutte le altre messe insieme. [vai: telegram]
- Mostrare un contatore a schermo lo azzerava. Adesso no: il numero resta quello, e mostrare e azzerare sono due comandi diversi. [vai: moduli]
- Dei contatori scegli tu le parole: quale comando aggiunge, quale toglie, quale azzera, e chi può usarlo. Verbo per verbo. [vai: moduli]
- Il numero adesso vale attaccato o staccato: «!morti +3» e «!morti + 3» sono la stessa cosa. Prima il secondo aggiungeva uno. [vai: moduli]
- Quando un comando è riservato, il bot lo dice invece di stare zitto. E lo dice bene: «ai moderatori e allo streamer», non «a i VIP». [vai: moduli]
- Nell’overlay c’erano due elenchi dei livelli, uno accanto alla tela e uno molto più in basso. Adesso ce n’è uno solo, quello che vedi. [vai: alert]
- Scegli un livello e a destra compare tutto quello che lo riguarda, con la tela sempre davanti: prima dovevi scorrere via per cambiarlo. [vai: alert]
- I livelli che si cambiano in un’altra scheda adesso te lo dicono, e ci si va da lì. [vai: alert]
- Nascondere un cartello in un overlay non restava nascosto dopo il salvataggio. Adesso sì. [vai: alert]
- In fondo a ogni mail che ti mandiamo c'è un codice di verifica. Lo ritrovi solo nella scheda Stato: se non combacia, quella mail non è nostra. [vai: stato]
- Nell'elenco della posta adesso si legge il nome di chi scrive, non il pezzo prima della chiocciola. [vai: dirette]
- C'è una scheda «Statistiche»: i numeri del canale per sette giorni, trenta o da sempre, e cinque classifiche. Prima erano sparsi fra Memoria, Giochi e Dirette. [vai: statistiche]
- La mail del rapporto adesso apre dicendo com'è andata, non con una tabella. In fondo trovi le clip della serata, una per una, da riaprire. [vai: dirette]
- Se non hai ancora messo un indirizzo, la prima volta che entri te lo chiedo una volta sola. Dici no e non te lo chiedo più. [vai: dirette]
- Basta tenere il pannello aperto sul computer della diretta: si ricollega da solo alla regia appena lo apri, e riprova quando il programma si chiude. [vai: consolify]
- Chi trasmette su due piattaforme sceglie quali chat vanno a schermo in ogni overlay. Per tenerle divise ne fai un secondo con l'altra accesa: ha un link suo. [vai: alert]
- Quando due chat stanno nello stesso riquadro, ogni riga può portare un segno che dice da dove arriva. Lo accendi in «Segna da dove arriva». [vai: alert]
- Togliere una chat dallo schermo non la spegne: il bot continua a leggerla e a rispondere. [vai: alert]
- Sulla pagina iniziale di SocialBot c'è una fascia con chi è in diretta adesso. Ci compari se lo accendi tu, dalla scheda Stato. [vai: stato]
- Della tua diretta si vedono nome, titolo, categoria e quanta gente ti guarda: niente dei tuoi spettatori. Spegni e sparisci. [vai: stato]
- Alla prossima apertura del pannello te lo chiedo io, una volta sola. Rispondi no e non te lo chiedo più. [vai: stato]
- Arriva il subathon: il conto alla rovescia dell'overlay si allunga con sub, bit e donazioni, quanto decidi tu. Si accende dallo Studio, sotto al conto. [vai: alert]
- Metti un tetto in ore e la fine non va mai oltre: una serata fortunata non ti porta a dormire alle sette. Con !subathon la chat sa quanto manca. [vai: alert]
- Chi rinnova l'abbonamento adesso fa scattare l'alert e conta negli obiettivi. Prima il rinnovo al bot non arrivava proprio. [vai: alert]
- Una raffica di regali conta un sub per ogni sub, non uno in più: l'annuncio della raffica serve all'alert, non al conto. [vai: alert]
- Nelle classifiche del canale non ci sei più tu: ore, monete, messaggi e serie contano chi ti guarda. Il totale dei messaggi resta intero. [vai: statistiche]
- Gli auguri di compleanno adesso arrivano anche in chat, al primo messaggio di chi li compie. Nel gruppo restano a mezzanotte, come prima. [vai: telegram]
- Chi ti guarda si segna il compleanno da solo: scrive !compleanno 25/12 e tu non devi toccare niente. Con !compleanno via lo toglie. [vai: telegram]
- Insieme agli auguri in chat può partire un effetto della tua libreria. Lo scegli dalla scheda Telegram. [vai: telegram]

## 2026-09-16

- Nella scheda «Abbonamento» aggiungi gli extra da lì: spunti quello che ti manca, leggi il totale e attivi. Chi ha già il Base non lo ripaga: l'extra entra nell'abbonamento che c'è. [vai: sottoscrizione]
- Se un rinnovo non va a buon fine, la scheda te lo dice e il tasto porta al portale per cambiare carta: appena il pagamento passa, le funzioni tornano da sole. [vai: sottoscrizione]
- Tornando dal pagamento, il piano risulta attivo solo quando Stripe ha confermato davvero. Se l'incasso è ancora in corso lo leggi, e il piano si accende da solo dopo. [vai: sottoscrizione]
- L'Essenziale non scade mai: chi esce dalla community o disdice un abbonamento resta con il bot acceso e perde solo le funzioni in più. [vai: sottoscrizione]
- Le donazioni passano da SocialBot: nella scheda «Donazioni» colleghi il tuo conto Stripe, tuo e gestito da te, e chi ti segue dona dalla tua pagina link. Il pagamento arriva a te. [vai: donazioni]
- Anche Satispay: colleghi il tuo negozio online con il codice di attivazione, e chi ha l'app paga da lì. Con tutti e due, chi dona sceglie. [vai: donazioni]
- Una pagina tutta per le donazioni, su dona.socialbot.live/iltuonome (o socialbot.live/dona/iltuonome): stessi strumenti della pagina link, un'altra pagina, e il tasto «Sostieni» della pagina link può portare lì. [vai: donazioni]
- Le offerte: fino a otto scaglioni con importo, nome ed effetto della tua libreria. Chi dona le vede al posto degli importi, e all'arrivo parte l'effetto dell'offerta raggiunta. [vai: donazioni]
- Chi dona, da un importo che decidi tu in su, può allegare un'immagine o una GIF: va in onda come un effetto, dopo che l'hai vista nel registro e l'hai mandata tu con un tasto. [vai: donazioni]
- Se preferisci, l'immagine di chi dona parte da sola appena il pagamento è confermato: lo scegli nella scheda delle donazioni, e la puoi sempre rimandare, scartare o togliere. [vai: donazioni]
- L'indirizzo corto dona.socialbot.live/iltuonome si accende da solo: quando lo vedi nella scheda «Donazioni» al posto di quello lungo, è pronto da condividere. [vai: donazioni]
- Il proprietario può aprirti funzioni oltre il tuo piano, o chiuderne, quando serve: lo leggi nella scheda «Il tuo bot», con la scadenza se c'è. [vai: stato]
- Quando incolli la pagina link o quella delle donazioni su Telegram, WhatsApp o Discord, l'anteprima è una card coi colori della tua pagina, e la rifai come vuoi con l'editor delle locandine. [vai: pagina]
- Un blocco «Chi ha donato» per la pagina link e per la pagina delle donazioni: gli ultimi sostenitori o i primi per somma, del mese o di sempre, quanti nomi vuoi. [vai: pagina]
- Per il tasto «Sostieni» scegli l'icona fra quelle della pagina, come per ogni link; di serie è un cuore. [vai: pagina]
- Sulla pagina link il puntatore disegnato resta suo anche sul blocco delle donazioni: stella sui tasti e sugli importi, penna intorno, cursore di testo solo dove si scrive. [vai: pagina]
- A ogni donazione ricevuta sul conto partono da soli l'avviso in overlay, il grazie in chat e l'obiettivo in euro. Nella scheda vedi le ultime arrivate, con nome e messaggio. [vai: donazioni]
- Il minimo e il massimo per una donazione li decidi tu nella scheda «Donazioni»: il massimo parte da 500 e può arrivare a 5.000. [vai: donazioni]
- Ogni donazione finisce nel registro della scheda «Donazioni»: totali di oggi, del mese e dell'anno, ricerca, scarico in CSV; per ogni riga puoi rimandare l'avviso, rimborsare dal tuo conto o cancellarla. [vai: donazioni]
- Le voci «Donazioni» e «CONSOLify» del menù del pannello hanno la loro icona, come tutte le altre. [vai: consolify]
- Nel player puoi mettere un tuo video in loop, caricato fra gli Effetti: sfocato sullo sfondo al posto della copertina, o in chiaro sulla copertina stessa. Con i temi vinile e CD la copertina resta quella del disco. [vai: alert]
- Donazioni: nella scheda «Donazioni» dici come si dona (sul tuo conto, oppure Ko-fi, PayPal o altro) e il tasto «Sostieni» compare sulla tua pagina link, col tuo tema. [vai: donazioni]
- Con il token di Ko-fi ogni mancia accende l'avviso «Donazione» in overlay, il grazie in chat e fa salire l'obiettivo in euro, che si può mostrare anche sotto il tasto «Sostieni». [vai: alert]
- Nel player la disposizione «libera» mette ogni pezzo dove lo trascini sulla tela: copertina, righe, barra, tempi e onde, con righe e barra larghe quanto vuoi. Si parte da dove i pezzi stanno già, e in diretta è uguale. [vai: alert]
- Gli extra Clip automatiche e Squadra costano 1,99 € al mese ciascuno, i comandi a voce 0,99 €: il listino dice quello che Stripe addebita, e i tre insieme restano 3,99 € con «Tutto». [vai: sottoscrizione]
- Giochi e monete, alert ed effetti, sondaggi e richieste musicali con il player sono nell'Essenziale, gratis: quello che gli altri bot danno gratis, qui è gratis. [vai: sottoscrizione]
- Il piano vale anche mentre il bot lavora, non solo quando salvi: clip automatiche, avvisi e ascolto a voce seguono il tuo piano, e nel pannello ogni funzione a pagamento ha il suo muro con il pacchetto giusto. [vai: sottoscrizione]

## 2026-09-12

- Il player ha due temi nuovi, CD ed esagono, e ogni tema porta la sua animazione: il vinile gira, il CD cambia riflesso, l'anello dell'esagono ruota. Scegli il tema e basta. [vai: alert]
- Ogni tema del player entra ed esce come l'oggetto vero: il vinile prende giri e poi frena e rientra nella custodia, il CD esce e la custodia si chiude, la cassetta viene espulsa. [vai: alert]
- Nello Studio, «Rivedi l'entrata» fa uscire e rientrare il player sulla tela, per vedere il gesto del tema senza andare in diretta. [vai: alert]
- L'entrata del player (dissolvenza, scivola, sale) in diretta ora parte davvero: prima il nodo compariva già al suo posto. [vai: alert]
- Nel player messo in colonna il testo sta dentro la carta e la copertina è al centro: i tempi non escono più dal bordo. [vai: alert]
- L'anteprima del link, quando lo incolli su Telegram, WhatsApp o X, dice la stessa cosa della pagina: il bot che in chat scrive con il tuo nome, con l'immagine rifatta.
- La pagina pubblica racconta una serata di diretta con il bot acceso, momento per momento, al posto delle schede tutte uguali; l'elenco completo delle funzioni resta, con i prezzi accanto.
- Nell'invito in fondo alla pagina pubblica ci si registra anche con Kick (e con YouTube dove è aperto), come in cima alla pagina: lì era rimasto solo Twitch.
- Sotto la tela dello Studio puoi mettere un'immagine di riferimento, uno screenshot della scena o una grafica: resta nel tuo browser, non va in onda, e la regoli in trasparenza. [vai: alert]
- Nello Studio il riquadro è la scatola dell'elemento: tiri il perimetro del player e lui prende quella forma, largo, stretto o quadrato; l'altezza dà la grandezza, la larghezza lo spazio al testo. [vai: alert]
- Mentre tiri i bordi di un riquadro vedi l'elemento cambiare in tempo reale, e la chat in anteprima riempie la sua scatola con quante righe ci stanno. [vai: alert]
- Il player musica si regola pezzo per pezzo: spazio attorno, copertina, vinile, prima e seconda riga, tempi, barra e onde hanno ognuno la sua misura e, se vuoi, il suo colore. [vai: alert]
- Il conto alla rovescia con «parte da solo» parte appena lo accendi, senza premere «Fai partire», e il pannello lo vede contare anche quando l'ha fatto partire una sorgente. [vai: alert]
- La sfida a tempo dei punti canale compare davvero sull'overlay (l'avvio si perdeva per strada) ed è un elemento della scena: la sposti, le dai un riquadro, e sulla carta si legge quanto manca. [vai: alert]
- Nell'editor degli overlay ogni elemento può avere un riquadro: tiri i bordi e chat, alert, player, widget, obiettivi e contatori si adattano a quello spazio, uguale sulla tela e in diretta. [vai: alert]

## 2026-09-11

- L'editor degli overlay chiede prima di farti perdere l'aspetto non salvato, se cambi scheda, overlay o pagina; dice quando un salvataggio non riesce; e non manda più salvataggi doppi. [vai: alert]
- Nell'editor degli overlay un livello si può bloccare perché non si sposti per sbaglio, l'aggancio alle guide si spegne, con Ctrl e rotella si ingrandisce attorno al puntatore, e la griglia si toglie davvero. [vai: alert]
- In chat il bot non parla più da assistente: niente «implementazione», «non sono in grado», «funzionalità». Se una cosa non è sua lo dice come uno della chat, e una riga di quel tipo non esce e non gli torna in mente. [vai: personalita]
- L'overlay in OBS si ricollega da solo dopo un riavvio del bot o un salto di rete: chat, effetti e tasti di CONSOLify ripartono senza toccare la sorgente. Quelle aperte da prima di oggi vanno ricaricate una volta. [vai: alert]
- Nell'editor degli overlay la tela ha le misure della diretta: il player tiene la stessa larghezza con ogni brano, la chat si ferma alla larghezza scelta, i contatori hanno la dimensione vera. [vai: alert]
- Quando parla da solo, il bot lo fa per un motivo e non più a caso: risponde a chi è rimasto senza risposta se sa la cosa, rilancia la chat che si ferma dopo un momento vivo, sale sull'onda quando esplode. [vai: personalita]
- Risposte e battute di sua iniziativa escono con il tempo di una persona che scrive, mai due di fila dello stesso genere, e se hai appena scritto tu lascia la chat a te. [vai: personalita]
- Di sua iniziativa il bot non parla più due volte in sei minuti, e il promemoria dei tuoi link esce al più ogni tre quarti d'ora: prima poteva ripeterlo a tre minuti di distanza. [vai: personalita]
- Nella scheda del bot vedi cosa ha detto da solo, con l'ora e il motivo, e puoi dirgli di farlo solo mentre sei in diretta. [vai: personalita]
- La chat autonoma parte a zero, come dice il cursore: prima il cursore mostrava 3%, il manuale 5% e il bot stava a zero. [vai: personalita]
- Quando la connessione alla chat muore in silenzio il bot se ne accorge e si ricollega da solo, invece di restare acceso e muto con la spia verde. [vai: stato]
- Se il permesso di Twitch scade, prova a rinnovarlo da solo prima di chiederti di ricollegare; e una risposta rimasta ferma durante una caduta non esce in ritardo di minuti. [vai: stato]
- Gli avvisi di follow, iscrizione e diretta che Twitch rifiutava per un attimo di troppo traffico ora si riattivano da soli poco dopo. [vai: alert]
- Per sicurezza il link dei tuoi overlay è stato rinnovato: copialo di nuovo dal pannello e rimettilo nelle sorgenti del programma con cui mandi in onda. [vai: alert]
- Il link dell'overlay ora porta la chiave con sé, e accanto c'è il tasto per farne uno nuovo: se ti scappa in un video o in una chat, lo rinnovi e il vecchio muore subito. [vai: alert]
- Un'icona caricata come disegno vettoriale viene trasformata in immagine: quello che carichi resta un'immagine e basta. [vai: consolify]
- Ogni canale ha un tetto di spazio sul disco per media, effetti, font e icone, e il pannello ti dice quanto ne usi: prima nessuno lo contava. [vai: effetti]
- Sulla pagina pubblica ora si vede anche CONSOLify, con il collegamento al programma della diretta: prima chi non aveva un account non sapeva che esistesse. [vai: consolify]
- Compaiono in vetrina anche le grafiche pronte da pubblicare, il registro della moderazione e quello che il bot ricorda dei tuoi spettatori. [vai: grafiche]
- Ogni novità dice anche dove è successa: le righe stanno sotto il nome della sezione, e quel nome è un bottone che ti porta lì. [vai: stato]
- Una carta adesso si stacca dalla pagina più dei bottoni che ci stanno dentro: prima avevano la stessa ombra e sembrava tutto appiccicato sullo stesso piano.
- Le scritte piccole sopra le schede e nel menù laterale erano troppo chiare per leggerle bene: ora hanno il contrasto che serve, col tema chiaro e con quello scuro.
- Il bottone che cancella tutto aveva la scritta bianca su rosso chiaro nel tema scuro, poco leggibile proprio dove conta: adesso è scritta in nero. [vai: stato]

- La finestra delle novità non perde più quello che arriva a giornata iniziata: se una cosa esce dopo che l'hai vista, te la mostra lo stesso invece di darla per letta.
- Quando le novità sono tante, la finestra ne mostra una manciata e dice quante altre ci sono, invece di rovesciarti addosso un muro di righe.

## 2026-09-10

- Con la regia collegata sul computer, i tasti scena funzionano anche premuti dal telefono o da una tastiera fisica: il pannello aperto lì fa da ponte. [vai: consolify]
- Se nessun pannello è aperto su quel computer, il tasto te lo dice invece di rispondere «fatto». [vai: consolify]
- I menù con tante voci non si schiacciano più: prima con dieci scene i nomi venivano tagliati a metà, ora la lista scorre. [vai: consolify]
- I menù a tendina del pannello sono disegnati come il resto del sito, tutti: prima solo uno lo era e gli altri uscivano col grigio del sistema.
- Un tasto si crea da un posto libero: nasce vuoto e si apre la sua scheda, dove costruisci quello che vuoi. Non devi più scegliere un'azione da una tendina prima di poter fare niente. [vai: consolify]
- Nella scheda ci sono idee pronte — manda un link, manda un suono, cambia scena, vado in pausa — che sono un punto di partenza: poi cambi tutto. [vai: consolify]
- Collegata la regia, ti do io scene, fonti e transizioni: nei tasti le scegli da un elenco invece di ricopiare i nomi a mano. [vai: consolify]
- Le schede aperte si aggiornano appena il collegamento va a buon fine, invece di restare come prima. [vai: consolify]
- Collegare il programma con cui mandi in onda è un clic: indirizzo e porta non te li chiedo, li provo io. Se lì l'autenticazione è spenta, hai finito lì. [vai: consolify]
- Se invece chiede una password, te lo dico e compare un campo solo per quella. Dalla volta dopo mi collego da solo quando apri la scheda. [vai: consolify]
- Puoi collegare il programma con cui mandi in onda: compaiono le tue scene, le cambi da qui, e i tasti possono cambiare scena o mutare una fonte dentro una fila di passi. [vai: consolify]
- Indirizzo e password di quel collegamento restano nel tuo browser: non arrivano al nostro server e non entrano nel database. Con «Scorda tutto» spariscono anche da lì. [vai: consolify]
- Funziona sul computer dove gira quel programma. Dal telefono i tasti del bot vanno come sempre, ma le scene no, e la scheda te lo dice prima. [vai: consolify]
- Un tasto può mandare in onda un'immagine, un video o un suono caricati lì sul tasto: non devi più farne prima un effetto con un suo comando in un'altra scheda. [vai: consolify]
- Durata e volume di quel media si cambiano dal tasto, e quando lo sostituisci il file vecchio se ne va invece di restare sul disco per sempre. [vai: consolify]
- Un tasto di CONSOLify può fare più cose di seguito, non una sola: dire una frase, aspettare, lanciare un effetto, mandare il risultato di un comando — nell'ordine che scegli tu. [vai: consolify]
- I passi si aggiungono, si spostano e si tolgono dalla scheda del tasto, e se uno non riesce gli altri succedono lo stesso. [vai: consolify]
- I tasti che avevi già continuano a funzionare: diventano una fila di un passo solo, senza che tu debba rifarli. [vai: consolify]
- I tasti di CONSOLify creati prima di oggi ripartono: alcuni non avevano un indirizzo valido e premerli non faceva niente, ora si sistemano da soli alla prima apertura. [vai: consolify]
- Il conto alla rovescia può partire da solo quando si apre l'overlay: metti su la scena d'attesa e il conto è già andato, senza premere niente. [vai: alert]
- Quello che metti su CONSOLify arriva a tutti i tuoi overlay: premi e parte, senza collegare niente a mano. [vai: consolify]
- Ogni overlay può rifiutare i tasti per conto suo, dall'elenco degli elementi, senza rifiutare anche gli effetti che gli arrivano dalla chat. [vai: effetti]
- Premere un tasto di CONSOLify senza nessun overlay collegato non dice più «fatto»: l'effetto non avrebbe dove andare, e adesso te lo dice invece di farti credere che sia partito. [vai: consolify]
- In cima alla plancia c'è una spia che dice se un overlay è collegato, così lo sai prima di premere e non dopo. [vai: consolify]
- I video degli effetti vanno fino in fondo: prima li chiudeva un tempo memorizzato, e se quel tempo era sbagliato il video spariva dopo un fotogramma senza mai partire. [vai: effetti]
- Se il browser non dà il permesso di partire con l'audio, il video parte muto invece di restare fermo, e negli errori trovi scritto che è successo. [vai: effetti]
- Quando un overlay non riesce a far partire un suono o un video, ora lo dice invece di restare zitto: il motivo lo trovi fra gli errori, con scritto cosa non è andato. [vai: effetti]
- I tasti di CONSOLify hanno il tratto disegnato del resto del sito, e si distinguono sia col tema chiaro sia con quello scuro; i posti liberi si vedono che sono posti, non tasti spenti. [vai: consolify]
- La plancia vuota non è più una frase: i posti liberi si vedono, e sotto c'è scritto come riempirli — con il consiglio giusto a seconda che tu stia sistemando i tasti o usandoli. [vai: consolify]
- Ogni tasto di CONSOLify ha il suo indirizzo, e punta al tasto invece che all'azione: se domani a quel tasto cambi mestiere, nome o icona, sulla tastiera fisica non rifai niente. [vai: consolify]
- Scegli il formato della plancia — da 3×3 a 5×8 — e quanto stanno grandi i tasti: parti da una griglia vera invece che da un foglio bianco, e i posti liberi si vedono. [vai: consolify]
- Sul telefono la plancia si apre di lato: in verticale i tasti sarebbero francobolli, e te lo dice invece di darteli schiacciati. [vai: consolify]
- Quello che scrivi nella scheda di un tasto si salva da sé quando esci dal campo: non c'è più un «Salva» da ricordarsi, e non si perde niente scegliendo un colore.
- Rigenerare la chiave degli indirizzi si fa dal pannello e chiede conferma: i vecchi indirizzi smettono di funzionare subito.
- Quando entri dopo un aggiornamento una finestra si apre in mezzo allo schermo e ti dice cosa è cambiato; se ti sei perso qualche giorno, li trovi tutti in elenco.
- I tasti di CONSOLify si personalizzano in tutto: nome, colore libero, conferma prima di premere, e l'icona la scegli da un elenco disegnato oppure carichi la tua immagine.
- L'immagine che carichi ha un suo indirizzo, così la stessa faccia la puoi mettere anche sul tasto di una tastiera fisica.
- I tasti si trascinano per ordinarli, si duplicano e si spostano fra le pagine.
- La chiave degli indirizzi ora sta coperta: quella scheda si apre mentre streami, e prima si leggeva a schermo.
- Nuova sezione CONSOLify: i tasti del tuo canale sotto le dita mentre streami — contatori, effetti, una battuta, una frase — sul telefono, sul tablet o su un secondo monitor.
- I tasti nascono da soli dai tuoi contatori e dai tuoi effetti, e ognuno mostra com'è andata: premi e leggi il numero nuovo.
- Gli stessi tasti li puoi mettere su una tastiera fisica: la scheda ti dà l'indirizzo già pronto da incollare, e icona e nome li scegli lì.
- Quando il serbatoio delle battute è vuoto, il bot ne costruisce una con i numeri del tuo canale — morti, tentativi, quello che conti tu — invece di chiederne una generica.
- E impara quale modo di costruirle fa ridere lì: dopo averla detta conta chi ride davvero, e la volta dopo usa il modo che ha funzionato.

## 2026-09-08

- Se la domanda tocca qualcosa che il cervello sa costruire — un calcolo, una deduzione, una catena di cause — risponde lui, e la risposta resta imparata.
- Il conto in chat arriva comunque: se il cervello è spento lo fa il bot, e chi guarda non vede differenza.

- Se il pannello non riesce a contattare il server, la pagina dice di chi è il software invece di mostrare solo un errore.

- Il menù per scegliere l'overlay non è più quello grigio del sistema: è disegnato come il resto del pannello, e si usa anche con la sola tastiera.
- Sul telefono resta quello del sistema, perché lì la ruota è più comoda di qualunque cosa possiamo disegnare.

- Il bot pensa una cosa per volta. Prima più richieste insieme si dimezzavano il processore a vicenda e finivano tutte fuori tempo: nessuna risposta usciva.
- Mentre qualcuno sta parlando, il bot smette di studiare per conto suo. La domanda di una persona viene prima del suo rimuginare.

- L'interruttore delle battute automatiche si spegne da solo se la chat autonoma è spenta, e dice perché: prima si poteva accendere senza che cambiasse niente.

- Le ricette e le domande da enciclopedia funzionano davvero: prima la ricerca non partiva mai e il bot ripiegava su «insegnamela dalla dashboard».
- Il comando delle battute si può rinominare e spegnere dal pannello come tutti gli altri, e ha una sua voce fra le famiglie.

- Se chiami il bot per nome ti risponde sempre. Prima, dopo una risposta restava muto per quarantacinque secondi anche a chi lo chiamava: sembrava morto.
- Ogni tanto dice una battuta da solo, se lasci accesa la chat autonoma. Si spegne dalla scheda Giochi.
- Le battute che fanno ridere escono più spesso: dopo ognuna il bot conta quante persone diverse ridono davvero.
- Le battute si gestiscono anche dalla dashboard, con quante volte sono state dette e quante hanno funzionato.
- Quello che il bot trova cercando se lo scrive. La stessa domanda, la seconda volta, ha risposta immediata.

- Nuovo comando !battuta. Il bot pesca dal serbatoio del canale, e mod e streamer lo riempiono con !battuta aggiungi.
- Non ripete: esce sempre la meno detta di recente, non una a caso.
- Se il serbatoio è vuoto se ne fa venire una dal cervello, con il carattere del canale addosso.
- Le ricette funzionano anche chiedendole come si chiedono davvero: «Bot mi dai la ricetta della carbonara?», non solo «ricetta carbonara».

- Il bot risponde alle domande cercando davvero. Prima restituiva l'introduzione di Wikipedia: a «capitale della Francia» rispondeva quanto è grande la Francia.
- Le ricette arrivano dal ricettario, non dall'enciclopedia: ingredienti e una riga di preparazione, non la storia del piatto.
- Quello che trova lo dice con parole sue, nel tono che gli hai dato. Prima il testo trovato usciva grezzo, e solo quando il modello era spento.
- Nuovo campo Carattere in Personalità: scrivi con parole tue com'è fatto il bot, e vale ovunque parli.
- Se non trova niente che c'entri con la domanda, tace invece di rispondere a caso.

- Il bot fa i conti: «quanto fa 4+4», «7 x 8», «20% di 90», anche con le parentesi. Il risultato lo calcola, non lo indovina, quindi è sempre giusto.
- Quando un numero è ambiguo tace invece di rischiare: «1.000» in italiano è mille, ma scritto in chat può essere uno virgola zero, e non c'è modo di saperlo.
- Se il messaggio non è un conto non risponde. Nessuna risposta a «ho 2 gatti e 3 cani».

- Scegli come il bot parla di sé: femminile, maschile, o senza dirlo. Sta in Personalità, sotto il tono.
- Prima cambiava a ogni frase. Le battute scritte a mano erano tutte al maschile («sono apparso»), e il resto lo decideva lui volta per volta.
- Chi non sceglie niente non rischia: il bot gira la frase e non dichiara nessun genere, invece di darsene uno a caso.

- Puoi sfidare a duello lo streamer. Il bot parla con il suo account e non vede i propri messaggi, quindi lui risultava sempre «non in chat» anche mentre stava scrivendo.
- Si può sfidare anche chi c'è e sta zitto. Prima contava solo chi aveva parlato negli ultimi trenta minuti, e metà della chat era invisibile.

- La scheda del giro guidato non sporge più dal bordo dello schermo mentre compare. Entrava salendo di quattordici pixel, e quando si appoggiava in fondo quei pixel la portavano fuori.

- Sulla pagina link, un avatar con l'indirizzo rotto mostra l'iniziale invece dell'icona di immagine spezzata. Il ripiego c'era da tempo, ma il browser lo rifiutava e non era mai partito.

- Il tasto sotto il mouse lo segue senza scattare. Prima il movimento ripartiva da capo a ogni spostamento del puntatore e non arrivava mai a destinazione.
- I tasti si sollevano davvero quando ci passi sopra: si staccano dalla pagina invece di spostarsi di un pixel, e restano davanti a quello che hanno intorno.
- L'ombra dei tasti non viene più tagliata dal bordo della scheda che li contiene. Su Safari era tagliata sempre, perché quel browser non conosce il permesso di sfogo.
- Chi tiene acceso il movimento ridotto vede la profondità senza il movimento: l'ombra cresce lo stesso, il tasto non si sposta.

- Il giro guidato non finisce più mezzo fuori dallo schermo. Su sette schede, sei avevano almeno un passo con la scheda dei suggerimenti tagliata dal bordo.
- L'ultimo passo, quello che dice dove trovare il manuale, si piantava dove stava il passo prima. Adesso sta in mezzo, e in mezzo davvero.
- Quando il passo indica qualcosa che sta più in basso nella pagina, il riquadro aspetta di stare dentro la finestra invece di seguirlo fuori.
- Nella demo un link diretto a una scheda porta dove dice. Prima si atterrava sempre sulla prima.

- La pagina della moderazione è divisa in tre: Chat per i filtri sui messaggi, Scudo per la difesa dagli attacchi, Registro per quello che è successo.
- Lo stato dello scudo sta dove si accende: acceso o spento, il livello di adesso, quanti follow servono per far scattare l'allarme.
- Le due liste «blocca sempre» e «non toccare mai» stavano in due posti e si cancellavano a vicenda: un nome aggiunto di qua spariva salvando di là. Ora stanno in un posto solo e si salvano da sole.
- Sola osservazione, quanto presto reagire e la segnalazione di chi guarda molti canali: le tre caselle c'erano, il salvataggio le buttava via. Adesso restano.
- Un salvataggio parziale non azzera più il resto. Soglia, timeout ed età minima restavano indietro a ogni «Salva» senza dirlo.
- Nel registro ogni attacco è una scheda che si apre: chi c'era diviso per giudizio, e la pulizia dei follower finti con il numero da riscrivere per confermare.
- Le azioni che non erano riuscite adesso si vedono, e si riprendono da lì.

- Chi scrive nel tuo canale da mesi non finisce più nel mucchio durante un'ondata di follow finti, nemmeno con un nome che somiglia a quelli dei bot.
- Per essere di casa servono una trentina di messaggi e un paio di mesi. Il volume da solo non basta: quattrocento righe in un'ora sono un motivo di sospetto.
- Pesano anche i precedenti. Un account che lo scudo ha già fermato lì da poco parte in salita, e questo vale solo nel canale dove è successo.
- Un giudizio vecchio conta meno di uno nuovo: ogni novanta giorni vale la metà, dopo un anno non ne resta praticamente niente.
- Essere stati lasciati stare durante un attacco non lascia alcuna traccia.
- La fiducia sposta il punteggio, in bene e in male, ma da sola non fa mai togliere nessuno: per agire serve sempre un fatto indipendente.

## 2026-09-07

- Il bot risponde agganciando la risposta al messaggio di chi gli ha scritto, come fa una persona col tasto «rispondi». Vale su Twitch e su Kick.
- Prima di rispondere aspetta un momento, come chi legge e scrive. Adesso quel momento segue il ritmo della chat: se vola risponde subito, se è calma si prende il suo tempo.
- Vede se chi gli scrive è moderatore, abbonato o VIP, e se è la prima volta che scrive da te. Non cambia cosa risponde, cambia il modo: a un nuovo arrivato non dà per scontate le cose del canale.
- Quando parla di sua iniziativa si aggancia a quello che vi state dicendo. L'elenco di frasi fatte non c'è più, e cadeva sempre in mezzo a discorsi che non c'entravano.
- Se non ha niente di suo da dire, sta zitto.
- Lo scudo anti-bot adesso ha sei livelli e sale un gradino alla volta. Prima guarda, poi avvisa i moderatori, poi rallenta la chat, e solo alla fine la chiude ai soli follower.
- Una clip andata bene non fa più chiudere la chat. Tanti follow di cui non si sa niente alzano l'attenzione, non la serranda.
- Quando l'attacco passa si scende un gradino per volta, riaprendo subito quello che non serve più.
- Puoi scegliere quanto presto reagire: prudente, bilanciata o aggressiva.
- Davanti a un'ondata di follow finti il bot riconosce quali nomi vengono dalla stessa fabbrica e toglie solo quelli. Chi era capitato lì in mezzo resta dov'è.
- Se non riconosce nessun gruppo non se lo inventa, e tratta l'ondata come una cosa sola.
- Vengono fermati anche i follow finti che arrivano piano piano, uno ogni pochi secondi per dieci minuti. Passavano indisturbati.
- Un'ondata così veloce da arrivare tutta insieme adesso si vede. Era proprio quella che scappava.
- Per dire che un'ondata è finta il bot aspetta di aver visto quindici follow. Con sei, un picco vero su dodici finiva scambiato per finto.
- Convincendosi a metà ondata riprende anche i follow arrivati prima, invece di partire da quel momento.
- Il ritmo del tuo canale non si impara più da due minuti di attacco. Perché conti servono ore.
- Un raid vero in cui trecento persone salutano con la stessa frase non viene più scambiato per un attacco.
- Una chat che ripete una frase corta tutti insieme nemmeno. Servono trenta caratteri e cinque parole, non quattordici caratteri.
- Il rilevamento dello stesso messaggio da tanti account resta acceso anche spegnendo l'elenco dei nomi da bot.
- Gli attacchi si misurano sull'ora in cui sono successi, non su quella in cui arrivano al bot.
- Ogni attacco diventa una scheda sola invece di trecento righe di registro: quando è cominciato, quanto è durato, quanto forte è andato, chi c'era, cosa ha fatto il bot.
- Un attacco che riprende dopo pochi minuti resta lo stesso attacco, e il conto dei danni non si spezza in dieci pezzi.
- Nella scheda chi è arrivato durante l'attacco è diviso fra bot certi, sospetti e persone vere.
- Finito l'attacco puoi ripulire i follower finti partendo da quella divisione. Le persone vere restano fuori, e per eseguire devi riscrivere quanti account stai per togliere.
- Se il bot si riavvia mentre un attacco è in corso, la scheda si chiude e resta.
- C'è la sola osservazione: lo scudo lavora e scrive cosa avrebbe fatto, senza bannare, bloccare o cancellare niente. Serve per vedere come si comporta prima di lasciarlo agire.
- Un'azione che non riesce non si perde. Resta in sospeso e la fai riprovare dalla console.
- Nel registro c'è anche cosa ha risposto Twitch, non solo se è andata.
- Nella console trovi quanto ha sbagliato: chi era stato segnalato e poi ha scritto in chat era una persona.
- Lo stesso evento che arriva due volte non fa bannare due volte.
- La cancellazione di un messaggio di spam passa avanti alla pulizia dei follower finti, che può aspettare.
- I canali che usano il bot si scambiano quello che scoprono. Un account bloccato durante un'ondata da una parte diventa noto anche agli altri, e la lista cresce da sola.
- Perché un nome entri in quella lista servono tre canali che lo riconoscano ciascuno per conto suo, e solo per cose misurate sul momento.
- Un nome nella lista comune scade dopo tre mesi e si può togliere subito.
- Lo scudo riconosce anche i bot che guardano e basta. Un account presente in molti canali nello stesso momento, che non scrive mai, viene segnalato: decidi tu.
- Il giudizio su un account non somma più tre volte la stessa cosa. Un nuovo spettatore senza foto né bio prendeva lo stesso punteggio di un follow-bot vero.
- Per togliere il follow serve sempre un fatto che una persona non può produrre: il nome riconosciuto, o la presenza in molti canali. Il resto fa solo segnalare.
- Se Twitch non risponde mentre lo scudo controlla l'età di un account, riprova al messaggio dopo.
- Il filtro dei link guarda il dominio del link, non il testo intorno. Bastava nominare da qualche parte un sito permesso e il filtro si spegneva.
- I messaggi normali scritti col punto attaccato, tipo «lascia stare.io ci provo», non vengono più cancellati. Su quindici frasi di chat vere ne finivano cancellate dieci.
- Una parola vietata resta vietata anche scritta con un accento.
- Nel pannello sei scritte avevano l'apostrofo al posto dell'accento, e adesso sono scritte come si deve.
- Quando la cancellazione è finita te lo dice una nuvoletta disegnata come il resto del sito, invece della finestrella grigia del browser.
- Nella finestra di ricerca il Tab non esce più dietro al velo, Escape chiude da qualunque punto e chiudendo il cursore torna dove eri. Prima girava nella pagina sotto, che non si vede.
- Il bot legge e risponde nella chat delle tue dirette YouTube, con gli stessi comandi, moduli e monete di Twitch. Si accende da Stato → Le tue piattaforme.
- Nella sezione Andarsene si vede cosa c'è da cancellare scritto a parole — messaggi ricordati, citazioni, comandi — invece dei nomi interni del database.
- Da Stato → Andarsene puoi cancellare l'account e tutto quello che contiene, file caricati e collegamenti compresi. Non si annulla: per confermare va scritto il nome del canale.
- Se il bot si riavvia mentre un giveaway è aperto, chi era entrato resta in gara coi suoi biglietti. Prima sparivano tutti, e con loro il giveaway.
- Anche una penitenza in corso riprende da dov'era, contatore compreso, invece di spegnersi a metà.
- Se lo scudo aveva chiuso la chat ai soli follower e il bot si riavviava, la chat restava chiusa e nessuno la riapriva. Adesso si riapre da sola al ritorno.
- La ricerca trova quello che c'è scritto dentro le schede — campi, sezioni, pieghevoli, bottoni — e non solo i nomi delle schede. Cliccando ti porta sulla cosa e te la segna, aprendo da sola quello che la nascondeva.
- Dalla ricerca si arriva anche a Scudo anti-bot, Comandi vocali, Conoscenza, Penitenze, Musica e Clip: prima quelle sei sezioni non uscivano mai.
- I moduli a tempo parlano solo mentre sei in diretta: prima riempivano la chat vuota tutta la notte. Dentro al modulo c'è l'interruttore per farli parlare anche a canale spento.
- Dopo un riavvio del bot i timer non partono più tutti insieme, perché l'ora dell'ultimo giro adesso resta salvata. E quelli che scadono nello stesso minuto escono in fila, non in un colpo.
- Un modulo a tempo appena creato aspetta il suo primo giro prima di parlare, invece di partire subito.
- Ogni campo del pannello ha un nome che il lettore di schermo legge: prima 395 caselle su 916 restavano mute. Riguarda i cursori del tema, i pannelli dello Studio, gli avvisi, i compleanni e i premi.
- Sui temi pronti della pagina link la nuvoletta ripeteva il nome scritto sotto al bottone, e ora non c'è più.

## 2026-09-06

- Nella locandina live compare la foto anche degli streamer che hai aggiunto tu alle notifiche: prima restava un cerchio vuoto.
- Le emote nel titolo non diventano più quadratini: vengono tolte, perché nel disegno della locandina non si possono scrivere.

- Le guide hanno lo stesso aspetto del resto: carta, contorno a inchiostro e titoli scritti a mano. Prima sembravano di un altro sito.

- Due guide nuove: una su Kick, che spiega cosa cambia rispetto a Twitch e perché, e una su come moderare la chat senza cacciare le persone vere.

- Il link corto dell'overlay e la tela del tracking non finiscono più fra le pagine che Google visita: non sono pagine, girano dentro OBS.

- La barra dell'Overlay Studio ha le nuvolette: cosa cambia fra un overlay e l'altro, perché il link è nascosto, e cosa succede davvero a OBS se rinomini o elimini.

- Cambiare sezione è uno stacco pulito: la pagina vecchia esce, la nuova entra dal lato da cui sei arrivato.
- Muoversi dentro la stessa sezione è più corto: niente lampo, i riquadri rientrano uno dopo l'altro nell'ordine in cui si leggono.
- Su un computer poco potente lo stacco non spariva più: la modalità leggera serve al carico, non al movimento.

- La pagina «non c'è niente qui» e quella di manutenzione sono diventate una vignetta, col numero 404 nell'angolo come in un fumetto.
- Nove riquadri del sito non avevano il contorno: la lente della ricerca, i campi per scegliere un file e altri. Ora ce l'hanno.
- Sulle pagine di servizio i puntini del retino passavano sopra al testo e lo rendevano quasi illeggibile. Ora stanno sotto.

- Le guide «Come funziona», le legende e i riquadri richiudibili hanno lo stesso aspetto degli altri: carta, contorno a inchiostro e titolo scritto a mano.
- Otto riquadri che si aprono non mostravano nessuna freccia: sembravano testo normale. Ora ce l'hanno tutti.

- Sulle nuvolette corte la coda non sbanda più sull'angolo: resta attaccata al fondo, anche quando la bolla è larga quanto una parola.
- Non supera più mezza bolla di lunghezza. Prima su una parola sola arrivava a due terzi e sembrava appesa a un filo.
- Le sezioni ancora vuote non sono più un buco bianco: sono un riquadro col retino, che dice cosa ci comparirà.

- La riga che apre ogni scheda adesso è una didascalia: un riquadro con la barra d'inchiostro e l'angolo piegato, come nei fumetti. Chi parla ha la bolla, chi racconta ha il riquadro.
- Le nuvolette corte non sono più grandi come quelle lunghe: la coda si accorcia insieme alla bolla.

- Le nuvolette sono disegnate: corpo e coda sono una forma sola, quindi non si vede più la linea che tagliava la coda a metà.
- La coda si piega verso quello che sta spiegando e si ferma prima di arrivarci, come nei fumetti veri.

- La coda delle nuvolette si ferma a metà strada e non copre più il tasto che sta spiegando.
- Il messaggio d'errore ha il bordo a zig-zag di un grido, e la nuvoletta che spiega un valore ha la scia di bollicine del pensiero.
- Gli avvisi che compaiono in basso sono didascalie, con la barra d'inchiostro e l'angolo piegato. Chi parla ha la bolla, chi racconta ha il riquadro.

- Le nuvolette respirano: più larghe che alte, con l'aria attorno al testo e le righe più distanziate. Prima erano piccole e strette e si leggevano male.

- Le nuvolette non compaiono più spostate per poi rimettersi a posto al primo movimento del mouse, e non rallentano più il sito.
- Stanno un po' più in alto e di lato, col becco che punta dentro al tasto, e si vede attraverso: non coprono più quello che stai leggendo.

- Le nuvolette seguono il cursore mentre lo muovi, e la coda è disegnata: curva, come nei fumetti, e punta alla cosa di cui parla anche quando la bolla è finita di lato.
- Compaiono con un piccolo scatto e se ne vanno da sole dopo il tempo che serve per leggerle. Non si spengono più da sole dopo mezzo secondo.
- Il testo dentro è centrato e le righe sono bilanciate, come nei balloon veri.

- Le nuvolette compaiono dove sei col cursore, non al centro della cosa che stai puntando. Sulla tela dell'editor finivano lontanissime.
- Sono palloncini veri: forma tonda, becco che punta dove guardi. Prima erano rettangoli con gli angoli smussati.
- Passando sopra alle vesti dell'overlay adesso c'è scritto com'è fatta ognuna, invece del nome che si legge già sul tasto.

- Le nuvolette col cursore sopra adesso sono di tre tipi: fumetto normale per un comando, squadrato e rosso per le cose che fanno danni, nuvola di pensiero per spiegare un valore o una parola.
- Ce ne sono ventidue in più, sui comandi il cui nome non dice cosa succede: «Studia ora», «Crea clip», «Avvia raid», «Rileva gruppo», «Togli dal web» e altri.

- Le levette hanno il pallino in mezzo e dentro alla pista. Fuori dal telefono era spostato in basso a destra e sbordava.

- La locandina è accesa di suo: se non l'hai mai toccata, parte con il prossimo annuncio. Se l'hai spenta resta spenta, anche salvando un disegno.
- Una diretta su Kick riceve la grafica di Kick e una su Twitch quella di Twitch, anche quando lo stesso canale trasmette su tutte e due. Prima poteva arrivare quella sbagliata.
- L'indirizzo scritto in fondo alla locandina è quello della piattaforma giusta.
- Se la tua immagine del profilo non si scarica in fretta, la locandina parte lo stesso invece di far aspettare l'annuncio.

- C'è l'editor della locandina: sposti i pezzi trascinandoli, ne aggiungi, cambi caratteri e colori, e vedi il risultato mentre lo fai. Annulla e rifai con Ctrl+Z.
- Quando parte la locandina il messaggio si accorcia: titolo e categoria sono già disegnati dentro, sotto restano il tuo nome e il link.
- La locandina arriva anche per gli streamer che hai aggiunto alle notifiche: la grafica resta la tua, dentro ci sono il loro nome, il loro titolo e la loro faccia.
- Il titolo e la categoria compaiono anche a canale spento: si prendono da quelli del canale, invece di restare vuoti.

- «Manda una prova» adesso manda esattamente quello che partirà davvero: se hai acceso la locandina, la prova arriva con la locandina, e te lo dice.
- La locandina ora si disegna anche in produzione: i caratteri non finivano nel programma pubblicato.
- I due tasti tondi in basso a destra non tremolano più quando ci passi sopra col cursore.

- Nelle notifiche Telegram c'è un riquadro per la locandina: la accendi, scegli fra la grafica di Twitch e quella di Kick, e vedi l'anteprima.
- L'anteprima è l'immagine vera, disegnata dal server: quello che vedi è quello che arriva nel gruppo.

- I suggerimenti che compaiono passando il cursore adesso sono fumetti: contorno spesso, coda che punta alla cosa di cui parlano, scritti a pennarello come il resto del sito.
- Un tasto su cui tieni il cursore si disegna sopra a quello che ha intorno. Prima poteva capitare che il riquadro accanto gli passasse sopra l'ombra e sembrasse tagliato.

- Quando parte la diretta, l'annuncio su Telegram porta con sé una locandina: il tuo nome, il titolo della diretta, il gioco e la tua immagine, su una grafica diversa per Twitch e per Kick.
- Vale per tutte le piattaforme collegate, non solo per Twitch.
- Se il messaggio è corto diventa la didascalia della foto; se è lungo parte prima la foto e subito dopo il testo intero, che non viene mai tagliato a metà.
- Se la locandina non si disegna o Telegram la rifiuta, l'annuncio parte lo stesso come prima: chi ti aspetta viene avvisato comunque.

## 2026-09-05

- I suggerimenti che compaiono passando il cursore sopra un comando adesso li disegna il sito, col suo tema. Prima erano la scatoletta grigia del browser, che non si può cambiare.
- Compaiono anche arrivandoci col tasto di tabulazione: chi naviga da tastiera prima non li vedeva mai.

- Il vinile che gira sull'overlay non si blocca più per ricominciare il giro da capo. Succedeva a ogni lettura del brano, e valeva anche per le onde e per il titolo che scorre.

- Nel lettore musica «niente onde» adesso le toglie davvero, invece di lasciarle lì ferme. Le due impostazioni che si sovrapponevano sono diventate una sola.
- La copertina pulsa solo quando Spotify ci dice il tempo del brano. Quando non lo dice resta ferma, invece di pulsare a una velocità che non c'entrava niente con la canzone.
- Il titolo lungo scorre sempre, non più a volte sì e a volte no: si rimisura quando arriva il carattere, quando arriva la copertina e quando cambi la dimensione.

- L'accesso con YouTube è pronto ma non ancora aperto: nella vetrina e nella scheda Piattaforme lo trovi in grigio, «in arrivo». Google deve prima approvare il permesso di leggere quale canale sei.
- Se moderi già il canale di qualcun altro puoi chiedere tu l'accesso al suo pannello, senza aspettare che ti mandi un link. Lo trovi nella scheda Stato.
- Su Twitch la richiesta arriva allo streamer già confermata: prima di mostrargliela chiediamo a Twitch chi modera quel canale.
- Chi ha il canale vede le richieste in attesa nella scheda Stato e risponde con un tasto. Finché non dice di sì, chi ha chiesto non vede niente e non occupa un posto del piano.
- L'invito a un moderatore ora si manda anche a chi sta su Kick: scegli la piattaforma e scrivi il nome.
- Chi è stato invitato entra dalla sua piattaforma, non per forza da Twitch.

## 2026-09-04

- La chiave API del canale non si conserva più: ne resta solo un'impronta. Si vede una volta sola, quando la generi — nemmeno noi possiamo rileggerla.
- I backup del database sono cifrati: una copia che esce di casa è rumore senza il segreto del server.
- I segreti dei collegamenti (bot Telegram, Spotify, TikTok, 7TV) non stanno più in chiaro nel database: ognuno ha la sua chiave, e quella chiave è a sua volta chiusa a chiave.
- Ogni segreto è legato al suo posto: preso da un account e messo su un altro non si apre più.
- Nell'Overlay Studio il titolo «Gira il telefono» non copre più l'icona sopra di sé.
- I tre passi per mettere l'overlay in OBS tornano a leggersi come frasi intere, invece di spezzarsi in due colonne.
- Niente più schermate vuote scorrendo una scheda: alcune carte restavano spente e lasciavano al loro posto un buco alto quanto loro.
- Sul telefono il contorno non resta più acceso sull'ultimo tasto premuto: gli effetti del passaggio del mouse ora valgono solo dove un mouse c'è davvero.
- Su telefono le schede Notifiche, Moduli e Avvisi non escono più dallo schermo: il testo si tagliava a metà frase e la pagina scivolava di lato.
- La ricerca ha il tema del sito: contorno pieno, filtri a pastiglia e le voci che si sollevano. Prima era rimasta col disegno di prima.
- Anche gli elenchi, le schede della libreria, i blocchi della pagina link, i contatori e le spunte hanno il contorno giusto.
- Il bot legge la tua pagina link mentre risponde: titoli, testi, link, social, conti alla rovescia e soprattutto le FAQ che ci hai scritto tu.
- Cambi la pagina e cambia subito quello che sa, senza rifare niente. Se la spegni, smette di usarla.
- Nell'elenco «cosa sa il bot» ora compaiono anche quelle voci, marcate «dalla tua pagina link»: si cambiano sulla pagina, non da lì.
- Il manuale del bot e la guida della scheda Conoscenza sono aggiornati: scheda, quando, fissate, quaderno, parole da bloccare e pagina link.
- I contorni non vengono più tagliati: dentro le schede ogni bottone aveva l'ombra rasata sui quattro lati, e nelle colonne che scorrono il bordo spariva di lato.
- Sul tema chiaro tornano le ombre piene che mancavano: una riga di stile sbagliata le spegneva tutte, mentre sul tema scuro si sono sempre viste.
- Nella scheda puoi elencare le parole che il bot non deve mai scrivere (il cognome, la via, il nome della scuola): se una finisce in una risposta, il bot non la manda.
- La scheda non parte più vuota: quando il bot rilegge il tuo profilo riempie chi sei, gli orari e dove ti trovano, senza toccare quello che hai scritto tu.
- Nella scheda Conoscenza puoi compilare la tua scheda: chi sei, cosa fai in diretta, gli orari, dove ti trovano, come deve chiamarti e cosa non deve dire di te.
- Il bot sceglie le voci di conoscenza più vicine alla domanda, non le ultime che hai scritto. Puoi scriverne quante vuoi.
- Ogni voce può valere sempre, solo quando sei in diretta o solo quando sei offline. Puoi anche fissarla, così il bot ce l'ha davanti in ogni caso.
- Le frasi che scrivi in Personalità ora arrivano al bot come esempio del tuo modo di parlare. Prima restavano lì.
- Nel quaderno del bot scrivi come deve rispondere, e vedi anche quello che gli è già stato insegnato.
- Nella dashboard i menù a tendina restano in riga con i bottoni accanto, invece di andare a capo da soli.
- In chat pubblica risponde il bot del tuo canale: non si ricorda degli utenti e non parla di sé.
- Le risposte salvate non escono più sempre uguali: il bot le riformula. Se contengono un link restano identiche.
- Attorno a un video o a una musica incorporata non si vedono più gli spicchi vuoti negli angoli: li riempie il colore del bordo, così sembrano cornice.
- Puoi scegliere il colore dietro al riquadro, per intonarlo a quello che si vede dentro al contenuto.
- I riquadri di video, musica e pagine incorporate, la copertina e i bottoni dell'informativa hanno lo stesso bordo e la stessa ombra del resto della pagina: prima avevano un filo sottile che non cambiava mai col tema.
- La scritta che scorre è tornata a scorrere: si era fermata perché due cose diverse avevano lo stesso nome dentro al foglio di stile.
- La sua velocità funziona per la prima volta: «lenta», «media» e «veloce» non arrivavano mai alla pagina, andavano tutte alla stessa andatura.
- L'editor della pagina link è a tre zone come il banco dell'overlay: i pezzi a sinistra, l'anteprima al centro, i comandi del pezzo scelto a destra.
- Scegli un pezzo (o cliccalo nell'anteprima) e i suoi comandi compaiono a destra, con scritto sopra di quale pezzo sono.
- Il tutorial della pagina link parte chiuso e sta in fondo: aperto si mangiava mezza colonna e la lista dei pezzi non si vedeva.
- I pezzi della pagina link non sono più tutti spalancati insieme: una riga per pezzo, che si apre una alla volta e resta aperta anche se lo sposti o lo duplichi.
- Nel tema scuro il contorno disegnato si vede: era nero su nero, quindi non c'era, e restavano solo gli aloni rosa.
- La barra in basso, la lente della ricerca e le icone parlano la stessa lingua del resto: contorno disegnato e ombra a timbro.
- La barra in basso è opaca: su alcuni telefoni il testo della pagina si leggeva attraverso.
- Le pagine link pubblicate non portano più i commenti del nostro codice: chi apriva gli strumenti del browser su una pagina qualsiasi ne trovava trentasette.
- La pagina link ora si allarga su tutto lo schermo come il banco dell'overlay: prima restava dentro una colonna da mille pixel e l'anteprima era piccola.
- I titoli delle sezioni non sporgono più sopra la carta, e la freccetta che le apre è tornata una punta invece di un rombo.
- La pagina link ha molte più cose da cambiare: carattere dei titoli separato, maiuscolo, interlinea, aria fra i pezzi, colore del testo dei bottoni e spessore del bordo.
- C'è una scheda «CSS» dove scrivere il tuo: arriva per ultimo, quindi vince su tutto il resto.
- La pagina link: l'aspetto non è più una colonna sola da ventidue voci, ma sei schede — Temi, Impianto, Scrittura, Colori, Bottoni, Modi — con i campi affiancati.
- L'anteprima della pagina link è passata a sinistra, con i comandi a destra: si legge come il banco dell'overlay.
- Puoi cambiare la grandezza del testo della pagina link (80–130%) e il suo spessore: leggero, medio o marcato. Prima era grassetto e basta.
- Il puntatore disegnato adesso resta scelto: lo salvavi e alla ricarica tornava indietro da solo.
- Il titolo della home usa gli stessi due colori del resto della pagina: le parole nel colore del testo, quelle in risalto nel rosa del marchio. Prima aveva un rosa tutto suo che al buio restava scuro come il fondo.
- I bottoni scelti e quelli rossi hanno di nuovo il loro contorno: il bordo era dello stesso colore del riempimento, quindi spariva dentro, e restava solo l'ombra su due lati — sembravano ritagliati male.
- I riquadri «ultimo follower» e «ultimo sub» prendono la veste come tutto il resto: prima quei bottoni non facevano niente e le due etichette restavano com'erano mentre l'overlay cambiava tema.
- «a tutto l'overlay» adesso li prende davvero tutti: prima saltava quei due, il conto alla rovescia e i contatori.
- Ai due riquadri puoi scegliere forma, materia e cornice, come agli altri pezzi.
- L'anteprima dei due riquadri mostra quello che va davvero in onda: prima ne disegnava uno e in diretta ne arrivava un altro.
- L'alone dell'alert e quello della materia neon si accendono: c'erano da sempre e non si erano mai visti.
- Con la veste manga l'ombra è netta invece che sfocata, come un secondo segno d'inchiostro.
- Il sito era irraggiungibile: la configurazione del guardiano d'ingresso non era valida e lui, per questo, non si avviava. Rimessa a posto e verificata col programma vero prima di spingerla.
- Un elemento con la Dimensione cambiata arriva davvero al bordo dello schermo: rimpicciolito si piantava prima e sembrava bloccato lì, ingrandito usciva dalla tela.
- Segue il dito com'è giusto mentre lo trascini, a qualunque Dimensione.
- Le immagini e i video dei comandi finiscono in diretta dove li hai messi nell'anteprima, anche quando li rimpicciolisci.
- Il player non si strizza più a seconda di dove lo metti: posato al centro o a destra si stringeva, e il titolo finiva tagliato. Ora è largo quanto gli serve, ovunque lo porti.
- Il player è cresciuto: le misure partono da dove prima finivano, e c'è la misura «enorme».
- «Enorme» c'è per tutti i widget, non solo per la chat: player, obiettivi, ultimo follower, ultimo sub, contatori.
- Il player ha i temi, e un tema prende la forma dell'oggetto vero. Cassetta: titolo e artista sull'etichetta, sotto la finestrella con le due bobine che girano.
- Vinile: il disco esce dalla busta e gira, con i solchi e l'etichetta al centro.
- Terminale: mono, prompt e cursore che lampeggia. Manga: retino, contorno d'inchiostro e il titolo in lettering.
- Ha il corpo: **slim** se lo vuoi sottile, **cicciotto** se lo vuoi generoso. È un asse a parte dalla dimensione: uno cambia le proporzioni, l'altro la scala.
- Le onde ballano quanto è carico il brano: una ballata si muove piano, un pezzo tirato spinge. Lo dice Spotify, non lo inventiamo noi.
- Un titolo lungo non allarga più il player a mezzo schermo: la colonna del testo ha il suo tetto e il titolo scorre, come deve.
- Quel tetto lo scegli tu: «Larghezza del testo» dice quanto può allargarsi prima che il titolo si metta a scorrere. A zero decide il corpo.
- «Parti da quanti ne ho adesso» adesso è una spunta che resta, non un tasto da premere ogni volta. Il numero lo tengo allineato io a quello vero di Twitch.
- La Plancia è disegnata come il resto del sito: contorno d'inchiostro, angoli tirati a mano, nomi in lettering.
- Quando scorri fra le sezioni partono le linee di concentrazione dalla scheda che stai guardando, come in una vignetta.
- Il tratto disegnato adesso arriva ovunque: interruttori, campi, cartellini e tutti i pulsantini hanno il contorno d'inchiostro e gli angoli tirati a mano.
- Gli interruttori sono disegnati anche loro: contorno, pallina con il suo bordo, e lo scatto a scatti invece che scivolato.
- Le schede sono vignette: angoli quadri, contorno spesso e il titolo in una fascia d'inchiostro in alto, come la didascalia di una tavola.
- Il grigio pieno è sparito: le superfici secondarie sono a retino, come il mezzotono stampato.
- Il tratto ha una gerarchia: la vignetta è più spessa del comando, il comando più del dettaglio. È così che si legge la profondità.
- I pulsanti sono a tinta piatta, senza sfumature: in una tavola il colore è pieno o non c'è.
- Quando arrivi con la tastiera su un comando si vede subito dove sei: cornice d'accento netta, senza niente che copra quello che hai intorno.
- Il tema scuro non è più bianco e nero: il fondo tira al prugna e la carta al rosa, come i colori del logo. Anche di notte è la stessa pagina stampata.
- Il titolo di una scheda è una targhetta nell'angolo, con la freccetta dentro: si legge come la didascalia di una vignetta.
- Il sito scarica il 16% in meno: quello che arriva al browser è compresso.
- L'anteprima che compare quando incolli un link di SocialBot è ridisegnata come il sito: lettering, retino e targhetta d'inchiostro.
- La pagina delle novità torna a mostrare le novità: era vuota, e con lei l'elenco nel pannello.
- I titoli grandi sono contornati come le lettere del logo: pieno colorato dentro, tratto nero attorno.
- La vetrina si apre a scaglioni, un pezzo alla volta, con lo scatto dell'animazione giapponese invece della dissolvenza sfocata.
- Anche il cambio di sezione ha perso la sfocatura: adesso è uno stacco netto, come si passa da una vignetta all'altra.
- L'avviso di errore arriva con la sua scossa: si capisce che qualcosa è andato storto anche solo da come si muove.
- Il marchio in alto trema un attimo quando ci passi sopra, come una cosa disegnata a mano.
- Di notte si legge: il contorno nero spariva nel fondo scuro, ora ha il filo di carta attorno come nelle tavole stampate.
- Le linee di concentrazione dietro il titolo si sono calmate: erano un fondale che copriva tutto, adesso convergono sul titolo e gli lasciano aria attorno.
- Il titolo grande ha il pieno del marchio, lo stesso della «b» di bot, dentro il contorno: prima era una parete di colore piatto e su telefono le lettere si gonfiavano fino a chiudersi.
- La home non si ricompone più sotto gli occhi mentre carica: arriva già fatta, e non balla più.
- È la stessa per tutti: prima chi cercava su Google trovava una pagina scritta a parte, solo in italiano, diversa da quella che poi si apriva davvero.
- Le tre lingue sono diventate indirizzi veri: cambiando lingua l'indirizzo cambia con te, e lo puoi salvare o mandare a qualcuno.
- Nell'Overlay Studio la veste si sceglie sempre, non solo quando crei un overlay: in cima a ogni barra ci sono le nove vesti, e sotto cambi quello che vuoi.
- «A tutto l'overlay» le applica in un colpo a tutti gli elementi, invece di rifare le stesse undici scelte per alert, chat e ogni widget.
- Adesso una veste veste davvero tutto: prima sceglievi Manga e la chat restava a metà, gli obiettivi e il player non se ne accorgevano nemmeno.
- Il player segue la veste: «Nastro» lo fa diventare una cassetta, «Terminale» un terminale, «Manga» il manga.
- Il manga adesso c'è dappertutto: overlay, pagina link (in chiaro e di notte) e grafiche social.
- La pagina link in manga è carta e inchiostro davvero: contorni neri, ombra piena spostata, titoli a pennarello.
- Il carattere a pennarello lo scarica solo chi sceglie quel tema: le altre pagine link restano leggere come prima.
- L'avatar segue il tema: prima aveva un alone sfumato suo che stonava su una pagina disegnata.
- Nel riquadro che chiede il consenso, «Dettagli» finiva da solo schiacciato nell'angolo in basso a destra e sembrava caduto fuori: ora sta dentro la frase che spiega, e i due pulsanti si dividono la riga.
- Il tema Manga adesso è disegnato davvero: retino stampato sulla carta, contorni spessi coi pieni dentro, e di notte le linee di concentrazione che convergono sul tuo nome.
- Puoi accendere un puntatore del mouse disegnato coi colori del tuo tema: una penna, e una stella su quello che si può premere. Su telefono non cambia niente.
- Chi visita la tua pagina può cambiare idea sui contenuti di altri siti: prima la scelta era per sempre e il riquadro non tornava più. Ora nel piede c'è «Contenuti di altri siti» che lo riapre.
- Se dice di no dopo aver detto di sì, il no vale davvero: la pagina si ricarica, così da quei siti non parte più niente.
- Sulla pagina link online non funzionava niente di quello che si clicca: il riquadro del consenso non compariva, «Carica il contenuto» non rispondeva, il conto alla rovescia stava fermo. Ora funziona.
- Nell'interfaccia non ci sono più emoji di sistema: dove dicevano qualcosa — «bloccato», «animato», «in attesa» — ora c'è il segno disegnato, con lo stesso tratto del resto.
- Le emoji che il bot scrive in chat restano dov'erano: quella è la sua voce.
- Gli obiettivi si impostano in un posto solo: il traguardo vale per tutti i tuoi overlay, e non lo devi rifare scena per scena. Dove sta e come si vede lo decidi ancora sull'overlay che stai componendo.
- La barra di un obiettivo non torna più indietro: se arrivavano follower mentre il numero vero era ancora quello di poco prima, il totale a schermo calava. Ora no.
- Nell'anteprima dello Studio la barra di un obiettivo era vuota anche a 662 su 1000: adesso si riempie davvero.
- L'anteprima non ti mostra più un overlay diverso da quello che va in onda: la cornice degli elementi era disegnata in un modo qui e in un altro in diretta.
- Il titolo lungo del player scorre anche nell'anteprima, invece di restare tagliato.
- Spuntare «parti da quanti ne ho adesso» non ti butta più fuori dalla scheda che stavi modificando.
- I comandi delle onde del player dicono cosa fanno: uno le mostra o le nasconde, l'altro decide cosa balla a tempo.
- Google mostrava ancora il logo vecchio: l'indirizzo da cui lo prende non cambiava mai, quindi non aveva motivo di riscaricarlo. Adesso cambia.

## 2026-09-03

- Nell'overlay c'è il player: quello che stai ascoltando su Spotify, a schermo. Compare quando la musica parte e sparisce quando la fermi.
- Il player è tuo dalla copertina in giù: quadrata, tonda o un vinile che gira, avanzamento come barra o come anello attorno alla copertina, onde che ballano a tempo.
- Ancora: lo sfondo può prendere la copertina sfocata o i colori del disco che scorrono, il titolo lungo scorre e l'entrata in scena la scegli tu.
- Il player va a tempo con quello che suona: le onde ballano sul battito vero del brano, e volendo pulsa anche la copertina.
- Il player non sparisce più mentre la canzone va: un intoppo di Spotify o il vuoto fra due tracce lo spegnevano per un attimo, e poi rientrava.
- In pausa invece sparisce davvero, se è quello che hai scelto: prima restava lì.
- Player e conto alla rovescia se ne vanno con una dissolvenza, non di colpo.
- Le forme con gli angoli tagliati non lasciano più uno spigolo chiaro: l'ombra seguiva il rettangolo invece della forma.
- La disposizione è tua: copertina a sinistra, a destra, sopra come un poster, o solo la copertina col cerchio che si riempie.
- Titolo e artista possono stare su due righe, e nei testi si può usare anche il nome dell'album.
- C'è il conto alla rovescia di inizio diretta: scegli i minuti e parte. Sta nel canale, quindi ricaricare l'overlay o riavviare tutto non lo azzera.
- Un obiettivo può partire da dove sei già: «1000 follower» invece di «altri 1000». Il tasto «Quanti ne ho adesso» va a chiedere il numero vero a Twitch.
- Spostare le cose nello Studio non le fa più saltare: prendevi un elemento e scattava sotto il cursore, tanto più lontano quanto più era vicino a un bordo.
- Un elemento non può più uscire dallo schermo mentre lo trascini.
- «Allinea a sinistra» adesso lo attacca davvero al bordo.
- L'occhio di un livello si vede quando è chiuso: prima l'elemento spariva ma l'icona restava un occhio aperto.
- Il puntino del cursore non sparisce più quando si aggancia a un pulsante: con il cursore nascosto era l'unico modo di sapere dove stavi puntando.

- Un elemento dell'overlay si modifica in un posto solo, accanto alla tela: scegli e hai davanti tutto quello che lo riguarda, senza scendere sotto e perdere di vista l'anteprima.
- Anche i contatori hanno i loro comandi lì: cosa scrivono, colori, carattere, con o senza sfondo.
- I comandi di un elemento sono raggruppati a fisarmonica: prima si scorreva per dodici schermate solo per l'alert, ora ne basta una.
- Il player ha la stazza di un player: la copertina era grande un francobollo perché seguiva la misura delle pastiglie.
- Scegliendo un elemento non compare più l'aspetto di un altro: una regola di stile teneva a schermo un blocco che era stato nascosto.
- Anche gli obiettivi si modificano tutti dal pannello: conta, traguardo, partenza e dove stavano ancora nella carta sotto la tela. Nell'elenco resta il nome, il conteggio e i due tasti.
- Nello Studio la tela ha tutto: obiettivi e contatori si trascinano come gli alert, con maniglie, frecce, aggancio e annulla. Prima si potevano mettere in posizione solo scrivendo numeri in un modulo.
- Gli angoli della tela sono quelli veri dell'overlay: un obiettivo «in alto a destra» sta a filo dello schermo, e non usciva più dal riquadro come faceva prima.
- Livelli e Proprietà non coprono più la tela: sono due sponde ai lati, si arrotolano per far spazio, si staccano trascinandole e si riagganciano con un doppio clic.
- Dimensione e Rotazione hanno un comando solo, cursore e casella insieme: erano due comandi separati che si contraddicevano, e sullo schermo si leggevano tre numeri diversi per lo stesso valore.
- Annulla riporta indietro anche il player e il conto alla rovescia: li spostavi e Annulla li lasciava dov'erano.
- Nei Livelli ogni elemento dice dov'è in percentuale, come le Proprietà e la barra sotto la tela: prima un elemento appena scelto diceva «in alto a sinistra» mentre le Proprietà dicevano già 2%.
- La regolazione fine sopravvive al salvataggio: le frecce dello Studio spostano di un pixel, ma il salvataggio arrotondava a percentuali intere e ricaricando l'elemento tornava indietro, fino a dieci pixel.
- I contatori seguono le stesse regole degli altri elementi su misure, colori e caratteri: quello che imposti resta nei limiti previsti.
- La maniglia per ruotare si raggiunge sempre: per un elemento in cima alla tela finiva tagliata fuori dal riquadro, e ora passa sotto.
- L'elemento che stai modificando sta davanti agli altri: prima un vicino gli copriva le maniglie e si prendeva il clic.
- Ogni overlay è una sessione di lavoro a sé: quello che sposti in uno resta lì. Prima player, conto alla rovescia, obiettivi e contatori avevano una posizione sola per tutto il canale e ti seguivano ovunque.
- Ogni overlay ha il suo Annulla: annullare in una scena non disfa quello che hai fatto in un'altra.
- Lo Studio ha la marcia fine: tieni Ctrl (o ⌘) mentre trascini e il puntatore va a un quinto, così arrivi sotto il pixel. Prima il movimento più piccolo possibile col mouse era di due pixel e mezzo di overlay.
- Con Maiusc premuto l'elemento resta dritto sull'asse in cui l'hai avviato, senza sbandare.
- La rotellina non ridimensiona più da sola: scorrendo la pagina sopra la tela cambiavi misura all'elemento senza volerlo. Ora serve Alt per la misura e Maiusc per la rotazione.
- Lo zoom della tela arriva al 400%, perché sotto il 227% un pixel dell'overlay non si vede nemmeno.
- Il sito ha preso il tema dal marchio: la sfumatura dal magenta al vino che c'è nel logo passa ora nei titoli e nei pulsanti, e il contorno scuro che tiene insieme le lettere tiene anche i pulsanti e le pastiglie.
- Vale dentro e fuori, in chiaro e in scuro: sul fondo scuro il contorno ha un filo di luce, così si legge come si legge il marchio.
- L'occhio dei Livelli toglie l'elemento dalla scena in cui stai lavorando, non da tutte: puoi avere una scena con un obiettivo e un'altra con un altro.
- L'interruttore di un elemento, quello nel suo pannello, resta invece valido ovunque: uno spegne l'elemento, l'altro lo toglie da una scena sola.
- Il sito è disegnato a mano come il marchio: i titoli hanno il tratto del logo, i riquadri hanno angoli storti come tirati a penna e i pulsanti portano l'ombra piena dell'inchiostro.
- I pulsanti si timbrano invece di illuminarsi: premendoli scendono sull'ombra come un timbro sulla carta.
- Il carattere disegnato è ospitato sul nostro server come tutti gli altri, quindi la pagina non chiede niente a nessuno per disegnarsi.
- Il sito è una tavola di manga: il fondo è carta, dietro al titolo ci sono le linee che convergono e sopra passa il retino a puntini.
- Dentro e fuori parlano la stessa lingua: pulsanti, menù, pannelli, elenchi e perfino il cursore hanno il contorno d'inchiostro.
- Le parole in risalto del titolo si colorano da sinistra a destra quando la pagina arriva, come le colorerebbe un disegnatore.
- I testi piccoli sono più scuri: su carta chiara quelli di prima si leggevano male.
- Il lettering disegnato è dei titoli, dei comandi e del marchio; il testo che si legge ha un carattere pulito, come in una tavola vera.
- La schermata di caricamento è una vignetta: linee che convergono sul marchio, retino e il logo che si timbra.
- Su telefono le ultime righe in fondo alla pagina non finiscono più sotto la barra dei pulsanti.
- Menù, cassetto, campi e interruttori hanno il contorno d'inchiostro come tutto il resto.
- Il puntatore è disegnato: una freccia con il contorno d'inchiostro, e non insegue più il mouse, quindi non resta mai indietro.
- Anche le guide e l'anteprima dei link sono tavole: carta, linee che convergono, retino e lettering disegnato.
- Il marchio nella schermata di caricamento è dentro la pagina stessa: non lo si chiede più alla rete, quindi non può mancare.
- Sopra le cose che si cliccano il puntatore diventa un lampo a quattro punte: cambia forma senza rincorrere il mouse, quindi non resta indietro.
- Passando sopra un pulsante, attorno a lui si allarga una sagoma d'inchiostro, e la stella del puntatore ci si muove dentro.
- Il lettering del sito è il pennarello del marchio, non un carattere tondo da fumetto per bambini.
- Se il sito non riesce a caricarsi resta comunque la sua pagina, vestita come tutto il resto, invece di una schermata spoglia.
- Anche il carattere «manga» che puoi scegliere per l'overlay ora è un pennarello vero.
- Le cose arrivano a scatti invece di scivolare, come i disegni tenuti due fotogrammi nell'animazione giapponese: si sente più veloce.
- Gli avvisi entrano di slancio e quelli di errore danno una scrollata, così non passano inosservati.
- Barre di avanzamento, equalizzatore e misuratore del volume si muovono senza far ricalcolare la pagina: il movimento è più fluido, soprattutto sull'overlay in diretta.
- Il puntatore disegnato ora vale ovunque: prima su alcune intestazioni e barre di sezione tornava quello di sistema.
- Scegliendo un obiettivo sulla tela le sue proprietà — colori, carattere, forma, cornice, opacità — si aprono lì accanto, come per ogni altro elemento.
- Trascinare un contatore non lo fa più saltare a metà schermo, e ora si può anche ruotare.
- L'occhio di «Obiettivo» e «Contatori» funziona davvero: prima si spegneva e al ricaricamento tornava acceso, quindi non si potevano togliere da un overlay.
- Il giro guidato insegna invece di raccontare: ogni tappa è un passo da fare, con la luce puntata sul comando che nomina — e se sta dentro una sezione chiusa, la apre.
- Tre schede che il giro saltava (Avatar 3D, Grafiche social, Scudo anti-bot) adesso ce l'hanno.

## 2026-09-02

- Gli obiettivi sono quanti ne vuoi, non uno: ognuno col suo traguardo, il suo angolo e il suo aspetto — colori, carattere, forma, cornice, dimensione, opacità.
- Due obiettivi che contano la stessa cosa salgono insieme: una scala («100 follower», «500 follower») si fa senza rifare niente a mano.
- C'è il manuale dell'overlay: i sette elementi, i valori di base, le parole da usare nei testi degli alert e cosa fare quando non si vede niente.
- Nell'overlay c'è l'obiettivo: una barra che si riempie da sola mentre arrivano follower, sub o bit, col conto vero e un tasto per ripartire da zero.
- I contatori sono diventati un elemento dell'overlay come gli altri: si spengono dall'elenco e prendono la veste della scena, senza perdere i colori che gli hai dato tu.
- Gli sfondi dell'overlay c'erano ma non si vedevano: alert, chat e widget uscivano trasparenti, quindi scritte bianche appoggiate sul gioco. Ora si vedono.
- L'overlay non è più viola Twitch di serie.
- La prima volta che entri in una scheda, il bot te la fa vedere passo passo: a cosa serve, cosa c'è dentro con la luce puntata sopra, e dove leggere di più.
- Il giro si vede una volta sola e si rifà quando vuoi dal «?». Se stai già facendo qualcosa non parte.
- I comandi pronti sono tradotti: nome e spiegazione escono in italiano, inglese e spagnolo come il resto del pannello.
- I giochi si creano tutti da un posto solo: prima c'erano due riquadri che facevano la stessa cosa e uno ti spostava in un'altra scheda per finire il lavoro.
- Si sceglie chi lancia il gioco — il bot a sorpresa, o uno spettatore che scrive un comando — e il resto si adatta.
- Nell'editor dei giochi le parole magiche offerte sono quelle che a un gioco servono: monete, caso, numeri, chi scrive. Le altre restano a un clic.
- Sul telefono il «?» apre guide, manuali e novità dentro al menù, come righe: prima usciva una tendina più larga del menù e si leggeva mezza parola.
- Anche il cambio canale sul telefono è diventato un elenco, per lo stesso motivo.
- Tutto quello che si chiama con un «!» adesso si gestisce: una quarantina di comandi pronti, ognuno da spegnere, rinominare o riservare a sub, VIP e moderatori. Li trovi in Comandi, in fondo.
- «!giochi» risponde una volta sola: prima usciva l'elenco dei giochi di chat e, subito sotto, quello dei giochi con la webcam — anche a chi la webcam non la usa.
- Un comando di una famiglia spenta non risponde più e il pannello te lo dice, invece di lasciarti indovinare perché tace.
- Ogni gioco si accende e si spegne da solo, si rinomina e si può riservare a sub, VIP o moderatori: prima i comandi erano fissi e non si poteva toccarne nemmeno uno.
- La scheda Giochi elenca tutti i comandi veri: ne mostrava dieci su trenta, e cinque giochi — pesca, roulette, furto, regala, manche — non li nominava affatto mentre il bot li annunciava in chat.
- «!giochi» in chat dice i giochi accesi coi nomi che hai scelto tu, invece di un elenco fisso che poteva non corrispondere.
- La promo social è passata dalle Notifiche, dove sta di casa: nella scheda Giochi non c'entrava niente.
- Ogni scheda del pannello ha il suo manuale o la sua guida: prima ce l'avevano sei schede su ventiquattro, e nelle altre il «?» in barra non aveva niente da offrire.
- Sette manuali nuovi: il bot, la moderazione, sondaggi e sorteggi, la diretta, la vetrina, l'abbonamento e le emote. Con i valori di base e i limiti veri, non descrizioni generiche.
- Il sito ha i colori del logo, chiaro e scuro: prima la carta era calda e l'accento arancione, e con un marchio magenta non c'entravano niente.
- Sul tema scuro il logo ha di nuovo l'alone dietro anche nella pagina pubblica e nelle guide: ce l'aveva solo la barra in alto.
- L'anteprima che esce quando condividi un link, e l'icona dell'app, sono dei colori nuovi: restavano indietro di un marchio.
- Le scritte più tenui, il verde e l'ambra adesso si leggono: stavano sotto la soglia di contrasto anche prima del cambio.
- Nella barra c'è un «?» che porta a guide, manuali e novità — e in cima quella della scheda che stai guardando.
- L'avviso della guida impara: dove sei già entrato e uscito senza fare niente arriva prima, e se gli dici due volte «non serve» sta zitto per un mese.
- Quando si vede che sei in difficoltà — fermo, un errore appena uscito, la rotella su e giù, o ci torni per la terza volta — il bot ti dice che per quella scheda c'è una guida. Si zittisce per sempre con un clic.
- Se è una guida, si apre sul punto che dice cosa fare in SocialBot: non su una spiegazione generica.
- Privacy, termini, invito ai moderatori e sblocco hanno lo stesso aspetto del resto del sito e seguono il tema che hai scelto: erano rimaste scure e viola.
- Su Kick il bot scrive con il tuo account, come su Twitch: prima provava con un account suo e Kick rifiutava, quindi in chat non usciva niente.
- La pagina pubblica è dello stesso colore del resto del bot e segue il tema che hai scelto, chiaro o scuro: prima era scura e basta, anche se avevi scelto chiaro.
- Dalla pagina pubblica si arriva a guide, manuali e novità con un clic: prima stavano solo in fondo alla pagina.
- Quando condividi un link di SocialBot esce l'anteprima giusta: privacy, termini, invito ai moderatori, sblocco e mini app non ne avevano nessuna, e le chat mostravano una cartolina vecchia.
- Se Kick non manda niente, il pannello dice quale delle quattro cause è — e c'è un tasto per rifare l'iscrizione agli eventi senza ricollegare l'account.
- Ci si registra anche con Kick: se trasmetti solo lì non ti serve un account Twitch, e le parti che senza Twitch non funzionerebbero il pannello te le dice spente invece di fingere.
- Il bot funziona davvero su Kick: gli eventi che Kick ci mandava venivano rifiutati dal sito, quindi il collegamento riusciva e poi non arrivava niente.
- Su Kick il bot non si ascolta più da solo: le sue risposte non contano come messaggi della chat.
- Il menù laterale si chiude cliccando fuori, non solo con la X: su schermi larghi restava aperto.
- Ci sono due manuali, uno per i giochi e uno per i moduli: cosa fa ogni comando, quanto costa, quanto paga, e cosa vuol dire ogni variabile. Li apri dalle schede Giochi e Comandi.
- C'è una pagina Novità, e in cima al pannello trovi quello che è cambiato da quando non guardavi: se aggiungiamo qualcosa, adesso lo sai.
- Le pagine che si aprono senza login tornano a funzionare: la home restava sotto il velo di caricamento, l'overlay in OBS era bianco, e l'invito ai moderatori e lo sblocco con passkey non facevano niente.
- Il marchio nuovo: il logo nella barra in alto al posto della scritta, e la schermata di caricamento che respira invece dello sfondo.
- Il logo nuovo arriva anche a chi era già passato dal sito: prima restava incastrato quello vecchio nella linguetta del browser.
- Nella scheda Giochi c'è "Inventa un gioco tuo": i giochi non sono più solo quelli pronti, te li costruisci come i comandi.
- Sei ricette a punti da cui partire: slot, scommessa, regalo, furto, saldo e "dai punti".
- Il costo di un gioco può essere una cifra che scrive chi gioca, non solo un numero fisso.
- Puoi aggiustare le monete di qualcuno a mano dal pannello, senza passare dalla chat.
- Nelle risposte a punti puoi usare la cifra davvero mossa e il nome di chi l'ha subita, così un furto racconta quello che è successo.
- Un comando che ti sei costruito tu vince sempre su quello pronto con lo stesso nome.
- "Scarica i miei dati" funziona anche su iPhone: prima non partiva niente.
- La barra in alto si ritira quando non ci sta, invece di accavallarsi su schermi stretti.
- Le dirette dal browser (Studio Web) sono spente: erano promesse in ventun punti e non funzionavano.

## 2026-08-29

- Due classifiche separate: una del pubblico e una dello staff, così i moderatori non coprono più i primi posti.
- Il premio in VIP salta chi ce l'ha già per sempre e passa al successivo, invece di accorciarglielo.
- La barra "non hai salvato" indica il salva della zona che stai modificando, e sparisce quando salvi lì.
- Le immagini che arrivano da fuori — emote comprese — non si rompono più.

## 2026-08-28

- Caricare emote nuove su 7TV funziona di nuovo.
- Il bot parla su Kick: comandi, moderazione e avvisi, con lo stesso pannello.
- Un !comando scritto su Kick non riceve più la risposta su Twitch.
- Puoi scegliere su quali piattaforme gira ogni singolo comando; quelli che hai già restano come stanno.
- L'avviso di diretta è uno solo per tutte le piattaforme, non uno per ognuna.
- Porti qui i comandi che hai già su un altro bot, senza riscriverli a mano.
- Puoi scaricare tutti i tuoi dati quando vuoi, in un file solo.
- La libreria dei media si apre da ogni campo dove serve un'immagine o un suono, non solo dalla sua scheda.
- Telegram: "Rileva gruppo" non dà più errore.
- Se finisci su una pagina senza cruscotto, adesso c'è come tornare indietro.
