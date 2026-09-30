<!-- © 2024–2026 Andrea Taliento (ANDRYXify) — Tutti i diritti riservati — socialbot.live -->
<!-- Proprietà intellettuale · ANDRYX-IP::a7f39c1e8b424d90-4f7b-taliento::socialbot.live -->
# Novità

Cosa è cambiato in SocialBot, in ordine di tempo. Una riga per cosa, scritta per chi
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

Ci vanno **tutte le cose interne del cervello privato**: il suo computer, il suo schermo, il
suo browser, come ragiona, come cresce. Non riguardano chi usa il bot, e questa
pagina è pubblica e indicizzata. Se una riga descrive invece una funzione che lo
streamer *usa*, si riscrive senza nominarla: la funzione resta documentata e il
nome resta in casa. Non è una cosa da ricordarsi:
`scripts/verifica-novita.mjs` boccia una riga pubblica che la nomina.

## 2026-09-30

- Il QR e il media kit degli Strumenti portano all'indirizzo vero del tuo canale anche su Kick e YouTube: prima su Kick ne scrivevano uno sbagliato. [vai: qr]
- I temi pronti della pagina link tengono i bottoni velati anche dopo il salvataggio: prima tornavano ai colori della base, e su un tema scuro potevano uscire bianchi. [vai: pagina]
- Nella settimana un canale Discord che per un momento non risponde resta fra i posti scelti, col suo perché accanto, e lo togli tu se vuoi. [vai: settimana]
- Nella pagina link la fascia che chiede il permesso per video e musica di altri siti si legge meglio, e in anteprima le parti da completare dicono cosa manca. [vai: pagina]
- I termini hanno un punto su piani, abbonamenti, disdetta e recesso in 14 giorni, e privacy e termini dicono con precisione con cosa ci si registra e cosa si scollega da dove.
- [importante] In Account c'è «I tuoi collegamenti»: tutti gli account che hai collegato, ognuno col suo «Scollega», anche se il piano ha chiuso la scheda dove stavano. [vai: account]
  > Tutti i tuoi collegamenti, in un posto
  > Spotify, TikTok, Instagram, Discord, 7TV e Telegram in una carta sola, e ognuno lo scolleghi quando vuoi, con qualunque piano.
- Spotify, TikTok, gli avvisi di Discord, 7TV e l'accesso con Telegram si scollegano con qualunque piano: prima, tornando all'Essenziale, restavano legati.
- Un sostegno al progetto aperto e mai pagato si cancella dopo una settimana, e quelli pagati dopo dieci anni, come dice l'informativa.
- L'azione «Timeout in chat» dei moduli mette davvero in pausa chi ha fatto scattare il modulo: prima non faceva niente. Se manca il permesso, o la persona è un moderatore o un VIP, il bot lo dice. [vai: moduli]
- Col pannello in inglese o in spagnolo la scheda Donazioni si chiama «Donations» e «Donaciones» anche nel menù, e nella pagina link il carattere in spagnolo è «Fuente». [vai: donazioni]
- Le recensioni della pagina iniziale scorrono sotto le dirette in onda e prima della serata col bot acceso, e la pagina si apre più leggera.
- I moderatori possono rinominare e togliere le emote 7TV anche dal pannello, come già potevano aggiungerle, dopo che il proprietario ha collegato 7TV. [vai: emote]
- Nel tracciamento della webcam il suggerimento nomina il tasto giusto, «Salva impostazioni webcam». [vai: effetti]
- L'informativa sulla privacy dice cosa succede alla voce: comandi a voce e penitenze passano dal tuo browser, l'audio della diretta si misura solo per le clip, e il bot impara solo dalle tue parole.
- Mima, Non ridere, Reaction rush e Battaglia, i minigiochi della webcam, hanno lo stesso nome in tutto il pannello, anche in inglese e in spagnolo. [vai: effetti]
- «Dai punti» a «Chi ha scritto» in un timer non paga più lo streamer: lì non ha scritto nessuno e il passo salta. E le monete vanno al nome utente, anche a chi si mostra con un nome in un altro alfabeto. [vai: moduli]
- La moneta di base si chiama «coins» o «monedas» col pannello in inglese o in spagnolo, e l'anteprima dell'importazione dice «Timers» o «Temporizadores». [vai: moduli]
- Chi toglie tutti i posti degli avvisi su Telegram o su Discord non se ne ritrova uno alla lettura dopo: il gruppo o il canale collegato diventa un posto una volta sola, quando arriva.

## 2026-09-27

- [importante] In «Strumenti» ci sono i pannelli per Twitch: tutti nello stesso stile, e già pieni dei link e delle descrizioni che il canale conosce. [vai: pannelli]
  > I pannelli del canale senza riscriverli
  > Link e descrizioni vengono da quello che hai già: pagina link, social, settimana, Discord, donazioni. Scarichi tutto in un file, pronto da mettere su Twitch.
- Nel media kit il testo sulla fascia del contatto si legge con qualunque colore della pagina link: con alcuni accenti prima restava troppo tenue.
- Ogni scheda del pannello ha il suo manuale: Stato, Effetti e Community si aggiungono agli altri, che ora dicono le etichette e i messaggi che vedi davvero.
- In chat «!bot» e «!ia» rispondono sempre, anche con i comandi base spenti: fra i comandi pronti non si spengono, non si rinominano e non si riservano più. [vai: moduli]
- Con la gestione dei comandi dalla chat accesa, «!comando lista» lo può scrivere chiunque: aggiungere, cambiare e togliere comandi resta ai moderatori. [vai: moduli]
- La guida dei contatori e il tasto «Accendi a schermo» non dicono più che il numero riparte da zero: si accende col numero a cui è arrivato. [vai: moduli]
- Nell'elenco dei moduli il riassunto dell'azione «Contatore» dice se azzera o imposta il numero: prima diceva sempre che lo aumentava. [vai: moduli]
- «Salva i comandi» salva le righe della sua lista: un gioco rimesso com'era di serie nella scheda Comandi non torna più come lo mostrava ancora la scheda Giochi. [vai: moduli]
- L'editor dei moduli e la pagina di ascolto vocale mandano nelle schede di oggi: Comandi vocali per il microfono e il permesso di gestione canale, Effetti & suoni, Musica. [vai: moduli]
- Nel giro guidato di Comandi vocali il passo sul microfono indica il tasto «Apri l'ascolto vocale», non più l'interruttore dei momenti salienti. [vai: ascolto]
- L'azione «Metti una canzone in coda» e l'importazione da un altro bot non parlano più di un add-on Musica: le richieste musicali sono nel piano Essenziale. [vai: moduli]
- Una donazione mandata dai Connettori avanzati senza valuta, o con una valuta sconosciuta, entra con quella del canale: prima la richiesta falliva. [vai: moduli]
- «Salva aspetto» dei contatori non rende più nero pieno lo sfondo: resta semitrasparente come quello di serie, anche quando cambi colore. [vai: moduli]
- Momenti salienti: la sensibilità salvata mentre il server ti sta già ascoltando vale entro un minuto, senza aspettare la diretta dopo. [vai: ascolto]
- Un modulo a tempo, su un evento, a voce o da Telegram con «Costa» o «Serve almeno» non toglie più monete a te né a nessuno: paga solo chi lo usa scrivendo in chat. [vai: moduli]
- Nell'azione «Aspetta» il campo arriva a 30 secondi, quanto il bot aspetta davvero, e il testo sull'overlay resta a schermo al massimo 30 secondi, come dice il suo campo. [vai: moduli]
- La carta «Comando vocale» dice che l'ascolto funziona anche fuori da Chrome ed Edge, col motore locale che la prima volta scarica un modello. [vai: ascolto]
- Nell'editor dei moduli inneschi, eventi, azioni e il riassunto di ogni modulo si leggono in inglese e in spagnolo, come il resto del pannello. [vai: moduli]
- I campi dell'editor dei moduli, i tasti Prova, Modifica ed Elimina e i Connettori avanzati si leggono anche in inglese e in spagnolo. [vai: moduli]
- La pagina di ascolto vocale si legge in inglese e in spagnolo, nella lingua del pannello, registro compreso. Il riconoscimento resta in italiano. [vai: ascolto]
- I pannelli per Twitch si scaricano tre volte più definiti: sul telefono bordi e scritte restano netti. Quelli che hai già caricato vanno riscaricati e rimessi. [vai: pannelli]
- Il cursore disegnato c'è anche sul selettore dei colori, su «scegli file» e nei campi dove si scrive: nel pannello non resta nessun cursore di sistema.
- La pagina iniziale in inglese e in spagnolo ha nella sua lingua anche il piede, il riquadro per dare una mano e l'avviso dei cookie: prima restavano in italiano.
- Anche nel pannello il piede e l'avviso dei cookie seguono la lingua che scegli, e cambiano insieme a lei.
- Privacy e termini si leggono anche in inglese e in spagnolo, ognuno col suo indirizzo: il testo di riferimento resta quello italiano, e le traduzioni lo dicono in cima.
- La transizione scelta in un tasto di CONSOLify o in un Modulo resta dov'è e parte davvero: prima spariva appena salvata. [vai: consolify]
- Un'idea pronta di CONSOLify crea il tasto coi passi da riempire segnati «da completare», e un passo aggiunto si salva subito: prima i passi vuoti sparivano e il tasto restava lì senza fare niente. [vai: consolify]
- Quando una pagina di CONSOLify ha già 48 tasti, anche «Duplica» e «Sposta nella pagina» si fermano e dicono che è piena: prima il tasto in più spariva senza avviso. [vai: consolify]
- Nel formato «libero» di CONSOLify, in modifica, c'è il «+» in fondo alla pagina: prima lì non c'era modo di creare un tasto nuovo. [vai: consolify]
- Le clip fatte con «Crea clip» in Regia finiscono in «Ultime clip», nel rapporto della serata e nelle statistiche, col motivo «dalla Regia». [vai: clip]
- Clip e Musica parlano tutte e tre le lingue anche nei pezzi rimasti in italiano o in inglese, e il muro delle clip automatiche dice che «non sono» nel tuo piano. [vai: clip]
- Se nella Musica manca il permesso dei punti canale, il riquadro porta dritto a concederlo: prima rimandava a una sezione che non c'è più. [vai: musica]
- In inglese la Regia si chiama «Control room» anche nel menù, e la sua guida elenca le azioni rapide che ci sono davvero: clip, marker, pubblicità, raid. [vai: regia]
- «Chi guarda di più» vuota non chiede più di accendere un conteggio che è già acceso: dice che nessuna ora è stata ancora contata, e solo se l'hai spento ti dice dove riaccenderlo. [vai: statistiche]
- Collegando la regia da CONSOLify leggi il motivo vero quando non va (password sbagliata, indirizzo di rete, programma spento), e «Oppure a mano» si prova anche senza password. [vai: consolify]
- Nella scheda Stato, in «Quando dev'essere attivo», restano «Sempre» e «Solo quando sei in diretta»: «Manuale» faceva lo stesso di «Sempre», e chi l'aveva scelto ora legge «Sempre». [vai: stato]
- Su Kick il bot ubbidisce all'interruttore e alla modalità: spento non risponde più, e con «Solo quando sei in diretta» risponde solo mentre Kick dice che sei in onda. [vai: stato]
- Per i canali nati su YouTube la chat delle dirette parte davvero: prima la levetta restava alzata e il bot non la leggeva mai. [vai: account]
- La scheda Stato di un canale Kick, YouTube o Discord non chiede più i permessi di Twitch, e «in chat adesso» guarda la chat della piattaforma del canale. [vai: stato]
- La carta «Attiva il bot» dice il vero sui permessi: Twitch ne chiede uno per ogni funzione che li usa, e l'elenco intero lo vedi prima di confermare. [vai: stato]
- In «Le tue piattaforme» un canale Kick, YouTube o Discord non vede più Twitch «da sistemare»: la riga dice che Twitch è un canale a sé, e come entrarci. [vai: account]
- Se dai i permessi entrando su Twitch con un altro account, il pannello te lo dice al ritorno e ti propone di riprovare, invece di tornare in silenzio. [vai: stato]
- Un moderatore non vede più i tasti per pagare, aggiungere un extra o aprire il portale dei pagamenti: sono del proprietario, e prima «Attiva» faceva pagare il canale del moderatore. [vai: sottoscrizione]
- Chi ha già il Base e nessun extra, nella scheda Abbonamento, vede solo quanto costano gli extra che aggiunge: prima il totale contava di nuovo il canone Base. [vai: sottoscrizione]
- In «Cosa hai acceso» della scheda Abbonamento ci sono anche «Bot su Telegram» e «Studio Web», che il Base comprende e mancavano dall'elenco. [vai: sottoscrizione]
- Quando andryxify ti apre o ti chiude una funzione a mano, il pannello lo dice con il suo nome: prima scriveva «il proprietario», che sembrava voler dire te. [vai: sottoscrizione]
- Invitando un moderatore, il pannello dice che entrerà con il suo account sulla piattaforma che hai scelto, non più «con Twitch» anche per Kick e YouTube. [vai: account]
- Quando il bot perde la chat, il messaggio su Telegram nomina il tasto giusto, «Ricollega i permessi» nella scheda Stato.
- Su un dispositivo che non gestisce le passkey il pannello dice solo che non si può, senza più aggiungere subito dopo «Passkey creata!». [vai: account]
- Un invito da moderatore scaduto si vede come «invito scaduto», da rigenerare, invece di un «valido fino al» con una data già passata. [vai: account]
- Invitando un moderatore puoi scrivere il nome come lo vedi sulla piattaforma, anche con maiuscole o punti: si legge come quando quella persona entra. [vai: account]
- L'avviso «Spotify non è collegato» arriva solo a chi ha le richieste musicali accese: chi spegne il comando !sr non lo vede più. [vai: musica]
- L'avviso «Non hai ancora un comando tuo» non conta più i due moduli del kit di partenza lasciati com'erano: prima non compariva mai. [vai: moduli]
- Sotto i punti della chat sparisce la casella «Solo mentre sei in diretta», che non cambiava niente: la presenza arriva solo in diretta, le monete per messaggio sempre. [vai: giochi]
- Nel giveaway «Quanti» parte dal numero scelto in «Vincitori (predefinito)», e dopo «Estrai» la riga con chi ha vinto resta al suo posto. [vai: giveaway]
- Se apri un giveaway con i minigiochi spenti, il pannello ti dice di accendere «Attiva i minigiochi in chat» invece di parlare del piano. [vai: giveaway]
- «VIP a tempo attivi» dice quante dirette restano a chi ha vinto il premio, invece di «per sempre», e chi rivince il premio lo rinnova a dirette. [vai: giochi]
- Le citazioni importate mostrano nell'elenco il loro autore e la data, e i testi dell'elenco si leggono anche in inglese e spagnolo. [vai: giochi]
- Creare un premio nelle penitenze accende anche l'interruttore nella scheda, così un «Salva» dopo non le rispegne, e «Salva» parte una volta sola. [vai: penitenze]
- Quando manca il permesso dei punti canale, la scheda Penitenze ti dà il tasto «Aggiorna i permessi» invece di mandarti in un'altra scheda. [vai: penitenze]
- Sondaggi e predizioni partono con due campi, e il tasto «+» ne aggiunge fino a 5 opzioni o 10 esiti, i limiti di Twitch. [vai: sondaggi]
- Su un canale che non è su Twitch, Sondaggi e Penitenze dicono che funzionano solo lì, invece di mostrare tasti che non fanno niente.
- Se le regole dei giochi o l'elenco dei tuoi giochi non arrivano, la carta dice l'errore invece di restare in caricamento o dirti che non ne hai. [vai: giochi]
- In «Classifica & VIP» i rimandi chiamano le schede col loro nome, «Comandi» e «Comandi vocali», e i campi dei giochi da creare hanno etichette più chiare. [vai: giochi]
- Nel manuale dei giochi la tabella delle regole scrive «1 frase di serie» al singolare, e i premi dei tris della slot vengono dagli stessi numeri del gioco.
- In «I giochi che hai fatto» il tipo di ogni manche si legge col nome del menù, anche in inglese e spagnolo, e non con la sua sigla. [vai: giochi]
- Quando a sondaggi, predizioni o penitenze manca un permesso, pannello e chat ti dicono di premere «Aggiorna i permessi» nella scheda «Stato». [vai: stato]
- Nella Mini App di Telegram il badge «in chat adesso» guarda la chat della piattaforma del tuo canale, non più solo quella di Twitch, e se il canale una chat non ce l'ha non compare.
- Nella Mini App di Telegram il codice da collegare ti manda nel posto giusto del pannello: «Le tue community», scheda Telegram, carta «Accedi e gestisci da Telegram». [vai: telegram]
- La scheda Avvisi di Discord dice che gli avvisi partono col piano Base, e «Prova» chiede lo stesso piano degli avvisi veri invece di mandare un avviso che poi non arriverebbe. [vai: dcavvisi]
- Negli Avvisi di Discord «Togli» chiede conferma prima di togliere un canale, come fa già Telegram coi suoi posti. [vai: dcavvisi]
- Nelle schede Telegram e Discord le spiegazioni dicono il vero: «Rileva gruppo» va anche col bot interattivo acceso, i comandi stanno in «Chat e pubblico», e nel filtro passano i ruoli che spunti. [vai: telegram]
- Nella scheda Telegram «Avvisa il gruppo quando vado in diretta» si accende appena c'è un posto dove mandare l'avviso, anche solo un canale, come già accettava il server. [vai: telegram]
- «Fissa l'avviso in cima durante la live…» vale per ogni posto che aggiungi, e a fine diretta su TikTok l'avviso si toglie solo dove era fissato, seguendo la spunta di quel posto. [vai: telegram]
- Nei Ruoli di Discord, «Passa adesso» con «Tieni i ruoli aggiornati» spento ti dice di accenderlo, invece di chiederti di portare nel server un bot che c'è già. [vai: ruoli]
- Le frasi di !discord in chat, i messaggi di Telegram e Discord nel pannello e i motivi scritti nel registro del tuo server hanno gli accenti veri: «così», «più», «è» invece dell'apostrofo. [vai: ruoli]
- Costruendo «Intorno alle dirette», il canale sono-in-onda entra negli Avvisi di Discord già acceso, e l'avviso della diretta ci arriva senza doverlo riaccendere a mano. [vai: dcavvisi]
- Su Discord l'avviso di un post nuovo ha parole da post, come «ha caricato un nuovo video su YouTube», e non più il testo della diretta che diceva «è in diretta». [vai: dcavvisi]
- Con gli auguri accesi sia nel gruppo Telegram sia in chat, chi compie gli anni riceve anche quelli in chat al suo primo messaggio: prima quelli del gruppo li spegnevano. [vai: telegram]
- La carta degli auguri di compleanno si vede anche senza il bot Telegram, così accendi gli auguri in chat; la parte del gruppo ti dice di collegarlo. [vai: telegram]
- La carta dei compleanni e il codice per collegare la chat privata di Telegram si leggono anche in inglese e spagnolo. [vai: telegram]
- Nel registro del tuo server Discord, il motivo della condizione sulle dirette si legge «c’è stato ad almeno N dirette», come la chiama la scheda Ruoli. [vai: ruoli]
- I temi della locandina di Telegram hanno il nome anche in inglese e spagnolo, e le etichette di Telegram e Discord non usano più la lineetta lunga. [vai: telegram]
- Un moderatore che apre le schede di Discord legge che le usa solo il proprietario del canale, invece di «Non riesco a leggere la configurazione». [vai: ruoli]
- Nel server Discord i tasti per aggiungere categorie, canali, ruoli e permessi si fermano al tetto e dicono quanti ne tiene la traccia, e l'anteprima scrive cosa resta fuori. [vai: dcserver]
- Nei Ruoli di Discord «Aggiungi una regola» si ferma a 20 e lo dice, e nel filtro una regola senza parole o senza liste avvisa che così non si salva. [vai: ruoli]
- «Aggiungi numero» nella pagina link si ferma a sei, quanti la pagina ne mostra: prima dal settimo in poi i numeri sparivano al salvataggio senza dirlo. [vai: pagina]
- Movimento, spessore e ombra dei bottoni, nell'aspetto della pagina link, mostrano quelli che la pagina usa davvero, anche dopo un tema pronto: prima il pannello diceva «Fermo», «Leggero» e «Nessuna». [vai: pagina]
- «Rimborsa», nel registro delle donazioni, su una donazione arrivata con Satispay chiede conferma nominando il tuo negozio Satispay, non più il conto Stripe. [vai: donazioni]
- «Modi», nell'aspetto della pagina link, dice come va davvero il permesso per video e musica di altri siti: con «Caricali subito» chi apre la pagina trova prima una fascia che glielo chiede. [vai: pagina]
- «Salva la settimana» ricorda i posti che hai spuntato in «Mandala»: prima teneva quelli di prima, e la settimana automatica usciva nei posti vecchi. [vai: settimana]
- Il primo link già pronto della pagina link porta al tuo canale anche se entri con Kick o YouTube, non più a Twitch; chi ha solo un server Discord parte senza. [vai: pagina]
- Le Grafiche portano all'indirizzo vero del tuo canale anche se entri con Kick o YouTube, e nella pagina link la foto del profilo si chiama «La tua foto» per tutti. [vai: grafiche]
- Nelle schede Ruoli, Il server e Il filtro di Discord le spiegazioni non usano più la lineetta lunga come pausa. [vai: dcserver]

## 2026-09-26

- Aprendo il pannello con una connessione lenta non resta più una pagina bianca col solo piede: la copertina aspetta che sia pronto, e se ci mette troppo compare «Riprova».
- Chi sostiene il progetto e torna da Stripe ritrova la pagina col suo grazie: prima il rimando al sottodominio perdeva per strada la conferma del pagamento.
- Privacy e termini dicono il giorno in cui il loro testo è cambiato l'ultima volta, non più solo l'anno.
- Nei risultati di ricerca titoli e descrizioni di home, guide, manuali, privacy e termini si leggono interi, senza tagli.
- Scegliendo una veste per l'overlay anche il muro delle emote la segue: l'ombra sulle emote si accende o si spegne come vuole la veste.
- Gli effetti pronti, i tasti dell'ispettore nello Studio e quello per togliere un carattere hanno di nuovo il loro contorno a china.
- [importante] La mail e il messaggio su Telegram che chiedono la conferma della settimana hanno «Non pubblicare»: la fermi fino al momento dell'uscita, anche dopo averla confermata, e dal pannello lo stesso. [vai: grafiche]
  > Non pubblicare, anche all'ultimo minuto
  > Se dopo aver confermato ti accorgi di un errore nella settimana non devi correre al computer: la fermi dalla mail, da Telegram o dal pannello, e se ci ripensi la rimetti in uscita.
- Nella finestra delle novità le importanti hanno un titolo, due righe su perché contano e il tasto «Provala» che ti porta dove si usano. Lo stesso nella pagina delle novità.
- [importante] In basso a destra, un avviso alla volta ti dice cosa manca al canale per usare quello che hai: permessi, Spotify, overlay, comandi, pagina link, settimana. [vai: account]
  > Cosa manca, detto una cosa per volta
  > Se una funzione non parte perché manca un passo, lo sai senza doverlo cercare: «Fammi vedere» ti porta dove si fa, e se non è il momento lo rimandi o lo togli. Li vedi solo tu, non chi modera il canale.
- Le emote 7TV si aggiungono, si tolgono e si rinominano per davvero: «fatto» arriva solo se 7TV conferma, e collegando l'account si controlla che il token possa cambiare il tuo set. [vai: emote]
- Nella chat a schermo e nel muro le emote 7TV non spariscono più per dieci minuti quando 7TV risponde lento: resta l'ultima lista buona e si riprova entro un minuto.
- La plancia si apre disegnandosi: tessere e tasti a matita uno dopo l'altro, e il nome della sezione che sale parola per parola, come nel resto del pannello. Chiudendola si disfa.
- Nella pagina che chiede di confermare la settimana i tasti hanno l'aspetto di quelli del sito, non quello grezzo del browser.
- Quando al canale non manca niente, ogni qualche giorno un piccolo invito in basso a destra ti fa scoprire una funzione che non hai ancora provato, una volta sola.
- Le istruzioni per trovare il token 7TV dicono dove cliccare su Chrome, Edge e Firefox, e ricordano che senza l'accesso a 7tv.app il token non c'è. [vai: emote]
- [importante] Nel menù c'è «Strumenti», e dentro «QR su misura»: forme, colori, il tuo logo e una frase, e prima di scaricarlo lo rileggiamo dai pixel. Lo stesso stile va nelle Grafiche social. [vai: qr]
  > Un QR tuo che si legge davvero
  > Un QR personalizzato di solito si prova col telefono e si spera. Qui contrasto, margine e quanto può coprire il logo sono dentro il disegno, e se riletto non torna non si scarica.
- [importante] In «Strumenti» c'è anche «Emote e badge»: da un'immagine sola escono le tre misure che chiede Twitch, rimpicciolite senza sporcare i bordi, e le vedi nella chat chiara e in quella scura. [vai: misure]
  > Le misure di Twitch da un'immagine sola
  > Non serve un programma di grafica per avere 112, 56 e 28 pixel: carichi l'immagine, vedi subito come sta in chat e sai se pesa troppo prima di caricarla su Twitch.
- Nel QR su misura, sul telefono, l'anteprima resta in cima mentre scegli forme e colori, e i tasti per scaricare stanno in fondo.
- [importante] In «Strumenti» c'è il media kit: il foglio da mandare ai marchi, in PDF coi link cliccabili, con chi sei, cosa trasmetti e i numeri delle tue ultime dirette. [vai: kit]
  > I tuoi numeri, pronti per un marchio
  > I numeri li misuriamo noi dalle tue dirette, e sotto c'è scritto di quale periodo sono: chi lo legge sa che sono veri. Tu scegli cosa mostrare, non cosa dicono.
- [importante] Da un altro bot ora porti qui anche i timer e i punti del tuo pubblico, nella carta dei comandi: prima di importare vedi ogni timer con quando parla e ogni saldo come sarà dopo. [vai: moduli]
  > Il trasloco intero da un altro bot
  > I punti si sommano alle monete di qui una volta sola, anche se importi di nuovo. E un timer che qui si comporterebbe diversamente te lo diciamo, invece di cambiarlo di nascosto.

## 2026-09-25

- La libreria sfondi delle Grafiche, quando è vuota, lo dice su tutta la riga invece di andare a capo sillaba per sillaba. Lo stesso per gli altri elenchi a griglia vuoti o in caricamento. [vai: grafiche]
- [importante] Nell'Overlay Studio decidi chi sta davanti e chi dietro trascinando la riga nei livelli, e in diretta l'ordine è lo stesso della tela. Scegliere un elemento non lo porta più in primo piano. [vai: alert]
  > Davanti e dietro, come in un programma di grafica
  > Metti la chat sopra la webcam o l'alert sopra tutto trascinando una riga, e quello che vedi nello Studio è quello che va in onda.
- Nello Studio un elemento spento non si porta più dietro una macchia tonda colorata, e si prende col clic in tutta la sua area.
- [importante] Otto effetti pronti a tutto schermo disegnati da noi: coriandoli, fuochi d'artificio, cuori, neve, palloncini, bolle, stelle e lampo. Scegli colori, quantità e durata, e dagli un comando. [vai: effetti]
  > Otto effetti pronti a tutto schermo
  > Scegli un effetto, lo colori come il tuo canale e lo lanci con un comando o con un premio: niente da cercare o da caricare.
- [importante] Ogni immagine o video dei tuoi effetti può andare a tutto schermo, riempito o intero, senza passare dall'area degli effetti dello Studio. [vai: effetti]
  > I tuoi effetti a tutto schermo
  > Un video o un'immagine che hai caricato copre tutta la scena quando lo lanci, e non serve disegnargli un'area nello Studio.
- I video WebM trasparenti restano trasparenti dopo il caricamento, i PNG animati restano animati e i WebP animati si caricano. Un file che non si legge dice quali formati vanno. [vai: effetti]
- [importante] Nella storia «Stasera alle…» l'immagine del gioco ha tre modi: a tutto schermo con velo e sfocatura, in un riquadro che sposti e ingrandisci, o niente per lasciare il tema. [vai: grafiche]
  > L'immagine del gioco come la vuoi tu
  > La stessa storia può avere la copertina del gioco sfocata dietro, piccola in un riquadro o niente, così si adatta al tuo stile invece del contrario.
- Gli effetti accettano ogni video trasparente: WebM, MOV ProRes 4444 o HEVC di iPhone e Final Cut, Animation, GIF, APNG, AVIF e WebP animati. Se la trasparenza si perdesse, il caricamento si ferma e lo dice. [vai: effetti]
- «Prova» su un effetto te lo fa vedere nel pannello com'è in onda, video e disegni compresi, e da lì lo mandi all'overlay. Nella libreria anche immagini e video hanno il tasto per guardarli. [vai: effetti]
- [importante] Caricando un effetto puoi togliere uno sfondo a tinta unita, come un green screen: lo vedi subito nell'anteprima e in onda esce proprio così. [vai: effetti]
  > Togli lo sfondo, come un green screen
  > Un video con lo sfondo verde o nero diventa un effetto pulito sopra la scena, senza programmi di montaggio: lo vedi subito, e in onda esce identico.
- Una GIF o un PNG animato coi fotogrammi velocissimi va in onda al ritmo con cui lo vedi nel browser, non più fino a dieci volte più veloce. [vai: effetti]
- Sul telefono la home non si trascina più di lato: le decorazioni della prima schermata restano dentro lo schermo, e il banner dei cookie ha di nuovo il tasto a portata di dito.
- Nella tua pagina link un indirizzo lungo scritto in un testo va a capo, invece di uscire dallo schermo del telefono. [vai: pagina]
- Sul telefono il menù non scorre più: si disegna quando lo apri e si disfa quando lo chiudi, con la X, toccando fuori o scegliendo una voce.
- Nel muro delle emote il numero della combo non torna più indietro quando la scena in onda è pesante: cinque persone che ripetono la stessa emote fanno sempre ×5. [vai: alert]
- Il menù si disegna in ogni caso: quando la pagina si carica, quando allarghi o stringi la finestra, quando giri il tablet e quando togli il tutto schermo.
- Con «Riduci movimento» attivo le pagine, gli avvisi, le finestre e il menù si disegnano e si disfano come per tutti, invece di comparire e sparire di colpo.
- Nella tua pagina link il blocco per sostenerti compare quando ci arrivi anche sui browser meno recenti, dove prima restava invisibile. [vai: pagina]
- Le tendine, le carte che ripieghi, i gruppi del menù, la ricerca, la barra delle modifiche e le finestre si disegnano quando compaiono e si disfano quando se ne vanno, invece di scivolare o sparire di colpo.
- Nella home la finestra per scegliere con cosa accedere si disegna e si disfa, e gli avvisi non si interrompono più a metà del loro disegno.
- Cambiando sezione la pagina vecchia si disfa prima che arrivi la nuova, anche fra pagine dello stesso gruppo, e con lei la testata.
- Le righe che aggiungi o togli, come azioni, frasi, premi e livelli delle donazioni, si disegnano quando arrivano e si disfano quando le togli.
- Dopo un salvataggio, un cambio di canale o di lingua la pagina si disfa e si ridisegna, invece di cambiare di colpo.
- Le bolle d'aiuto, le nuvolette e le barre in alto e in basso si disegnano quando compaiono e si disfano quando se ne vanno.
- [importante] !giochi risponde a chi lo chiede con i giochi che può usare, divisi per come si gioca, e con !giochi e un nome spiega quel gioco coi nomi e le regole del tuo canale. [vai: giochi]
  > !giochi spiega i giochi alla chat
  > Chi arriva in chat scopre da solo a cosa può giocare e come si fa, con i nomi e le regole del tuo canale, e tu non devi ripeterlo ogni volta.
- Chi chiede qualcosa in chat, come una classifica, come si usa un comando o quanto aspettare, riceve la risposta agganciata al suo messaggio. Le classifiche dicono anche dove sta lui.
- Il blackjack dice il conto per intero: quanto ti torna, cosa c'è dentro e quante monete hai adesso. Se il bot si riavvia con una mano aperta, lo dice in chat quando rende la puntata.
- Fra i comandi dei giochi la pesca non porta più l'etichetta «costa monete»: non ne è mai costata.
- Chi toglie e rimette il follow non fa più partire avvisi, ringraziamenti e conti da follower nuovo. Chi torna a seguirti dopo tre mesi viene salutato con un bentornato.
- Una domanda fatta a te in chat che il bot non sa resta a te: il bot tace invece di rispondere col tuo nome. Le cose da sistemare nel pannello le dice solo a te e ai tuoi mod, mai agli spettatori.
- L'elenco di !giochi dice come si gioca ognuno: il nome e quello che va scritto dopo, tipo !duello @nome posta. In fondo dice come chiedere le regole di un gioco.
- Nello Studio i pannelli che arrotoli, il riquadro delle proprietà e le righe dei livelli si disegnano e si disfano come il resto del pannello. Sul telefono di lato il tasto della guida la mostra davvero.

## 2026-09-24

- Il sito si disegna: cambiando sezione la pagina vecchia si disegna all'indietro e la nuova si disegna a matita e china, come una tavola di manga. Lo stesso per avvisi, finestre e carte che arrivano.
  en: The site draws itself: when you switch sections, the old page un-draws and the new one is sketched in pencil and ink, like a manga page. The same goes for notices, windows and cards as they arrive.
  es: El sitio se dibuja: al cambiar de sección la página vieja se borra hacia atrás y la nueva se dibuja a lápiz y tinta, como una página de manga. Igual con los avisos, las ventanas y las tarjetas que llegan.
- Il tasto che premi si ripassa a china per un attimo. Prima di un gesto di cui potresti pentirti, come togliere una regola, la finestra che te lo chiede diventa una nuvoletta rossa a punte.
  en: The button you press gets inked over for a moment. Before an action you might regret, like removing a rule, the window asking you turns into a spiky red speech bubble.
  es: El botón que pulsas se repasa con tinta un instante. Antes de un gesto del que podrías arrepentirte, como quitar una regla, la ventana que te lo pregunta se vuelve un globo rojo con picos.
- Nel pannello, quando si parla di tutto il servizio adesso c'è scritto SocialBot. «Il bot» resta per quello che scrive in chat, su Discord e su Telegram.
  en: In the panel, when it’s about the whole service, it now says SocialBot. “The bot” is kept for what writes in chat, on Discord and on Telegram.
  es: En el panel, cuando se habla de todo el servicio, ahora dice SocialBot. «El bot» queda para lo que escribe en el chat, en Discord y en Telegram.
- Guide e manuali non saltano più mentre si caricano i caratteri, e due guide non portano più a una pagina che non c'era.
  en: Guides and manuals no longer jump while the fonts load, and two guides no longer link to a page that didn’t exist.
  es: Guías y manuales ya no saltan mientras cargan las fuentes, y dos guías ya no llevan a una página que no existía.
- La pagina iniziale pesa quasi un terzo in meno, e sul telefono si vede prima.
  en: The home page weighs almost a third less, and it shows up sooner on phones.
  es: La portada pesa casi un tercio menos, y en el teléfono se ve antes.
- Puoi dare un voto a SocialBot, da Il tuo account o dalla carta che compare dopo un po' che lo usi. Le recensioni scorrono nella pagina iniziale, sotto l'anteprima dell'Overlay Studio. [vai: account]
  en: You can rate SocialBot, from Your account or from the card that shows up after you’ve used it for a while. Reviews scroll on the home page, under the Overlay Studio preview.
  es: Puedes darle una puntuación a SocialBot, desde Tu cuenta o desde la tarjeta que aparece después de usarlo un tiempo. Las reseñas pasan en la portada, debajo de la vista previa de Overlay Studio.
- La pagina iniziale in inglese e in spagnolo ha il suo indirizzo, socialbot.live/en e socialbot.live/es, e la demo aperta da lì parte già nella tua lingua.
  en: The home page in English and in Spanish has its own address, socialbot.live/en and socialbot.live/es, and the demo opened from there starts in your language.
  es: La portada en inglés y en español tiene su propia dirección, socialbot.live/en y socialbot.live/es, y la demo abierta desde ahí ya arranca en tu idioma.
- Nel registro dello scudo le azioni rimaste in sospeso, e i numeri della coda, sono solo quelli del tuo canale. [vai: registro]
  en: In the shield log, pending actions and the queue numbers are only your channel’s.
  es: En el registro del escudo, las acciones pendientes y los números de la cola son solo los de tu canal.
- Cancellare l'account funziona anche per i canali Kick, YouTube e Discord, e disdice prima l'abbonamento: dopo non parte più nessun addebito. [vai: account]
  en: Deleting your account works for Kick, YouTube and Discord channels too, and it cancels your subscription first: no charges go out afterward.
  es: Borrar la cuenta funciona también para los canales de Kick, YouTube y Discord, y antes cancela la suscripción: después no sale ningún cobro.
- «Salva le regole» nei Giochi salva le regole dei giochi, e il salva delle parole vietate non tocca più le regole dei giochi. [vai: giochi]
  en: “Save the rules” in Games saves the game rules, and saving banned words no longer touches the game rules.
  es: «Guardar las reglas» en Juegos guarda las reglas de los juegos, y guardar las palabras prohibidas ya no toca las reglas de los juegos.
- Le penitenze contano davvero quello che dici: finché ce n'è una in corso, la pagina della voce manda al bot tutto il parlato, non solo i comandi. [vai: penitenze]
  en: Forfeits really count what you say: while one is running, the voice page sends the bot everything you say, not just commands.
  es: Las penitencias cuentan de verdad lo que dices: mientras hay una en curso, la página de voz le manda al bot todo lo que hablas, no solo los comandos.
- I contatori sono uno solo: l'azione «Contatore» dei comandi, $count(nome) e il contatore con !morti sono lo stesso numero, e «Incrementa (+1)» aggiunge davvero uno. [vai: moduli]
  en: There’s just one kind of counter: the commands’ “Counter” action, $count(name) and the counter with !morti are the same number, and “Increase (+1)” really adds one.
  es: Los contadores son uno solo: la acción «Contador» de los comandos, $count(nombre) y el contador con !morti son el mismo número, y «Aumenta (+1)» suma uno de verdad.
- «Salva aspetto» dei contatori salva l'aspetto invece di dare un errore. [vai: moduli]
  en: “Save look” on counters saves the look instead of throwing an error.
  es: «Guardar aspecto» de los contadores guarda el aspecto en lugar de dar un error.
- Ko-fi si collega nella carta in alto delle Donazioni, accanto a Stripe e Satispay: con la pagina e il token, chi dona trova il tasto Ko-fi fra i modi per donare. [vai: donazioni]
  en: Ko-fi connects in the top card of Donations, next to Stripe and Satispay: with the page and the token, donors find the Ko-fi button among the ways to donate.
  es: Ko-fi se conecta en la tarjeta de arriba de Donaciones, junto a Stripe y Satispay: con la página y el token, quien dona encuentra el botón de Ko-fi entre las formas de donar.
- La pagina link e la pagina delle donazioni si aprono anche per i canali di Kick, YouTube e Discord, e le donazioni da Ko-fi arrivano anche a loro. [vai: pagina]
  en: The link page and the donations page open for Kick, YouTube and Discord channels too, and Ko-fi donations reach them as well.
  es: La página de enlaces y la de donaciones se abren también para los canales de Kick, YouTube y Discord, y las donaciones de Ko-fi les llegan también.
- «Prova l'avviso» nelle Donazioni fa partire una donazione, non un follow, e l'alert Donazione accetta i tuoi suoni e le tue immagini. [vai: donazioni]
  en: “Test the alert” in Donations fires a donation, not a follow, and the Donation alert accepts your own sounds and images.
  es: «Probar el aviso» en Donaciones lanza una donación, no un follow, y la alerta Donación acepta tus sonidos y tus imágenes.
- Dalla pagina delle donazioni si dona anche quando la pagina link è spenta. [vai: donazioni]
  en: People can donate from the donations page even when the link page is turned off.
  es: Desde la página de donaciones se puede donar aunque la página de enlaces esté apagada.
- Una donazione in un'altra valuta fa partire l'avviso e il grazie, ma non conta per l'obiettivo e per le offerte, che sono nella tua valuta. [vai: donazioni]
  en: A donation in another currency fires the alert and the thank-you, but doesn’t count toward the goal or the offers, which are in your currency.
  es: Una donación en otra moneda lanza el aviso y el agradecimiento, pero no cuenta para el objetivo ni para las ofertas, que están en tu moneda.
- L'informativa della tua pagina nomina i conti che usi davvero, Ko-fi compreso, e la privacy e i termini del sito parlano anche di Ko-fi.
  en: Your page’s privacy notice names the accounts you actually use, Ko-fi included, and the site’s privacy policy and terms cover Ko-fi too.
  es: El aviso de privacidad de tu página nombra las cuentas que usas de verdad, Ko-fi incluido, y la privacidad y los términos del sitio hablan también de Ko-fi.
- Nell'Overlay Studio, nelle Grafiche, nella Pagina link e nelle Donazioni c'è «Tutto schermo»: il menù lascia il lato e la pagina prende tutta la larghezza. [vai: alert]
  en: Overlay Studio, Graphics, the Link page and Donations have “Full screen”: the menu leaves the side and the page takes the whole width.
  es: En Overlay Studio, Gráficas, la Página de enlaces y Donaciones está «Pantalla completa»: el menú deja el lateral y la página ocupa todo el ancho.
- A tutto schermo il menù aspetta sul bordo sinistro: ci arrivi col cursore e si disegna, lo lasci e si disfa. Nello Studio il menù resta di lato finché non scegli tu. [vai: alert]
  en: In full screen the menu waits at the left edge: move the cursor there and it draws itself, move away and it un-draws. In the Studio the menu stays at the side until you choose otherwise.
  es: En pantalla completa el menú espera en el borde izquierdo: llegas con el cursor y se dibuja, lo dejas y se deshace. En el Studio el menú se queda al lado hasta que elijas tú.
- I suggerimenti che compaiono passando sopra ai tasti sono più leggeri e si disegnano a matita, e dopo un clic dicono la cosa giusta.
  en: The tips that appear when you hover over buttons are lighter and drawn in pencil, and after a click they say the right thing.
  es: Las ayudas que aparecen al pasar sobre los botones son más ligeras y se dibujan a lápiz, y después de un clic dicen lo correcto.
- Chi condivide socialbot.live/en o socialbot.live/es vede l'anteprima del link in inglese o in spagnolo, come la pagina.
  en: People who share socialbot.live/en or socialbot.live/es see the link preview in English or Spanish, like the page.
  es: Quien comparte socialbot.live/en o socialbot.live/es ve la vista previa del enlace en inglés o en español, como la página.
- La tua pagina link, e la sua anteprima nelle chat, mostrano la tua foto anche se entri con Kick, YouTube o Discord, dal prossimo accesso. [vai: pagina]
  en: Your link page, and its preview in chats, show your photo even if you sign in with Kick, YouTube or Discord, starting from your next sign-in.
  es: Tu página de enlaces, y su vista previa en los chats, muestran tu foto aunque entres con Kick, YouTube o Discord, desde el próximo acceso.
- In sola osservazione lo scudo non cambia più le modalità della chat: nel registro scrive cosa avrebbe fatto, come per il resto. [vai: scudo]
  en: In observe-only mode the shield no longer changes chat modes: it writes in the log what it would have done, like for everything else.
  es: En solo observar el escudo ya no cambia los modos del chat: escribe en el registro lo que habría hecho, como con lo demás.
- «Blocca sempre» vale sempre con lo scudo acceso, anche con l'elenco dei nomi da bot spento. [vai: scudo]
  en: “Always block” always applies with the shield on, even with the list of bot names turned off.
  es: «Bloquear siempre» vale siempre con el escudo encendido, aunque la lista de nombres de bots esté apagada.
- Tolto l'interruttore «Durante un'ondata, chat ai soli follower», che non faceva niente: ai soli follower la chat ci va quando lo scudo arriva ad «attacco». [vai: scudo]
  en: The “During a wave, followers-only chat” switch is gone, since it did nothing: chat goes followers-only when the shield reaches “attack”.
  es: Se quitó el interruptor «Durante una oleada, chat solo para seguidores», que no hacía nada: el chat pasa a solo seguidores cuando el escudo llega a «ataque».
- La pulizia dopo un attacco dice quanti account toglie davvero e quanti ne lascia stare, e quando non può dice perché. [vai: registro]
  en: The cleanup after an attack says how many accounts it actually removes and how many it leaves alone, and when it can’t, it says why.
  es: La limpieza tras un ataque dice cuántas cuentas quita de verdad y cuántas deja en paz, y cuando no puede dice por qué.
- Nel registro dello scudo ogni riga ha il suo nome nella lingua del pannello, e dopo «Permetti», «Ignora» o «Blocca sempre» si aggiorna il registro. [vai: registro]
  en: In the shield log every row has its name in the panel’s language, and after “Allow”, “Dismiss” or “Always block” the log updates.
  es: En el registro del escudo cada fila tiene su nombre en el idioma del panel, y después de «Permitir», «Ignorar» o «Bloquear siempre» el registro se actualiza.
- La pulizia dei follower blocca invece di bannare, così il follow sparisce e il numero torna pulito. Se il blocco non si può fare banna e lo dice, e se mancano i permessi dice dove riconcederli. [vai: registro]
  en: The follower cleanup blocks instead of banning, so the follow disappears and the count comes back clean. If blocking isn’t possible it bans and says so, and if permissions are missing it says where to grant them again.
  es: La limpieza de seguidores bloquea en lugar de banear, así el follow desaparece y el número vuelve a estar limpio. Si no se puede bloquear, banea y lo dice, y si faltan permisos dice dónde volver a darlos.
- Quando «Blocca sempre» o «Non toccare mai» sono piene il pannello lo dice, invece di perdere il nome al salvataggio, e il caso da rivedere resta lì finché non fai spazio. [vai: scudo]
  en: When “Always block” or “Never touch” are full, the panel says so instead of losing the name on save, and the case to review stays there until you make room.
  es: Cuando «Bloquear siempre» o «Nunca tocar» están llenas, el panel lo dice en lugar de perder el nombre al guardar, y el caso por revisar se queda ahí hasta que hagas espacio.
- Con «solo mod» nei link dell'antispam un VIP non posta più link. Per tutto il resto i VIP restano liberi. [vai: regole]
  en: With “mods only” set for links in the antispam, a VIP can no longer post links. For everything else, VIPs stay free.
  es: Con «solo mods» en los enlaces del antispam, un VIP ya no publica enlaces. Para todo lo demás, los VIP siguen libres.
- Lo scudo dice giusto chi non tocca mai: tu, i mod, i VIP e gli abbonati. Seguire il canale non basta, perché il follow è un clic e i follow-bot lo fanno. [vai: scudo]
  en: The shield correctly states who it never touches: you, mods, VIPs and subscribers. Following the channel isn’t enough, because a follow is one click and follow-bots do it.
  es: El escudo dice bien a quién no toca nunca: a ti, a los mods, a los VIP y a los suscriptores. Seguir el canal no basta, porque el follow es un clic y los follow-bots lo hacen.
- Le conferme del pannello, come «salvato», «acceso» e «spento», escono nella lingua del pannello, e numeri e date si scrivono come si usa in quella lingua.
  en: Panel confirmations, like “Saved”, “On” and “Off”, come out in the panel’s language, and numbers and dates are written the way that language writes them.
  es: Las confirmaciones del panel, como «Guardado», «Encendido» y «Apagado», salen en el idioma del panel, y los números y las fechas se escriben como se usa en ese idioma.
- «Sfoglia i font» tiene la sua icona anche dopo che hai aperto e chiuso l'elenco. [vai: alert]
  en: “Browse fonts” keeps its icon even after you’ve opened and closed the list.
  es: «Explorar fuentes» mantiene su icono incluso después de abrir y cerrar la lista.
- Con il canale su YouTube o su Discord, le schede che parlano solo con Twitch sono spente e spiegate, come già su Kick, invece di mostrare pulsanti che non fanno niente.
  en: With a YouTube or Discord channel, tabs that only work with Twitch are turned off and explained, as on Kick already, instead of showing buttons that do nothing.
  es: Con el canal en YouTube o en Discord, las pestañas que solo funcionan con Twitch están apagadas y explicadas, como ya pasaba en Kick, en lugar de mostrar botones que no hacen nada.
- Aprendo un attacco nel registro dello scudo, i conti dicono certi, sospetti e legittimi nella lingua del pannello, senza un «probabile» che restava sempre a zero. [vai: registro]
  en: When you open an attack in the shield log, the counts say certain, suspect and legitimate in the panel’s language, without a “probable” that always stayed at zero.
  es: Al abrir un ataque en el registro del escudo, las cuentas dicen seguros, sospechosos y legítimos en el idioma del panel, sin un «probable» que siempre quedaba en cero.
- Il manuale della moderazione segue le tre schede, Chat, Scudo e Registro, e spiega ogni voce con il suo valore di base, i suoi limiti e i messaggi che leggi. [vai: regole]
  en: The moderation manual follows the three tabs, Chat, Shield and Log, and explains each item with its default, its limits and the messages you read.
  es: El manual de moderación sigue las tres pestañas, Chat, Escudo y Registro, y explica cada opción con su valor de base, sus límites y los mensajes que lees.
- In guide e manuali l'indice «In questa pagina» mostra anche le parti di ogni sezione, e ognuna si apre col suo collegamento.
  en: In guides and manuals, the “On this page” index also shows the parts of each section, and each one opens with its own link.
  es: En guías y manuales, el índice «En esta página» muestra también las partes de cada sección, y cada una se abre con su enlace.
- «Adatta la personalità al mio canale» fa quello che dice: spento, il bot non impara più lo stile dalla tua voce e dai tuoi messaggi, e usa solo le frasi che hai scritto tu. [vai: personalita]
  en: “Adapt the personality to my channel” does what it says: when it’s off, the bot no longer learns style from your voice and your messages, and uses only the phrases you wrote.
  es: «Adapta la personalidad a mi canal» hace lo que dice: apagado, el bot ya no aprende el estilo de tu voz ni de tus mensajes, y usa solo las frases que escribiste tú.
- Le regole della personalità sono al massimo 12 e arrivano al bot tutte. Prima dalla tredicesima in poi si salvavano, ma il bot non le vedeva. [vai: personalita]
  en: Personality rules are capped at 12 and all of them reach the bot. Before, from the thirteenth on they were saved, but the bot didn’t see them.
  es: Las reglas de la personalidad son como máximo 12 y le llegan todas al bot. Antes, de la decimotercera en adelante se guardaban, pero el bot no las veía.
- Nella Memoria ogni lezione e ogni fatto si toglie da solo con «Togli», e azzerare tutta la memoria lo può fare solo il proprietario del canale. [vai: memoria]
  en: In Memory, each lesson and each fact can be removed on its own with “Remove”, and only the channel owner can wipe the whole memory.
  es: En Memoria cada lección y cada dato se quita por separado con «Quitar», y borrar toda la memoria solo lo puede hacer el propietario del canal.
- Il promemoria dei social parte solo con la pagina link accesa, e il suggerimento sotto la spunta dice quando parte davvero. [vai: personalita]
  en: The socials reminder only runs with the link page on, and the tip under the checkbox says when it really goes out.
  es: El recordatorio de las redes sale solo con la página de enlaces encendida, y la ayuda debajo de la casilla dice cuándo sale de verdad.
- «Ri-leggi il mio profilo» dice quante cose nuove ha trovato, e se non trova niente lo dice invece di scrivere «Fatto». [vai: conoscenza]
  en: “Re-read my profile” says how many new things it found, and if it finds nothing it says so instead of writing “Done”.
  es: «Volver a leer mi perfil» dice cuántas cosas nuevas encontró, y si no encuentra nada lo dice en lugar de escribir «Hecho».
- In «Cosa sa il bot» e nella Memoria ogni voce ha un nome nella lingua del pannello, anche quelle trovate online o ricavate dai tuoi discorsi. [vai: conoscenza]
  en: In “What the bot knows” and in Memory every entry has a name in the panel’s language, including ones found online or drawn from your conversations.
  es: En «Lo que sabe el bot» y en Memoria cada entrada tiene un nombre en el idioma del panel, también las encontradas en línea o sacadas de tus conversaciones.
- Il manuale del bot segue le tre schede, Personalità, Conoscenza e Memoria, con ogni controllo, il suo valore di base e i messaggi che leggi. [vai: personalita]
  en: The bot manual follows the three tabs, Personality, Knowledge and Memory, with every control, its default and the messages you read.
  es: El manual del bot sigue las tres pestañas, Personalidad, Conocimiento y Memoria, con cada control, su valor de base y los mensajes que lees.
- Premendo «Tutto schermo» il menù di lato si disfa a matita prima di lasciare il posto, e tornando indietro si ridisegna. [vai: alert]
  en: When you press “Full screen” the side menu un-draws in pencil before making room, and when you go back it draws itself again.
  es: Al pulsar «Pantalla completa» el menú lateral se deshace a lápiz antes de dejar su sitio, y al volver se dibuja de nuevo.
- Nelle Grafiche l'anteprima resta tutta visibile mentre scorri, sotto la barra in cima. [vai: grafiche]
  en: In Graphics the preview stays fully visible while you scroll, under the top bar.
  es: En Gráficas la vista previa se queda entera a la vista mientras te desplazas, debajo de la barra de arriba.
- Nel giro guidato il riquadro attorno a quello che ti indica si disegna a matita, a ogni passo.
  en: In the guided tour, the box around what it’s pointing at is drawn in pencil at every step.
  es: En el recorrido guiado, el recuadro alrededor de lo que te señala se dibuja a lápiz en cada paso.
- [importante] Nelle Grafiche sposti ogni pezzo trascinandolo sull'anteprima, col mouse, col dito o con le frecce. Le guide mostrano margini, centri e dove Instagram copre la storia, e post e storia si spostano insieme. [vai: grafiche]
  en: In Graphics you move each piece by dragging it on the preview, with the mouse, your finger or the arrow keys. Guides show margins, centers and where Instagram covers the story, and post and story move together.
  es: En Gráficas mueves cada pieza arrastrándola sobre la vista previa, con el mouse, el dedo o las flechas. Las guías muestran márgenes, centros y dónde Instagram tapa la historia, y post e historia se mueven juntos.
  > Le Grafiche si impaginano col dito
  > Sposti titolo, orari e immagini direttamente sull'anteprima, e le guide ti dicono dove Instagram coprirebbe la storia prima che succeda.
  en> Lay out your graphics with your finger
  en> Move the title, times and images right on the preview, and the guides show where Instagram would cover the story before it happens.
  es> Las Gráficas se maquetan con el dedo
  es> Mueves título, horarios e imágenes directamente sobre la vista previa, y las guías te dicen dónde Instagram taparía la historia antes de que pase.
- [importante] Nelle Grafiche c'è «Stasera alle…»: la storia che annuncia la prossima diretta della tua Settimana, con l'ora, il tuo indirizzo e dietro la copertina del gioco. [vai: grafiche]
  en: Graphics has “Tonight at…”: the story that announces the next stream from Your week, with the time, your address and the game’s cover art behind it.
  es: En Gráficas está «Esta noche a las…»: la historia que anuncia el próximo directo de Tu semana, con la hora, tu dirección y detrás la portada del juego.
  > La storia che annuncia la prossima diretta
  > Ogni giorno in onda ha la sua storia già pronta, con l'ora giusta e la copertina del gioco: la pubblichi in un tocco invece di rifarla ogni volta.
  en> The story that announces your next stream
  en> Every day on air has its story ready, with the right time and the game’s cover art: you post it with one tap instead of making it again every time.
  es> La historia que anuncia el próximo directo
  es> Cada día al aire tiene su historia ya lista, con la hora correcta y la portada del juego: la publicas con un toque en lugar de rehacerla cada vez.
- [importante] Nella pagina link e in quella delle donazioni l'immagine di sfondo si sposta e si rimpicciolisce trascinandola sull'anteprima. Dove non arriva continuano i colori dei suoi bordi. [vai: pagina]
  en: On the link page and the donations page, the background image moves and shrinks as you drag it on the preview. Where it doesn’t reach, the colors of its edges carry on.
  es: En la página de enlaces y en la de donaciones, la imagen de fondo se mueve y se reduce arrastrándola sobre la vista previa. Donde no llega siguen los colores de sus bordes.
  > Lo sfondo della pagina link si sistema trascinando
  > Scegli tu quale parte della foto si vede e quanto è grande, e dove la foto non arriva i colori continuano senza un bordo netto.
  en> Adjust the link page background by dragging
  en> You choose which part of the photo shows and how big it is, and where the photo doesn’t reach the colors carry on without a hard edge.
  es> El fondo de la página de enlaces se ajusta arrastrando
  es> Eliges qué parte de la foto se ve y qué tan grande es, y donde la foto no llega los colores siguen sin un borde marcado.
- Il boss risponde a chi lo colpisce: poco dopo il primo colpo, e poi al massimo ogni venti secondi, il bot scrive chi ha colpito e quanto, la vita che resta e i secondi che mancano. [vai: giochi]
  en: The boss answers whoever hits it: shortly after the first hit, and then at most every twenty seconds, the bot writes who hit it and how hard, the health left and the seconds remaining.
  es: El jefe responde a quien lo golpea: poco después del primer golpe, y luego como mucho cada veinte segundos, el bot escribe quién golpeó y cuánto, la vida que queda y los segundos que faltan.
- [importante] Nelle Grafiche c'è «In automatico»: la storia «Stasera alle…» esce da sola prima di ogni diretta, e la settimana esce il giorno che scegli, dopo che l'hai confermata dalla mail o dal pannello. [vai: grafiche]
  en: Graphics has “Automatic”: the “Tonight at…” story goes out by itself before every stream, and the week goes out on the day you choose, after you’ve confirmed it by email or from the panel.
  es: En Gráficas está «Automático»: la historia «Esta noche a las…» sale sola antes de cada directo, y la semana sale el día que eliges, después de confirmarla desde el correo o el panel.
  > Le storie escono da sole
  > La storia prima della diretta e la settimana escono all'ora giusta anche se te ne dimentichi, e la settimana solo dopo che l'hai confermata.
  en> Stories that go out by themselves
  en> The pre-stream story and the week go out at the right time even if you forget, and the week only after you’ve confirmed it.
  es> Las historias salen solas
  es> La historia antes del directo y la semana salen a la hora correcta aunque te olvides, y la semana solo después de que la hayas confirmado.
- Col tutto schermo acceso, passando a una scheda che non lo usa il menù torna di lato disegnandosi, e tornando si disfa prima di sparire. Anche riaprirlo mentre si sta chiudendo lo ridisegna.
  en: With full screen on, switching to a tab that doesn’t use it brings the menu back to the side, drawing itself, and switching back un-draws it before it vanishes. Reopening it while it’s closing redraws it too.
  es: Con la pantalla completa activada, al pasar a una pestaña que no la usa el menú vuelve al lado dibujándose, y al volver se deshace antes de desaparecer. Reabrirlo mientras se cierra también lo redibuja.
- [importante] La pagina delle donazioni può avere l'aspetto della pagina link e seguirlo quando lo cambi: nell'editor, in «Aspetto», scegli «Uguale alla pagina link». [vai: donazioni]
  en: The donations page can have the link page’s look and follow it when you change it: in the editor, under “Look”, choose “Same as the link page”.
  es: La página de donaciones puede tener el aspecto de la página de enlaces y seguirlo cuando lo cambias: en el editor, en «Aspecto», eliges «Igual que la página de enlaces».
  > Donazioni e pagina link con lo stesso aspetto
  > Chi passa dalla tua pagina link a quella delle donazioni trova gli stessi colori e gli stessi caratteri, e se cambi l'una cambia anche l'altra.
  en> Donations and link page with the same look
  en> People going from your link page to your donations page find the same colors and fonts, and if you change one the other changes too.
  es> Donaciones y página de enlaces con el mismo aspecto
  es> Quien pasa de tu página de enlaces a la de donaciones encuentra los mismos colores y las mismas fuentes, y si cambias una cambia también la otra.
- Nell'editor della pagina link e di quella delle donazioni, dopo un tema pronto resti nella scheda in cui eri, e i tasti scattano una volta sola anche dopo tanti ritocchi.
  en: In the link page and donations page editor, after a ready-made theme you stay on the tab you were on, and buttons fire only once even after lots of tweaks.
  es: En el editor de la página de enlaces y de la de donaciones, después de un tema listo te quedas en la pestaña donde estabas, y los botones saltan una sola vez incluso después de muchos retoques.
- La classifica dei Bit compare davvero in diretta, e resta dove la metti in ogni overlay. I caratteri che carichi si vedono anche in OBS, non solo nello Studio. [vai: alert]
  en: The Bits leaderboard really shows up live, and stays where you put it in each overlay. Fonts you upload show in OBS too, not just in the Studio.
  es: La clasificación de Bits aparece de verdad en directo, y se queda donde la pones en cada overlay. Las fuentes que subes se ven también en OBS, no solo en el Studio.
- Il tutto schermo si ricorda per ogni scheda: acceso in Donazioni non si accende più anche in Pagina link, che resta col menù di lato finché non lo scegli lì.
  en: Full screen is remembered per tab: turned on in Donations, it no longer turns on in the Link page too, which keeps its side menu until you choose it there.
  es: La pantalla completa se recuerda por pestaña: activada en Donaciones ya no se activa también en la Página de enlaces, que mantiene el menú al lado hasta que la elijas ahí.
- [importante] Il boss è un pezzo dell'Overlay Studio: lo sposti, lo ingrandisci e lo vesti come gli altri, e lo spegni per ogni overlay. Nello Studio lo vedi com'è in onda. [vai: alert]
  en: The boss is an Overlay Studio piece: you move it, resize it and dress it like the others, and turn it off per overlay. In the Studio you see it as it looks on air.
  es: El jefe es una pieza de Overlay Studio: lo mueves, lo agrandas y lo vistes como los demás, y lo apagas en cada overlay. En el Studio lo ves como sale al aire.
  > Il boss si sistema nello Studio
  > La barra della vita del boss va dove vuoi tu, grande quanto vuoi e vestita come il resto dell'overlay, invece di stare in un angolo fisso.
  en> Set up the boss in the Studio
  en> The boss’s health bar goes where you want, as big as you want and dressed like the rest of the overlay, instead of sitting in a fixed corner.
  es> El jefe se acomoda en el Studio
  es> La barra de vida del jefe va donde quieras, del tamaño que quieras y vestida como el resto del overlay, en lugar de quedarse en una esquina fija.
- Nell'editor della pagina link e di quella delle donazioni l'anteprima resta ferma a metà schermo mentre scorri i campi. Sul telefono resta in cima, con «Salva e pubblica» sempre a portata. [vai: pagina]
  en: In the link page and donations page editor, the preview stays put in the middle of the screen while you scroll the fields. On phones it stays at the top, with “Save and publish” always within reach.
  es: En el editor de la página de enlaces y de la de donaciones, la vista previa se queda fija a media pantalla mientras recorres los campos. En el teléfono se queda arriba, con «Guardar y publicar» siempre a mano.
- Il testo che un comando mostra sull'overlay è un pezzo dello Studio: lo sposti, lo vesti (anche con un fondo) e lo spegni per ogni overlay. [vai: alert]
  en: The text a command shows on the overlay is a Studio piece: you move it, dress it (with a background too) and turn it off per overlay.
  es: El texto que un comando muestra en el overlay es una pieza del Studio: lo mueves, lo vistes (también con un fondo) y lo apagas en cada overlay.
- Anche la pastiglia col nome del comando che compare con un effetto, per esempio «!applausi», è un pezzo dello Studio: la sposti, la vesti e la spegni per ogni overlay. [vai: alert]
  en: The pill with the command name that appears with an effect, for example “!applausi”, is also a Studio piece: you move it, dress it and turn it off per overlay.
  es: También la píldora con el nombre del comando que aparece con un efecto, por ejemplo «!applausi», es una pieza del Studio: la mueves, la vistes y la apagas en cada overlay.
- Le immagini e i video degli effetti compaiono in un'area che sposti e ridimensioni nello Studio, e in un riquadro si adattano senza deformarsi. [vai: alert]
  en: Effect images and videos appear in an area you move and resize in the Studio, and inside a frame they fit without getting distorted.
  es: Las imágenes y los videos de los efectos aparecen en un área que mueves y redimensionas en el Studio, y dentro de un recuadro se adaptan sin deformarse.
- I video col green screen escono con la loro forma, invece che schiacciati a due per uno.
  en: Green screen videos come out in their own shape, instead of squashed two to one.
  es: Los videos con pantalla verde salen con su forma, en lugar de aplastados dos a uno.
- [importante] Il muro delle emote: quelle che la chat scrive volano sulla scena con dieci movimenti, la stessa ripetuta cresce e poi esplode. Eventi, premi e !esplodi fanno esplodere figure intere. [vai: alert]
  en: The emote wall: emotes that chat types fly across the scene with ten kinds of movement, and the same one repeated grows and then explodes. Events, prizes and !esplodi blow up whole shapes.
  es: El muro de emotes: los que escribe el chat vuelan por la escena con diez movimientos, y el mismo repetido crece y luego explota. Eventos, premios y !esplodi hacen explotar figuras enteras.
  > Il muro delle emote
  > Le emote che la chat scrive diventano parte della scena: chi guarda vede la sua emote volare, e un raid o un premio fanno esplodere una figura intera.
  en> The emote wall
  en> The emotes chat types become part of the scene: viewers see their emote fly, and a raid or a prize blows up a whole shape.
  es> El muro de emotes
  es> Los emotes que escribe el chat pasan a formar parte de la escena: quien mira ve volar su emote, y un raid o un premio hacen explotar una figura entera.

## 2026-09-23

- I ruoli che il costruttore crea adesso vanno a qualcuno: «Streamer» a te che hai il server, gli altri a moderatori, VIP e abbonati. [vai: dcserver]
  en: The roles the builder creates now go to someone: “Streamer” to you as the server owner, the others to mods, VIPs and subscribers.
  es: Los roles que crea el constructor ahora van a alguien: «Streamer» a ti, que tienes el servidor, y los demás a moderadores, VIP y suscriptores.
- Il giro dei ruoli non partiva per chi usa il nostro bot, e i ruoli non arrivavano mai: adesso parte. [vai: ruoli]
  en: The role round didn’t start for people using our bot, and the roles never arrived: now it starts.
  es: La ronda de roles no arrancaba para quien usa nuestro bot, y los roles nunca llegaban: ahora arranca.
- Anche gli appuntamenti sul calendario si allineano col nostro bot, e non si spengono più insieme ai ruoli. [vai: dcavvisi]
  en: Calendar events line up with our bot too, and no longer switch off together with the roles.
  es: También las citas del calendario se alinean con nuestro bot, y ya no se apagan junto con los roles.
- Ogni ruolo della traccia dice a chi va, e lo cambi tu: a te, a chi modera, ai VIP, agli abbonati, o a nessuno. [vai: dcserver]
  en: Each role in the track says who it goes to, and you can change it: to you, to your mods, to VIPs, to subscribers, or to nobody.
  es: Cada rol de la plantilla dice a quién va, y lo cambias tú: a ti, a quien modera, a los VIP, a los suscriptores o a nadie.
- Quando qualcosa non riesce, il costruttore dice su cosa: quale canale, quale regola, quale porta. [vai: dcserver]
  en: When something fails, the builder says what on: which channel, which rule, which door.
  es: Cuando algo falla, el constructor dice en qué: qué canal, qué regla, qué puerta.
- «In diretta» nasce come stanza dove si ascolta: parli tu e chi modera, gli altri ti sentono. [vai: dcserver]
  en: “Live” starts out as a room for listening: you and your mods speak, everyone else hears you.
  es: «En directo» nace como sala para escuchar: hablan tú y quien modera, los demás te oyen.
- Le tracce creano l'angolo AFK e lo impostano, se il tuo server non ne ha già uno. [vai: dcserver]
  en: Tracks create the AFK corner and set it up, if your server doesn’t already have one.
  es: Las plantillas crean el rincón AFK y lo configuran, si tu servidor no tiene ya uno.
- Scegliere un'immagine per un ruolo che c'è già non blocca più la costruzione con un falso «il server è cambiato». [vai: dcserver]
  en: Picking an image for a role that already exists no longer blocks the build with a false “the server has changed”.
  es: Elegir una imagen para un rol que ya existe ya no bloquea la construcción con un falso «el servidor ha cambiado».
- Il cambio di categoria, a voce, in chat o da Telegram, non scambia più «diablo 4» per «Diablo»: conta ogni parola che dici, e capisce numeri romani e sigle come «gta 5» o «cs2». [vai: ascolto]
  en: Changing category by voice, in chat or from Telegram no longer mistakes “diablo 4” for “Diablo”: it counts every word you say, and understands Roman numerals and abbreviations like “gta 5” or “cs2”.
  es: El cambio de categoría, por voz, en el chat o desde Telegram, ya no confunde «diablo 4» con «Diablo»: cuenta cada palabra que dices, y entiende números romanos y siglas como «gta 5» o «cs2».
- Nei Ruoli si sceglie solo un ruolo che il bot può dare davvero. Il pannello dice qual è il suo ruolo più alto e chi gli sta sopra, senza contare i ruoli degli altri bot. [vai: ruoli]
  en: In Roles you can only pick a role the bot can actually give. The panel says which is its highest role and who’s above it, not counting other bots’ roles.
  es: En Roles solo se elige un rol que el bot pueda dar de verdad. El panel dice cuál es su rol más alto y quién está por encima, sin contar los roles de otros bots.
- Il costruttore non crea più un secondo «Moderatori» accanto al tuo «moderatore»: se il ruolo c'è già e il bot non ci arriva, te lo dice. [vai: dcserver]
  en: The builder no longer creates a second “Moderators” next to your “moderator”: if the role already exists and the bot can’t reach it, it tells you.
  es: El constructor ya no crea un segundo «Moderadores» junto a tu «moderador»: si el rol ya existe y el bot no llega a él, te lo dice.
- Facendo piazza pulita, i ruoli vecchi che restano li vedi prima, ognuno col suo perché: stanno sopra il bot, oppure sono di un altro bot. [vai: dcserver]
  en: When you clear the board, you see beforehand the old roles that will stay, each with its reason: they’re above the bot, or they belong to another bot.
  es: Al hacer limpieza ves antes los roles viejos que se quedan, cada uno con su motivo: están por encima del bot, o son de otro bot.
- [importante] La settimana ha una scheda sua: scrivi una volta i giorni, gli orari e cosa fai, e da lì li prendono la grafica e i calendari. [vai: settimana]
  en: Your week has its own tab: write your days, times and what you do once, and the graphic and calendars take them from there.
  es: La semana tiene su propia pestaña: escribes una vez los días, los horarios y lo que haces, y de ahí los toman la gráfica y los calendarios.
  > La tua settimana in un posto solo
  > Scrivi una volta quando vai in onda e cosa fai: grafiche, calendari e avvisi prendono tutto da lì.
  en> Your week in one place
  en> Write once when you go live and what you do: graphics, calendars and alerts take everything from there.
  es> Tu semana en un solo lugar
  es> Escribes una vez cuándo sales al aire y qué haces: gráficas, calendarios y avisos lo toman todo de ahí.
- Con un tasto la mandi su Telegram, nei canali di Discord e nella storia di Instagram. Compaiono solo i servizi che hai collegato. [vai: settimana]
  en: With one button you send it to Telegram, to Discord channels and to your Instagram story. Only the services you’ve connected show up.
  es: Con un botón la envías a Telegram, a los canales de Discord y a la historia de Instagram. Aparecen solo los servicios que conectaste.
- Anche il Programma del tuo canale Twitch può riceverla, e si rimette in pari da solo quando cambi la settimana. [vai: settimana]
  en: Your Twitch channel’s Schedule can receive it too, and it catches up by itself when you change your week.
  es: También el Programa de tu canal de Twitch puede recibirla, y se pone al día solo cuando cambias la semana.
- Nella grafica della settimana i giorni seguono la lingua del pannello: in inglese non esce più «LUN MAR MER». [vai: grafiche]
  en: In the weekly graphic the days follow the panel’s language: in English you no longer get “LUN MAR MER”.
  es: En la gráfica de la semana los días siguen el idioma del panel: en inglés ya no sale «LUN MAR MER».
- Due tasti «Vai a…», nel calendario di Discord e negli avvisi, non portavano da nessuna parte: adesso ci portano. [vai: dcavvisi]
  en: Two “Go to…” buttons, in the Discord calendar and in the alerts, led nowhere: now they take you there.
  es: Dos botones «Ir a…», en el calendario de Discord y en los avisos, no llevaban a ninguna parte: ahora sí llevan.
- I tasti di CONSOLify funzionano davvero da una tastiera fisica, icone comprese: fino a oggi ogni pressione si perdeva per strada. [vai: consolify]
  en: CONSOLify keys really work from a physical key pad, icons included: until today every press got lost along the way.
  es: Las teclas de CONSOLify funcionan de verdad desde un teclado físico, iconos incluidos: hasta hoy cada pulsación se perdía por el camino.
- Con i giochi che dicono da soli quando muori, il contatore adesso sale davvero: il loro messaggio non arrivava fino a me. [vai: moduli]
  en: With games that report your deaths themselves, the counter now really goes up: their message wasn’t reaching me.
  es: Con los juegos que dicen solos cuándo mueres, el contador ahora sube de verdad: su mensaje no me llegaba.
- [importante] Instagram si collega con un tasto, come TikTok: scegli con che account entrare, e niente più ID e token da copiare dal sito di Meta. Serve un account professionale. [vai: notifiche]
  en: Instagram connects with one button, like TikTok: choose which account to sign in with, and no more IDs and tokens to copy from Meta’s site. You need a professional account.
  es: Instagram se conecta con un botón, como TikTok: eliges con qué cuenta entrar, y se acabaron los ID y tokens que copiar del sitio de Meta. Hace falta una cuenta profesional.
  > Instagram si collega con un tasto
  > Prima servivano codici copiati dal sito di Meta. Adesso scegli l'account e sei collegato, pronto a pubblicare storie e post dal pannello.
  en> Instagram connects with one button
  en> Before, you needed codes copied from Meta’s site. Now you pick the account and you’re connected, ready to post stories and posts from the panel.
  es> Instagram se conecta con un botón
  es> Antes hacían falta códigos copiados del sitio de Meta. Ahora eliges la cuenta y ya estás conectado, listo para publicar historias y posts desde el panel.
- Il collegamento con Instagram si rinnova da solo prima di scadere, e se togli l'app dal tuo Instagram lo cancello subito. [vai: notifiche]
  en: The Instagram connection renews itself before it expires, and if you remove the app from your Instagram I delete it right away.
  es: La conexión con Instagram se renueva sola antes de caducar, y si quitas la app de tu Instagram la borro enseguida.
- Se a Instagram o al bot di Discord manca un permesso, o un collegamento si è rotto, lo vedi subito nella sua scheda, con il tasto per rimediare. [vai: notifiche]
  en: If Instagram or the Discord bot is missing a permission, or a connection broke, you see it right away in its tab, with the button to fix it.
  es: Si a Instagram o al bot de Discord le falta un permiso, o una conexión se rompió, lo ves enseguida en su pestaña, con el botón para arreglarlo.
- Quando il pannello ti chiede una conferma o un nome, lo fa con la sua finestra e nella tua lingua: niente più finestre grigie del browser, che sul telefono sembravano un avviso di sistema.
  en: When the panel asks you for a confirmation or a name, it uses its own window, in your language: no more gray browser windows that looked like a system alert on phones.
  es: Cuando el panel te pide una confirmación o un nombre, lo hace con su propia ventana y en tu idioma: se acabaron las ventanas grises del navegador, que en el teléfono parecían un aviso del sistema.
- Le scorciatoie si leggono coi tasti del tuo computer, ⌘ sul Mac e Ctrl su Windows, e sul telefono non compaiono. L'editor dell'overlay si usa anche col dito. [vai: alert]
  en: Shortcuts show your computer’s keys, ⌘ on Mac and Ctrl on Windows, and they don’t appear on phones. The overlay editor works with your finger too.
  es: Los atajos se leen con las teclas de tu computadora, ⌘ en Mac y Ctrl en Windows, y en el teléfono no aparecen. El editor del overlay se usa también con el dedo.
- Se il browser non lascia copiare, il testo compare già selezionato, col tasto giusto per il tuo dispositivo, anche nel segnalibro delle citazioni. Prima alcune copie fallivano senza dirlo.
  en: If the browser won’t allow copying, the text appears already selected, with the right key for your device, in the quotes bookmark too. Before, some copies failed without saying so.
  es: Si el navegador no deja copiar, el texto aparece ya seleccionado, con la tecla adecuada para tu dispositivo, también en el marcador de las citas. Antes algunas copias fallaban sin decirlo.
- Il tasto che toglie l'audio a una sorgente non resta più vuoto quando l'audio è spento, e i titoli del calendario e dei ruoli hanno di nuovo la loro icona.
  en: The button that mutes a source no longer goes blank when the audio is off, and the calendar and roles titles have their icon back.
  es: El botón que silencia una fuente ya no se queda vacío cuando el audio está apagado, y los títulos del calendario y de los roles vuelven a tener su icono.
- «Avvisi» diventa «I tuoi social»: in cima i tuoi account, ognuno con il suo stato e il tasto per collegarlo, e sotto cosa annunciare quando pubblichi. Niente più riquadri ripetuti. [vai: notifiche]
  en: “Alerts” becomes “Your socials”: your accounts at the top, each with its status and a button to connect it, and below that what to announce when you post. No more repeated boxes.
  es: «Avisos» pasa a ser «Tus redes»: arriba tus cuentas, cada una con su estado y el botón para conectarla, y debajo qué anunciar cuando publicas. Se acabaron los recuadros repetidos.
- La pagina delle donazioni si modifica dalla scheda Donazioni, e la tua diretta in prima pagina si accende dalla Pagina link. [vai: donazioni]
  en: The donations page is edited from the Donations tab, and your stream on the front page is turned on from the Link page.
  es: La página de donaciones se edita desde la pestaña Donaciones, y tu directo en la portada se activa desde la Página de enlaces.
- La promo dei tuoi social in chat si accende insieme alla personalità del bot, accanto a «si fa vivo da solo». [vai: personalita]
  en: The promo for your socials in chat turns on together with the bot’s personality, next to “chimes in on its own”.
  es: La promo de tus redes en el chat se activa junto con la personalidad del bot, al lado de «interviene solo».
- «Come funziona» si apre da solo la prima volta che entri in una scheda, poi resta chiuso finché non lo apri tu.
  en: “How it works” opens by itself the first time you enter a tab, then stays closed until you open it.
  es: «Cómo funciona» se abre solo la primera vez que entras en una pestaña, y luego queda cerrado hasta que lo abras tú.
- [importante] La prima schermata del tuo server Discord si scrive da sola: ogni canale in mostra ha già la sua faccina e la sua riga, nella lingua del nome. Quelle che scrivi tu restano tue. [vai: dcentra]
  en: Your Discord server’s welcome screen writes itself: every featured channel already has its emoji and its line, in the language of its name. The ones you write stay yours.
  es: La pantalla de bienvenida de tu servidor de Discord se escribe sola: cada canal destacado ya tiene su emoji y su línea, en el idioma de su nombre. Las que escribes tú siguen siendo tuyas.
  > La prima schermata del server si scrive da sola
  > Chi entra nel tuo server trova ogni canale già spiegato in una riga, nella lingua giusta, e tu cambi solo quello che vuoi.
  en> Your server’s welcome screen writes itself
  en> Newcomers to your server find every channel already explained in one line, in the right language, and you only change what you want.
  es> La bienvenida del servidor se escribe sola
  es> Quien entra en tu servidor encuentra cada canal ya explicado en una línea, en el idioma correcto, y tú cambias solo lo que quieras.
- Nei giorni della settimana scrivi un gioco o un titolo: mentre scrivi compaiono le categorie di Twitch, e sotto ogni giorno leggi quale andrà sul Programma. [vai: settimana]
  en: In the days of your week you type a game or a title: Twitch categories appear as you type, and under each day you read which one will go on the Schedule.
  es: En los días de la semana escribes un juego o un título: mientras escribes aparecen las categorías de Twitch, y debajo de cada día lees cuál irá al Programa.
- Il synthwave delle grafiche è in prospettiva vera: il sole sorge dietro il titolo e le linee del pavimento escono da tutto l'orizzonte. [vai: grafiche]
  en: The synthwave in graphics has real perspective: the sun rises behind the title and the floor lines come out from the whole horizon.
  es: El synthwave de las gráficas tiene perspectiva real: el sol sale detrás del título y las líneas del suelo salen de todo el horizonte.
- Otto temi animati nuovi per le grafiche, fra cui vaporwave, pioggia al neon, notte di stelle, sakura e lo-fi, e tredici stili pronti con l'anteprima fatta coi tuoi testi. [vai: grafiche]
  en: Eight new animated themes for graphics, including vaporwave, neon rain, starry night, sakura and lo-fi, and thirteen ready-made styles with previews made from your texts.
  es: Ocho temas animados nuevos para las gráficas, entre ellos vaporwave, lluvia de neón, noche estrellada, sakura y lo-fi, y trece estilos listos con la vista previa hecha con tus textos.
- Nelle grafiche scegli il carattere e lo stile del titolo, la forma delle righe, e per le scene animate cosa si vede, la velocità e quanto si nota. [vai: grafiche]
  en: In graphics you choose the title’s font and style, the shape of the rows, and for animated scenes what’s shown, the speed and how noticeable it is.
  es: En las gráficas eliges la fuente y el estilo del título, la forma de las filas y, en las escenas animadas, qué se ve, la velocidad y cuánto se nota.
- Le scritte delle grafiche si leggono sempre, anche sopra le scene che si muovono, e GIF e video ricominciano senza scatti. Col QR, niente più righe coperte. [vai: grafiche]
  en: Text on graphics is always readable, even over moving scenes, and GIFs and videos loop without stutters. With the QR code, no more covered rows.
  es: Los textos de las gráficas se leen siempre, incluso sobre escenas en movimiento, y los GIF y videos vuelven a empezar sin saltos. Con el QR, se acabaron las filas tapadas.
- Nella scheda del browser la tua pagina link ha come icona la tua foto, quella che mostra in alto, invece di quella di SocialBot. [vai: pagina]
  en: In the browser tab, your link page uses your photo as its icon, the one shown at the top, instead of SocialBot’s.
  es: En la pestaña del navegador tu página de enlaces tiene como icono tu foto, la que muestra arriba, en lugar de la de SocialBot.
- Il titolo di ogni scheda si vede subito, anche al primo caricamento, e sul telefono il pannello non scivola più di lato.
  en: Each tab’s title shows right away, even on first load, and on phones the panel no longer slides sideways.
  es: El título de cada pestaña se ve enseguida, incluso en la primera carga, y en el teléfono el panel ya no se desliza de lado.
- Stato ti dice come va adesso: in diretta vedi da quanto, chi ti guarda e cosa succede in chat; fuori onda, quando è la prossima e com’è andata l’ultima. [vai: stato]
  en: Status tells you how things are going now: when live, how long you’ve been on, who’s watching and what’s happening in chat; off air, when the next stream is and how the last one went.
  es: Estado te dice cómo va ahora: en directo ves desde cuándo, quién te mira y qué pasa en el chat; fuera del aire, cuándo es el próximo y cómo fue el último.
- Piattaforme, passkey, moderatori, codici delle mail e i tuoi dati hanno una scheda loro, «Il tuo account». Il pre-addestramento sta in Conoscenza. [vai: account]
  en: Platforms, passkeys, moderators, email codes and your data have their own tab, “Your account”. Pre-training is in Knowledge.
  es: Plataformas, passkeys, moderadores, códigos de los correos y tus datos tienen su propia pestaña, «Tu cuenta». El preentrenamiento está en Conocimiento.
- Sul computer il menù sta sempre a sinistra, con tutte le schede: un clic e ci sei, e vedi sempre dove sei.
  en: On a computer the menu always sits on the left, with every tab: one click and you’re there, and you always see where you are.
  es: En la computadora el menú está siempre a la izquierda, con todas las pestañas: un clic y llegas, y siempre ves dónde estás.
- Mentre una scheda carica, al posto di «Caricamento…» vedi la forma di quello che sta arrivando.
  en: While a tab loads, instead of “Loading…” you see the shape of what’s on its way.
  es: Mientras una pestaña carga, en lugar de «Cargando…» ves la forma de lo que está llegando.
- Il pannello si apre e cambia scheda più in fretta, soprattutto sul telefono: prepara solo la scheda che stai guardando.
  en: The panel opens and switches tabs faster, especially on phones: it only prepares the tab you’re looking at.
  es: El panel se abre y cambia de pestaña más rápido, sobre todo en el teléfono: prepara solo la pestaña que estás mirando.
- Le «×» che tolgono un amico o una fonte si prendono col dito anche sul telefono.
  en: The “×” buttons that remove a friend or a source can be tapped with a finger on phones too.
  es: Las «×» que quitan a un amigo o una fuente se pulsan con el dedo también en el teléfono.
- Nello Studio un elemento si sposta di quanto lo trascini anche appena scelto: la tela non cambia più misura sotto il dito. [vai: alert]
  en: In the Studio an element moves as far as you drag it even right after you pick it: the canvas no longer changes size under your finger.
  es: En el Studio un elemento se mueve lo que lo arrastras incluso recién elegido: el lienzo ya no cambia de tamaño bajo el dedo.
- A diretta appena chiusa, Stato non dice più «in diretta»: quando Twitch risponde, vale quello che dice Twitch. [vai: stato]
  en: Right after a stream ends, Status no longer says “Live”: once Twitch answers, what Twitch says wins.
  es: Con el directo recién terminado, Estado ya no dice «En directo»: cuando Twitch responde, vale lo que dice Twitch.
- Scrivere nelle Grafiche è di nuovo fluido, anche dopo esserci entrati più volte, e «Salva» o «Scarica» partono una volta sola. [vai: grafiche]
  en: Typing in Graphics is smooth again, even after going in several times, and “Save” or “Download” fire only once.
  es: Escribir en Gráficas vuelve a ser fluido, incluso después de entrar varias veces, y «Guardar» o «Descargar» salen una sola vez.
- Le grafiche escono anche in verticale per le storie, 1080×1920: lo sfondo copre tutto lo schermo e le scritte stanno lontane dalle barre di Instagram. [vai: grafiche]
  en: Graphics now also come out vertical for stories, 1080×1920: the background covers the whole screen and the text stays clear of Instagram’s bars.
  es: Las gráficas salen también en vertical para las historias, 1080×1920: el fondo cubre toda la pantalla y los textos quedan lejos de las barras de Instagram.
- La settimana mandata nella storia di Instagram non esce più tagliata ai lati: alla storia va la versione verticale, a Telegram e Discord il post. [vai: settimana]
  en: The week sent to your Instagram story no longer comes out cropped at the sides: the story gets the vertical version, Telegram and Discord the post.
  es: La semana enviada a la historia de Instagram ya no sale cortada a los lados: a la historia va la versión vertical, y a Telegram y Discord el post.
- [importante] Nuovo nelle Grafiche: con «Metti nella storia» la grafica che vedi va nella tua storia di Instagram, già in verticale. Se Instagram non è collegato, il tasto per collegarlo è lì. [vai: grafiche]
  en: New in Graphics: with “Post to your story”, the graphic you see goes to your Instagram story, already vertical. If Instagram isn’t connected, the button to connect it is right there.
  es: Nuevo en Gráficas: con «Publicar en tu historia», la gráfica que ves va a tu historia de Instagram, ya en vertical. Si Instagram no está conectado, el botón para conectarlo está ahí.
  > Dalle Grafiche alla storia di Instagram
  > La grafica che hai appena fatto finisce nella tua storia già nel formato giusto, senza scaricarla e ricaricarla dal telefono.
  en> From Graphics to your Instagram story
  en> The graphic you just made lands in your story already in the right format, without downloading it and uploading it again from your phone.
  es> De Gráficas a tu historia de Instagram
  es> La gráfica que acabas de hacer llega a tu historia ya en el formato correcto, sin descargarla y volver a subirla desde el teléfono.
- [importante] La storia «Live ora» può partire da sola quando vai in diretta su Twitch: accendila nelle Grafiche, nel riquadro della storia, e se non parte te lo dico. [vai: grafiche]
  en: The “Live now” story can go out by itself when you go live on Twitch: turn it on in Graphics, in the story box, and if it doesn’t go out I’ll tell you.
  es: La historia «En directo» puede salir sola cuando empiezas un directo en Twitch: la activas en Gráficas, en el recuadro de la historia, y si no sale te lo digo.
  > La storia «Live ora» parte da sola
  > Quando vai in diretta chi ti segue su Instagram lo sa subito, anche se tu stai già pensando a tutt'altro.
  en> The “Live now” story goes out by itself
  en> When you go live, your Instagram followers know right away, even if your mind is already on something else.
  es> La historia «En directo» sale sola
  es> Cuando empiezas el directo, quien te sigue en Instagram lo sabe enseguida, aunque tú ya estés pensando en otra cosa.
- Settimana e «Live ora» hanno ognuna il suo titolo: quello della settimana non finisce più sulla grafica della diretta. [vai: grafiche]
  en: The week and “Live now” each have their own title: the week’s title no longer ends up on the live graphic.
  es: La semana y «En directo» tienen cada una su título: el de la semana ya no acaba en la gráfica del directo.
- Nelle Grafiche i tasti hanno di nuovo il contorno, come nel resto del pannello, e in Statistiche il periodo scelto non perde il bordo. [vai: grafiche]
  en: In Graphics the buttons have their outline back, like in the rest of the panel, and in Stats the chosen period keeps its border.
  es: En Gráficas los botones vuelven a tener contorno, como en el resto del panel, y en Estadísticas el periodo elegido no pierde el borde.
- Cambiare scheda è più svelto, soprattutto sul telefono, e nello Studio l'anteprima dal vivo riparte quando ci torni. [vai: alert]
  en: Switching tabs is quicker, especially on phones, and in the Studio the live preview restarts when you come back to it.
  es: Cambiar de pestaña es más ágil, sobre todo en el teléfono, y en el Studio la vista previa en vivo se reanuda cuando vuelves.
- Nello Studio la tela è molto più grande: il menù si apre dal tasto in alto e lascia la larghezza al lavoro, e i nomi dei livelli non si tagliano più. [vai: alert]
  en: In the Studio the canvas is much bigger: the menu opens from the button at the top and leaves the width for your work, and layer names no longer get cut off.
  es: En el Studio el lienzo es mucho más grande: el menú se abre desde el botón de arriba y deja el ancho para el trabajo, y los nombres de las capas ya no se cortan.
- Pubblicità in chat: il preavviso adesso parte davvero, «sono tornato» arriva quando la pausa finisce, e i secondi nei messaggi sono sempre quanto dura la pausa. [vai: regia]
  en: Ads in chat: the heads-up now really goes out, “I’m back” arrives when the break ends, and the seconds in the messages always match how long the break lasts.
  es: Publicidad en el chat: el aviso previo ahora sale de verdad, «ya volví» llega cuando termina la pausa, y los segundos de los mensajes son siempre lo que dura la pausa.
- Chi ha l'account nuovo non viene più cacciato dallo scudo: l'avviso esce una volta sola, e un mod lo fa scrivere con !permetti nome. Un messaggio con i Bit non viene mai trattenuto. [vai: scudo]
  en: People with new accounts are no longer kicked out by the shield: the notice goes out only once, and a mod lets them write with !permetti name. A message with Bits is never held back.
  es: Quien tiene la cuenta nueva ya no es expulsado por el escudo: el aviso sale una sola vez, y un mod lo deja escribir con !permetti nombre. Un mensaje con Bits nunca se retiene.
- [importante] Ogni gioco ha le sue regole da cambiare: costi, premi, attese, probabilità, testi e cosa si pesca, con accanto quanto rende. Di serie il banco vince sempre un po' e la pesca rende quanto la presenza. [vai: giochi]
  en: Every game has its own rules to change: costs, prizes, waits, odds, texts and what can be caught, with what it pays out alongside. By default the house always wins a little, and fishing pays as much as attendance.
  es: Cada juego tiene sus reglas para cambiar: costos, premios, esperas, probabilidades, textos y qué se pesca, con lo que rinde al lado. De serie la banca siempre gana un poco y la pesca rinde lo mismo que la asistencia.
  > Le regole di ogni gioco sono tue
  > Decidi quanto costa giocare, quanto si vince e ogni quanto, e vedi subito se il gioco regala punti o li toglie.
  en> The rules of every game are yours
  en> Decide how much it costs to play, how much you win and how often, and see right away whether the game gives points away or takes them.
  es> Las reglas de cada juego son tuyas
  es> Decides cuánto cuesta jugar, cuánto se gana y cada cuánto, y ves enseguida si el juego regala puntos o los quita.
- [importante] La chat in solo emote per due minuti, o per il tempo che dici: la accendono i mod con !soloemote 5m, un tuo Modulo o la chat con !sblocca, e poi torna com'era da sola. [vai: moduli]
  en: Emote-only chat for two minutes, or for as long as you say: mods turn it on with !soloemote 5m, one of your Modules does, or chat does with !sblocca, and then it goes back to normal by itself.
  es: El chat en solo emotes durante dos minutos, o el tiempo que digas: lo activan los mods con !soloemote 5m, un Módulo tuyo o el chat con !sblocca, y luego vuelve solo a como estaba.
  > La chat in solo emote, a tempo
  > Un momento di festa o di calma in chat dura quanto vuoi e poi finisce da solo.
  en> Emote-only chat, on a timer
  en> A moment of celebration or calm in chat lasts as long as you want and then ends on its own.
  es> El chat en solo emotes, con tiempo
  es> Un momento de fiesta o de calma en el chat dura lo que quieras y luego termina solo.
- [importante] Quattro manche nuove: impiccato, più o meno, calcolo veloce e rebus con le emoji. Scegli tu quali girano da sole, e con !manche impiccato ne apri una per nome. [vai: giochi]
  en: Four new rounds: hangman, higher or lower, quick maths and emoji rebus. You choose which ones run on their own, and with !manche impiccato you open one by name.
  es: Cuatro rondas nuevas: ahorcado, más o menos, cálculo rápido y jeroglífico con emojis. Eliges cuáles salen solas, y con !manche impiccato abres una por su nombre.
  > Quattro manche nuove in chat
  > Impiccato, più o meno, calcolo e rebus tengono viva la chat nei momenti morti, da soli o quando li chiami tu.
  en> Four new chat rounds
  en> Hangman, higher or lower, quick maths and rebus keep chat alive in the slow moments, on their own or when you call them.
  es> Cuatro rondas nuevas en el chat
  es> Ahorcado, más o menos, cálculo y jeroglífico mantienen vivo el chat en los momentos muertos, solos o cuando los llamas tú.
- [importante] Duelli con la posta: !duello @nome 50, l'altro accetta o rifiuta e chi vince prende la posta dell'altro. Arriva anche la morra cinese contro il bot, per ridere o con una puntata. [vai: giochi]
  en: Duels with stakes: !duello @name 50, the other person accepts or refuses, and the winner takes the other’s stake. Rock paper scissors against the bot arrives too, just for fun or with a bet.
  es: Duelos con apuesta: !duello @nombre 50, el otro acepta o rechaza y quien gana se lleva la apuesta del otro. Llega también piedra, papel o tijera contra el bot, por diversión o con una apuesta.
  > Duelli con la posta e morra cinese
  > Due spettatori si sfidano mettendo in gioco i propri punti, e tutta la chat sta a guardare chi vince.
  en> Duels with stakes, and rock paper scissors
  en> Two viewers challenge each other by putting their own points on the line, and the whole chat watches to see who wins.
  es> Duelos con apuesta y piedra, papel o tijera
  es> Dos espectadores se retan poniendo en juego sus propios puntos, y todo el chat mira quién gana.
- Abbracci, bacini e il batti il cinque in chat: ogni tanto, a sorpresa, viene un cinque perfetto. Chi scrive !nococcole non ne riceve. [vai: giochi]
  en: Hugs, kisses and high fives in chat: every now and then, out of nowhere, a perfect high five comes along. Anyone who types !nococcole doesn’t get any.
  es: Abrazos, besitos y choca esos cinco en el chat: de vez en cuando, por sorpresa, sale un choque perfecto. Quien escribe !nococcole no recibe ninguno.
- [importante] Due giochi da fare insieme: il colpo di gruppo, dove più siete più è facile scappare col bottino, e il boss, che la chat batte a colpi di !colpisci con la barra della vita sull'overlay. [vai: giochi]
  en: Two games to play together: the group heist, where the more of you there are the easier it is to get away with the loot, and the boss, which chat beats with !colpisci while its health bar shows on the overlay.
  es: Dos juegos para jugar juntos: el golpe en grupo, donde cuantos más son más fácil es escapar con el botín, y el jefe, que el chat vence a golpes de !colpisci con la barra de vida en el overlay.
  > Giochi da fare tutti insieme
  > Il colpo e il boss premiano la chat quando gioca unita: più gente partecipa, più è facile vincere.
  en> Games to play all together
  en> The heist and the boss reward chat for playing as one: the more people join in, the easier it is to win.
  es> Juegos para jugar todos juntos
  es> El golpe y el jefe premian al chat cuando juega unido: cuanta más gente participa, más fácil es ganar.
- La finestra delle novità non ti rimostra più le stesse righe: ognuna esce una volta. Le cose nuove più grosse stanno in cima, «In evidenza», anche nella pagina delle novità.
  en: The What’s new window no longer shows you the same lines again: each one appears once. The biggest new things sit at the top, “Featured”, on the What’s new page too.
  es: La ventana de novedades ya no te vuelve a mostrar las mismas líneas: cada una sale una vez. Las cosas nuevas más grandes están arriba, «Destacado», también en la página de novedades.
- [importante] Ogni gioco ha due attese che scegli tu, a testa e per tutti, e partono solo quando si gioca davvero. Chi le trova se lo sente dire una volta, con quanto manca. [vai: giochi]
  en: Every game has two cooldowns you choose, per person and for everyone, and they only start when someone actually plays. Whoever hits one is told once, with how long is left.
  es: Cada juego tiene dos esperas que eliges tú, por persona y para todos, y solo empiezan cuando se juega de verdad. Quien se las encuentra lo oye una vez, con cuánto falta.
  > Attese a testa e per tutti
  > Nessuno riempie la chat con lo stesso gioco, e chi deve aspettare sa quanto manca invece di riprovare a vuoto.
  en> Cooldowns per person and for everyone
  en> Nobody floods chat with the same game, and whoever has to wait knows how long is left instead of trying again in vain.
  es> Esperas por persona y para todos
  es> Nadie llena el chat con el mismo juego, y quien tiene que esperar sabe cuánto falta en lugar de volver a intentarlo en vano.
- [importante] Tre giochi nuovi: il wordle della chat coi quadratini colorati, conta insieme per battere il record del canale, e il blackjack contro il banco con !bj 50. [vai: giochi]
  en: Three new games: the chat Wordle with colored squares, count together to beat the channel record, and blackjack against the house with !bj 50.
  es: Tres juegos nuevos: el Wordle del chat con cuadraditos de colores, contar juntos para batir el récord del canal, y el blackjack contra la banca con !bj 50.
  > Wordle, conta e blackjack
  > Tre giochi diversi fra loro, uno di parole, uno da fare insieme per il record e uno a carte, così ognuno in chat trova il suo.
  en> Wordle, count together and blackjack
  en> Three very different games, one with words, one to play together for the record and one with cards, so everyone in chat finds theirs.
  es> Wordle, contar juntos y blackjack
  es> Tres juegos distintos entre sí, uno de palabras, uno para jugar juntos por el récord y uno de cartas, así cada uno en el chat encuentra el suyo.
- La corsa: !corsa apre le puntate su cinque corridori, il favorito paga poco e l'ultimo tanto, e ogni corridore rende uguale. Nomi e resa li scegli tu. [vai: giochi]
  en: The race: !corsa opens betting on five runners, the favorite pays little and the last one a lot, and every runner pays out equally over time. You choose names and payouts.
  es: La carrera: !corsa abre las apuestas sobre cinco corredores, el favorito paga poco y el último mucho, y cada corredor rinde igual. Nombres y pagos los eliges tú.
- La patata bollente: !patata la lancia, !passa la passa a chi è in chat, e scoppia quando nessuno se l'aspetta. Se vuoi, chi resta con la patata paga una multa. [vai: giochi]
  en: Hot potato: !patata throws it, !passa passes it to someone in chat, and it blows up when nobody expects it. If you like, whoever is left holding it pays a fine.
  es: La patata caliente: !patata la lanza, !passa la pasa a alguien del chat, y explota cuando nadie se lo espera. Si quieres, quien se queda con la patata paga una multa.
- La catena di parole: !catena, e ogni parola comincia con le ultime due lettere della precedente. Si batte il record del canale, e le chiacchiere non la rompono. [vai: giochi]
  en: Word chain: !catena, and each word starts with the last two letters of the one before. You go for the channel record, and small talk doesn’t break the chain.
  es: La cadena de palabras: !catena, y cada palabra empieza con las dos últimas letras de la anterior. Se bate el récord del canal, y las charlas no la rompen.
- !trivia e !manche, mentre si conta insieme, ti dicono cosa c'è in corso invece di tacere o di dire che non ci sono manche. [vai: giochi]
  en: While a count together is running, !trivia and !manche tell you what’s going on instead of staying silent or saying there are no rounds.
  es: Mientras se cuenta juntos, !trivia y !manche te dicen qué está en curso en lugar de callarse o decir que no hay rondas.
- Il menù è fatto a vignette: ogni gruppo si apre e si chiude dalla sua didascalia, e resta aperto quello della scheda in cui sei. Se dentro un gruppo chiuso c'è qualcosa di nuovo, lo vedi dal «!».
  en: The menu is made of comic panels: each group opens and closes from its caption, and the group for the tab you’re in stays open. If there’s something new inside a closed group, the “!” shows it.
  es: El menú está hecho de viñetas: cada grupo se abre y se cierra desde su texto de apoyo, y queda abierto el de la pestaña en la que estás. Si dentro de un grupo cerrado hay algo nuevo, lo ves por el «!».
- Nella Pagina link e nelle Donazioni l'anteprima non si schiaccia più accanto ai comandi: il telefono resta sempre intero, e le colonne si mettono in fila solo se c'è posto. [vai: donazioni]
  en: In the Link page and in Donations, the preview no longer gets squashed next to the controls: the phone always stays whole, and the columns only line up side by side if there’s room.
  es: En la Página de enlaces y en Donaciones la vista previa ya no se aplasta junto a los controles: el teléfono siempre queda entero, y las columnas se ponen en fila solo si hay espacio.
- Nella scheda Telegram «Auguri di compleanno», l'accesso, dove mandare gli avvisi e la carta live compaiono subito: restavano in caricamento finché non passavi da «I tuoi social». [vai: telegram]
  en: In the Telegram tab, “Birthday wishes”, sign-in, where to send alerts and the live card show up right away: they stayed loading until you went through “Your socials”.
  es: En la pestaña Telegram, «Felicitaciones de cumpleaños», el acceso, adónde mandar los avisos y la tarjeta en directo aparecen enseguida: se quedaban cargando hasta que pasabas por «Tus redes».
- Le Donazioni si aprono larghe quanto la Pagina link: l'editor è lo stesso, e adesso ha lo stesso spazio per comandi, anteprima e ispettore. [vai: donazioni]
  en: Donations opens as wide as the Link page: the editor is the same, and it now has the same room for controls, preview and inspector.
  es: Donaciones se abre tan ancha como la Página de enlaces: el editor es el mismo, y ahora tiene el mismo espacio para controles, vista previa e inspector.
- Nel menù, nel gruppo «Canale», il canale che stai guardando ha di nuovo il suo timbro: sul telefono si vedeva solo un'ombra storta.
  en: In the menu, in the “Channel” group, the channel you’re viewing has its stamp again: on phones you only saw a crooked shadow.
  es: En el menú, en el grupo «Canal», el canal que estás viendo vuelve a tener su sello: en el teléfono solo se veía una sombra torcida.
- Nella libreria degli effetti i tasti restano dentro la loro carta anche sugli schermi medi: «Non condividere» usciva dal bordo. [vai: effetti]
  en: In the effects library the buttons stay inside their card even on medium screens: “Stop sharing” used to spill over the edge.
  es: En la biblioteca de efectos los botones se quedan dentro de su tarjeta incluso en pantallas medianas: «Dejar de compartir» se salía del borde.
- Cambiando sezione le carte entrano davvero dal lato verso cui vai: finora, quasi sempre, salivano e basta.
  en: When you switch sections, cards really come in from the side you’re heading to: until now, they almost always just slid up.
  es: Al cambiar de sección las tarjetas entran de verdad por el lado hacia el que vas: hasta ahora, casi siempre, solo subían.
- Sul telefono, cambiando scheda, le carte entrano dal bordo e non più da fuori schermo, e le scritte accanto agli interruttori vanno a capo: la pagina non scivola più di lato.
  en: On phones, when you switch tabs, cards come in from the edge rather than from off screen, and the labels next to switches wrap: the page no longer slides sideways.
  es: En el teléfono, al cambiar de pestaña, las tarjetas entran desde el borde y ya no desde fuera de la pantalla, y los textos junto a los interruptores bajan de línea: la página ya no se desliza de lado.
- Cambiando sezione da una pagina scorsa in giù, la nuova si apre dall'inizio: prima compariva a metà e scivolava su da sola.
  en: When you switch sections from a page scrolled down, the new one opens at the top: before, it appeared halfway down and slid up by itself.
  es: Al cambiar de sección desde una página desplazada hacia abajo, la nueva se abre desde el principio: antes aparecía a la mitad y subía sola.

## 2026-09-19

- [importante] La tua settimana finisce sul calendario del server Discord: chi ti segue vede quando torni e mette il promemoria. [vai: dcavvisi]
  en: Your week lands on your Discord server’s calendar: your followers see when you’re back and can set a reminder.
  es: Tu semana llega al calendario del servidor de Discord: quien te sigue ve cuándo vuelves y se pone el recordatorio.
  > La tua settimana sul calendario di Discord
  > Chi ti segue su Discord vede quando torni in onda e può mettersi il promemoria.
  en> Your week on the Discord calendar
  en> Your followers on Discord see when you’re back on air and can set themselves a reminder.
  es> Tu semana en el calendario de Discord
  es> Quien te sigue en Discord ve cuándo vuelves al aire y puede ponerse el recordatorio.
- Il palinsesto non te lo richiedo: leggo quello che hai già scritto per la grafica della settimana. [vai: dcavvisi]
  en: I don’t ask you for the schedule again: I read what you already wrote for the weekly graphic.
  es: El horario no te lo vuelvo a pedir: leo lo que ya escribiste para la gráfica de la semana.
- Se cambi la programmazione, o arriva l'ora legale, gli appuntamenti si rimettono a posto da soli. [vai: dcavvisi]
  en: If you change your schedule, or daylight saving time kicks in, the events fix themselves.
  es: Si cambias la programación, o llega el horario de verano, las citas se acomodan solas.
- Gli appuntamenti che scrivi a mano tu non li tocco: Discord non me lo lascia fare, e va benissimo così. [vai: dcavvisi]
  en: Events you write by hand I leave alone: Discord doesn’t let me touch them, and that’s just fine.
  es: Las citas que escribes a mano no las toco: Discord no me deja, y está muy bien así.
- Se hai invitato il bot prima del calendario, te lo dico subito e ti dico come rimediare, invece di provarci a vuoto. [vai: dcavvisi]
  en: If you invited the bot before the calendar existed, I tell you right away and how to fix it, instead of trying in vain.
  es: Si invitaste al bot antes del calendario, te lo digo enseguida y te digo cómo arreglarlo, en lugar de intentarlo en vano.
- Da ogni scheda salti a quelle accanto senza tornare al menù: prima la barra c'era solo in alcune. [vai: effetti]
  en: From every tab you can jump to the ones next to it without going back to the menu: before, only some had the bar.
  es: Desde cada pestaña saltas a las de al lado sin volver al menú: antes la barra estaba solo en algunas.
- [importante] Quando parte la pubblicità lo dico in chat: fra poco, adesso, e quando torno. [vai: regia]
  en: When an ad break starts, I say so in chat: coming up, now, and when I’m back.
  es: Cuando empieza la publicidad lo digo en el chat: dentro de poco, ahora, y cuando vuelvo.
  > La pubblicità annunciata in chat
  > Chi guarda sa che sta per arrivare una pausa e quando finisce, e non chiude la diretta pensando che sia caduta.
  en> Ad breaks announced in chat
  en> Viewers know a break is coming and when it ends, and they don’t close the stream thinking it crashed.
  es> La publicidad anunciada en el chat
  es> Quien mira sabe que se acerca una pausa y cuándo termina, y no cierra el directo pensando que se cayó.
- Se mi mancano i permessi per farlo te lo dico subito, con il posto dove concederli. [vai: regia]
  en: If I’m missing the permissions to do it, I tell you right away, with the place to grant them.
  es: Si me faltan los permisos para hacerlo te lo digo enseguida, con el lugar donde concederlos.
- I tre messaggi li scrivi tu, e ognuno si spegne per conto suo. [vai: regia]
  en: You write the three messages, and each one can be turned off on its own.
  es: Los tres mensajes los escribes tú, y cada uno se apaga por separado.
- Per la fine Twitch non manda niente: conto i secondi che mi ha detto, e se mi riavvio nel mezzo sto zitta invece di salutarti tardi. [vai: regia]
  en: Twitch sends nothing when the break ends: I count the seconds it told me, and if I restart in the middle I stay quiet instead of welcoming you back late.
  es: Para el final Twitch no manda nada: cuento los segundos que me dijo, y si me reinicio en medio me quedo callada en lugar de saludarte tarde.
- Ogni ruolo può avere il suo segno accanto al nome: un'emoji, o un'immagine tua. [vai: dcserver]
  en: Each role can have its own mark next to the name: an emoji, or an image of your own.
  es: Cada rol puede tener su signo junto al nombre: un emoji o una imagen tuya.
- La tinta la scegli tu: un colore, una sfumatura fra due, o l'olografico. [vai: dcserver]
  en: You pick the tint: one color, a gradient between two, or holographic.
  es: El tono lo eliges tú: un color, un degradado entre dos o el holográfico.
- L'immagine che scegli non la tengo: la rimpicciolisco io, la mando a Discord e la scordo. [vai: dcserver]
  en: I don’t keep the image you choose: I shrink it, send it to Discord and forget it.
  es: La imagen que eliges no me la quedo: la reduzco, la mando a Discord y la olvido.
- Quello che il tuo server non può ancora fare te lo dico prima, invece di fartelo scoprire da un rifiuto. [vai: dcserver]
  en: Whatever your server can’t do yet, I tell you beforehand, instead of letting you find out from a rejection.
  es: Lo que tu servidor todavía no puede hacer te lo digo antes, en lugar de que lo descubras por un rechazo.
- Le tracce del server adesso arrivano con la porta d'ingresso e il filtro già scritti, sui canali che la traccia ha. [vai: dcentra]
  en: Server tracks now come with the entrance door and the filter already written, for the channels the track has.
  es: Las plantillas del servidor ahora llegan con la puerta de entrada y el filtro ya escritos, en los canales que tiene la plantilla.
- Se sei partito dal tuo server, un tasto te li scrive su misura: poi li cambi come vuoi. [vai: dcentra]
  en: If you started from your own server, one button writes them to fit: then you change them however you like.
  es: Si partiste de tu servidor, un botón te los escribe a medida: después los cambias como quieras.
- La porta nasce accesa solo dove Discord la prenderebbe, e dove non ci arriva te lo dice invece di farti scoprire il rifiuto. [vai: dcentra]
  en: The door starts switched on only where Discord would accept it, and where it can’t, it tells you instead of letting you discover the rejection.
  es: La puerta nace encendida solo donde Discord la aceptaría, y donde no llega te lo dice en lugar de dejarte descubrir el rechazo.
- [importante] Il filtro del tuo server Discord si scrive da qui: le tue parole, le liste che Discord tiene aggiornate da sé, lo spam e le raffiche di menzioni. [vai: dcfiltro]
  en: Your Discord server’s filter is written from here: your own words, the lists Discord keeps up to date by itself, spam and mention floods.
  es: El filtro de tu servidor de Discord se escribe desde aquí: tus palabras, las listas que Discord mantiene al día por su cuenta, el spam y las ráfagas de menciones.
  > Il filtro del server Discord, da qui
  > Parole vietate, spam e raffiche di menzioni si fermano prima di arrivare nei canali, e lo regoli dal pannello invece che dalle impostazioni di Discord.
  en> Your Discord server’s filter, from here
  en> Banned words, spam and mention floods are stopped before they reach your channels, and you set it from the panel instead of Discord’s settings.
  es> El filtro del servidor de Discord, desde aquí
  es> Palabras prohibidas, spam y ráfagas de menciones se frenan antes de llegar a los canales, y lo ajustas desde el panel en lugar de la configuración de Discord.
- Per ogni regola scegli cosa succede quando scatta, e chi non tocca: i tuoi moderatori passano sempre. [vai: dcfiltro]
  en: For each rule you choose what happens when it triggers, and who it leaves alone: your mods always get through.
  es: Para cada regla eliges qué pasa cuando salta y a quién no toca: tus moderadores pasan siempre.
- Le regole che hai già non te le riscrivo: te le leggo, e cambio solo quello che è diverso. [vai: dcfiltro]
  en: I don’t rewrite the rules you already have: I read them, and change only what’s different.
  es: Las reglas que ya tienes no te las reescribo: las leo y cambio solo lo que es distinto.
- Adesso i comandi rispondono anche a te: il bot scrive col tuo account, e per sbaglio scartava i messaggi tuoi come se fossero i suoi. [vai: moduli]
  en: Commands now answer you too: the bot writes with your account, and by mistake it was discarding your messages as if they were its own.
  es: Ahora los comandos te responden también a ti: el bot escribe con tu cuenta, y por error descartaba tus mensajes como si fueran suyos.
- Il tasto del Discord in chat portava a un indirizzo con i due punti attaccati dentro: adesso il link finisce dove finisce, e si apre. [vai: ruoli]
  en: The Discord button in chat led to an address with the colon stuck inside it: now the link ends where it should, and it opens.
  es: El botón de Discord en el chat llevaba a una dirección con los dos puntos pegados dentro: ahora el enlace termina donde termina, y se abre.
- [importante] Gli avvisi su Discord adesso hanno una scheda loro: quanti canali vuoi, e per ognuno quali avvisi, di chi, con che parole. [vai: dcavvisi]
  en: Discord alerts now have their own tab: as many channels as you want, and for each one which alerts, for whom, with what words.
  es: Los avisos en Discord ahora tienen su propia pestaña: tantos canales como quieras, y para cada uno qué avisos, de quién y con qué palabras.
  > Gli avvisi su Discord come li vuoi
  > Puoi avere più canali di avvisi, ognuno con le sue dirette e le sue parole, invece di un solo messaggio uguale per tutto.
  en> Discord alerts the way you want them
  en> You can have several alert channels, each with its own streams and its own words, instead of one message that’s the same for everything.
  es> Los avisos en Discord como los quieres
  es> Puedes tener varios canales de avisos, cada uno con sus directos y sus palabras, en lugar de un solo mensaje igual para todo.
- Puoi far chiamare un ruolo quando parte l'avviso: sveglia quello e nessun altro, mai il server intero per una parola scritta per sbaglio. [vai: dcavvisi]
  en: You can have a role pinged when the alert goes out: it wakes that role and nobody else, never the whole server because of a word typed by mistake.
  es: Puedes hacer que se llame a un rol cuando sale el aviso: despierta a ese y a nadie más, nunca al servidor entero por una palabra escrita por error.
- Le dirette degli amici e della community arrivano anche sul server Discord, con la levetta separata da quella di Telegram. [vai: dcavvisi]
  en: Streams from friends and the community reach your Discord server too, with a toggle separate from Telegram’s.
  es: Los directos de los amigos y de la comunidad llegan también al servidor de Discord, con un interruptor aparte del de Telegram.
- Se lo chiedi, a diretta chiusa l'avviso diventa «ha finito la diretta»: non resta un «sono in onda» appeso fino a domani. [vai: dcavvisi]
  en: If you ask for it, once the stream is over the alert changes to “finished streaming”: no “I’m live” left hanging until tomorrow.
  es: Si lo pides, con el directo terminado el aviso pasa a «terminó el directo»: no queda un «estoy en directo» colgado hasta mañana.
- I menù a tendina non vengono più tagliati dal riquadro che li contiene: si aprono interi, e scorrerli non li fa sparire. [vai: ruoli]
  en: Dropdown menus are no longer clipped by the box that holds them: they open in full, and scrolling doesn’t make them vanish.
  es: Los menús desplegables ya no los recorta el recuadro que los contiene: se abren enteros, y desplazarse no los hace desaparecer.
- La scheda Discord è in ordine: il collegamento, chi prende quale ruolo, la porta d'ingresso. Una carta, una cosa. [vai: ruoli]
  en: The Discord tab is in order: the connection, who gets which role, the entrance door. One card, one thing.
  es: La pestaña Discord está en orden: la conexión, quién recibe qué rol, la puerta de entrada. Una tarjeta, una cosa.
- Sul sito, chi cerca un bot solo per il suo Discord lo trova subito sotto ai tasti di registrazione. [vai: pagina]
  en: On the site, people looking for a bot just for their Discord find it right under the sign-up buttons.
  es: En el sitio, quien busca un bot solo para su Discord lo encuentra enseguida debajo de los botones de registro.
- Ogni ruolo dato o tolto adesso lascia scritto il perché nel registro del tuo server, invece di una riga muta. [vai: ruoli]
  en: Every role given or removed now leaves the reason in your server’s audit log, instead of a silent line.
  es: Cada rol dado o quitado ahora deja escrito el porqué en el registro de tu servidor, en lugar de una línea muda.
- Il costruttore sa fare anche canali annunci, forum con i tag, media e palco, con lentezza e durata dei fili. [vai: dcserver]
  en: The builder can also make announcement channels, forums with tags, media and stage channels, with slow mode and thread duration.
  es: El constructor sabe hacer también canales de anuncios, foros con etiquetas, multimedia y escenario, con modo lento y duración de los hilos.
- Le impostazioni del tuo server Discord si cambiano da qui: chi può scrivere appena entra, il filtro delle immagini, i canali di sistema e regole, l'angolo AFK. [vai: dcserver]
  en: Your Discord server’s settings are changed from here: who can write as soon as they join, the image filter, the system and rules channels, the AFK corner.
  es: La configuración de tu servidor de Discord se cambia desde aquí: quién puede escribir nada más entrar, el filtro de imágenes, los canales de sistema y de reglas, el rincón AFK.
- Il freno d'emergenza c'è: metti in pausa tutti gli inviti con una spunta, e li riapri quando vuoi. [vai: dcserver]
  en: There’s an emergency brake: pause all invites with one checkbox, and reopen them whenever you want.
  es: Hay un freno de emergencia: pausas todas las invitaciones con una casilla, y las reabres cuando quieras.
- Chi un canale non ce l’ha entra con Discord e basta: costruisce il suo server da qui, e di dirette e overlay non vede nemmeno le schede. [vai: dcserver]
  en: People without a channel just sign in with Discord: they build their server from here, and don’t even see the stream and overlay tabs.
  es: Quien no tiene un canal entra solo con Discord: construye su servidor desde aquí, y de directos y overlays ni siquiera ve las pestañas.
- Dalla scheda di Discord adesso copi l’indirizzo della tua porta d’ingresso e la apri, invece di leggerla dentro una frase. [vai: ruoli]
  en: From the Discord tab you now copy your entrance door’s address and open it, instead of reading it inside a sentence.
  es: Desde la pestaña Discord ahora copias la dirección de tu puerta de entrada y la abres, en lugar de leerla dentro de una frase.
- Sostenere il progetto ha un indirizzo solo, corto, e dal sito ci si arriva: prima la pagina esisteva e non ci portava nessuno.
  en: Supporting the project has a single short address, and the site links to it: before, the page existed and nothing led there.
  es: Apoyar el proyecto tiene una sola dirección, corta, y desde el sitio se llega: antes la página existía y no llevaba nadie ahí.
- Prima di mandarti su Twitch adesso ti chiedo con quale account: lo stesso riquadro per «Inizia gratis» e per «Attiva». [vai: sottoscrizione]
  en: Before sending you to Twitch, I now ask you which account: the same box for “Start for free” and for “Activate”.
  es: Antes de mandarte a Twitch ahora te pregunto con qué cuenta: el mismo recuadro para «Empieza gratis» y para «Activar».
- La pagina per collegare il Discord si apre a chiunque, anche senza account, e prima di mandarti da Discord ti dice in tre righe cosa succede. [vai: ruoli]
  en: The page for linking Discord opens for anyone, even without an account, and before sending you to Discord it tells you in three lines what happens.
  es: La página para vincular Discord se abre para cualquiera, incluso sin cuenta, y antes de mandarte a Discord te dice en tres líneas qué pasa.
- Ti serve solo la parte di Discord? Adesso c’è scritto sul sito che si può fare e che è gratis. [vai: dcserver]
  en: Only need the Discord part? The site now says you can, and that it’s free.
  es: ¿Solo te sirve la parte de Discord? Ahora el sitio dice que se puede y que es gratis.
- Adesso ti dico quali dei tuoi ruoli Discord terrei e come li chiamerei, affiancati a quelli della traccia. Rinominarli tiene dentro chi ce l’aveva, cancellarli lo toglie a tutti. [vai: dcserver]
  en: I now tell you which of your Discord roles I’d keep and what I’d call them, side by side with the track’s. Renaming keeps whoever had them, deleting takes them from everyone.
  es: Ahora te digo qué roles de tu Discord conservaría y cómo los llamaría, junto a los de la plantilla. Renombrarlos mantiene a quien los tenía, borrarlos se los quita a todos.
- Se «!discord» non risponde in chat, la scheda ti dice quale delle tre cose manca invece di lasciartelo indovinare. [vai: ruoli]
  en: If “!discord” doesn’t answer in chat, the tab tells you which of the three things is missing instead of leaving you to guess.
  es: Si «!discord» no responde en el chat, la pestaña te dice cuál de las tres cosas falta en lugar de dejártelo adivinar.
- [importante] La porta del tuo server Discord si scrive da qui: quanto si aspetta prima di poter scrivere, cosa legge chi arriva, e le domande che gli aprono i canali. [vai: dcentra]
  en: Your Discord server’s door is written from here: how long people wait before they can write, what newcomers read, and the questions that open channels for them.
  es: La puerta de tu servidor de Discord se escribe desde aquí: cuánto se espera antes de poder escribir, qué lee quien llega y las preguntas que le abren los canales.
  > La porta d'ingresso del server Discord
  > Chi arriva nel tuo server legge prima quello che conta per te, aspetta il tempo che hai scelto prima di scrivere, e le sue risposte gli aprono i canali giusti.
  en> Your Discord server’s entrance door
  en> Newcomers to your server first read what matters to you, wait the time you chose before writing, and their answers open the right channels for them.
  es> La puerta de entrada del servidor de Discord
  es> Quien llega a tu servidor lee primero lo que te importa, espera el tiempo que elegiste antes de escribir, y sus respuestas le abren los canales correctos.
- Ogni risposta apre dei canali e dà un ruolo, scegliendoli per nome: valgono anche quelli che la traccia deve ancora creare. [vai: dcentra]
  en: Each answer opens channels and gives a role, picked by name: even those the track still has to create count.
  es: Cada respuesta abre canales y da un rol, eligiéndolos por nombre: valen también los que la plantilla todavía tiene que crear.
- Se Discord la porta non la prenderebbe, te lo dico prima di scriverla: quanti canali mancano, o che al server serve il tipo Community. [vai: dcentra]
  en: If Discord wouldn’t accept the door, I tell you before writing it: how many channels are missing, or that the server needs to be a Community server.
  es: Si Discord no aceptaría la puerta, te lo digo antes de escribirla: cuántos canales faltan, o que el servidor tiene que ser de tipo Comunidad.
- Chi aveva già risposto alle domande non ricomincia da capo: si rifanno solo quelle che hai cambiato. [vai: dcentra]
  en: People who had already answered the questions don’t start over: only the ones you changed are asked again.
  es: Quien ya había respondido a las preguntas no empieza de cero: solo se repiten las que cambiaste.
- La modalità distruttiva adesso si vede anche dalla scheda della porta: fascia rossa, tasto rosso e il tempo che scorre, da tutte e due. [vai: dcentra]
  en: Destructive mode now shows on the door’s tab too: red band, red button and the time running, on both.
  es: El modo destructivo ahora se ve también desde la pestaña de la puerta: franja roja, botón rojo y el tiempo corriendo, en las dos.
- Passare fra «Il server» e «Chi entra» non chiede più di salvare: sono due metà della stessa traccia, e uscendo davvero te lo ricorda lo stesso. [vai: dcentra]
  en: Switching between “The server” and “Who joins” no longer asks you to save: they’re two halves of the same track, and when you really leave it still reminds you.
  es: Pasar de «El servidor» a «Quién entra» ya no pide guardar: son dos mitades de la misma plantilla, y cuando sales de verdad te lo recuerda igual.
- Le impostazioni del server adesso arrivano davvero al server: il pannello le scriveva nella traccia e per strada si perdevano. [vai: dcserver]
  en: Server settings now really reach the server: the panel wrote them into the track and they got lost on the way.
  es: La configuración del servidor ahora llega de verdad al servidor: el panel la escribía en la plantilla y se perdía por el camino.
- Niente più spiegazioni per cose che hai già fatto: i permessi te li chiedo solo se mancano davvero. [vai: ruoli]
  en: No more explanations for things you’ve already done: I only ask for permissions if they’re really missing.
  es: Se acabaron las explicaciones para cosas que ya hiciste: los permisos te los pido solo si de verdad faltan.
- Entrare nel tuo Discord adesso è un indirizzo solo: si apre, si dice a Discord chi si è, e si è dentro. Poi il codice in chat e i ruoli arrivano da soli. [vai: ruoli]
  en: Joining your Discord is now a single address: it opens, people tell Discord who they are, and they’re in. Then the chat code and the roles arrive by themselves.
  es: Entrar en tu Discord ahora es una sola dirección: se abre, se le dice a Discord quién eres y ya estás dentro. Luego el código en el chat y los roles llegan solos.
- Quello che il bot risponde quando gli chiedono del Discord lo scrivi tu: cinque frasi, col nome di chi scrive e il link dentro. [vai: ruoli]
  en: You write what the bot answers when people ask about the Discord: five lines, with the name of whoever’s asking and the link inside.
  es: Lo que el bot responde cuando le preguntan por el Discord lo escribes tú: cinco frases, con el nombre de quien escribe y el enlace dentro.
- Vuoi che gestisca tutto il server? C’è un tasto che lo riporta su Discord come amministratore, e prima ti dice per bene cosa comporta. [vai: ruoli]
  en: Want it to manage the whole server? There’s a button that brings it back to Discord as an administrator, and it first explains properly what that means.
  es: ¿Quieres que gestione todo el servidor? Hay un botón que lo vuelve a llevar a Discord como administrador, y antes te explica bien lo que implica.
- Accanto al tasto «Attiva» adesso scegli il canale, Twitch o Kick, e un clic basta ancora. Entri da lì e al pagamento ritrovi i pacchetti che avevi già spuntato. [vai: sottoscrizione]
  en: Next to the “Activate” button you now pick the channel, Twitch or Kick, and one click is still enough. You sign in from there, and at checkout you find the packages you had already checked.
  es: Junto al botón «Activar» ahora eliges el canal, Twitch o Kick, y sigue bastando un clic. Entras desde ahí y en el pago encuentras los paquetes que ya habías marcado.
- Apri il sito e si vede prima, soprattutto dalla seconda volta: quello che non è cambiato il browser adesso se lo tiene, invece di richiederlo tutto da capo ogni volta.
  en: The site shows up faster when you open it, especially from the second time: the browser now keeps what hasn’t changed instead of fetching it all again every time.
  es: El sitio se ve antes al abrirlo, sobre todo desde la segunda vez: lo que no cambió ahora el navegador lo guarda, en lugar de volver a pedirlo todo cada vez.
- [importante] I ruoli del tuo server Discord li dà il bot, in base a quello che succede su Twitch: chi ti segue, chi è abbonato, chi c'è sempre. Scrivi la regola, il resto lo fa lui. [vai: ruoli]
  en: The bot hands out your Discord server’s roles based on what happens on Twitch: who follows you, who’s subscribed, who’s always there. You write the rule, it does the rest.
  es: Los roles de tu servidor de Discord los da el bot según lo que pasa en Twitch: quién te sigue, quién está suscrito, quién está siempre. Escribes la regla y él hace el resto.
  > I ruoli di Discord li dà il bot
  > Chi ti segue, chi è abbonato e chi c'è sempre riceve il ruolo giusto da solo, e tu non devi più assegnarli a mano.
  en> The bot hands out Discord roles
  en> Followers, subscribers and regulars get the right role on their own, and you no longer have to assign them by hand.
  es> Los roles de Discord los da el bot
  es> Quien te sigue, quien está suscrito y quien está siempre recibe el rol correcto solo, y ya no tienes que asignarlos a mano.
- Chi ti guarda si collega da solo: scrive !discord in chat e segue due passi. Tocca solo chi si è collegato, e solo i ruoli che hai nominato tu. [vai: ruoli]
  en: Viewers link themselves: they type !discord in chat and follow two steps. It only affects people who linked, and only the roles you named.
  es: Quien te mira se vincula solo: escribe !discord en el chat y sigue dos pasos. Solo afecta a quien se vinculó, y solo a los roles que nombraste tú.
- Il rapporto di fine diretta adesso conta anche i Bit della serata e ti dice chi ne ha messi di più. Chi ha cheerato in anonimo conta nel totale e resta senza nome. [vai: dirette]
  en: The end-of-stream report now also counts the night’s Bits and tells you who gave the most. Anonymous cheers count in the total and stay nameless.
  es: El informe de fin de directo ahora cuenta también los Bits de la noche y te dice quién puso más. Quien hizo cheer en anónimo cuenta en el total y se queda sin nombre.
- Il premio VIP automatico adesso può pescare dai Bit invece che dalle monete: lo scegli tu, e vale la classifica vera di Twitch. [vai: giochi]
  en: The automatic VIP prize can now draw from Bits instead of coins: you choose, and it uses Twitch’s real leaderboard.
  es: El premio VIP automático ahora puede sacar de los Bits en lugar de las monedas: lo eliges tú, y vale la clasificación real de Twitch.
- Chi guida i Bit diventa il re: tiene una corona accanto al nome nella chat a schermo, e quando torna a scrivere il bot lo saluta con la frase che hai scritto. [vai: giochi]
  en: Whoever leads in Bits becomes the king: they keep a crown next to their name in the on-screen chat, and when they write again the bot greets them with the line you wrote.
  es: Quien lidera en Bits se vuelve el rey: lleva una corona junto al nombre en el chat en pantalla, y cuando vuelve a escribir el bot lo saluda con la frase que escribiste.
- La classifica dei Bit puoi metterla in scena: la scegli dallo Studio come ogni altro elemento, dici di quando e quante righe, e si aggiorna da sola quando arriva un cheer. [vai: alert]
  en: You can put the Bits leaderboard on screen: pick it in the Studio like any other element, say for what period and how many rows, and it updates itself when a cheer comes in.
  es: La clasificación de Bits la puedes poner en escena: la eliges desde el Studio como cualquier otro elemento, dices de cuándo y cuántas filas, y se actualiza sola cuando llega un cheer.
- [importante] Collegare Discord adesso è un tasto: ti manda a scegliere il server dall'elenco e torni a posto. Niente bot da creare, niente id da copiare. [vai: ruoli]
  en: Connecting Discord is now one button: it sends you to pick the server from the list and you’re back, all set. No bot to create, no IDs to copy.
  es: Conectar Discord ahora es un botón: te manda a elegir el servidor de la lista y vuelves listo. Nada de bots que crear ni de ids que copiar.
  > Discord si collega con un tasto
  > Scegli il server da un elenco e hai finito: niente bot da creare nel portale degli sviluppatori e niente codici da copiare.
  en> Discord connects with one button
  en> Pick the server from a list and you’re done: no bot to create in the developer portal and no codes to copy.
  es> Discord se conecta con un botón
  es> Eliges el servidor de una lista y listo: nada de bots que crear en el portal de desarrolladores ni códigos que copiar.
- Un VIP a premio adesso dura DIRETTE, non giorni: se salti una settimana ti aspetta. E le gare sono due, monete e Bit, che vanno avanti insieme. [vai: giochi]
  en: A prize VIP now lasts STREAMS, not days: if you skip a week, it waits for you. There are two races, coins and Bits, running side by side.
  es: Un VIP de premio ahora dura DIRECTOS, no días: si te saltas una semana, te espera. Las carreras son dos, monedas y Bits, que avanzan juntas.
- Ogni posizione ha il nome che le dai tu (re, principe, cavaliere) e la sua durata: al primo posto puoi dare cinque dirette e al terzo una. [vai: giochi]
  en: Each position has the name you give it (king, prince, knight) and its own duration: you can give first place five streams and third place one.
  es: Cada posición tiene el nombre que le das (rey, príncipe, caballero) y su duración: al primer puesto le puedes dar cinco directos y al tercero uno.
- [importante] Categorie e canali del tuo Discord li scegli da qui: parti da una traccia pronta o fagli leggere il server che hai già, e lui lo mette su. [vai: dcserver]
  en: You pick your Discord’s categories and channels from here: start from a ready-made track or let it read the server you already have, and it sets it up.
  es: Las categorías y los canales de tu Discord los eliges desde aquí: partes de una plantilla lista o le haces leer el servidor que ya tienes, y él lo monta.
  > Il server Discord si costruisce da qui
  > Parti da una traccia pronta o da quello che hai già, e categorie e canali si creano da soli nell'ordine giusto.
  en> Build your Discord server from here
  en> Start from a ready-made track or from what you already have, and categories and channels are created by themselves in the right order.
  es> El servidor de Discord se construye desde aquí
  es> Partes de una plantilla lista o de lo que ya tienes, y las categorías y los canales se crean solos en el orden correcto.
- Prima di toccare niente ti fa vedere l'elenco esatto di quello che farebbe. Va solo in avanti: quello che non è nella traccia resta dov'è, e te lo dice. [vai: dcserver]
  en: Before touching anything, it shows you the exact list of what it would do. It only moves forward: whatever isn’t in the track stays where it is, and it tells you so.
  es: Antes de tocar nada te muestra la lista exacta de lo que haría. Solo va hacia adelante: lo que no está en la plantilla se queda donde está, y te lo dice.
- Dentro ogni canale scrivi chi può fare cosa, con parole normali, come «tutti», «non può», «scrivere». I permessi che non nomini nessuno li tocca. [vai: dcserver]
  en: Inside each channel you write who can do what, in plain words like “everyone”, “cannot”, “write”. Permissions you don’t mention are left untouched.
  es: Dentro de cada canal escribes quién puede hacer qué, con palabras normales como «todos», «no puede», «escribir». Los permisos que no nombras no se tocan.
- Alcuni tasti comparivano quando non servivano a niente: «Scollega tutto» senza niente da scollegare, «Ferma la diretta» senza diretta. Adesso restano via finché non servono.
  en: Some buttons showed up when they served no purpose: “Disconnect everything” with nothing to disconnect, “Stop the stream” with no stream. Now they stay away until they’re needed.
  es: Algunos botones aparecían cuando no servían para nada: «Desconectar todo» sin nada que desconectar, «Parar el directo» sin directo. Ahora no aparecen hasta que hacen falta.
- Dalla privacy della pagina donazioni il tasto «Torna alla pagina» riportava alla pagina link. Adesso torna dov'eri, e quell'informativa parla della pagina giusta.
  en: From the donations page’s privacy notice, the “Back to the page” button led to the link page. Now it goes back where you were, and that notice talks about the right page.
  es: Desde la privacidad de la página de donaciones, el botón «Volver a la página» llevaba a la página de enlaces. Ahora vuelve adonde estabas, y ese aviso habla de la página correcta.
- In fondo alla pagina delle donazioni c'è il collegamento ai tuoi link: chi arriva da un link diretto trova anche il resto. [vai: donazioni]
  en: At the bottom of the donations page there’s a link to your links: people arriving from a direct link find the rest too.
  es: Al final de la página de donaciones está el enlace a tus enlaces: quien llega desde un enlace directo encuentra también el resto.
- Nel costruttore Discord una categoria non risulta più «mai usata»: quel conto non esiste, e adesso ti dice quanti canali ha dentro e da quanto tacciono. [vai: dcserver]
  en: In the Discord builder a category no longer shows as “never used”: that count doesn’t exist, and now it tells you how many channels it holds and how long they’ve been quiet.
  es: En el constructor de Discord una categoría ya no aparece como «nunca usada»: esa cuenta no existe, y ahora te dice cuántos canales tiene dentro y desde cuándo están callados.
- C'è una pagina per dare una mano al progetto, su socialbot.live/sostieni: quanto vuoi tu, una volta sola, senza iscriverti a niente.
  en: There’s a page to help out the project, at socialbot.live/sostieni: as much as you like, just once, without signing up for anything.
  es: Hay una página para echarle una mano al proyecto, en socialbot.live/sostieni: lo que quieras, una sola vez, sin suscribirte a nada.
- Vuoi che il server diventi esattamente la traccia? C'è una modalità apposta: la accendi tu, dura dieci minuti e si spegne da sola, e intanto la pagina cambia colore. [vai: dcserver]
  en: Want the server to become exactly the track? There’s a mode just for that: you turn it on, it lasts ten minutes and switches itself off, and meanwhile the page changes color.
  es: ¿Quieres que el servidor sea exactamente la plantilla? Hay un modo para eso: lo activas tú, dura diez minutos y se apaga solo, y mientras tanto la página cambia de color.
- Quando stai per cancellare un canale in cui si parlava ancora, o più di dieci cose insieme, ti chiedo di scrivere il nome del server: su Discord non tornano. [vai: dcserver]
  en: When you’re about to delete a channel where people were still talking, or more than ten things at once, I ask you to type the server’s name: on Discord they don’t come back.
  es: Cuando vas a borrar un canal donde todavía se hablaba, o más de diez cosas a la vez, te pido que escribas el nombre del servidor: en Discord no vuelven.
- Di ogni passaggio del costruttore resta scritto chi è stato e cosa ha fatto, coi nomi di quello che è sparito. È l'unico posto dove quei nomi restano. [vai: dcserver]
  en: Every pass of the builder leaves a record of who did it and what they did, with the names of whatever disappeared. It’s the only place those names survive.
  es: De cada pasada del constructor queda escrito quién fue y qué hizo, con los nombres de lo que desapareció. Es el único lugar donde esos nombres se conservan.
- Quando incolli il link della pagina per dare una mano al progetto, l'anteprima adesso parla di quella pagina invece che del bot in generale.
  en: When you paste the link to the page for helping the project, the preview now talks about that page instead of the bot in general.
  es: Cuando pegas el enlace de la página para ayudar al proyecto, la vista previa ahora habla de esa página y no del bot en general.
- La pagina per dare una mano al progetto si apriva solo a chi era già entrato: da fuori dava «non c'è niente qui». Adesso si apre a tutti.
  en: The page for helping the project only opened for people already signed in: from outside it said “nothing here”. Now it opens for everyone.
  es: La página para ayudar al proyecto solo se abría a quien ya había entrado: desde fuera decía «aquí no hay nada». Ahora se abre para todos.
- Il puntatore disegnato c'era solo sulla vetrina. Adesso è su ogni pagina del sito, 404 compreso.
  en: The hand-drawn pointer was only on the showcase. Now it’s on every page of the site, 404 included.
  es: El puntero dibujado solo estaba en el escaparate. Ahora está en todas las páginas del sitio, 404 incluida.
- Su Discord l'avviso di diretta lo scrive il bot nel canale che scegli: non devi più creare un webhook a mano. Chi ce l'ha già lo tiene. [vai: notifiche]
  en: On Discord the bot writes the go-live alert in the channel you choose: you no longer have to create a webhook by hand. If you already have one, you keep it.
  es: En Discord el aviso de directo lo escribe el bot en el canal que eliges: ya no tienes que crear un webhook a mano. Quien ya lo tiene lo conserva.
- Un canale in sola lettura non zittisce più il bot: «sono-in-onda» resta di sola lettura per le persone, e lui ci scrive. [vai: dcserver]
  en: A read-only channel no longer silences the bot: “sono-in-onda” stays read-only for people, and the bot writes in it.
  es: Un canal de solo lectura ya no calla al bot: «sono-in-onda» sigue siendo de solo lectura para las personas, y él escribe ahí.
- Il bot adesso può dare ai ruoli anche i poteri di moderazione, così «Moderatori» nasce già con i suoi: se l'avevi invitato prima, rifallo. [vai: ruoli]
  en: The bot can now give roles moderation powers too, so “Moderators” is born with its own: if you invited it earlier, do it again.
  es: Ahora el bot puede dar a los roles también los poderes de moderación, así «Moderadores» nace ya con los suyos: si lo invitaste antes, vuelve a hacerlo.
- Dal costruttore decidi anche i ruoli: nome, colore, se stanno a parte, e cosa possono fare. Le tracce ne portano già quattro. [vai: dcserver]
  en: From the builder you also decide the roles: name, color, whether they’re shown separately, and what they can do. The tracks already come with four.
  es: Desde el constructor decides también los roles: nombre, color, si van aparte y qué pueden hacer. Las plantillas ya traen cuatro.
- In piazza pulita spariscono anche i ruoli che non sono nella traccia, e si cancellano per ultimi: se qualcosa va storto non resti senza privilegi. [vai: dcserver]
  en: When you clear the board, roles that aren’t in the track disappear too, and they’re deleted last: if something goes wrong, you’re not left without privileges.
  es: Al hacer limpieza desaparecen también los roles que no están en la plantilla, y se borran al final: si algo sale mal, no te quedas sin privilegios.
- Quello che il bot non può toccare adesso te lo dice prima: i ruoli sopra di lui, e i privilegi che non ha da passare. [vai: dcserver]
  en: Whatever the bot can’t touch, it now tells you beforehand: roles above it, and privileges it doesn’t have to pass on.
  es: Lo que el bot no puede tocar ahora te lo dice antes: los roles por encima de él y los privilegios que no tiene para dar.
- Quando una cosa non riesce, il messaggio parla di quella cosa: se non è riuscito a cancellare un canale non ti manda più a guardare i ruoli.
  en: When something fails, the message talks about that thing: if it couldn’t delete a channel, it no longer sends you off to check the roles.
  es: Cuando algo falla, el mensaje habla de esa cosa: si no pudo borrar un canal, ya no te manda a mirar los roles.
- I canali che il bot non vede o non può gestire adesso restano fuori dall'elenco, e te li dice prima: non ti promette più cose che poi non riescono. [vai: dcserver]
  en: Channels the bot can’t see or manage now stay off the list, and it tells you about them beforehand: it no longer promises things that then fail.
  es: Los canales que el bot no ve o no puede gestionar ahora quedan fuera de la lista, y te los dice antes: ya no promete cosas que luego no salen.
- In fondo alla home c'è un invito a dare una mano al progetto, al posto di un link perso fra privacy e termini.
  en: At the bottom of the home page there’s an invitation to help out the project, instead of a link lost between privacy and terms.
  es: Al final de la portada hay una invitación a echarle una mano al proyecto, en lugar de un enlace perdido entre privacidad y términos.

## 2026-09-18

- Un contatore nuovo lo fai dal banco di regia, senza cambiare scheda: premi «Aggiungi», gli dai un comando e compare sulla tela già acceso. [vai: alert]
  en: You make a new counter right from the studio, without switching tabs: press “Add”, give it a command, and it appears on the canvas already on.
  es: Un contador nuevo lo creas desde la mesa del Studio, sin cambiar de pestaña: pulsas «Añadir», le das un comando y aparece en el lienzo ya encendido.
- Vuoi provarlo senza toccare l'overlay che hai già in OBS? Il banco te ne fa una copia, stesso layout e link suo, col contatore acceso solo lì. [vai: alert]
  en: Want to try it without touching the overlay you already have in OBS? The studio makes you a copy, same layout with its own link, with the counter on only there.
  es: ¿Quieres probarlo sin tocar el overlay que ya tienes en OBS? La mesa te hace una copia, mismo diseño y enlace propio, con el contador encendido solo ahí.
- L'annulla dello Studio non riporta più indietro anche l'elemento spostato un attimo prima: ogni cosa ha il suo passo. [vai: alert]
  en: Undo in the Studio no longer also reverts the element you moved a moment earlier: each thing has its own step.
  es: Deshacer en el Studio ya no revierte también el elemento que moviste un momento antes: cada cosa tiene su paso.
- Su un widget piccolo la maniglia per ingrandire finiva sotto quella del perimetro: ci cliccavi e invece di ingrandirlo gli davi una cornice. Adesso lì non c'è, e la dimensione la cambi dal pannello. [vai: alert]
  en: On a small widget the resize handle ended up under the outline handle: you clicked it and gave it a frame instead of resizing it. Now it’s not there, and you change the size from the panel.
  es: En un widget pequeño el asa para agrandar quedaba debajo de la del perímetro: hacías clic y en vez de agrandarlo le ponías un marco. Ahora ahí no está, y el tamaño lo cambias desde el panel.
- Il lucchetto tiene davvero: prima le maniglie restavano lì, e con quelle un elemento bloccato si poteva ancora ingrandire o girare. [vai: alert]
  en: The lock really holds: before, the handles stayed there, and with them a locked element could still be resized or rotated.
  es: El candado aguanta de verdad: antes las asas seguían ahí, y con ellas un elemento bloqueado todavía se podía agrandar o girar.
- Se il bot riparte mentre sei in onda la serata non si perde più: prima i numeri dicevano zero minuti, e quella diretta finiva senza lasciare il suo rapporto. [vai: statistiche]
  en: If the bot restarts while you’re live, the night is no longer lost: before, the numbers said zero minutes, and that stream ended without leaving its report.
  es: Si el bot se reinicia mientras estás al aire, la noche ya no se pierde: antes los números decían cero minutos, y ese directo terminaba sin dejar su informe.
- Quando parla di sua iniziativa non si intromette più fra due che stanno parlando: prende l'ultima cosa detta a tutti, e se non ce n'è una sta zitto. [vai: personalita]
  en: When it speaks on its own, it no longer butts in between two people talking: it picks up the last thing said to everyone, and if there isn’t one it stays quiet.
  es: Cuando habla por iniciativa propia ya no se mete entre dos que están hablando: toma lo último que se dijo a todos, y si no hay nada se calla.
- Nel rapporto di fine diretta le clip hanno il loro titolo vero, con quanto durano: prima c'era scritto solo perché il bot le aveva fatte, tipo «modulo». [vai: dirette]
  en: In the end-of-stream report, clips have their real title and length: before, it only said why the bot had made them, like “modulo”.
  es: En el informe de fin de directo los clips tienen su título real y cuánto duran: antes solo decía por qué los había hecho el bot, como «modulo».
- Parla di meno ma meglio: si aggiunge a un discorso vero fra due persone, non a una riga qualsiasi, e quando parte ha il taglio di uno della chat invece che di chi presenta la serata. [vai: personalita]
  en: It talks less but better: it joins a real conversation between two people, not just any line, and when it does, it sounds like someone in chat rather than the host of the night.
  es: Habla menos pero mejor: se suma a una conversación real entre dos personas, no a cualquier línea, y cuando lo hace suena como uno del chat y no como quien presenta la noche.
- Tutto quello che fa salire un contatore da solo sta in un posto suo: nei Comandi trovi CONTATORify, accanto ai contatori che muove. [vai: moduli]
  en: Everything that makes a counter go up by itself has its own place: in Commands you’ll find CONTATORify, next to the counters it moves.
  es: Todo lo que hace subir solo un contador tiene su propio lugar: en Comandos encuentras CONTATORify, junto a los contadores que mueve.
- Le schermate di morte adesso stanno in comune: cerchi il gioco, la prendi e non insegni niente. Se una non ti prende bene la sistemi, e la sistemi per tutti. [vai: moduli]
  en: Death screens are now shared: you search for the game, grab its screen and teach nothing. If one doesn’t catch well, you fix it, and you fix it for everyone.
  es: Las pantallas de muerte ahora son compartidas: buscas el juego, la tomas y no enseñas nada. Si una no te detecta bien la arreglas, y la arreglas para todos.
- Counter-Strike e Dota dicono loro quante volte sei morto: metti un file nella cartella del gioco e il contatore sale da se', senza riconoscere niente. [vai: moduli]
  en: Counter-Strike and Dota report themselves how many times you died: put a file in the game folder and the counter goes up on its own, with nothing to recognize.
  es: Counter-Strike y Dota dicen ellos cuántas veces moriste: pones un archivo en la carpeta del juego y el contador sube solo, sin reconocer nada.
- Muori e il numero sale da solo: fai vedere al bot la schermata di morte del gioco una volta, e poi ci pensa lui mentre giochi. L'immagine dello schermo non esce dal tuo computer. [vai: moduli]
  en: Die and the number goes up by itself: show the bot the game’s death screen once, and it takes care of it while you play. Your screen image never leaves your computer.
  es: Mueres y el número sube solo: le muestras al bot la pantalla de muerte del juego una vez, y luego se encarga él mientras juegas. La imagen de tu pantalla no sale de tu computadora.
- Mentre sei in onda le Statistiche si aggiornano da sole: la diretta di adesso conta già fra le dirette, coi suoi minuti e il suo picco, invece di comparire solo a fine serata. [vai: statistiche]
  en: While you’re live, Stats update by themselves: the current stream already counts among your streams, with its minutes and its peak, instead of showing up only at the end of the night.
  es: Mientras estás al aire, las Estadísticas se actualizan solas: el directo actual ya cuenta entre los directos, con sus minutos y su pico, en lugar de aparecer solo al final de la noche.
- Chi manda bit non viene più preso per spam: cinque «5 bit» di fila sono cinque messaggi uguali per forza, e adesso il filtro lo sa. [vai: regole]
  en: People sending bits are no longer taken for spam: five “5 bit” in a row are bound to be five identical messages, and now the filter knows it.
  es: Quien manda bits ya no se toma por spam: cinco «5 bit» seguidos son por fuerza cinco mensajes iguales, y ahora el filtro lo sabe.
- Le cose che il bot dice da solo non si accumulano più mentre la chat è ferma o la diretta è spenta: prima tornavano tutte insieme appena si riaccendeva. [vai: personalita]
  en: Things the bot says on its own no longer pile up while chat is quiet or the stream is off: before, they all came back at once as soon as it came back on.
  es: Lo que el bot dice por su cuenta ya no se acumula mientras el chat está quieto o el directo apagado: antes volvía todo junto en cuanto se reactivaba.
- Il bot non spara più una riga appena si riavvia: se non si ricorda quando ha parlato l'ultima volta, conta da adesso. Se il processo ripartiva spesso, sembrava impazzito. [vai: personalita]
  en: The bot no longer fires off a line as soon as it restarts: if it doesn’t remember when it last spoke, it counts from now. If the process restarted often, it seemed to go crazy.
  es: El bot ya no suelta una línea en cuanto se reinicia: si no recuerda cuándo habló por última vez, cuenta desde ahora. Si el proceso se reiniciaba a menudo, parecía enloquecido.
- Il bot fa il portiere del gruppo Telegram: chi entra non può scrivere finché non preme un tasto, e chi non risponde in tempo esce (e può rientrare). Lo accendi tu, ed è spento finché non lo fai. [vai: telegram]
  en: The bot works as the Telegram group’s doorkeeper: newcomers can’t write until they press a button, and anyone who doesn’t answer in time is removed (and can rejoin). You turn it on; it’s off until you do.
  es: El bot hace de portero del grupo de Telegram: quien entra no puede escribir hasta que pulsa un botón, y quien no responde a tiempo sale (y puede volver). Lo activas tú, y está apagado hasta que lo hagas.
- Per le sere diverse dalle altre ci sono le occasioni: un'aggiunta sopra l'overlay che hai già. La accendi e compare, la spegni e torna tutto com'era, e in OBS non tocchi niente. [vai: alert]
  en: For nights that aren’t like the others there are occasions: an add-on on top of the overlay you already have. Turn it on and it appears, turn it off and everything goes back to how it was, with nothing to touch in OBS.
  es: Para las noches distintas de las demás están las ocasiones: un añadido encima del overlay que ya tienes. Lo activas y aparece, lo apagas y todo vuelve a como estaba, y en OBS no tocas nada.
- Le occasioni partono da un modello che guardi prima di sceglierlo: subathon, torno subito, serata speciale, o una vuota da farsi da sé. [vai: alert]
  en: Occasions start from a template you can look at before choosing it: subathon, be right back, special night, or a blank one to make yourself.
  es: Las ocasiones parten de una plantilla que miras antes de elegirla: subathon, vuelvo enseguida, noche especial, o una vacía para armarla tú.
- Nella colonna dei livelli la posizione scritta adesso è quella vera anche appena apri lo Studio. [vai: alert]
  en: In the layers column, the position shown is now the real one even right after you open the Studio.
  es: En la columna de capas la posición escrita ahora es la real incluso nada más abrir el Studio.
- I livelli mostrano quello che c'è in questo overlay, non più la lista intera con dentro anche lo spento. Il resto sta sotto «Aggiungi», dove trovi anche cartelli e immagini. [vai: alert]
  en: Layers show what’s in this overlay, no longer the whole list including what’s turned off. The rest is under “Add”, where you’ll also find signs and images.
  es: Las capas muestran lo que hay en este overlay, ya no la lista entera con lo apagado incluido. El resto está en «Añadir», donde también encuentras carteles e imágenes.
- Lo Studio si muove più svelto: trascinare un elemento costa quasi la metà di prima. [vai: alert]
  en: The Studio moves faster: dragging an element costs almost half what it did.
  es: El Studio va más ágil: arrastrar un elemento cuesta casi la mitad que antes.

## 2026-09-17

- Le presenze si contano diretta dopo diretta: chi resta in chat almeno dieci minuti è presente, e le dirette di fila fanno una serie con un bonus in monete che cresce. Con !serie ognuno vede la sua. [vai: giochi]
  en: Attendance is counted stream after stream: anyone who stays in chat for at least ten minutes is present, and consecutive streams build a streak with a growing coin bonus. With !serie everyone sees their own.
  es: Las asistencias se cuentan directo tras directo: quien se queda en el chat al menos diez minutos está presente, y los directos seguidos forman una racha con un bono en monedas que crece. Con !serie cada uno ve la suya.
- Il bot saluta chi scrive per la prima volta e chi torna dopo settimane, con le parole che scegli tu nella scheda Giochi. Se hai già un Modulo sul primo messaggio, vince il tuo. [vai: giochi]
  en: The bot greets people writing for the first time and those coming back after weeks, with the words you choose in the Games tab. If you already have a Module on first messages, yours wins.
  es: El bot saluda a quien escribe por primera vez y a quien vuelve tras semanas, con las palabras que eliges en la pestaña Juegos. Si ya tienes un Módulo para el primer mensaje, gana el tuyo.
- Nella scheda Memoria trovi chi c'è sempre: le serie di presenze più lunghe del canale. [vai: memoria]
  en: In the Memory tab you’ll find who’s always there: the channel’s longest attendance streaks.
  es: En la pestaña Memoria encuentras a quien siempre está: las rachas de asistencia más largas del canal.
- Ogni diretta finita lascia il suo rapporto nella scheda «Dirette», con durata, picco di spettatori, chat, follower, sub, raid, presenti, clip e donazioni. Un puntino ti dice quando ce n'è uno nuovo. [vai: dirette]
  en: Every finished stream leaves its report in the “Streams” tab, with length, viewer peak, chat, followers, subs, raids, attendance, clips and donations. A dot tells you when there’s a new one.
  es: Cada directo terminado deja su informe en la pestaña «Directos», con duración, pico de espectadores, chat, seguidores, subs, raids, presentes, clips y donaciones. Un puntito te avisa cuando hay uno nuevo.
- Il rapporto può arrivarti appena chiudi, su Telegram in privato o via mail: l'indirizzo lo scrivi tu e vale dopo la conferma. [vai: dirette]
  en: The report can reach you as soon as you sign off, privately on Telegram or by email: you type the address yourself, and it works after you confirm it.
  es: El informe te puede llegar en cuanto cierras, por Telegram en privado o por correo: la dirección la escribes tú y vale después de confirmarla.
- I Moduli comandano la regia: un comando, la voce o un raid cambiano scena, mutano una fonte o la transizione nel programma con cui mandi in onda. Tre modelli pronti: torno subito, sono tornato, raid. [vai: moduli]
  en: Modules control your streaming program: a command, your voice or a raid can switch scene, mute a source or change the transition. Three ready-made templates: be right back, I’m back, raid.
  es: Los Módulos manejan el programa de emisión: un comando, la voz o un raid cambian de escena, silencian una fuente o cambian la transición. Tres plantillas listas: vuelvo enseguida, ya volví, raid.
- Il marchio adesso esiste anche in vettoriale, pronto per il giorno che i programmi di posta mostreranno il nostro logo accanto al mittente. [vai: dirette]
  en: The brand now exists as a vector file too, ready for the day email programs show our logo next to the sender.
  es: La marca ahora existe también en vectorial, lista para el día en que los programas de correo muestren nuestro logo junto al remitente.
- La pagina d’ingresso adesso pesa un settimo: chi arriva per leggere non si scarica più tutto il pannello, e il listino è già lì senza aspettare.
  en: The landing page now weighs a seventh as much: people who come to read no longer download the whole panel, and the price list is already there without waiting.
  es: La página de entrada ahora pesa una séptima parte: quien llega a leer ya no se descarga todo el panel, y la lista de precios ya está ahí sin esperar.
- L’hype train adesso sta nella scena: livello, barra, quanto manca e chi spinge di più. Il bot lo dice in chat quando parte, quando sale e quando finisce. [vai: alert]
  en: The hype train now lives in the scene: level, bar, how much is left and who’s pushing hardest. The bot announces in chat when it starts, when it levels up and when it ends.
  es: El hype train ahora está en la escena: nivel, barra, cuánto falta y quién empuja más. El bot lo dice en el chat cuando empieza, cuando sube y cuando termina.
- Puoi mettere in scena scritte e immagini tue: il titolo della serata, le regole, il logo, un «torno subito». Le trascini dove vuoi, fino a otto. [vai: alert]
  en: You can put your own text and images in the scene: the night’s title, the rules, your logo, a “be right back”. Drag them wherever you like, up to eight.
  es: Puedes poner en escena textos e imágenes tuyos: el título de la noche, las reglas, el logo, un «vuelvo enseguida». Los arrastras adonde quieras, hasta ocho.
- Un elemento con lo sfondo a zero diventava una lastra colorata invece di sparire. Adesso «senza sfondo» vuol dire davvero senza niente dietro. [vai: alert]
  en: An element with its background at zero turned into a colored slab instead of disappearing. Now “No background” really means nothing behind it.
  es: Un elemento con el fondo en cero se volvía una placa de color en lugar de desaparecer. Ahora «Sin fondo» quiere decir de verdad nada detrás.
- Il rapporto di fine diretta dice anche a che livello è arrivato l’hype train e chi l’ha spinto. [vai: dirette]
  en: The end-of-stream report also says what level the hype train reached and who pushed it.
  es: El informe de fin de directo dice también a qué nivel llegó el hype train y quién lo empujó.
- Gli eventi più lunghi venivano registrati a metà e il rapporto non riusciva più a rileggerli. Adesso ci stanno interi. [vai: dirette]
  en: Longer events were saved only halfway, and the report could no longer read them back. Now they fit whole.
  es: Los eventos más largos se guardaban a medias y el informe ya no lograba volver a leerlos. Ahora caben enteros.
- La pagina d’ingresso è scesa ancora: adesso si porta dietro solo le animazioni che usa davvero, non quelle di tutto il pannello.
  en: The landing page got lighter still: it now only carries the animations it actually uses, not those of the whole panel.
  es: La página de entrada bajó todavía más: ahora solo lleva las animaciones que usa de verdad, no las de todo el panel.
- Un’automazione può chiedere quanti Bit sono arrivati: sotto la soglia non parte, e con una fascia per scaglione scrivi una scala. Vale anche per gli spettatori di un raid e i mesi di un sub. [vai: moduli]
  en: An automation can ask how many Bits came in: below the threshold it doesn’t run, and with one band per tier you write a ladder. The same works for raid viewers and sub months.
  es: Una automatización puede preguntar cuántos Bits llegaron: por debajo del umbral no arranca, y con una franja por nivel escribes una escala. Vale también para los espectadores de un raid y los meses de un sub.
- Quando il treno è nell’ultimo quarto della salita il bot dice quanti punti mancano al livello dopo. Una volta per livello, e la frase la scrivi tu. [vai: alert]
  en: When the train is in the last quarter of its climb, the bot says how many points are left to the next level. Once per level, and you write the line.
  es: Cuando el tren está en el último cuarto de la subida, el bot dice cuántos puntos faltan para el siguiente nivel. Una vez por nivel, y la frase la escribes tú.
- «!bit» dice chi ha messo più Bit oggi, questa settimana, questo mese o da sempre. E a chi non è sul podio dice a che posto è. [vai: moduli]
  en: “!bit” says who gave the most Bits today, this week, this month or all time. To anyone not on the podium it says what place they’re in.
  es: «!bit» dice quién puso más Bits hoy, esta semana, este mes o desde siempre. A quien no está en el podio le dice en qué puesto está.
- Telegram adesso ha una scheda sua, nel gruppo nuovo «Le tue community»: era una voce dentro le notifiche, con dentro più roba di tutte le altre messe insieme. [vai: telegram]
  en: Telegram now has its own tab, in the new “Your communities” group: it was an entry inside notifications, holding more than all the others put together.
  es: Telegram ahora tiene su propia pestaña, en el grupo nuevo «Tus comunidades»: era una entrada dentro de las notificaciones, con más cosas que todas las demás juntas.
- Mostrare un contatore a schermo lo azzerava. Adesso no: il numero resta quello, e mostrare e azzerare sono due comandi diversi. [vai: moduli]
  en: Showing a counter on screen reset it to zero. Not anymore: the number stays put, and showing and resetting are two separate commands.
  es: Mostrar un contador en pantalla lo ponía a cero. Ya no: el número se queda como está, y mostrar y poner a cero son dos comandos distintos.
- Dei contatori scegli tu le parole: quale comando aggiunge, quale toglie, quale azzera, e chi può usarlo. Verbo per verbo. [vai: moduli]
  en: You choose the words for counters: which command adds, which subtracts, which resets, and who can use it. Verb by verb.
  es: Las palabras de los contadores las eliges tú: qué comando suma, cuál resta, cuál pone a cero y quién puede usarlo. Verbo por verbo.
- Il numero adesso vale attaccato o staccato: «!morti +3» e «!morti + 3» sono la stessa cosa. Prima il secondo aggiungeva uno. [vai: moduli]
  en: The number now counts with or without a space: “!morti +3” and “!morti + 3” are the same thing. Before, the second one added one.
  es: El número ahora vale pegado o separado: «!morti +3» y «!morti + 3» son lo mismo. Antes el segundo sumaba uno.
- Quando un comando è riservato, il bot lo dice invece di stare zitto. E lo dice bene: «ai moderatori e allo streamer», non «a i VIP». [vai: moduli]
  en: When a command is restricted, the bot says so instead of staying silent. It says it properly too: “ai moderatori e allo streamer”, not “a i VIP”.
  es: Cuando un comando está reservado, el bot lo dice en lugar de callarse. Lo dice bien, además: «ai moderatori e allo streamer», no «a i VIP».
- Nell’overlay c’erano due elenchi dei livelli, uno accanto alla tela e uno molto più in basso. Adesso ce n’è uno solo, quello che vedi. [vai: alert]
  en: The overlay had two layer lists, one next to the canvas and one much further down. Now there’s just one, the one you see.
  es: En el overlay había dos listas de capas, una junto al lienzo y otra mucho más abajo. Ahora hay una sola, la que ves.
- Scegli un livello e a destra compare tutto quello che lo riguarda, con la tela sempre davanti: prima dovevi scorrere via per cambiarlo. [vai: alert]
  en: Pick a layer and everything about it appears on the right, with the canvas always in front of you: before, you had to scroll away to change it.
  es: Eliges una capa y a la derecha aparece todo lo que le concierne, con el lienzo siempre delante: antes había que desplazarse para cambiarla.
- I livelli che si cambiano in un’altra scheda adesso te lo dicono, e ci si va da lì. [vai: alert]
  en: Layers that are changed in another tab now tell you so, and you can go there from them.
  es: Las capas que se cambian en otra pestaña ahora te lo dicen, y desde ahí se va.
- Nascondere un cartello in un overlay non restava nascosto dopo il salvataggio. Adesso sì. [vai: alert]
  en: Hiding a sign in an overlay didn’t stay hidden after saving. Now it does.
  es: Ocultar un cartel en un overlay no se mantenía después de guardar. Ahora sí.
- In fondo a ogni mail che ti mandiamo c'è un codice di verifica. Lo ritrovi solo nella scheda Stato: se non combacia, quella mail non è nostra. [vai: stato]
  en: At the bottom of every email we send you there’s a verification code. You’ll find it only in the Status tab: if it doesn’t match, that email isn’t from us.
  es: Al final de cada correo que te enviamos hay un código de verificación. Lo encuentras solo en la pestaña Estado: si no coincide, ese correo no es nuestro.
- Nell'elenco della posta adesso si legge il nome di chi scrive, non il pezzo prima della chiocciola. [vai: dirette]
  en: In your inbox you now see the sender’s name, not the part before the @.
  es: En la bandeja de entrada ahora se lee el nombre de quien escribe, no la parte antes de la arroba.
- C'è una scheda «Statistiche»: i numeri del canale per sette giorni, trenta o da sempre, e cinque classifiche. Prima erano sparsi fra Memoria, Giochi e Dirette. [vai: statistiche]
  en: There’s a “Stats” tab: the channel’s numbers for seven days, thirty or all time, and five leaderboards. Before, they were scattered across Memory, Games and Streams.
  es: Hay una pestaña «Estadísticas»: los números del canal de siete días, treinta o desde siempre, y cinco clasificaciones. Antes estaban repartidos entre Memoria, Juegos y Directos.
- La mail del rapporto adesso apre dicendo com'è andata, non con una tabella. In fondo trovi le clip della serata, una per una, da riaprire. [vai: dirette]
  en: The report email now opens by saying how it went, not with a table. At the bottom you’ll find the night’s clips, one by one, ready to reopen.
  es: El correo del informe ahora empieza diciendo cómo fue, no con una tabla. Al final encuentras los clips de la noche, uno por uno, para volver a abrirlos.
- Se non hai ancora messo un indirizzo, la prima volta che entri te lo chiedo una volta sola. Dici no e non te lo chiedo più. [vai: dirette]
  en: If you haven’t added an address yet, I’ll ask you for one the first time you come in, just once. Say no and I won’t ask again.
  es: Si todavía no pusiste una dirección, te la pido la primera vez que entras, una sola vez. Dices que no y no te la vuelvo a pedir.
- Basta tenere il pannello aperto sul computer della diretta: si ricollega da solo alla regia appena lo apri, e riprova quando il programma si chiude. [vai: consolify]
  en: Just keep the panel open on your streaming computer: it reconnects to the program by itself as soon as you open it, and tries again when the program closes.
  es: Basta con tener el panel abierto en la computadora del directo: se reconecta solo al programa en cuanto lo abres, y vuelve a intentarlo cuando el programa se cierra.
- Chi trasmette su due piattaforme sceglie quali chat vanno a schermo in ogni overlay. Per tenerle divise ne fai un secondo con l'altra accesa: ha un link suo. [vai: alert]
  en: If you stream on two platforms, you choose which chats go on screen in each overlay. To keep them apart, make a second one with the other chat on: it has its own link.
  es: Quien emite en dos plataformas elige qué chats salen en pantalla en cada overlay. Para tenerlos separados, haces un segundo overlay con el otro activado: tiene su propio enlace.
- Quando due chat stanno nello stesso riquadro, ogni riga può portare un segno che dice da dove arriva. Lo accendi in «Segna da dove arriva». [vai: alert]
  en: When two chats share the same box, each line can carry a mark saying where it comes from. Turn it on in “Mark where it comes from”.
  es: Cuando dos chats están en el mismo recuadro, cada línea puede llevar una marca que dice de dónde llega. Se activa en «Marca de dónde llega».
- Togliere una chat dallo schermo non la spegne: il bot continua a leggerla e a rispondere. [vai: alert]
  en: Removing a chat from the screen doesn’t turn it off: the bot keeps reading it and replying.
  es: Quitar un chat de la pantalla no lo apaga: el bot sigue leyéndolo y respondiendo.
- Sulla pagina iniziale di SocialBot c'è una fascia con chi è in diretta adesso. Ci compari se lo accendi tu, dalla scheda Stato. [vai: stato]
  en: SocialBot’s home page has a strip showing who’s live right now. You appear there if you turn it on yourself, from the Status tab.
  es: En la portada de SocialBot hay una franja con quién está en directo ahora. Apareces si lo activas tú, desde la pestaña Estado.
- Della tua diretta si vedono nome, titolo, categoria e quanta gente ti guarda: niente dei tuoi spettatori. Spegni e sparisci. [vai: stato]
  en: From your stream, people see your name, title, category and how many are watching: nothing about your viewers. Turn it off and you disappear.
  es: De tu directo se ven el nombre, el título, la categoría y cuánta gente te mira: nada de tus espectadores. Lo apagas y desapareces.
- Alla prossima apertura del pannello te lo chiedo io, una volta sola. Rispondi no e non te lo chiedo più. [vai: stato]
  en: The next time you open the panel I’ll ask you, just once. Answer no and I won’t ask again.
  es: La próxima vez que abras el panel te lo pregunto yo, una sola vez. Respondes que no y no te lo vuelvo a preguntar.
- Arriva il subathon: il conto alla rovescia dell'overlay si allunga con sub, bit e donazioni, quanto decidi tu. Si accende dallo Studio, sotto al conto. [vai: alert]
  en: Here comes the subathon: the overlay countdown gets longer with subs, bits and donations, by as much as you decide. You turn it on from the Studio, under the countdown.
  es: Llega el subathon: la cuenta atrás del overlay se alarga con subs, bits y donaciones, lo que decidas tú. Se activa desde el Studio, debajo de la cuenta.
- Metti un tetto in ore e la fine non va mai oltre: una serata fortunata non ti porta a dormire alle sette. Con !subathon la chat sa quanto manca. [vai: alert]
  en: Set a cap in hours and the end never goes past it: a lucky night won’t keep you up until seven in the morning. With !subathon, chat knows how much is left.
  es: Pones un tope en horas y el final nunca lo supera: una noche con suerte no te lleva a dormir a las siete. Con !subathon el chat sabe cuánto falta.
- Chi rinnova l'abbonamento adesso fa scattare l'alert e conta negli obiettivi. Prima il rinnovo al bot non arrivava proprio. [vai: alert]
  en: Subscription renewals now trigger the alert and count toward goals. Before, renewals never reached the bot at all.
  es: Quien renueva la suscripción ahora hace saltar la alerta y cuenta en los objetivos. Antes la renovación ni le llegaba al bot.
- Una raffica di regali conta un sub per ogni sub, non uno in più: l'annuncio della raffica serve all'alert, non al conto. [vai: alert]
  en: A burst of gifted subs counts one sub for each sub, not one extra: the burst announcement is for the alert, not the count.
  es: Una ráfaga de regalos cuenta un sub por cada sub, no uno de más: el anuncio de la ráfaga sirve para la alerta, no para la cuenta.
- Nelle classifiche del canale non ci sei più tu: ore, monete, messaggi e serie contano chi ti guarda. Il totale dei messaggi resta intero. [vai: statistiche]
  en: You’re no longer in your own channel’s leaderboards: hours, coins, messages and streaks count the people watching you. The total message count stays whole.
  es: En las clasificaciones del canal ya no estás tú: horas, monedas, mensajes y rachas cuentan a quien te mira. El total de mensajes sigue entero.
- Gli auguri di compleanno adesso arrivano anche in chat, al primo messaggio di chi li compie. Nel gruppo restano a mezzanotte, come prima. [vai: telegram]
  en: Birthday wishes now arrive in chat too, on the first message of the person celebrating. In the group they still go out at midnight, as before.
  es: Las felicitaciones de cumpleaños ahora llegan también al chat, con el primer mensaje de quien los cumple. En el grupo siguen saliendo a medianoche, como antes.
- Chi ti guarda si segna il compleanno da solo: scrive !compleanno 25/12 e tu non devi toccare niente. Con !compleanno via lo toglie. [vai: telegram]
  en: Viewers add their own birthday: they type !compleanno 25/12 and you don’t have to touch anything. With !compleanno via they remove it.
  es: Quien te mira anota su cumpleaños solo: escribe !compleanno 25/12 y tú no tienes que tocar nada. Con !compleanno via lo quita.
- Insieme agli auguri in chat può partire un effetto della tua libreria. Lo scegli dalla scheda Telegram. [vai: telegram]
  en: Along with the birthday wishes in chat, an effect from your library can go off. You choose it from the Telegram tab.
  es: Junto con las felicitaciones en el chat puede salir un efecto de tu biblioteca. Lo eliges desde la pestaña Telegram.

## 2026-09-16

- Nella scheda «Abbonamento» aggiungi gli extra da lì: spunti quello che ti manca, leggi il totale e attivi. Chi ha già il Base non lo ripaga: l'extra entra nell'abbonamento che c'è. [vai: sottoscrizione]
  en: In the “Subscription” tab you add extras right there: check what you’re missing, read the total and activate. If you already have Base you don’t pay for it again: the extra joins your current subscription.
  es: En la pestaña «Suscripción» añades los extras desde ahí: marcas lo que te falta, lees el total y activas. Quien ya tiene el Base no lo vuelve a pagar: el extra entra en la suscripción que ya tiene.
- Se un rinnovo non va a buon fine, la scheda te lo dice e il tasto porta al portale per cambiare carta: appena il pagamento passa, le funzioni tornano da sole. [vai: sottoscrizione]
  en: If a renewal doesn’t go through, the tab tells you and the button takes you to the portal to change your card: as soon as the payment clears, the features come back by themselves.
  es: Si una renovación no sale bien, la pestaña te lo dice y el botón lleva al portal para cambiar de tarjeta: en cuanto el pago pasa, las funciones vuelven solas.
- Tornando dal pagamento, il piano risulta attivo solo quando Stripe ha confermato davvero. Se l'incasso è ancora in corso lo leggi, e il piano si accende da solo dopo. [vai: sottoscrizione]
  en: When you come back from payment, the plan shows as active only once Stripe has really confirmed it. If the charge is still going through you’ll see that, and the plan turns on by itself afterward.
  es: Al volver del pago, el plan figura activo solo cuando Stripe lo ha confirmado de verdad. Si el cobro todavía está en curso lo verás, y el plan se activa solo después.
- L'Essenziale non scade mai: chi esce dalla community o disdice un abbonamento resta con il bot acceso e perde solo le funzioni in più. [vai: sottoscrizione]
  en: Essenziale never expires: anyone who leaves the community or cancels a subscription keeps the bot running and only loses the extra features.
  es: Essenziale no caduca nunca: quien sale de la comunidad o cancela una suscripción se queda con el bot encendido y solo pierde las funciones extra.
- Le donazioni passano da SocialBot: nella scheda «Donazioni» colleghi il tuo conto Stripe, tuo e gestito da te, e chi ti segue dona dalla tua pagina link. Il pagamento arriva a te. [vai: donazioni]
  en: Donations go through SocialBot: in the “Donations” tab you connect your Stripe account, yours and managed by you, and your followers donate from your link page. The payment goes to you.
  es: Las donaciones pasan por SocialBot: en la pestaña «Donaciones» conectas tu cuenta de Stripe, tuya y gestionada por ti, y quien te sigue dona desde tu página de enlaces. El pago te llega a ti.
- Anche Satispay: colleghi il tuo negozio online con il codice di attivazione, e chi ha l'app paga da lì. Con tutti e due, chi dona sceglie. [vai: donazioni]
  en: Satispay too: you connect your online store with the activation code, and people with the app pay from there. With both, donors choose.
  es: También Satispay: conectas tu tienda en línea con el código de activación, y quien tiene la app paga desde ahí. Con los dos, quien dona elige.
- Una pagina tutta per le donazioni, su dona.socialbot.live/iltuonome (o socialbot.live/dona/iltuonome): stessi strumenti della pagina link, un'altra pagina, e il tasto «Sostieni» della pagina link può portare lì. [vai: donazioni]
  en: A page just for donations, at dona.socialbot.live/yourname (or socialbot.live/dona/yourname): the same tools as the link page, a separate page, and the link page’s “Support” button can lead there.
  es: Una página solo para las donaciones, en dona.socialbot.live/tunombre (o socialbot.live/dona/tunombre): las mismas herramientas que la página de enlaces, otra página, y el botón «Apóyame» puede llevar ahí.
- Le offerte: fino a otto scaglioni con importo, nome ed effetto della tua libreria. Chi dona le vede al posto degli importi, e all'arrivo parte l'effetto dell'offerta raggiunta. [vai: donazioni]
  en: Offers: up to eight tiers with an amount, a name and an effect from your library. Donors see them instead of the amounts, and when one comes in, the effect for the tier reached plays.
  es: Las ofertas: hasta ocho niveles con importe, nombre y efecto de tu biblioteca. Quien dona las ve en lugar de los importes, y al llegar sale el efecto de la oferta alcanzada.
- Chi dona, da un importo che decidi tu in su, può allegare un'immagine o una GIF: va in onda come un effetto, dopo che l'hai vista nel registro e l'hai mandata tu con un tasto. [vai: donazioni]
  en: Donors giving above an amount you set can attach an image or a GIF: it goes on air as an effect, after you’ve seen it in the log and sent it yourself with a button.
  es: Quien dona desde un importe que decides tú puede adjuntar una imagen o un GIF: sale al aire como un efecto, después de que lo veas en el registro y lo mandes tú con un botón.
- Se preferisci, l'immagine di chi dona parte da sola appena il pagamento è confermato: lo scegli nella scheda delle donazioni, e la puoi sempre rimandare, scartare o togliere. [vai: donazioni]
  en: If you prefer, the donor’s image plays by itself as soon as the payment is confirmed: you choose this in the donations tab, and you can always replay, discard or remove it.
  es: Si lo prefieres, la imagen de quien dona sale sola en cuanto el pago se confirma: lo eliges en la pestaña de las donaciones, y siempre puedes volver a enviarla, descartarla o quitarla.
- L'indirizzo corto dona.socialbot.live/iltuonome si accende da solo: quando lo vedi nella scheda «Donazioni» al posto di quello lungo, è pronto da condividere. [vai: donazioni]
  en: The short address dona.socialbot.live/yourname turns on by itself: when you see it in the “Donations” tab instead of the long one, it’s ready to share.
  es: La dirección corta dona.socialbot.live/tunombre se activa sola: cuando la ves en la pestaña «Donaciones» en lugar de la larga, está lista para compartir.
- Il proprietario può aprirti funzioni oltre il tuo piano, o chiuderne, quando serve: lo leggi nella scheda «Il tuo bot», con la scadenza se c'è. [vai: stato]
  en: The owner can open features beyond your plan for you, or close some, when needed: you’ll read it in the “Your bot” tab, with the expiry date if there is one.
  es: El propietario puede abrirte funciones más allá de tu plan, o cerrarlas, cuando hace falta: lo lees en la pestaña «Tu bot», con la fecha de vencimiento si la hay.
- Quando incolli la pagina link o quella delle donazioni su Telegram, WhatsApp o Discord, l'anteprima è una card coi colori della tua pagina, e la rifai come vuoi con l'editor delle locandine. [vai: pagina]
  en: When you paste your link page or donations page on Telegram, WhatsApp or Discord, the preview is a card in your page’s colors, and you can redo it however you like with the poster editor.
  es: Cuando pegas la página de enlaces o la de donaciones en Telegram, WhatsApp o Discord, la vista previa es una tarjeta con los colores de tu página, y la rehaces como quieras con el editor de carteles.
- Un blocco «Chi ha donato» per la pagina link e per la pagina delle donazioni: gli ultimi sostenitori o i primi per somma, del mese o di sempre, quanti nomi vuoi. [vai: pagina]
  en: A “Who donated” block for the link page and the donations page: the latest supporters or the top ones by total, for the month or all time, as many names as you like.
  es: Un bloque «Quién donó» para la página de enlaces y la de donaciones: los últimos que apoyaron o los primeros por suma, del mes o de siempre, tantos nombres como quieras.
- Per il tasto «Sostieni» scegli l'icona fra quelle della pagina, come per ogni link; di serie è un cuore. [vai: pagina]
  en: For the “Support” button you pick the icon from the page’s set, like for any link; by default it’s a heart.
  es: Para el botón «Apóyame» eliges el icono entre los de la página, como para cualquier enlace; por defecto es un corazón.
- Sulla pagina link il puntatore disegnato resta suo anche sul blocco delle donazioni: stella sui tasti e sugli importi, penna intorno, cursore di testo solo dove si scrive. [vai: pagina]
  en: On the link page the hand-drawn pointer stays its own on the donations block too: a star on buttons and amounts, a pen around them, a text cursor only where you type.
  es: En la página de enlaces el puntero dibujado sigue siendo el suyo también en el bloque de donaciones: estrella sobre los botones y los importes, pluma alrededor, cursor de texto solo donde se escribe.
- A ogni donazione ricevuta sul conto partono da soli l'avviso in overlay, il grazie in chat e l'obiettivo in euro. Nella scheda vedi le ultime arrivate, con nome e messaggio. [vai: donazioni]
  en: For every donation received on your account, the overlay alert, the thank-you in chat and the euro goal all go off by themselves. In the tab you see the latest ones, with name and message.
  es: Con cada donación recibida en la cuenta salen solos el aviso en el overlay, el agradecimiento en el chat y el objetivo en euros. En la pestaña ves las últimas llegadas, con nombre y mensaje.
- Il minimo e il massimo per una donazione li decidi tu nella scheda «Donazioni»: il massimo parte da 500 e può arrivare a 5.000. [vai: donazioni]
  en: You set the minimum and maximum for a donation in the “Donations” tab: the maximum starts at 500 and can go up to 5,000.
  es: El mínimo y el máximo de una donación los decides tú en la pestaña «Donaciones»: el máximo empieza en 500 y puede llegar a 5.000.
- Ogni donazione finisce nel registro della scheda «Donazioni»: totali di oggi, del mese e dell'anno, ricerca, scarico in CSV; per ogni riga puoi rimandare l'avviso, rimborsare dal tuo conto o cancellarla. [vai: donazioni]
  en: Every donation lands in the “Donations” tab log: totals for today, the month and the year, search, CSV export; for each row you can replay the alert, refund from your account or delete it.
  es: Cada donación queda en el registro de la pestaña «Donaciones»: totales de hoy, del mes y del año, búsqueda, descarga en CSV; en cada fila puedes repetir el aviso, reembolsar desde tu cuenta o borrarla.
- Le voci «Donazioni» e «CONSOLify» del menù del pannello hanno la loro icona, come tutte le altre. [vai: consolify]
  en: The “Donations” and “CONSOLify” entries in the panel menu have their own icons, like all the others.
  es: Las entradas «Donaciones» y «CONSOLify» del menú del panel tienen su icono, como todas las demás.
- Nel player puoi mettere un tuo video in loop, caricato fra gli Effetti: sfocato sullo sfondo al posto della copertina, o in chiaro sulla copertina stessa. Con i temi vinile e CD la copertina resta quella del disco. [vai: alert]
  en: In the player you can put your own looping video, uploaded in Effects: blurred in the background instead of the cover art, or sharp on the cover itself. With the vinyl and CD themes the cover stays the record’s.
  es: En el reproductor puedes poner un video tuyo en bucle, subido en Efectos: desenfocado de fondo en lugar de la portada, o nítido sobre la portada misma. Con los temas vinilo y CD la portada sigue siendo la del disco.
- Donazioni: nella scheda «Donazioni» dici come si dona (sul tuo conto, oppure Ko-fi, PayPal o altro) e il tasto «Sostieni» compare sulla tua pagina link, col tuo tema. [vai: donazioni]
  en: Donations: in the “Donations” tab you say how people can donate (to your account, or Ko-fi, PayPal or something else) and the “Support” button appears on your link page, in your theme.
  es: Donaciones: en la pestaña «Donaciones» dices cómo se dona (en tu cuenta, o Ko-fi, PayPal u otro) y el botón «Apóyame» aparece en tu página de enlaces, con tu tema.
- Con il token di Ko-fi ogni mancia accende l'avviso «Donazione» in overlay, il grazie in chat e fa salire l'obiettivo in euro, che si può mostrare anche sotto il tasto «Sostieni». [vai: alert]
  en: With your Ko-fi token, every tip fires the “Donation” alert in the overlay and the thank-you in chat, and moves the euro goal up, which can also show under the “Support” button.
  es: Con el token de Ko-fi cada propina enciende el aviso «Donación» en el overlay y el agradecimiento en el chat, y hace subir el objetivo en euros, que también se puede mostrar bajo el botón «Apóyame».
- Nel player la disposizione «libera» mette ogni pezzo dove lo trascini sulla tela: copertina, righe, barra, tempi e onde, con righe e barra larghe quanto vuoi. Si parte da dove i pezzi stanno già, e in diretta è uguale. [vai: alert]
  en: In the player, the “free” layout puts each piece where you drag it on the canvas: cover art, lines, bar, times and waves, with lines and bar as wide as you like. It starts from where they are, and live is the same.
  es: En el reproductor, la disposición «libre» pone cada pieza donde la arrastras en el lienzo: portada, líneas, barra, tiempos y ondas, con líneas y barra del ancho que quieras. Parte de donde ya están y en directo es igual.
- Gli extra Clip automatiche e Squadra costano 1,99 € al mese ciascuno, i comandi a voce 0,99 €: il listino dice quello che Stripe addebita, e i tre insieme restano 3,99 € con «Tutto». [vai: sottoscrizione]
  en: The Automatic Clips and Team extras cost €1.99 a month each, and Voice Commands €0.99: the price list says what Stripe charges, and all three together stay at €3.99 with “Everything”.
  es: Los extras Clips Automáticos y Equipo cuestan 1,99 € al mes cada uno, y Comandos por Voz 0,99 €: la lista de precios dice lo que cobra Stripe, y los tres juntos siguen costando 3,99 € con «Todo».
- Giochi e monete, alert ed effetti, sondaggi e richieste musicali con il player sono nell'Essenziale, gratis: quello che gli altri bot danno gratis, qui è gratis. [vai: sottoscrizione]
  en: Games and coins, alerts and effects, polls and song requests with the player are in Essenziale, for free: what other bots give away for free is free here too.
  es: Juegos y monedas, alertas y efectos, encuestas y peticiones musicales con el reproductor están en Essenziale, gratis: lo que los otros bots dan gratis, aquí es gratis.
- Il piano vale anche mentre il bot lavora, non solo quando salvi: clip automatiche, avvisi e ascolto a voce seguono il tuo piano, e nel pannello ogni funzione a pagamento ha il suo muro con il pacchetto giusto. [vai: sottoscrizione]
  en: The plan applies while the bot is working too, not only when you save: automatic clips, alerts and voice listening follow your plan, and in the panel every paid feature has its own wall with the right package.
  es: El plan vale también mientras el bot trabaja, no solo cuando guardas: clips automáticos, avisos y escucha por voz siguen tu plan, y en el panel cada función de pago tiene su muro con el paquete correcto.

## 2026-09-12

- Il player ha due temi nuovi, CD ed esagono, e ogni tema porta la sua animazione: il vinile gira, il CD cambia riflesso, l'anello dell'esagono ruota. Scegli il tema e basta. [vai: alert]
  en: The player has two new themes, CD and hexagon, and each theme brings its own animation: the vinyl spins, the CD shimmers, the hexagon’s ring rotates. Just pick the theme.
  es: El reproductor tiene dos temas nuevos, CD y hexágono, y cada tema trae su animación: el vinilo gira, el CD cambia de reflejo, el anillo del hexágono rota. Eliges el tema y listo.
- Ogni tema del player entra ed esce come l'oggetto vero: il vinile prende giri e poi frena e rientra nella custodia, il CD esce e la custodia si chiude, la cassetta viene espulsa. [vai: alert]
  en: Each player theme comes in and goes out like the real object: the vinyl spins up, then brakes and slides back into its sleeve, the CD pops out and the case closes, the cassette gets ejected.
  es: Cada tema del reproductor entra y sale como el objeto real: el vinilo toma vueltas, luego frena y vuelve a la funda, el CD sale y la caja se cierra, el casete se expulsa.
- Nello Studio, «Rivedi l'entrata» fa uscire e rientrare il player sulla tela, per vedere il gesto del tema senza andare in diretta. [vai: alert]
  en: In the Studio, “Replay the entrance” makes the player leave and come back on the canvas, so you can see the theme’s move without going live.
  es: En el Studio, «Repetir la entrada» hace salir y volver a entrar el reproductor en el lienzo, para ver el gesto del tema sin salir en directo.
- L'entrata del player (dissolvenza, scivola, sale) in diretta ora parte davvero: prima il nodo compariva già al suo posto. [vai: alert]
  en: The player’s entrance (fade, slide, rise) now really plays live: before, it just appeared already in place.
  es: La entrada del reproductor (fundido, deslizar, subir) ahora sí arranca en directo: antes aparecía ya en su sitio.
- Nel player messo in colonna il testo sta dentro la carta e la copertina è al centro: i tempi non escono più dal bordo. [vai: alert]
  en: In the column layout of the player the text stays inside the card and the cover art is centered: the times no longer spill over the edge.
  es: En el reproductor en columna el texto queda dentro de la tarjeta y la portada está centrada: los tiempos ya no se salen del borde.
- L'anteprima del link, quando lo incolli su Telegram, WhatsApp o X, dice la stessa cosa della pagina: il bot che in chat scrive con il tuo nome, con l'immagine rifatta.
  en: The link preview, when you paste it on Telegram, WhatsApp or X, says the same thing as the page: the bot that writes in chat under your name, with a redone image.
  es: La vista previa del enlace, cuando lo pegas en Telegram, WhatsApp o X, dice lo mismo que la página: el bot que en el chat escribe con tu nombre, con la imagen rehecha.
- La pagina pubblica racconta una serata di diretta con il bot acceso, momento per momento, al posto delle schede tutte uguali; l'elenco completo delle funzioni resta, con i prezzi accanto.
  en: The public page tells the story of a stream night with the bot on, moment by moment, instead of cards that all look the same; the full list of features is still there, with prices alongside.
  es: La página pública cuenta una noche de directo con el bot encendido, momento a momento, en lugar de tarjetas todas iguales; la lista completa de funciones sigue ahí, con los precios al lado.
- Nell'invito in fondo alla pagina pubblica ci si registra anche con Kick (e con YouTube dove è aperto), come in cima alla pagina: lì era rimasto solo Twitch.
  en: In the invite at the bottom of the public page you can sign up with Kick too (and with YouTube where it’s open), like at the top of the page: only Twitch had been left there.
  es: En la invitación al final de la página pública también te puedes registrar con Kick (y con YouTube donde está abierto), como arriba: ahí solo había quedado Twitch.
- Sotto la tela dello Studio puoi mettere un'immagine di riferimento, uno screenshot della scena o una grafica: resta nel tuo browser, non va in onda, e la regoli in trasparenza. [vai: alert]
  en: Under the Studio canvas you can place a reference image, a screenshot of the scene or a graphic: it stays in your browser, never goes on air, and you adjust its transparency.
  es: Debajo del lienzo del Studio puedes poner una imagen de referencia, una captura de la escena o una gráfica: se queda en tu navegador, no sale al aire, y ajustas su transparencia.
- Nello Studio il riquadro è la scatola dell'elemento: tiri il perimetro del player e lui prende quella forma, largo, stretto o quadrato; l'altezza dà la grandezza, la larghezza lo spazio al testo. [vai: alert]
  en: In the Studio the frame is the element’s box: drag the player’s outline and it takes that shape, wide, narrow or square; the height sets the size, the width the room for text.
  es: En el Studio el recuadro es la caja del elemento: estiras el perímetro del reproductor y toma esa forma, ancha, estrecha o cuadrada; la altura da el tamaño y la anchura el espacio para el texto.
- Mentre tiri i bordi di un riquadro vedi l'elemento cambiare in tempo reale, e la chat in anteprima riempie la sua scatola con quante righe ci stanno. [vai: alert]
  en: While you drag a frame’s edges you see the element change in real time, and the chat in the preview fills its box with as many lines as fit.
  es: Mientras estiras los bordes de un recuadro ves el elemento cambiar en tiempo real, y el chat de la vista previa llena su caja con tantas líneas como caben.
- Il player musica si regola pezzo per pezzo: spazio attorno, copertina, vinile, prima e seconda riga, tempi, barra e onde hanno ognuno la sua misura e, se vuoi, il suo colore. [vai: alert]
  en: The music player can be tuned piece by piece: padding, cover art, vinyl, first and second line, times, bar and waves each have their own size and, if you like, their own color.
  es: El reproductor de música se ajusta pieza por pieza: espacio alrededor, portada, vinilo, primera y segunda línea, tiempos, barra y ondas tienen cada uno su medida y, si quieres, su color.
- Il conto alla rovescia con «parte da solo» parte appena lo accendi, senza premere «Fai partire», e il pannello lo vede contare anche quando l'ha fatto partire una sorgente. [vai: alert]
  en: The countdown set to “starts by itself” starts as soon as you turn it on, without pressing “Start it”, and the panel sees it counting even when a source started it.
  es: La cuenta atrás con «arranca sola» arranca en cuanto la activas, sin pulsar «Ponlo en marcha», y el panel la ve contar aunque la haya iniciado una fuente.
- La sfida a tempo dei punti canale compare davvero sull'overlay (l'avvio si perdeva per strada) ed è un elemento della scena: la sposti, le dai un riquadro, e sulla carta si legge quanto manca. [vai: alert]
  en: The channel points timed challenge really shows up on the overlay (the start got lost along the way) and it’s a scene element: you move it, give it a frame, and the card shows how long is left.
  es: El desafío con tiempo de los puntos de canal aparece de verdad en el overlay (el inicio se perdía por el camino) y es un elemento de la escena: lo mueves, le das un recuadro y en la tarjeta se lee cuánto falta.
- Nell'editor degli overlay ogni elemento può avere un riquadro: tiri i bordi e chat, alert, player, widget, obiettivi e contatori si adattano a quello spazio, uguale sulla tela e in diretta. [vai: alert]
  en: In the overlay editor every element can have a frame: drag the edges and chat, alerts, player, widgets, goals and counters adapt to that space, the same on the canvas and live.
  es: En el editor de overlays cada elemento puede tener un recuadro: estiras los bordes y chat, alertas, reproductor, widgets, objetivos y contadores se adaptan a ese espacio, igual en el lienzo que en directo.

## 2026-09-11

- L'editor degli overlay chiede prima di farti perdere l'aspetto non salvato, se cambi scheda, overlay o pagina; dice quando un salvataggio non riesce; e non manda più salvataggi doppi. [vai: alert]
  en: The overlay editor asks before letting you lose an unsaved look when you switch tab, overlay or page; it tells you when a save fails; and it no longer sends duplicate saves.
  es: El editor de overlays pregunta antes de hacerte perder el aspecto sin guardar, si cambias de pestaña, de overlay o de página; avisa cuando un guardado falla; y ya no envía guardados dobles.
- Nell'editor degli overlay un livello si può bloccare perché non si sposti per sbaglio, l'aggancio alle guide si spegne, con Ctrl e rotella si ingrandisce attorno al puntatore, e la griglia si toglie davvero. [vai: alert]
  en: In the overlay editor you can lock a layer so it doesn’t move by accident, turn off snapping to guides, zoom around the pointer with Ctrl and the wheel, and really hide the grid.
  es: En el editor de overlays una capa se puede bloquear para que no se mueva sin querer, el ajuste a las guías se apaga, con Ctrl y la rueda se amplía alrededor del puntero, y la cuadrícula se quita de verdad.
- In chat il bot non parla più da assistente: niente «implementazione», «non sono in grado», «funzionalità». Se una cosa non è sua lo dice come uno della chat, e una riga di quel tipo non esce e non gli torna in mente. [vai: personalita]
  en: In chat the bot no longer talks like an assistant: no “implementation”, “I’m not able to”, “functionality”. If something isn’t its thing it says so like anyone in chat, and a line like that never goes out.
  es: En el chat el bot ya no habla como un asistente: nada de «implementación», «no estoy en condiciones», «funcionalidad». Si algo no es lo suyo lo dice como uno más del chat, y una línea así no sale.
- L'overlay in OBS si ricollega da solo dopo un riavvio del bot o un salto di rete: chat, effetti e tasti di CONSOLify ripartono senza toccare la sorgente. Quelle aperte da prima di oggi vanno ricaricate una volta. [vai: alert]
  en: The overlay in OBS reconnects by itself after a bot restart or a network drop: chat, effects and CONSOLify keys come back without touching the source. Sources opened before today need one reload.
  es: El overlay en OBS se reconecta solo tras un reinicio del bot o un corte de red: chat, efectos y teclas de CONSOLify vuelven sin tocar la fuente. Las abiertas antes de hoy hay que recargarlas una vez.
- Nell'editor degli overlay la tela ha le misure della diretta: il player tiene la stessa larghezza con ogni brano, la chat si ferma alla larghezza scelta, i contatori hanno la dimensione vera. [vai: alert]
  en: In the overlay editor the canvas has the stream’s real size: the player keeps the same width with every song, the chat stops at the chosen width, and counters have their true size.
  es: En el editor de overlays el lienzo tiene las medidas del directo: el reproductor mantiene el mismo ancho con cada canción, el chat se detiene en el ancho elegido y los contadores tienen su tamaño real.
- Quando parla da solo, il bot lo fa per un motivo e non più a caso: risponde a chi è rimasto senza risposta se sa la cosa, rilancia la chat che si ferma dopo un momento vivo, sale sull'onda quando esplode. [vai: personalita]
  en: When it speaks on its own, the bot now has a reason: it answers someone left without a reply if it knows the answer, revives a chat that stalls after a lively moment, and rides the wave when it blows up.
  es: Cuando habla solo, el bot lo hace por un motivo y ya no al azar: responde a quien se quedó sin respuesta si sabe la cosa, reanima el chat que se para tras un momento vivo y se sube a la ola cuando estalla.
- Risposte e battute di sua iniziativa escono con il tempo di una persona che scrive, mai due di fila dello stesso genere, e se hai appena scritto tu lascia la chat a te. [vai: personalita]
  en: Replies and jokes on its own initiative come out at the pace of a person typing, never two of the same kind in a row, and if you just wrote something it leaves the chat to you.
  es: Las respuestas y los chistes por iniciativa propia salen con el ritmo de una persona que escribe, nunca dos seguidos del mismo tipo, y si acabas de escribir tú te deja el chat.
- Di sua iniziativa il bot non parla più due volte in sei minuti, e il promemoria dei tuoi link esce al più ogni tre quarti d'ora: prima poteva ripeterlo a tre minuti di distanza. [vai: personalita]
  en: On its own initiative the bot no longer speaks twice in six minutes, and the reminder of your links goes out at most every forty-five minutes: before, it could repeat it three minutes apart.
  es: Por iniciativa propia el bot ya no habla dos veces en seis minutos, y el recordatorio de tus enlaces sale como mucho cada tres cuartos de hora: antes podía repetirlo a tres minutos de distancia.
- Nella scheda del bot vedi cosa ha detto da solo, con l'ora e il motivo, e puoi dirgli di farlo solo mentre sei in diretta. [vai: personalita]
  en: In the bot’s tab you see what it said on its own, with the time and the reason, and you can tell it to do so only while you’re live.
  es: En la pestaña del bot ves lo que dijo por su cuenta, con la hora y el motivo, y puedes pedirle que lo haga solo mientras estás en directo.
- La chat autonoma parte a zero, come dice il cursore: prima il cursore mostrava 3%, il manuale 5% e il bot stava a zero. [vai: personalita]
  en: Autonomous chatting starts at zero, as the slider says: before, the slider showed 3%, the manual 5% and the bot sat at zero.
  es: El chat autónomo empieza en cero, como dice el control: antes el control mostraba 3%, el manual 5% y el bot estaba en cero.
- Quando la connessione alla chat muore in silenzio il bot se ne accorge e si ricollega da solo, invece di restare acceso e muto con la spia verde. [vai: stato]
  en: When the chat connection dies silently, the bot notices and reconnects by itself, instead of staying on and mute with the green light lit.
  es: Cuando la conexión con el chat muere en silencio, el bot se da cuenta y se reconecta solo, en lugar de quedarse encendido y mudo con la luz verde.
- Se il permesso di Twitch scade, prova a rinnovarlo da solo prima di chiederti di ricollegare; e una risposta rimasta ferma durante una caduta non esce in ritardo di minuti. [vai: stato]
  en: If the Twitch permission expires, it tries to renew it by itself before asking you to reconnect; and a reply stuck during an outage doesn’t go out minutes late.
  es: Si el permiso de Twitch caduca, intenta renovarlo solo antes de pedirte que vuelvas a conectar; y una respuesta que se quedó parada durante una caída no sale con minutos de retraso.
- Gli avvisi di follow, iscrizione e diretta che Twitch rifiutava per un attimo di troppo traffico ora si riattivano da soli poco dopo. [vai: alert]
  en: Follow, sub and go-live alerts that Twitch rejected for a moment because of too much traffic now reactivate by themselves shortly after.
  es: Los avisos de follow, suscripción y directo que Twitch rechazaba por un momento de demasiado tráfico ahora se reactivan solos poco después.
- Per sicurezza il link dei tuoi overlay è stato rinnovato: copialo di nuovo dal pannello e rimettilo nelle sorgenti del programma con cui mandi in onda. [vai: alert]
  en: For security, your overlays’ link has been renewed: copy it again from the panel and put it back in the sources of the program you go live with.
  es: Por seguridad, el enlace de tus overlays se renovó: cópialo de nuevo desde el panel y vuelve a ponerlo en las fuentes del programa con el que emites.
- Il link dell'overlay ora porta la chiave con sé, e accanto c'è il tasto per farne uno nuovo: se ti scappa in un video o in una chat, lo rinnovi e il vecchio muore subito. [vai: alert]
  en: The overlay link now carries its key, and next to it there’s a button to make a new one: if it slips out in a video or a chat, you renew it and the old one dies instantly.
  es: El enlace del overlay ahora lleva la clave consigo, y al lado está el botón para crear uno nuevo: si se te escapa en un video o en un chat, lo renuevas y el viejo muere al instante.
- Un'icona caricata come disegno vettoriale viene trasformata in immagine: quello che carichi resta un'immagine e basta. [vai: consolify]
  en: An icon uploaded as a vector drawing is turned into an image: what you upload stays an image and nothing more.
  es: Un icono subido como dibujo vectorial se convierte en imagen: lo que subes sigue siendo una imagen y nada más.
- Ogni canale ha un tetto di spazio sul disco per media, effetti, font e icone, e il pannello ti dice quanto ne usi: prima nessuno lo contava. [vai: effetti]
  en: Each channel has a disk space cap for media, effects, fonts and icons, and the panel tells you how much you’re using: before, nobody was counting.
  es: Cada canal tiene un tope de espacio en disco para medios, efectos, fuentes e iconos, y el panel te dice cuánto usas: antes nadie lo contaba.
- Sulla pagina pubblica ora si vede anche CONSOLify, con il collegamento al programma della diretta: prima chi non aveva un account non sapeva che esistesse. [vai: consolify]
  en: The public page now shows CONSOLify too, with the connection to your streaming program: before, people without an account didn’t know it existed.
  es: En la página pública ahora se ve también CONSOLify, con la conexión al programa del directo: antes quien no tenía cuenta no sabía que existía.
- Compaiono in vetrina anche le grafiche pronte da pubblicare, il registro della moderazione e quello che il bot ricorda dei tuoi spettatori. [vai: grafiche]
  en: The showcase now also features ready-to-post graphics, the moderation log and what the bot remembers about your viewers.
  es: En el escaparate aparecen también las gráficas listas para publicar, el registro de moderación y lo que el bot recuerda de tus espectadores.
- Ogni novità dice anche dove è successa: le righe stanno sotto il nome della sezione, e quel nome è un bottone che ti porta lì. [vai: stato]
  en: Every update also says where it happened: the lines sit under the name of the section, and that name is a button that takes you there.
  es: Cada novedad dice también dónde pasó: las líneas están bajo el nombre de la sección, y ese nombre es un botón que te lleva ahí.
- Una carta adesso si stacca dalla pagina più dei bottoni che ci stanno dentro: prima avevano la stessa ombra e sembrava tutto appiccicato sullo stesso piano.
  en: A card now stands out from the page more than the buttons inside it: before, they had the same shadow and everything looked stuck on the same level.
  es: Una tarjeta ahora se despega de la página más que los botones que tiene dentro: antes tenían la misma sombra y todo parecía pegado en el mismo plano.
- Le scritte piccole sopra le schede e nel menù laterale erano troppo chiare per leggerle bene: ora hanno il contrasto che serve, col tema chiaro e con quello scuro.
  en: The small labels above the tabs and in the side menu were too light to read well: now they have the contrast they need, in both the light and dark themes.
  es: Los textos pequeños sobre las pestañas y en el menú lateral eran demasiado claros para leerlos bien: ahora tienen el contraste necesario, con el tema claro y con el oscuro.
- Il bottone che cancella tutto aveva la scritta bianca su rosso chiaro nel tema scuro, poco leggibile proprio dove conta: adesso è scritta in nero. [vai: stato]
  en: The button that deletes everything had white text on light red in the dark theme, hard to read right where it matters: now the text is black.
  es: El botón que lo borra todo tenía el texto blanco sobre rojo claro en el tema oscuro, poco legible justo donde importa: ahora el texto es negro.

- La finestra delle novità non perde più quello che arriva a giornata iniziata: se una cosa esce dopo che l'hai vista, te la mostra lo stesso invece di darla per letta.
  en: The What’s new window no longer misses things that arrive after the day has started: if something comes out after you’ve looked, it shows it anyway instead of marking it as read.
  es: La ventana de novedades ya no pierde lo que llega con el día empezado: si algo sale después de que la viste, te lo muestra igual en lugar de darlo por leído.
- Quando le novità sono tante, la finestra ne mostra una manciata e dice quante altre ci sono, invece di rovesciarti addosso un muro di righe.
  en: When there’s a lot of news, the window shows a handful and says how many more there are, instead of dumping a wall of lines on you.
  es: Cuando hay muchas novedades, la ventana muestra unas cuantas y dice cuántas más hay, en lugar de echarte encima un muro de líneas.

## 2026-09-10

- Con la regia collegata sul computer, i tasti scena funzionano anche premuti dal telefono o da una tastiera fisica: il pannello aperto lì fa da ponte. [vai: consolify]
  en: With the program connected on your computer, scene keys work even when pressed from your phone or a physical key pad: the panel open there acts as a bridge.
  es: Con el programa conectado en la computadora, las teclas de escena funcionan también pulsadas desde el teléfono o un teclado físico: el panel abierto allí hace de puente.
- Se nessun pannello è aperto su quel computer, il tasto te lo dice invece di rispondere «fatto». [vai: consolify]
  en: If no panel is open on that computer, the key tells you so instead of answering “done”.
  es: Si no hay ningún panel abierto en esa computadora, la tecla te lo dice en lugar de responder «hecho».
- I menù con tante voci non si schiacciano più: prima con dieci scene i nomi venivano tagliati a metà, ora la lista scorre. [vai: consolify]
  en: Menus with lots of items no longer get squashed: before, with ten scenes the names were cut in half, and now the list scrolls.
  es: Los menús con muchas opciones ya no se aprietan: antes, con diez escenas los nombres se cortaban por la mitad, y ahora la lista se desplaza.
- I menù a tendina del pannello sono disegnati come il resto del sito, tutti: prima solo uno lo era e gli altri uscivano col grigio del sistema.
  en: All the panel’s dropdown menus are drawn like the rest of the site: before, only one was, and the others came out in the system’s gray.
  es: Todos los menús desplegables del panel están dibujados como el resto del sitio: antes solo uno lo estaba y los demás salían con el gris del sistema.
- Un tasto si crea da un posto libero: nasce vuoto e si apre la sua scheda, dove costruisci quello che vuoi. Non devi più scegliere un'azione da una tendina prima di poter fare niente. [vai: consolify]
  en: You create a key from an empty slot: it starts blank and its card opens, where you build whatever you want. You no longer have to pick an action from a dropdown before doing anything.
  es: Una tecla se crea desde un hueco libre: nace vacía y se abre su ficha, donde construyes lo que quieras. Ya no hace falta elegir una acción de un desplegable antes de poder hacer nada.
- Nella scheda ci sono idee pronte (manda un link, manda un suono, cambia scena, vado in pausa) che sono un punto di partenza: poi cambi tutto. [vai: consolify]
  en: The card has ready-made ideas (send a link, play a sound, switch scene, going on a break) as a starting point: then you change everything.
  es: En la ficha hay ideas listas (enviar un enlace, enviar un sonido, cambiar de escena, me voy a pausa) que son un punto de partida: luego lo cambias todo.
- Collegata la regia, ti do io scene, fonti e transizioni: nei tasti le scegli da un elenco invece di ricopiare i nomi a mano. [vai: consolify]
  en: Once the program is connected, I give you the scenes, sources and transitions: in keys you pick them from a list instead of copying the names by hand.
  es: Con el programa conectado, te doy yo escenas, fuentes y transiciones: en las teclas las eliges de una lista en lugar de copiar los nombres a mano.
- Le schede aperte si aggiornano appena il collegamento va a buon fine, invece di restare come prima. [vai: consolify]
  en: Open cards update as soon as the connection goes through, instead of staying as they were.
  es: Las fichas abiertas se actualizan en cuanto la conexión funciona, en lugar de quedarse como antes.
- Collegare il programma con cui mandi in onda è un clic: indirizzo e porta non te li chiedo, li provo io. Se lì l'autenticazione è spenta, hai finito lì. [vai: consolify]
  en: Connecting the program you go live with takes one click: I don’t ask for the address and port, I try them myself. If authentication is off there, you’re done.
  es: Conectar el programa con el que emites es un clic: la dirección y el puerto no te los pido, los pruebo yo. Si ahí la autenticación está apagada, ya terminaste.
- Se invece chiede una password, te lo dico e compare un campo solo per quella. Dalla volta dopo mi collego da solo quando apri la scheda. [vai: consolify]
  en: If it asks for a password, I tell you, and a field appears just for that. From then on I connect by myself when you open the tab.
  es: Si en cambio pide una contraseña, te lo digo y aparece un campo solo para eso. Desde la vez siguiente me conecto solo cuando abres la pestaña.
- Puoi collegare il programma con cui mandi in onda: compaiono le tue scene, le cambi da qui, e i tasti possono cambiare scena o mutare una fonte dentro una fila di passi. [vai: consolify]
  en: You can connect the program you go live with: your scenes show up, you switch them from here, and keys can switch scene or mute a source within a series of steps.
  es: Puedes conectar el programa con el que emites: aparecen tus escenas, las cambias desde aquí, y las teclas pueden cambiar de escena o silenciar una fuente dentro de una serie de pasos.
- Indirizzo e password di quel collegamento restano nel tuo browser: non arrivano al nostro server e non entrano nel database. Con «Scorda tutto» spariscono anche da lì. [vai: consolify]
  en: The address and password for that connection stay in your browser: they don’t reach our server and never go into the database. “Forget it all” removes them from there too.
  es: La dirección y la contraseña de esa conexión se quedan en tu navegador: no llegan a nuestro servidor ni entran en la base de datos. Con «Olvidar todo» desaparecen también de ahí.
- Funziona sul computer dove gira quel programma. Dal telefono i tasti del bot vanno come sempre, ma le scene no, e la scheda te lo dice prima. [vai: consolify]
  en: It works on the computer where that program runs. From your phone the bot’s keys work as always, but scenes don’t, and the tab tells you beforehand.
  es: Funciona en la computadora donde corre ese programa. Desde el teléfono las teclas del bot van como siempre, pero las escenas no, y la pestaña te lo dice antes.
- Un tasto può mandare in onda un'immagine, un video o un suono caricati lì sul tasto: non devi più farne prima un effetto con un suo comando in un'altra scheda. [vai: consolify]
  en: A key can put an image, a video or a sound on air, uploaded right there on the key: you no longer have to turn it into an effect with its own command in another tab first.
  es: Una tecla puede sacar al aire una imagen, un video o un sonido subidos ahí mismo en la tecla: ya no hace falta convertirlos antes en un efecto con su comando en otra pestaña.
- Durata e volume di quel media si cambiano dal tasto, e quando lo sostituisci il file vecchio se ne va invece di restare sul disco per sempre. [vai: consolify]
  en: That media’s duration and volume are changed from the key, and when you replace it the old file goes away instead of staying on the disk forever.
  es: La duración y el volumen de ese medio se cambian desde la tecla, y cuando lo reemplazas el archivo viejo se va en lugar de quedarse en el disco para siempre.
- Un tasto di CONSOLify può fare più cose di seguito, non una sola: dire una frase, aspettare, lanciare un effetto, mandare il risultato di un comando, nell'ordine che scegli tu. [vai: consolify]
  en: A CONSOLify key can do several things in a row, not just one: say a line, wait, fire an effect, send a command’s result, in the order you choose.
  es: Una tecla de CONSOLify puede hacer varias cosas seguidas, no una sola: decir una frase, esperar, lanzar un efecto, enviar el resultado de un comando, en el orden que elijas.
- I passi si aggiungono, si spostano e si tolgono dalla scheda del tasto, e se uno non riesce gli altri succedono lo stesso. [vai: consolify]
  en: Steps are added, moved and removed from the key’s card, and if one fails the others still happen.
  es: Los pasos se añaden, se mueven y se quitan desde la ficha de la tecla, y si uno falla los demás se ejecutan igual.
- I tasti che avevi già continuano a funzionare: diventano una fila di un passo solo, senza che tu debba rifarli. [vai: consolify]
  en: The keys you already had keep working: they become a one-step series, without you having to redo them.
  es: Las teclas que ya tenías siguen funcionando: se vuelven una serie de un solo paso, sin que tengas que rehacerlas.
- I tasti di CONSOLify creati prima di oggi ripartono: alcuni non avevano un indirizzo valido e premerli non faceva niente, ora si sistemano da soli alla prima apertura. [vai: consolify]
  en: CONSOLify keys created before today work again: some didn’t have a valid address and pressing them did nothing, and now they fix themselves the first time you open them.
  es: Las teclas de CONSOLify creadas antes de hoy vuelven a funcionar: algunas no tenían una dirección válida y pulsarlas no hacía nada, y ahora se arreglan solas al abrirlas por primera vez.
- Il conto alla rovescia può partire da solo quando si apre l'overlay: metti su la scena d'attesa e il conto è già andato, senza premere niente. [vai: alert]
  en: The countdown can start by itself when the overlay opens: put up the waiting scene and the countdown is already running, without pressing anything.
  es: La cuenta atrás puede arrancar sola cuando se abre el overlay: pones la escena de espera y la cuenta ya está en marcha, sin pulsar nada.
- Quello che metti su CONSOLify arriva a tutti i tuoi overlay: premi e parte, senza collegare niente a mano. [vai: consolify]
  en: Whatever you put on CONSOLify reaches all your overlays: press it and it goes, without connecting anything by hand.
  es: Lo que pones en CONSOLify llega a todos tus overlays: pulsas y sale, sin conectar nada a mano.
- Ogni overlay può rifiutare i tasti per conto suo, dall'elenco degli elementi, senza rifiutare anche gli effetti che gli arrivano dalla chat. [vai: effetti]
  en: Each overlay can refuse keys on its own, from the list of elements, without also refusing the effects that come from chat.
  es: Cada overlay puede rechazar las teclas por su cuenta, desde la lista de elementos, sin rechazar también los efectos que le llegan desde el chat.
- Premere un tasto di CONSOLify senza nessun overlay collegato non dice più «fatto»: l'effetto non avrebbe dove andare, e adesso te lo dice invece di farti credere che sia partito. [vai: consolify]
  en: Pressing a CONSOLify key with no overlay connected no longer says “done”: the effect would have nowhere to go, and now it tells you instead of making you think it went out.
  es: Pulsar una tecla de CONSOLify sin ningún overlay conectado ya no dice «hecho»: el efecto no tendría adónde ir, y ahora te lo dice en lugar de hacerte creer que salió.
- In cima alla plancia c'è una spia che dice se un overlay è collegato, così lo sai prima di premere e non dopo. [vai: consolify]
  en: At the top of the board there’s a light that shows whether an overlay is connected, so you know before pressing, not after.
  es: Arriba del tablero hay un indicador que dice si hay un overlay conectado, así lo sabes antes de pulsar y no después.
- I video degli effetti vanno fino in fondo: prima li chiudeva un tempo memorizzato, e se quel tempo era sbagliato il video spariva dopo un fotogramma senza mai partire. [vai: effetti]
  en: Effect videos play all the way through: before, a stored duration cut them off, and if that duration was wrong the video vanished after one frame without ever starting.
  es: Los videos de los efectos llegan hasta el final: antes los cerraba un tiempo guardado, y si ese tiempo estaba mal el video desaparecía tras un fotograma sin llegar a arrancar.
- Se il browser non dà il permesso di partire con l'audio, il video parte muto invece di restare fermo, e negli errori trovi scritto che è successo. [vai: effetti]
  en: If the browser won’t allow it to start with sound, the video starts muted instead of staying frozen, and the errors tell you it happened.
  es: Si el navegador no da permiso para arrancar con sonido, el video arranca en silencio en lugar de quedarse quieto, y en los errores queda escrito que pasó.
- Quando un overlay non riesce a far partire un suono o un video, ora lo dice invece di restare zitto: il motivo lo trovi fra gli errori, con scritto cosa non è andato. [vai: effetti]
  en: When an overlay can’t play a sound or a video, it now says so instead of staying silent: you’ll find the reason among the errors, with what went wrong.
  es: Cuando un overlay no logra reproducir un sonido o un video, ahora lo dice en lugar de callarse: el motivo lo encuentras entre los errores, con lo que no funcionó.
- I tasti di CONSOLify hanno il tratto disegnato del resto del sito, e si distinguono sia col tema chiaro sia con quello scuro; i posti liberi si vedono che sono posti, non tasti spenti. [vai: consolify]
  en: CONSOLify keys have the same hand-drawn stroke as the rest of the site and stand out in both the light and dark themes; empty slots look like slots, not switched-off keys.
  es: Las teclas de CONSOLify tienen el trazo dibujado del resto del sitio y se distinguen tanto con el tema claro como con el oscuro; los huecos libres se ven como huecos, no como teclas apagadas.
- La plancia vuota non è più una frase: i posti liberi si vedono, e sotto c'è scritto come riempirli, con il consiglio giusto a seconda che tu stia sistemando i tasti o usandoli. [vai: consolify]
  en: An empty board is no longer just a sentence: the empty slots are visible, and below them it says how to fill them, with the right tip depending on whether you’re arranging keys or using them.
  es: El tablero vacío ya no es una frase: los huecos libres se ven, y debajo dice cómo llenarlos, con el consejo adecuado según estés ordenando las teclas o usándolas.
- Ogni tasto di CONSOLify ha il suo indirizzo, e punta al tasto invece che all'azione: se domani a quel tasto cambi mestiere, nome o icona, sulla tastiera fisica non rifai niente. [vai: consolify]
  en: Each CONSOLify key has its own address, pointing at the key rather than the action: if you later change that key’s job, name or icon, you redo nothing on the physical key pad.
  es: Cada tecla de CONSOLify tiene su dirección, y apunta a la tecla y no a la acción: si mañana a esa tecla le cambias la función, el nombre o el icono, en el teclado físico no rehaces nada.
- Scegli il formato della plancia (da 3×3 a 5×8) e quanto stanno grandi i tasti: parti da una griglia vera invece che da un foglio bianco, e i posti liberi si vedono. [vai: consolify]
  en: Choose the board size (from 3×3 to 5×8) and how big the keys are: you start from a real grid instead of a blank sheet, and the empty slots are visible.
  es: Elige el formato del tablero (de 3×3 a 5×8) y qué tan grandes son las teclas: partes de una cuadrícula real en lugar de una hoja en blanco, y los huecos libres se ven.
- Sul telefono la plancia si apre di lato: in verticale i tasti sarebbero francobolli, e te lo dice invece di darteli schiacciati. [vai: consolify]
  en: On phones the board opens sideways: upright, the keys would be postage stamps, and it tells you so instead of handing them to you squashed.
  es: En el teléfono el tablero se abre de lado: en vertical las teclas serían sellos, y te lo dice en lugar de dártelas aplastadas.
- Quello che scrivi nella scheda di un tasto si salva da sé quando esci dal campo: non c'è più un «Salva» da ricordarsi, e non si perde niente scegliendo un colore.
  en: What you type in a key’s card saves itself when you leave the field: there’s no “Save” to remember anymore, and nothing gets lost when you pick a color.
  es: Lo que escribes en la ficha de una tecla se guarda solo cuando sales del campo: ya no hay un «Guardar» que recordar, y no se pierde nada al elegir un color.
- Rigenerare la chiave degli indirizzi si fa dal pannello e chiede conferma: i vecchi indirizzi smettono di funzionare subito.
  en: Regenerating the address key is done from the panel and asks for confirmation: the old addresses stop working right away.
  es: Regenerar la clave de las direcciones se hace desde el panel y pide confirmación: las direcciones viejas dejan de funcionar al instante.
- Quando entri dopo un aggiornamento una finestra si apre in mezzo allo schermo e ti dice cosa è cambiato; se ti sei perso qualche giorno, li trovi tutti in elenco.
  en: When you come in after an update, a window opens in the middle of the screen and tells you what changed; if you missed a few days, you’ll find them all in a list.
  es: Cuando entras después de una actualización, se abre una ventana en medio de la pantalla que te cuenta qué cambió; si te perdiste algunos días, los encuentras todos en una lista.
- I tasti di CONSOLify si personalizzano in tutto: nome, colore libero, conferma prima di premere, e l'icona la scegli da un elenco disegnato oppure carichi la tua immagine.
  en: CONSOLify keys can be customized in every way: name, any color, a confirmation before pressing, and an icon picked from a drawn set or your own uploaded image.
  es: Las teclas de CONSOLify se personalizan en todo: nombre, color libre, confirmación antes de pulsar, y el icono lo eliges de una lista dibujada o subes tu propia imagen.
- L'immagine che carichi ha un suo indirizzo, così la stessa faccia la puoi mettere anche sul tasto di una tastiera fisica.
  en: The image you upload gets its own address, so you can put the same face on a physical key pad’s key too.
  es: La imagen que subes tiene su propia dirección, así la misma cara la puedes poner también en la tecla de un teclado físico.
- I tasti si trascinano per ordinarli, si duplicano e si spostano fra le pagine.
  en: Keys can be dragged to reorder them, duplicated and moved between pages.
  es: Las teclas se arrastran para ordenarlas, se duplican y se mueven entre páginas.
- La chiave degli indirizzi ora sta coperta: quella scheda si apre mentre streami, e prima si leggeva a schermo.
  en: The address key is now hidden: that card is open while you stream, and before, it could be read on screen.
  es: La clave de las direcciones ahora está tapada: esa ficha se abre mientras emites, y antes se leía en pantalla.
- Nuova sezione CONSOLify: i tasti del tuo canale sotto le dita mentre streami (contatori, effetti, una battuta, una frase) sul telefono, sul tablet o su un secondo monitor.
  en: New CONSOLify section: your channel’s keys under your fingers while you stream (counters, effects, a joke, a line) on your phone, tablet or a second monitor.
  es: Nueva sección CONSOLify: las teclas de tu canal bajo los dedos mientras emites (contadores, efectos, un chiste, una frase) en el teléfono, la tablet o un segundo monitor.
- I tasti nascono da soli dai tuoi contatori e dai tuoi effetti, e ognuno mostra com'è andata: premi e leggi il numero nuovo.
  en: Keys are created automatically from your counters and your effects, and each one shows how it went: press it and read the new number.
  es: Las teclas nacen solas de tus contadores y tus efectos, y cada una muestra cómo fue: pulsas y lees el número nuevo.
- Gli stessi tasti li puoi mettere su una tastiera fisica: la scheda ti dà l'indirizzo già pronto da incollare, e icona e nome li scegli lì.
  en: You can put the same keys on a physical key pad: the card gives you the address ready to paste, and you pick the icon and name there.
  es: Las mismas teclas las puedes poner en un teclado físico: la ficha te da la dirección lista para pegar, y el icono y el nombre los eliges ahí.
- Quando il serbatoio delle battute è vuoto, il bot ne costruisce una con i numeri del tuo canale (morti, tentativi, quello che conti tu) invece di chiederne una generica.
  en: When the joke jar is empty, the bot builds one with your channel’s numbers (deaths, attempts, whatever you count) instead of asking for a generic one.
  es: Cuando el depósito de chistes está vacío, el bot arma uno con los números de tu canal (muertes, intentos, lo que cuentes tú) en lugar de pedir uno genérico.
- E impara quale modo di costruirle fa ridere lì: dopo averla detta conta chi ride davvero, e la volta dopo usa il modo che ha funzionato.
  en: It learns which way of building them gets laughs there: after telling one it counts who really laughs, and next time it uses the approach that worked.
  es: Aprende además qué forma de armarlos hace reír ahí: después de contarlo cuenta quién se ríe de verdad, y la vez siguiente usa la forma que funcionó.

## 2026-09-08

- Se la domanda tocca qualcosa che il cervello sa costruire (un calcolo, una deduzione, una catena di cause), risponde lui, e la risposta resta imparata.
  en: If the question touches something the brain knows how to build (a calculation, a deduction, a chain of causes), the brain answers, and the answer stays learned.
  es: Si la pregunta toca algo que el cerebro sabe construir (un cálculo, una deducción, una cadena de causas), responde él, y la respuesta queda aprendida.
- Il conto in chat arriva comunque: se il cervello è spento lo fa il bot, e chi guarda non vede differenza.
  en: The math reaches the chat either way: if the brain is off, the bot does it, and viewers see no difference.
  es: La cuenta llega al chat de todos modos: si el cerebro está apagado la hace el bot, y quien mira no nota la diferencia.

- Se il pannello non riesce a contattare il server, la pagina dice di chi è il software invece di mostrare solo un errore.
  en: If the panel can’t reach the server, the page says who the software belongs to instead of just showing an error.
  es: Si el panel no logra contactar con el servidor, la página dice de quién es el software en lugar de mostrar solo un error.

- Il menù per scegliere l'overlay non è più quello grigio del sistema: è disegnato come il resto del pannello, e si usa anche con la sola tastiera.
  en: The menu for picking the overlay is no longer the system’s gray one: it’s drawn like the rest of the panel, and it works with the keyboard alone too.
  es: El menú para elegir el overlay ya no es el gris del sistema: está dibujado como el resto del panel, y se usa también solo con el teclado.
- Sul telefono resta quello del sistema, perché lì la ruota è più comoda di qualunque cosa possiamo disegnare.
  en: On phones the system one stays, because there the wheel is handier than anything we could draw.
  es: En el teléfono se queda el del sistema, porque ahí la rueda es más cómoda que cualquier cosa que podamos dibujar.

- Il bot pensa una cosa per volta. Prima più richieste insieme si dimezzavano il processore a vicenda e finivano tutte fuori tempo: nessuna risposta usciva.
  en: The bot thinks about one thing at a time. Before, several requests at once halved each other’s processor time and all timed out: no answer came out.
  es: El bot piensa una cosa a la vez. Antes varias peticiones juntas se partían el procesador y acababan todas fuera de tiempo: no salía ninguna respuesta.
- Mentre qualcuno sta parlando, il bot smette di studiare per conto suo. La domanda di una persona viene prima del suo rimuginare.
  en: While someone is talking, the bot stops studying on its own. A person’s question comes before its musing.
  es: Mientras alguien está hablando, el bot deja de estudiar por su cuenta. La pregunta de una persona va antes que sus cavilaciones.

- L'interruttore delle battute automatiche si spegne da solo se la chat autonoma è spenta, e dice perché: prima si poteva accendere senza che cambiasse niente.
  en: The automatic jokes switch turns itself off if autonomous chatting is off, and says why: before, you could turn it on and nothing changed.
  es: El interruptor de los chistes automáticos se apaga solo si el chat autónomo está apagado, y dice por qué: antes se podía activar sin que cambiara nada.

- Le ricette e le domande da enciclopedia funzionano davvero: prima la ricerca non partiva mai e il bot ripiegava su «insegnamela dalla dashboard».
  en: Recipes and encyclopedia questions really work: before, the search never started and the bot fell back on “teach it to me from the dashboard”.
  es: Las recetas y las preguntas de enciclopedia funcionan de verdad: antes la búsqueda nunca arrancaba y el bot recurría a «enséñamela desde el panel».
- Il comando delle battute si può rinominare e spegnere dal pannello come tutti gli altri, e ha una sua voce fra le famiglie.
  en: The jokes command can be renamed and turned off from the panel like all the others, and it has its own entry among the families.
  es: El comando de los chistes se puede renombrar y apagar desde el panel como todos los demás, y tiene su propia entrada entre las familias.

- Se chiami il bot per nome ti risponde sempre. Prima, dopo una risposta restava muto per quarantacinque secondi anche a chi lo chiamava: sembrava morto.
  en: If you call the bot by name it always answers. Before, after one reply it went silent for forty-five seconds even for people calling it: it seemed dead.
  es: Si llamas al bot por su nombre te responde siempre. Antes, después de una respuesta se quedaba mudo cuarenta y cinco segundos incluso con quien lo llamaba: parecía muerto.
- Ogni tanto dice una battuta da solo, se lasci accesa la chat autonoma. Si spegne dalla scheda Giochi.
  en: Every now and then it tells a joke on its own, if you leave autonomous chatting on. You turn it off from the Games tab.
  es: De vez en cuando cuenta un chiste por su cuenta, si dejas activado el chat autónomo. Se apaga desde la pestaña Juegos.
- Le battute che fanno ridere escono più spesso: dopo ognuna il bot conta quante persone diverse ridono davvero.
  en: Jokes that get laughs come out more often: after each one, the bot counts how many different people actually laugh.
  es: Los chistes que hacen reír salen más a menudo: después de cada uno, el bot cuenta cuántas personas distintas se ríen de verdad.
- Le battute si gestiscono anche dalla dashboard, con quante volte sono state dette e quante hanno funzionato.
  en: Jokes can be managed from the dashboard too, with how many times each was told and how many times it worked.
  es: Los chistes también se gestionan desde el panel, con cuántas veces se contaron y cuántas funcionaron.
- Quello che il bot trova cercando se lo scrive. La stessa domanda, la seconda volta, ha risposta immediata.
  en: Whatever the bot finds by searching, it writes down. The same question the second time gets an instant answer.
  es: Lo que el bot encuentra buscando lo anota. La misma pregunta, la segunda vez, tiene respuesta inmediata.

- Nuovo comando !battuta. Il bot pesca dal serbatoio del canale, e mod e streamer lo riempiono con !battuta aggiungi.
  en: New !battuta command. The bot draws from the channel’s joke jar, and mods and the streamer fill it with !battuta aggiungi.
  es: Nuevo comando !battuta. El bot saca del depósito de chistes del canal, y los mods y el streamer lo llenan con !battuta aggiungi.
- Non ripete: esce sempre la meno detta di recente, non una a caso.
  en: It doesn’t repeat itself: it always picks the one told least recently, not a random one.
  es: No se repite: sale siempre el que menos se ha contado últimamente, no uno al azar.
- Se il serbatoio è vuoto se ne fa venire una dal cervello, con il carattere del canale addosso.
  en: If the jar is empty, it gets one from the brain, with the channel’s personality on it.
  es: Si el depósito está vacío, pide uno al cerebro, con el carácter del canal encima.
- Le ricette funzionano anche chiedendole come si chiedono davvero: «Bot mi dai la ricetta della carbonara?», non solo «ricetta carbonara».
  en: Recipes also work when you ask for them the way people really ask: “Bot mi dai la ricetta della carbonara?”, not just “ricetta carbonara”.
  es: Las recetas funcionan también pidiéndolas como se piden de verdad: «Bot mi dai la ricetta della carbonara?», no solo «ricetta carbonara».

- Il bot risponde alle domande cercando davvero. Prima restituiva l'introduzione di Wikipedia: a «capitale della Francia» rispondeva quanto è grande la Francia.
  en: The bot answers questions by really searching. Before, it returned the Wikipedia introduction: asked for the “capitale della Francia”, it answered with how big France is.
  es: El bot responde a las preguntas buscando de verdad. Antes devolvía la introducción de Wikipedia: a «capitale della Francia» respondía cuánto mide Francia.
- Le ricette arrivano dal ricettario, non dall'enciclopedia: ingredienti e una riga di preparazione, non la storia del piatto.
  en: Recipes come from the cookbook, not the encyclopedia: ingredients and a line of method, not the history of the dish.
  es: Las recetas llegan del recetario, no de la enciclopedia: ingredientes y una línea de preparación, no la historia del plato.
- Quello che trova lo dice con parole sue, nel tono che gli hai dato. Prima il testo trovato usciva grezzo, e solo quando il modello era spento.
  en: It says what it finds in its own words, in the tone you gave it. Before, the text it found came out raw, and only when the model was off.
  es: Lo que encuentra lo dice con sus propias palabras, en el tono que le diste. Antes el texto encontrado salía en bruto, y solo cuando el modelo estaba apagado.
- Nuovo campo Carattere in Personalità: scrivi con parole tue com'è fatto il bot, e vale ovunque parli.
  en: New Character field in Personality: describe the bot in your own words, and it applies everywhere it speaks.
  es: Nuevo campo Carácter en Personalidad: escribe con tus palabras cómo es el bot, y vale en todas partes donde habla.
- Se non trova niente che c'entri con la domanda, tace invece di rispondere a caso.
  en: If it finds nothing related to the question, it stays quiet instead of answering at random.
  es: Si no encuentra nada que tenga que ver con la pregunta, se calla en lugar de responder al azar.

- Il bot fa i conti: «quanto fa 4+4», «7 x 8», «20% di 90», anche con le parentesi. Il risultato lo calcola, non lo indovina, quindi è sempre giusto.
  en: The bot does math: “quanto fa 4+4”, “7 x 8”, “20% di 90”, even with parentheses. It calculates the result instead of guessing it, so it’s always right.
  es: El bot hace cuentas: «quanto fa 4+4», «7 x 8», «20% di 90», incluso con paréntesis. El resultado lo calcula, no lo adivina, así que siempre es correcto.
- Quando un numero è ambiguo tace invece di rischiare: «1.000» in italiano è mille, ma scritto in chat può essere uno virgola zero, e non c'è modo di saperlo.
  en: When a number is ambiguous it stays quiet instead of taking a chance: “1.000” in Italian is a thousand, but typed in chat it could be one point zero, and there’s no way to know.
  es: Cuando un número es ambiguo se calla en lugar de arriesgarse: «1.000» en italiano es mil, pero escrito en el chat puede ser uno coma cero, y no hay forma de saberlo.
- Se il messaggio non è un conto non risponde. Nessuna risposta a «ho 2 gatti e 3 cani».
  en: If the message isn’t a calculation, it doesn’t answer. No reply to “ho 2 gatti e 3 cani”.
  es: Si el mensaje no es una cuenta, no responde. Ninguna respuesta a «ho 2 gatti e 3 cani».

- Scegli come il bot parla di sé: femminile, maschile, o senza dirlo. Sta in Personalità, sotto il tono.
  en: Choose how the bot refers to itself: feminine, masculine, or without saying. It’s in Personality, under the tone.
  es: Elige cómo habla el bot de sí mismo: en femenino, en masculino o sin decirlo. Está en Personalidad, debajo del tono.
- Prima cambiava a ogni frase. Le battute scritte a mano erano tutte al maschile («sono apparso»), e il resto lo decideva lui volta per volta.
  en: Before, it switched with every sentence. The handwritten jokes were all masculine in Italian (“sono apparso”), and it decided the rest case by case.
  es: Antes cambiaba en cada frase. Los chistes escritos a mano estaban todos en masculino («sono apparso»), y el resto lo decidía él cada vez.
- Chi non sceglie niente non rischia: il bot gira la frase e non dichiara nessun genere, invece di darsene uno a caso.
  en: If you don’t choose, there’s no risk: the bot phrases things so it doesn’t state any gender, instead of picking one at random.
  es: Si no eliges nada no hay riesgo: el bot da la vuelta a la frase y no declara ningún género, en lugar de darse uno al azar.

- Puoi sfidare a duello lo streamer. Il bot parla con il suo account e non vede i propri messaggi, quindi lui risultava sempre «non in chat» anche mentre stava scrivendo.
  en: You can challenge the streamer to a duel. The bot speaks with the streamer’s account and doesn’t see its own messages, so the streamer always showed up as “not in chat” even while typing.
  es: Puedes retar a duelo al streamer. El bot habla con su cuenta y no ve sus propios mensajes, así que el streamer siempre aparecía «no en el chat» aunque estuviera escribiendo.
- Si può sfidare anche chi c'è e sta zitto. Prima contava solo chi aveva parlato negli ultimi trenta minuti, e metà della chat era invisibile.
  en: You can also challenge people who are there but quiet. Before, only those who had spoken in the last thirty minutes counted, and half the chat was invisible.
  es: También se puede retar a quien está pero no escribe. Antes solo contaba quien había hablado en los últimos treinta minutos, y medio chat era invisible.

- La scheda del giro guidato non sporge più dal bordo dello schermo mentre compare. Entrava salendo di quattordici pixel, e quando si appoggiava in fondo quei pixel la portavano fuori.
  en: The guided tour card no longer sticks out past the edge of the screen as it appears. It came in rising by fourteen pixels, and when it rested at the bottom those pixels pushed it out.
  es: La tarjeta del recorrido guiado ya no sobresale del borde de la pantalla al aparecer. Entraba subiendo catorce píxeles, y cuando se apoyaba abajo esos píxeles la sacaban.

- Sulla pagina link, un avatar con l'indirizzo rotto mostra l'iniziale invece dell'icona di immagine spezzata. Il ripiego c'era da tempo, ma il browser lo rifiutava e non era mai partito.
  en: On the link page, an avatar with a broken address shows the initial instead of the broken-image icon. The fallback had been there for a while, but the browser rejected it and it never kicked in.
  es: En la página de enlaces, un avatar con la dirección rota muestra la inicial en lugar del icono de imagen rota. El respaldo existía desde hacía tiempo, pero el navegador lo rechazaba y nunca se activó.

- Il tasto sotto il mouse lo segue senza scattare. Prima il movimento ripartiva da capo a ogni spostamento del puntatore e non arrivava mai a destinazione.
  en: The button under the mouse follows it without jerking. Before, the motion restarted with every pointer move and never reached its destination.
  es: El botón bajo el mouse lo sigue sin saltos. Antes el movimiento volvía a empezar con cada desplazamiento del puntero y nunca llegaba a destino.
- I tasti si sollevano davvero quando ci passi sopra: si staccano dalla pagina invece di spostarsi di un pixel, e restano davanti a quello che hanno intorno.
  en: Buttons really lift up when you hover over them: they come off the page instead of shifting by a pixel, and stay in front of what’s around them.
  es: Los botones se levantan de verdad cuando pasas por encima: se despegan de la página en lugar de moverse un píxel, y quedan delante de lo que los rodea.
- L'ombra dei tasti non viene più tagliata dal bordo della scheda che li contiene. Su Safari era tagliata sempre, perché quel browser non conosce il permesso di sfogo.
  en: Button shadows are no longer clipped by the edge of the card that holds them. On Safari they were always clipped, because that browser doesn’t support the overflow permission.
  es: La sombra de los botones ya no la recorta el borde de la tarjeta que los contiene. En Safari se recortaba siempre, porque ese navegador no conoce el permiso de desborde.
- Chi tiene acceso il movimento ridotto vede la profondità senza il movimento: l'ombra cresce lo stesso, il tasto non si sposta.
  en: People with reduced motion turned on see the depth without the motion: the shadow still grows, the button doesn’t move.
  es: Quien tiene activado el movimiento reducido ve la profundidad sin el movimiento: la sombra crece igual, el botón no se mueve.

- Il giro guidato non finisce più mezzo fuori dallo schermo. Su sette schede, sei avevano almeno un passo con la scheda dei suggerimenti tagliata dal bordo.
  en: The guided tour no longer ends up half off the screen. Out of seven tabs, six had at least one step with the tips card cut off by the edge.
  es: El recorrido guiado ya no queda medio fuera de la pantalla. De siete pestañas, seis tenían al menos un paso con la tarjeta de ayuda cortada por el borde.
- L'ultimo passo, quello che dice dove trovare il manuale, si piantava dove stava il passo prima. Adesso sta in mezzo, e in mezzo davvero.
  en: The last step, the one that says where to find the manual, got stuck where the previous step had been. Now it sits in the middle, truly in the middle.
  es: El último paso, el que dice dónde encontrar el manual, se quedaba clavado donde estaba el paso anterior. Ahora está en el centro, en el centro de verdad.
- Quando il passo indica qualcosa che sta più in basso nella pagina, il riquadro aspetta di stare dentro la finestra invece di seguirlo fuori.
  en: When a step points to something further down the page, the box waits to be inside the window instead of following it out.
  es: Cuando el paso señala algo que está más abajo en la página, el recuadro espera a estar dentro de la ventana en lugar de seguirlo fuera.
- Nella demo un link diretto a una scheda porta dove dice. Prima si atterrava sempre sulla prima.
  en: In the demo, a direct link to a tab takes you where it says. Before, you always landed on the first one.
  es: En la demo, un enlace directo a una pestaña lleva adonde dice. Antes siempre se aterrizaba en la primera.

- La pagina della moderazione è divisa in tre: Chat per i filtri sui messaggi, Scudo per la difesa dagli attacchi, Registro per quello che è successo.
  en: The moderation page is split into three: Chat for message filters, Shield for defending against attacks, Log for what happened.
  es: La página de moderación está dividida en tres: Chat para los filtros de mensajes, Escudo para la defensa contra los ataques y Registro para lo que pasó.
- Lo stato dello scudo sta dove si accende: acceso o spento, il livello di adesso, quanti follow servono per far scattare l'allarme.
  en: The shield’s status sits where you turn it on: on or off, the current level, how many follows it takes to trigger the alarm.
  es: El estado del escudo está donde se activa: encendido o apagado, el nivel actual y cuántos follows hacen falta para que salte la alarma.
- Le due liste «blocca sempre» e «non toccare mai» stavano in due posti e si cancellavano a vicenda: un nome aggiunto di qua spariva salvando di là. Ora stanno in un posto solo e si salvano da sole.
  en: The “Always block” and “Never touch” lists lived in two places and wiped each other out: a name added on one side vanished when saving on the other. Now they’re in one place and save themselves.
  es: Las listas «Bloquear siempre» y «Nunca tocar» estaban en dos lugares y se borraban entre sí: un nombre añadido en uno desaparecía al guardar en el otro. Ahora están en un solo lugar y se guardan solas.
- Sola osservazione, quanto presto reagire e la segnalazione di chi guarda molti canali: le tre caselle c'erano, il salvataggio le buttava via. Adesso restano.
  en: Observe only, how early to react and flagging people who watch many channels: the three boxes were there, but saving threw them away. Now they stick.
  es: Solo observar, qué tan pronto reaccionar y la señalización de quien mira muchos canales: las tres casillas estaban, pero al guardar se perdían. Ahora se quedan.
- Un salvataggio parziale non azzera più il resto. Soglia, timeout ed età minima restavano indietro a ogni «Salva» senza dirlo.
  en: A partial save no longer resets everything else. Threshold, timeout and minimum age were silently rolled back with every “Save”.
  es: Un guardado parcial ya no pone a cero el resto. Umbral, timeout y antigüedad mínima se quedaban atrás en cada «Guardar» sin avisar.
- Nel registro ogni attacco è una scheda che si apre: chi c'era diviso per giudizio, e la pulizia dei follower finti con il numero da riscrivere per confermare.
  en: In the log, each attack is a card that opens: who was there, sorted by verdict, and the fake-follower cleanup with the number to type back to confirm.
  es: En el registro cada ataque es una ficha que se abre: quién estaba, dividido por veredicto, y la limpieza de seguidores falsos con el número que hay que volver a escribir para confirmar.
- Le azioni che non erano riuscite adesso si vedono, e si riprendono da lì.
  en: Actions that had failed are now visible, and can be resumed from there.
  es: Las acciones que habían fallado ahora se ven, y se retoman desde ahí.

- Chi scrive nel tuo canale da mesi non finisce più nel mucchio durante un'ondata di follow finti, nemmeno con un nome che somiglia a quelli dei bot.
  en: People who have been chatting in your channel for months no longer get lumped in during a wave of fake follows, even with a name that looks like a bot’s.
  es: Quien escribe en tu canal desde hace meses ya no acaba en el montón durante una oleada de follows falsos, ni siquiera con un nombre parecido al de los bots.
- Per essere di casa servono una trentina di messaggi e un paio di mesi. Il volume da solo non basta: quattrocento righe in un'ora sono un motivo di sospetto.
  en: Being a regular takes about thirty messages and a couple of months. Volume alone isn’t enough: four hundred lines in one hour is a reason for suspicion.
  es: Para ser de la casa hacen falta unos treinta mensajes y un par de meses. El volumen solo no basta: cuatrocientas líneas en una hora son motivo de sospecha.
- Pesano anche i precedenti. Un account che lo scudo ha già fermato lì da poco parte in salita, e questo vale solo nel canale dove è successo.
  en: Track record counts too. An account the shield recently stopped there starts uphill, and that only applies in the channel where it happened.
  es: También pesan los antecedentes. Una cuenta que el escudo ya frenó ahí hace poco empieza cuesta arriba, y eso vale solo en el canal donde pasó.
- Un giudizio vecchio conta meno di uno nuovo: ogni novanta giorni vale la metà, dopo un anno non ne resta praticamente niente.
  en: An old verdict counts less than a new one: every ninety days it’s worth half, and after a year there’s practically nothing left of it.
  es: Un veredicto viejo cuenta menos que uno nuevo: cada noventa días vale la mitad, y después de un año prácticamente no queda nada.
- Essere stati lasciati stare durante un attacco non lascia alcuna traccia.
  en: Having been left alone during an attack leaves no trace at all.
  es: Haber sido dejado en paz durante un ataque no deja ningún rastro.
- La fiducia sposta il punteggio, in bene e in male, ma da sola non fa mai togliere nessuno: per agire serve sempre un fatto indipendente.
  en: Trust shifts the score, for better and for worse, but on its own it never gets anyone removed: acting always takes an independent fact.
  es: La confianza mueve la puntuación, para bien y para mal, pero por sí sola nunca hace quitar a nadie: para actuar siempre hace falta un hecho independiente.

## 2026-09-07

- Il bot risponde agganciando la risposta al messaggio di chi gli ha scritto, come fa una persona col tasto «rispondi». Vale su Twitch e su Kick.
  en: The bot answers by attaching its reply to the message of whoever wrote to it, the way a person uses the “reply” button. It works on Twitch and on Kick.
  es: El bot responde enganchando la respuesta al mensaje de quien le escribió, como hace una persona con el botón «responder». Vale en Twitch y en Kick.
- Prima di rispondere aspetta un momento, come chi legge e scrive. Adesso quel momento segue il ritmo della chat: se vola risponde subito, se è calma si prende il suo tempo.
  en: Before answering it waits a moment, like someone reading and typing. That moment now follows the pace of the chat: if it’s flying it answers right away, if it’s calm it takes its time.
  es: Antes de responder espera un momento, como quien lee y escribe. Ahora ese momento sigue el ritmo del chat: si va volando responde enseguida, si está tranquilo se toma su tiempo.
- Vede se chi gli scrive è moderatore, abbonato o VIP, e se è la prima volta che scrive da te. Non cambia cosa risponde, cambia il modo: a un nuovo arrivato non dà per scontate le cose del canale.
  en: It sees whether the person writing is a mod, a subscriber or a VIP, and whether it’s their first time in your chat. It changes how it answers, not what: with a newcomer it doesn’t take channel things for granted.
  es: Ve si quien le escribe es moderador, suscriptor o VIP, y si es la primera vez que escribe en tu canal. No cambia qué responde, cambia el modo: a quien llega nuevo no le da por sabidas las cosas del canal.
- Quando parla di sua iniziativa si aggancia a quello che vi state dicendo. L'elenco di frasi fatte non c'è più, e cadeva sempre in mezzo a discorsi che non c'entravano.
  en: When it speaks up on its own, it picks up on what you’re all talking about. The list of stock phrases is gone, and it always landed in the middle of unrelated conversations.
  es: Cuando habla por iniciativa propia se engancha a lo que están diciendo. La lista de frases hechas ya no existe, y siempre caía en medio de conversaciones que no tenían nada que ver.
- Se non ha niente di suo da dire, sta zitto.
  en: If it has nothing of its own to say, it stays quiet.
  es: Si no tiene nada propio que decir, se calla.
- Lo scudo anti-bot adesso ha sei livelli e sale un gradino alla volta. Prima guarda, poi avvisa i moderatori, poi rallenta la chat, e solo alla fine la chiude ai soli follower.
  en: The anti-bot shield now has six levels and goes up one step at a time. First it watches, then it warns the mods, then it slows the chat, and only at the end does it close it to followers only.
  es: El escudo anti-bot ahora tiene seis niveles y sube un escalón a la vez. Primero observa, luego avisa a los moderadores, luego frena el chat y solo al final lo cierra a solo seguidores.
- Una clip andata bene non fa più chiudere la chat. Tanti follow di cui non si sa niente alzano l'attenzione, non la serranda.
  en: A clip that did well no longer gets the chat closed. Lots of follows from unknown accounts raise attention, not the shutters.
  es: Un clip que funcionó bien ya no hace cerrar el chat. Muchos follows de los que no se sabe nada suben la atención, no la persiana.
- Quando l'attacco passa si scende un gradino per volta, riaprendo subito quello che non serve più.
  en: When the attack passes it steps down one level at a time, reopening right away whatever is no longer needed.
  es: Cuando el ataque pasa se baja un escalón a la vez, reabriendo enseguida lo que ya no hace falta.
- Puoi scegliere quanto presto reagire: prudente, bilanciata o aggressiva.
  en: You can choose how early it reacts: cautious, balanced or aggressive.
  es: Puedes elegir qué tan pronto reacciona: prudente, equilibrada o agresiva.
- Davanti a un'ondata di follow finti il bot riconosce quali nomi vengono dalla stessa fabbrica e toglie solo quelli. Chi era capitato lì in mezzo resta dov'è.
  en: Faced with a wave of fake follows, the bot recognizes which names come from the same factory and removes only those. Anyone who happened to be caught in the middle stays put.
  es: Ante una oleada de follows falsos, el bot reconoce qué nombres vienen de la misma fábrica y quita solo esos. Quien había caído ahí en medio se queda donde está.
- Se non riconosce nessun gruppo non se lo inventa, e tratta l'ondata come una cosa sola.
  en: If it doesn’t recognize any group, it doesn’t make one up, and it treats the wave as a single thing.
  es: Si no reconoce ningún grupo no se lo inventa, y trata la oleada como una sola cosa.
- Vengono fermati anche i follow finti che arrivano piano piano, uno ogni pochi secondi per dieci minuti. Passavano indisturbati.
  en: Fake follows that trickle in slowly, one every few seconds for ten minutes, are stopped too. They used to get through untouched.
  es: También se frenan los follows falsos que llegan despacio, uno cada pocos segundos durante diez minutos. Pasaban sin que nadie los tocara.
- Un'ondata così veloce da arrivare tutta insieme adesso si vede. Era proprio quella che scappava.
  en: A wave so fast that it arrives all at once can now be seen. That was exactly the one that slipped through.
  es: Una oleada tan rápida que llega toda junta ahora se ve. Era justamente la que se escapaba.
- Per dire che un'ondata è finta il bot aspetta di aver visto quindici follow. Con sei, un picco vero su dodici finiva scambiato per finto.
  en: To call a wave fake, the bot waits until it has seen fifteen follows. With six, one real spike in twelve was mistaken for fake.
  es: Para decir que una oleada es falsa, el bot espera a haber visto quince follows. Con seis, un pico real de cada doce se tomaba por falso.
- Convincendosi a metà ondata riprende anche i follow arrivati prima, invece di partire da quel momento.
  en: When it makes up its mind halfway through a wave, it also goes back to the follows that came before, instead of starting from that moment.
  es: Cuando se convence a mitad de la oleada, recupera también los follows llegados antes, en lugar de empezar desde ese momento.
- Il ritmo del tuo canale non si impara più da due minuti di attacco. Perché conti servono ore.
  en: Your channel’s rhythm is no longer learned from two minutes of an attack. For it to count, it takes hours.
  es: El ritmo de tu canal ya no se aprende de dos minutos de ataque. Para que cuente hacen falta horas.
- Un raid vero in cui trecento persone salutano con la stessa frase non viene più scambiato per un attacco.
  en: A real raid where three hundred people say hi with the same phrase is no longer mistaken for an attack.
  es: Un raid de verdad en el que trescientas personas saludan con la misma frase ya no se toma por un ataque.
- Una chat che ripete una frase corta tutti insieme nemmeno. Servono trenta caratteri e cinque parole, non quattordici caratteri.
  en: The same goes for a chat all repeating a short phrase together. It takes thirty characters and five words, not fourteen characters.
  es: Tampoco un chat que repite a coro una frase corta. Hacen falta treinta caracteres y cinco palabras, no catorce caracteres.
- Il rilevamento dello stesso messaggio da tanti account resta acceso anche spegnendo l'elenco dei nomi da bot.
  en: Detection of the same message from many accounts stays on even if you turn off the list of bot names.
  es: La detección del mismo mensaje desde muchas cuentas sigue activa aunque apagues la lista de nombres de bots.
- Gli attacchi si misurano sull'ora in cui sono successi, non su quella in cui arrivano al bot.
  en: Attacks are measured by the time they happened, not the time they reach the bot.
  es: Los ataques se miden por la hora en que ocurrieron, no por la hora en que le llegan al bot.
- Ogni attacco diventa una scheda sola invece di trecento righe di registro: quando è cominciato, quanto è durato, quanto forte è andato, chi c'era, cosa ha fatto il bot.
  en: Each attack becomes a single card instead of three hundred log lines: when it started, how long it lasted, how hard it hit, who was there, what the bot did.
  es: Cada ataque se vuelve una sola ficha en lugar de trescientas líneas de registro: cuándo empezó, cuánto duró, qué tan fuerte fue, quién estaba y qué hizo el bot.
- Un attacco che riprende dopo pochi minuti resta lo stesso attacco, e il conto dei danni non si spezza in dieci pezzi.
  en: An attack that resumes after a few minutes is still the same attack, and the damage count doesn’t break into ten pieces.
  es: Un ataque que se reanuda a los pocos minutos sigue siendo el mismo ataque, y la cuenta de daños no se parte en diez trozos.
- Nella scheda chi è arrivato durante l'attacco è diviso fra bot certi, sospetti e persone vere.
  en: On the card, whoever arrived during the attack is split into certain bots, suspects and real people.
  es: En la ficha, quien llegó durante el ataque está dividido entre bots seguros, sospechosos y personas reales.
- Finito l'attacco puoi ripulire i follower finti partendo da quella divisione. Le persone vere restano fuori, e per eseguire devi riscrivere quanti account stai per togliere.
  en: Once the attack is over you can clean out the fake followers starting from that split. Real people are left out, and to go ahead you have to type how many accounts you’re about to remove.
  es: Terminado el ataque puedes limpiar los seguidores falsos a partir de esa división. Las personas reales quedan fuera, y para ejecutar tienes que volver a escribir cuántas cuentas vas a quitar.
- Se il bot si riavvia mentre un attacco è in corso, la scheda si chiude e resta.
  en: If the bot restarts while an attack is under way, the card closes and stays.
  es: Si el bot se reinicia mientras hay un ataque en curso, la ficha se cierra y se conserva.
- C'è la sola osservazione: lo scudo lavora e scrive cosa avrebbe fatto, senza bannare, bloccare o cancellare niente. Serve per vedere come si comporta prima di lasciarlo agire.
  en: There’s an observe-only mode: the shield works and writes down what it would have done, without banning, blocking or deleting anything. Use it to see how it behaves before letting it act.
  es: Existe el modo solo observar: el escudo trabaja y anota lo que habría hecho, sin banear, bloquear ni borrar nada. Sirve para ver cómo se comporta antes de dejarlo actuar.
- Un'azione che non riesce non si perde. Resta in sospeso e la fai riprovare dalla console.
  en: An action that fails isn’t lost. It stays pending and you can retry it from the console.
  es: Una acción que falla no se pierde. Queda pendiente y la puedes reintentar desde la consola.
- Nel registro c'è anche cosa ha risposto Twitch, non solo se è andata.
  en: The log also shows what Twitch answered, not just whether it worked.
  es: En el registro está también lo que respondió Twitch, no solo si salió bien.
- Nella console trovi quanto ha sbagliato: chi era stato segnalato e poi ha scritto in chat era una persona.
  en: In the console you see how often it got it wrong: someone who was flagged and then wrote in chat was a person.
  es: En la consola ves cuánto se equivocó: quien había sido señalado y luego escribió en el chat era una persona.
- Lo stesso evento che arriva due volte non fa bannare due volte.
  en: The same event arriving twice doesn’t cause two bans.
  es: El mismo evento que llega dos veces no hace banear dos veces.
- La cancellazione di un messaggio di spam passa avanti alla pulizia dei follower finti, che può aspettare.
  en: Deleting a spam message now goes ahead of cleaning out fake followers, which can wait.
  es: Borrar un mensaje de spam ahora pasa por delante de la limpieza de seguidores falsos, que puede esperar.
- I canali che usano il bot si scambiano quello che scoprono. Un account bloccato durante un'ondata da una parte diventa noto anche agli altri, e la lista cresce da sola.
  en: Channels using the bot share what they discover. An account blocked during a wave in one place becomes known to the others too, and the list grows by itself.
  es: Los canales que usan el bot comparten lo que descubren. Una cuenta bloqueada durante una oleada en un lado pasa a ser conocida también por los demás, y la lista crece sola.
- Perché un nome entri in quella lista servono tre canali che lo riconoscano ciascuno per conto suo, e solo per cose misurate sul momento.
  en: For a name to get onto that list, three channels have to recognize it independently, and only for things measured at the time.
  es: Para que un nombre entre en esa lista hacen falta tres canales que lo reconozcan cada uno por su cuenta, y solo por cosas medidas en el momento.
- Un nome nella lista comune scade dopo tre mesi e si può togliere subito.
  en: A name on the shared list expires after three months and can be removed right away.
  es: Un nombre en la lista común caduca a los tres meses y se puede quitar enseguida.
- Lo scudo riconosce anche i bot che guardano e basta. Un account presente in molti canali nello stesso momento, che non scrive mai, viene segnalato: decidi tu.
  en: The shield also recognizes bots that only watch. An account present in many channels at the same moment that never writes gets flagged: you decide.
  es: El escudo reconoce también los bots que solo miran. Una cuenta presente en muchos canales al mismo tiempo, que nunca escribe, queda señalada: decides tú.
- Il giudizio su un account non somma più tre volte la stessa cosa. Un nuovo spettatore senza foto né bio prendeva lo stesso punteggio di un follow-bot vero.
  en: The verdict on an account no longer adds up the same thing three times. A new viewer with no photo or bio got the same score as a real follow-bot.
  es: El juicio sobre una cuenta ya no suma tres veces lo mismo. Un espectador nuevo sin foto ni bio sacaba la misma puntuación que un follow-bot de verdad.
- Per togliere il follow serve sempre un fatto che una persona non può produrre: il nome riconosciuto, o la presenza in molti canali. Il resto fa solo segnalare.
  en: Removing a follow always takes a fact a person can’t produce: a recognized name, or presence in many channels. Anything else only raises a flag.
  es: Para quitar el follow siempre hace falta un hecho que una persona no puede producir: el nombre reconocido o la presencia en muchos canales. Lo demás solo hace señalar.
- Se Twitch non risponde mentre lo scudo controlla l'età di un account, riprova al messaggio dopo.
  en: If Twitch doesn’t answer while the shield is checking an account’s age, it tries again on the next message.
  es: Si Twitch no responde mientras el escudo comprueba la antigüedad de una cuenta, lo reintenta en el mensaje siguiente.
- Il filtro dei link guarda il dominio del link, non il testo intorno. Bastava nominare da qualche parte un sito permesso e il filtro si spegneva.
  en: The link filter looks at the link’s domain, not the text around it. Mentioning an allowed site anywhere was enough to switch the filter off.
  es: El filtro de enlaces mira el dominio del enlace, no el texto de alrededor. Bastaba con nombrar en algún lado un sitio permitido para que el filtro se apagara.
- I messaggi normali scritti col punto attaccato, tipo «lascia stare.io ci provo», non vengono più cancellati. Su quindici frasi di chat vere ne finivano cancellate dieci.
  en: Normal messages typed with a period stuck to the next word, like “lascia stare.io ci provo”, are no longer deleted. Out of fifteen real chat lines, ten ended up deleted.
  es: Los mensajes normales escritos con el punto pegado, como «lascia stare.io ci provo», ya no se borran. De quince frases de chat reales se borraban diez.
- Una parola vietata resta vietata anche scritta con un accento.
  en: A banned word stays banned even when written with an accent.
  es: Una palabra prohibida sigue prohibida aunque se escriba con tilde.
- Nel pannello sei scritte avevano l'apostrofo al posto dell'accento, e adesso sono scritte come si deve.
  en: Six Italian labels in the panel had an apostrophe instead of an accent, and now they’re written properly.
  es: En el panel, seis textos en italiano tenían el apóstrofo en lugar del acento, y ahora están bien escritos.
- Quando la cancellazione è finita te lo dice una nuvoletta disegnata come il resto del sito, invece della finestrella grigia del browser.
  en: When the deletion is done, a bubble drawn like the rest of the site tells you, instead of the browser’s little gray window.
  es: Cuando el borrado termina te lo dice un globo dibujado como el resto del sitio, en lugar de la ventanita gris del navegador.
- Nella finestra di ricerca il Tab non esce più dietro al velo, Escape chiude da qualunque punto e chiudendo il cursore torna dove eri. Prima girava nella pagina sotto, che non si vede.
  en: In the search window, Tab no longer escapes behind the overlay, Escape closes it from anywhere, and on closing the cursor goes back where you were. Before, it wandered into the hidden page underneath.
  es: En la ventana de búsqueda, Tab ya no se escapa detrás del velo, Escape cierra desde cualquier punto y al cerrar el cursor vuelve adonde estabas. Antes daba vueltas por la página de abajo, que no se ve.
- Il bot legge e risponde nella chat delle tue dirette YouTube, con gli stessi comandi, moduli e monete di Twitch. Si accende da Stato → Le tue piattaforme.
  en: The bot reads and answers in the chat of your YouTube streams, with the same commands, modules and coins as on Twitch. Turn it on from Status → Your platforms.
  es: El bot lee y responde en el chat de tus directos de YouTube, con los mismos comandos, módulos y monedas que en Twitch. Se activa desde Estado → Tus plataformas.
- Nella sezione Andarsene si vede cosa c'è da cancellare scritto a parole (messaggi ricordati, citazioni, comandi) invece dei nomi interni del database.
  en: In the Leaving section, what there is to delete is spelled out in words (remembered messages, quotes, commands) instead of the database’s internal names.
  es: En la sección Marcharse se ve lo que hay que borrar escrito con palabras (mensajes recordados, citas, comandos) en lugar de los nombres internos de la base de datos.
- Da Stato → Andarsene puoi cancellare l'account e tutto quello che contiene, file caricati e collegamenti compresi. Non si annulla: per confermare va scritto il nome del canale.
  en: From Status → Leaving you can delete your account and everything in it, uploaded files and connections included. It can’t be undone: to confirm, you type the channel name.
  es: Desde Estado → Marcharse puedes borrar la cuenta y todo lo que contiene, archivos subidos y conexiones incluidos. No se deshace: para confirmar hay que escribir el nombre del canal.
- Se il bot si riavvia mentre un giveaway è aperto, chi era entrato resta in gara coi suoi biglietti. Prima sparivano tutti, e con loro il giveaway.
  en: If the bot restarts while a giveaway is open, everyone who entered stays in with their tickets. Before, they all vanished, and the giveaway with them.
  es: Si el bot se reinicia mientras hay un sorteo abierto, quien había entrado sigue participando con sus boletos. Antes desaparecían todos, y con ellos el sorteo.
- Anche una penitenza in corso riprende da dov'era, contatore compreso, invece di spegnersi a metà.
  en: A forfeit in progress also picks up where it left off, counter included, instead of switching off halfway.
  es: También una penitencia en curso sigue desde donde estaba, contador incluido, en lugar de apagarse a la mitad.
- Se lo scudo aveva chiuso la chat ai soli follower e il bot si riavviava, la chat restava chiusa e nessuno la riapriva. Adesso si riapre da sola al ritorno.
  en: If the shield had closed chat to followers only and the bot restarted, chat stayed closed and nobody reopened it. Now it reopens by itself when the bot comes back.
  es: Si el escudo había cerrado el chat a solo seguidores y el bot se reiniciaba, el chat se quedaba cerrado y nadie lo volvía a abrir. Ahora se reabre solo al volver.
- La ricerca trova quello che c'è scritto dentro le schede (campi, sezioni, pieghevoli, bottoni) e non solo i nomi delle schede. Cliccando ti porta sulla cosa e te la segna, aprendo da sola quello che la nascondeva.
  en: Search finds what’s written inside the tabs (fields, sections, collapsibles, buttons), not just the tab names. Clicking takes you to the thing and highlights it, opening whatever was hiding it.
  es: La búsqueda encuentra lo que está escrito dentro de las pestañas (campos, secciones, plegables, botones) y no solo sus nombres. Al hacer clic te lleva a la cosa y la marca, abriendo lo que la ocultaba.
- Dalla ricerca si arriva anche a Scudo anti-bot, Comandi vocali, Conoscenza, Penitenze, Musica e Clip: prima quelle sei sezioni non uscivano mai.
  en: Search now also reaches Anti-bot shield, Voice commands, Knowledge, Forfeits, Music and Clips: before, those six sections never came up.
  es: Desde la búsqueda se llega también a Escudo anti-bot, Comandos de voz, Conocimiento, Penitencias, Música y Clips: antes esas seis secciones no salían nunca.
- I moduli a tempo parlano solo mentre sei in diretta: prima riempivano la chat vuota tutta la notte. Dentro al modulo c'è l'interruttore per farli parlare anche a canale spento.
  en: Timed modules only talk while you’re live: before, they filled the empty chat all night. Inside the module there’s a switch to make them talk while the channel is offline too.
  es: Los módulos con temporizador solo hablan mientras estás en directo: antes llenaban el chat vacío toda la noche. Dentro del módulo está el interruptor para que hablen también con el canal apagado.
- Dopo un riavvio del bot i timer non partono più tutti insieme, perché l'ora dell'ultimo giro adesso resta salvata. E quelli che scadono nello stesso minuto escono in fila, non in un colpo.
  en: After a bot restart, timers no longer all fire at once, because the time of the last round is now saved. Timers due in the same minute go out one after another, not in one burst.
  es: Tras un reinicio del bot los temporizadores ya no salen todos juntos, porque la hora de la última vuelta ahora queda guardada. Los que vencen en el mismo minuto salen en fila, no de golpe.
- Un modulo a tempo appena creato aspetta il suo primo giro prima di parlare, invece di partire subito.
  en: A newly created timed module waits for its first round before talking, instead of starting right away.
  es: Un módulo con temporizador recién creado espera su primera vuelta antes de hablar, en lugar de arrancar enseguida.
- Ogni campo del pannello ha un nome che il lettore di schermo legge: prima 395 caselle su 916 restavano mute. Riguarda i cursori del tema, i pannelli dello Studio, gli avvisi, i compleanni e i premi.
  en: Every field in the panel has a name that screen readers read out: before, 395 fields out of 916 were silent. This covers the theme sliders, Studio panels, alerts, birthdays and prizes.
  es: Cada campo del panel tiene un nombre que lee el lector de pantalla: antes 395 casillas de 916 estaban mudas. Afecta a los controles del tema, los paneles del Studio, los avisos, los cumpleaños y los premios.
- Sui temi pronti della pagina link la nuvoletta ripeteva il nome scritto sotto al bottone, e ora non c'è più.
  en: On the link page’s ready-made themes, the tooltip repeated the name written under the button, and now it’s gone.
  es: En los temas listos de la página de enlaces, el globo repetía el nombre escrito debajo del botón, y ahora ya no está.

## 2026-09-06

- Nella locandina live compare la foto anche degli streamer che hai aggiunto tu alle notifiche: prima restava un cerchio vuoto.
  en: The live poster now shows the photo of streamers you added to notifications yourself too: before, it stayed an empty circle.
  es: El cartel del directo ahora muestra también la foto de los streamers que añadiste tú a las notificaciones: antes quedaba un círculo vacío.
- Le emote nel titolo non diventano più quadratini: vengono tolte, perché nel disegno della locandina non si possono scrivere.
  en: Emotes in the title no longer turn into little squares: they’re removed, because they can’t be written into the poster’s drawing.
  es: Los emotes del título ya no se convierten en cuadraditos: se quitan, porque en el dibujo del cartel no se pueden escribir.

- Le guide hanno lo stesso aspetto del resto: carta, contorno a inchiostro e titoli scritti a mano. Prima sembravano di un altro sito.
  en: Guides look like everything else: paper, ink outline and handwritten titles. Before, they looked like they came from another site.
  es: Las guías tienen el mismo aspecto que el resto: papel, contorno de tinta y títulos escritos a mano. Antes parecían de otro sitio.

- Due guide nuove: una su Kick, che spiega cosa cambia rispetto a Twitch e perché, e una su come moderare la chat senza cacciare le persone vere.
  en: Two new guides: one on Kick, explaining what changes compared with Twitch and why, and one on moderating chat without kicking out real people.
  es: Dos guías nuevas: una sobre Kick, que explica qué cambia respecto a Twitch y por qué, y otra sobre cómo moderar el chat sin echar a personas reales.

- Il link corto dell'overlay e la tela del tracking non finiscono più fra le pagine che Google visita: non sono pagine, girano dentro OBS.
  en: The overlay’s short link and the tracking canvas no longer end up among the pages Google visits: they aren’t pages, they run inside OBS.
  es: El enlace corto del overlay y el lienzo del tracking ya no acaban entre las páginas que visita Google: no son páginas, funcionan dentro de OBS.

- La barra dell'Overlay Studio ha le nuvolette: cosa cambia fra un overlay e l'altro, perché il link è nascosto, e cosa succede davvero a OBS se rinomini o elimini.
  en: The Overlay Studio bar has tooltips: what differs from one overlay to another, why the link is hidden, and what really happens in OBS if you rename or delete one.
  es: La barra de Overlay Studio tiene globos de ayuda: qué cambia entre un overlay y otro, por qué el enlace está oculto y qué pasa de verdad en OBS si lo renombras o lo eliminas.

- Cambiare sezione è uno stacco pulito: la pagina vecchia esce, la nuova entra dal lato da cui sei arrivato.
  en: Switching sections is a clean cut: the old page leaves, and the new one comes in from the side you came from.
  es: Cambiar de sección es un corte limpio: la página vieja sale y la nueva entra por el lado del que llegaste.
- Muoversi dentro la stessa sezione è più corto: niente lampo, i riquadri rientrano uno dopo l'altro nell'ordine in cui si leggono.
  en: Moving within the same section is shorter: no flash, the boxes come back in one after another, in reading order.
  es: Moverse dentro de la misma sección es más corto: sin destello, los recuadros vuelven a entrar uno tras otro en el orden en que se leen.
- Su un computer poco potente lo stacco non spariva più: la modalità leggera serve al carico, non al movimento.
  en: On a low-powered computer the transition no longer disappears: light mode is about load, not about motion.
  es: En una computadora poco potente la transición ya no desaparece: el modo ligero sirve para la carga, no para el movimiento.

- La pagina «non c'è niente qui» e quella di manutenzione sono diventate una vignetta, col numero 404 nell'angolo come in un fumetto.
  en: The “nothing here” page and the maintenance page are now comic panels, with the number 404 in the corner like in a comic book.
  es: La página de «aquí no hay nada» y la de mantenimiento ahora son viñetas, con el número 404 en la esquina como en un cómic.
- Nove riquadri del sito non avevano il contorno: la lente della ricerca, i campi per scegliere un file e altri. Ora ce l'hanno.
  en: Nine boxes on the site had no outline: the search magnifier, the file pickers and others. Now they do.
  es: Nueve recuadros del sitio no tenían contorno: la lupa de la búsqueda, los campos para elegir un archivo y otros. Ahora lo tienen.
- Sulle pagine di servizio i puntini del retino passavano sopra al testo e lo rendevano quasi illeggibile. Ora stanno sotto.
  en: On service pages the halftone dots ran over the text and made it almost unreadable. Now they sit underneath.
  es: En las páginas de servicio los puntos de la trama pasaban por encima del texto y lo hacían casi ilegible. Ahora quedan debajo.

- Le guide «Come funziona», le legende e i riquadri richiudibili hanno lo stesso aspetto degli altri: carta, contorno a inchiostro e titolo scritto a mano.
  en: The “How it works” guides, the legends and the collapsible boxes look like the others: paper, ink outline and a handwritten title.
  es: Las guías «Cómo funciona», las leyendas y los recuadros plegables tienen el mismo aspecto que los demás: papel, contorno de tinta y título escrito a mano.
- Otto riquadri che si aprono non mostravano nessuna freccia: sembravano testo normale. Ora ce l'hanno tutti.
  en: Eight boxes that open showed no arrow at all: they looked like plain text. Now they all have one.
  es: Ocho recuadros que se abren no mostraban ninguna flecha: parecían texto normal. Ahora la tienen todos.

- Sulle nuvolette corte la coda non sbanda più sull'angolo: resta attaccata al fondo, anche quando la bolla è larga quanto una parola.
  en: On short tooltips the tail no longer skids onto the corner: it stays attached to the bottom, even when the bubble is as wide as a single word.
  es: En los globos cortos la cola ya no se desvía hacia la esquina: sigue pegada al fondo, incluso cuando el globo es tan ancho como una palabra.
- Non supera più mezza bolla di lunghezza. Prima su una parola sola arrivava a due terzi e sembrava appesa a un filo.
  en: It’s never longer than half the bubble now. Before, on a single word it reached two thirds and looked like it was hanging by a thread.
  es: Ya no pasa de la mitad del globo. Antes, en una sola palabra llegaba a dos tercios y parecía colgada de un hilo.
- Le sezioni ancora vuote non sono più un buco bianco: sono un riquadro col retino, che dice cosa ci comparirà.
  en: Sections that are still empty are no longer a white hole: they’re a box with halftone that says what will show up there.
  es: Las secciones todavía vacías ya no son un hueco blanco: son un recuadro con trama que dice qué aparecerá ahí.

- La riga che apre ogni scheda adesso è una didascalia: un riquadro con la barra d'inchiostro e l'angolo piegato, come nei fumetti. Chi parla ha la bolla, chi racconta ha il riquadro.
  en: The line that opens each tab is now a caption: a box with an ink bar and a folded corner, like in comics. Whoever speaks gets a bubble, whoever narrates gets a box.
  es: La línea que abre cada pestaña ahora es un texto de apoyo: un recuadro con la barra de tinta y la esquina doblada, como en los cómics. Quien habla tiene globo, quien narra tiene recuadro.
- Le nuvolette corte non sono più grandi come quelle lunghe: la coda si accorcia insieme alla bolla.
  en: Short tooltips are no longer as big as long ones: the tail gets shorter along with the bubble.
  es: Los globos cortos ya no son tan grandes como los largos: la cola se acorta junto con el globo.

- Le nuvolette sono disegnate: corpo e coda sono una forma sola, quindi non si vede più la linea che tagliava la coda a metà.
  en: Tooltips are drawn: body and tail are a single shape, so the line that cut the tail in half is gone.
  es: Los globos están dibujados: cuerpo y cola son una sola forma, así que ya no se ve la línea que cortaba la cola por la mitad.
- La coda si piega verso quello che sta spiegando e si ferma prima di arrivarci, come nei fumetti veri.
  en: The tail bends toward what it’s explaining and stops just before reaching it, like in real comics.
  es: La cola se curva hacia lo que está explicando y se detiene antes de llegar, como en los cómics de verdad.

- La coda delle nuvolette si ferma a metà strada e non copre più il tasto che sta spiegando.
  en: The tooltip tail stops halfway and no longer covers the button it’s explaining.
  es: La cola de los globos se detiene a mitad de camino y ya no tapa el botón que está explicando.
- Il messaggio d'errore ha il bordo a zig-zag di un grido, e la nuvoletta che spiega un valore ha la scia di bollicine del pensiero.
  en: The error message has the zigzag edge of a shout, and the tooltip that explains a value has the bubble trail of a thought.
  es: El mensaje de error tiene el borde en zigzag de un grito, y el globo que explica un valor tiene la estela de burbujas del pensamiento.
- Gli avvisi che compaiono in basso sono didascalie, con la barra d'inchiostro e l'angolo piegato. Chi parla ha la bolla, chi racconta ha il riquadro.
  en: Notices that pop up at the bottom are captions, with an ink bar and a folded corner. Whoever speaks gets a bubble, whoever narrates gets a box.
  es: Los avisos que aparecen abajo son textos de apoyo, con la barra de tinta y la esquina doblada. Quien habla tiene globo, quien narra tiene recuadro.

- Le nuvolette respirano: più larghe che alte, con l'aria attorno al testo e le righe più distanziate. Prima erano piccole e strette e si leggevano male.
  en: Tooltips breathe: wider than they are tall, with room around the text and more space between lines. Before, they were small and cramped and hard to read.
  es: Los globos respiran: más anchos que altos, con aire alrededor del texto y las líneas más separadas. Antes eran pequeños y apretados y se leían mal.

- Le nuvolette non compaiono più spostate per poi rimettersi a posto al primo movimento del mouse, e non rallentano più il sito.
  en: Tooltips no longer appear out of place only to jump into position at the first mouse move, and they no longer slow the site down.
  es: Los globos ya no aparecen desplazados para luego acomodarse con el primer movimiento del mouse, y ya no hacen más lento el sitio.
- Stanno un po' più in alto e di lato, col becco che punta dentro al tasto, e si vede attraverso: non coprono più quello che stai leggendo.
  en: They sit a bit higher and to the side, with the beak pointing into the button, and you can see through them: they no longer cover what you’re reading.
  es: Están un poco más arriba y de lado, con el pico apuntando dentro del botón, y se ve a través: ya no tapan lo que estás leyendo.

- Le nuvolette seguono il cursore mentre lo muovi, e la coda è disegnata: curva, come nei fumetti, e punta alla cosa di cui parla anche quando la bolla è finita di lato.
  en: Tooltips follow the cursor as you move it, and the tail is drawn: curved, like in comics, and it points at what it’s talking about even when the bubble ends up to the side.
  es: Los globos siguen al cursor mientras lo mueves, y la cola está dibujada: curva, como en los cómics, y apunta a lo que habla incluso cuando el globo acaba de lado.
- Compaiono con un piccolo scatto e se ne vanno da sole dopo il tempo che serve per leggerle. Non si spengono più da sole dopo mezzo secondo.
  en: They pop in with a little snap and leave by themselves after enough time to read them. They no longer switch off on their own after half a second.
  es: Aparecen con un pequeño salto y se van solos después del tiempo necesario para leerlos. Ya no se apagan solos al medio segundo.
- Il testo dentro è centrato e le righe sono bilanciate, come nei balloon veri.
  en: The text inside is centered and the lines are balanced, like in real speech balloons.
  es: El texto de dentro está centrado y las líneas equilibradas, como en los globos de verdad.

- Le nuvolette compaiono dove sei col cursore, non al centro della cosa che stai puntando. Sulla tela dell'editor finivano lontanissime.
  en: Tooltips appear where your cursor is, not in the middle of the thing you’re pointing at. On the editor canvas they ended up miles away.
  es: Los globos aparecen donde está tu cursor, no en el centro de lo que estás señalando. En el lienzo del editor acababan lejísimos.
- Sono palloncini veri: forma tonda, becco che punta dove guardi. Prima erano rettangoli con gli angoli smussati.
  en: They’re real speech balloons: a round shape, with a beak pointing where you’re looking. Before, they were rectangles with rounded corners.
  es: Son globos de verdad: forma redonda y pico que apunta adonde miras. Antes eran rectángulos con las esquinas redondeadas.
- Passando sopra alle vesti dell'overlay adesso c'è scritto com'è fatta ognuna, invece del nome che si legge già sul tasto.
  en: Hovering over the overlay looks now tells you what each one is like, instead of the name you can already read on the button.
  es: Al pasar sobre los aspectos del overlay ahora se lee cómo es cada uno, en lugar del nombre que ya está en el botón.

- Le nuvolette col cursore sopra adesso sono di tre tipi: fumetto normale per un comando, squadrato e rosso per le cose che fanno danni, nuvola di pensiero per spiegare un valore o una parola.
  en: Hover tooltips now come in three kinds: a normal speech balloon for a control, a square red one for things that do damage, and a thought cloud to explain a value or a word.
  es: Los globos al pasar el cursor ahora son de tres tipos: globo normal para un control, cuadrado y rojo para lo que hace daño, y nube de pensamiento para explicar un valor o una palabra.
- Ce ne sono ventidue in più, sui comandi il cui nome non dice cosa succede: «Studia ora», «Crea clip», «Avvia raid», «Rileva gruppo», «Togli dal web» e altri.
  en: There are twenty-two more, on controls whose name doesn’t say what happens: “Study now”, “Create clip”, “Start raid”, “Detect group”, “Take offline” and others.
  es: Hay veintidós más, en los controles cuyo nombre no dice qué pasa: «Estudiar ahora», «Crear clip», «Iniciar raid», «Detectar grupo», «Quitar de la web» y otros.

- Le levette hanno il pallino in mezzo e dentro alla pista. Fuori dal telefono era spostato in basso a destra e sbordava.
  en: Toggles have the knob centered and inside the track. Off phones it was shifted down and to the right and spilled over.
  es: Los interruptores tienen la bolita en medio y dentro de la pista. Fuera del teléfono estaba desplazada abajo a la derecha y se salía.

- La locandina è accesa di suo: se non l'hai mai toccata, parte con il prossimo annuncio. Se l'hai spenta resta spenta, anche salvando un disegno.
  en: The poster is on by default: if you’ve never touched it, it goes out with the next announcement. If you turned it off it stays off, even when you save a design.
  es: El cartel viene activado: si nunca lo tocaste, sale con el próximo anuncio. Si lo apagaste sigue apagado, aunque guardes un diseño.
- Una diretta su Kick riceve la grafica di Kick e una su Twitch quella di Twitch, anche quando lo stesso canale trasmette su tutte e due. Prima poteva arrivare quella sbagliata.
  en: A stream on Kick gets the Kick design and one on Twitch the Twitch design, even when the same channel streams on both. Before, the wrong one could arrive.
  es: Un directo en Kick recibe el diseño de Kick y uno en Twitch el de Twitch, incluso cuando el mismo canal emite en los dos. Antes podía llegar el equivocado.
- L'indirizzo scritto in fondo alla locandina è quello della piattaforma giusta.
  en: The address written at the bottom of the poster is the one for the right platform.
  es: La dirección escrita al pie del cartel es la de la plataforma correcta.
- Se la tua immagine del profilo non si scarica in fretta, la locandina parte lo stesso invece di far aspettare l'annuncio.
  en: If your profile picture doesn’t download quickly, the poster goes out anyway instead of holding up the announcement.
  es: Si tu imagen de perfil no se descarga rápido, el cartel sale igual en lugar de hacer esperar al anuncio.

- C'è l'editor della locandina: sposti i pezzi trascinandoli, ne aggiungi, cambi caratteri e colori, e vedi il risultato mentre lo fai. Annulla e rifai con Ctrl+Z.
  en: There’s a poster editor: you move the pieces by dragging them, add more, change fonts and colors, and see the result as you go. Undo and redo with Ctrl+Z.
  es: Hay un editor del cartel: mueves las piezas arrastrándolas, añades otras, cambias fuentes y colores, y ves el resultado mientras lo haces. Deshacer y rehacer con Ctrl+Z.
- Quando parte la locandina il messaggio si accorcia: titolo e categoria sono già disegnati dentro, sotto restano il tuo nome e il link.
  en: When the poster goes out, the message gets shorter: title and category are already drawn in, and below it only your name and the link remain.
  es: Cuando sale el cartel el mensaje se acorta: título y categoría ya están dibujados dentro, y debajo quedan tu nombre y el enlace.
- La locandina arriva anche per gli streamer che hai aggiunto alle notifiche: la grafica resta la tua, dentro ci sono il loro nome, il loro titolo e la loro faccia.
  en: The poster also goes out for the streamers you added to notifications: the design stays yours, with their name, their title and their face inside.
  es: El cartel llega también para los streamers que añadiste a las notificaciones: el diseño sigue siendo el tuyo, y dentro están su nombre, su título y su cara.
- Il titolo e la categoria compaiono anche a canale spento: si prendono da quelli del canale, invece di restare vuoti.
  en: Title and category show up even when the channel is offline: they’re taken from the channel’s own, instead of staying empty.
  es: El título y la categoría aparecen también con el canal apagado: se toman de los del canal, en lugar de quedar vacíos.

- «Manda una prova» adesso manda esattamente quello che partirà davvero: se hai acceso la locandina, la prova arriva con la locandina, e te lo dice.
  en: “Send a test” now sends exactly what will really go out: if the poster is on, the test arrives with the poster, and it tells you so.
  es: «Enviar una prueba» ahora envía exactamente lo que saldrá de verdad: si activaste el cartel, la prueba llega con el cartel, y te lo dice.
- La locandina ora si disegna anche in produzione: i caratteri non finivano nel programma pubblicato.
  en: The poster is now drawn in production too: the fonts weren’t making it into the published program.
  es: El cartel ahora se dibuja también en producción: las fuentes no llegaban al programa publicado.
- I due tasti tondi in basso a destra non tremolano più quando ci passi sopra col cursore.
  en: The two round buttons at the bottom right no longer flicker when you hover over them.
  es: Los dos botones redondos de abajo a la derecha ya no parpadean cuando pasas el cursor por encima.

- Nelle notifiche Telegram c'è un riquadro per la locandina: la accendi, scegli fra la grafica di Twitch e quella di Kick, e vedi l'anteprima.
  en: Telegram notifications have a box for the poster: you turn it on, choose between the Twitch and the Kick design, and see the preview.
  es: En las notificaciones de Telegram hay un recuadro para el cartel: lo activas, eliges entre el diseño de Twitch y el de Kick, y ves la vista previa.
- L'anteprima è l'immagine vera, disegnata dal server: quello che vedi è quello che arriva nel gruppo.
  en: The preview is the real image, drawn by the server: what you see is what arrives in the group.
  es: La vista previa es la imagen real, dibujada por el servidor: lo que ves es lo que llega al grupo.

- I suggerimenti che compaiono passando il cursore adesso sono fumetti: contorno spesso, coda che punta alla cosa di cui parlano, scritti a pennarello come il resto del sito.
  en: Hover tips are now comic balloons: a thick outline, a tail pointing at what they’re about, and written in marker like the rest of the site.
  es: Las ayudas que aparecen al pasar el cursor ahora son globos de cómic: contorno grueso, cola que apunta a lo que explican y letra de marcador como el resto del sitio.
- Un tasto su cui tieni il cursore si disegna sopra a quello che ha intorno. Prima poteva capitare che il riquadro accanto gli passasse sopra l'ombra e sembrasse tagliato.
  en: A button you hover over is drawn on top of what’s around it. Before, the box next to it could cast its shadow over it and make it look cut off.
  es: Un botón sobre el que tienes el cursor se dibuja por encima de lo que lo rodea. Antes podía pasar que el recuadro de al lado le echara la sombra encima y pareciera cortado.

- Quando parte la diretta, l'annuncio su Telegram porta con sé una locandina: il tuo nome, il titolo della diretta, il gioco e la tua immagine, su una grafica diversa per Twitch e per Kick.
  en: When your stream starts, the Telegram announcement brings a poster: your name, the stream title, the game and your picture, on a different design for Twitch and for Kick.
  es: Cuando empieza el directo, el anuncio en Telegram lleva un cartel: tu nombre, el título del directo, el juego y tu imagen, con un diseño distinto para Twitch y para Kick.
- Vale per tutte le piattaforme collegate, non solo per Twitch.
  en: It works for every connected platform, not just Twitch.
  es: Vale para todas las plataformas conectadas, no solo para Twitch.
- Se il messaggio è corto diventa la didascalia della foto; se è lungo parte prima la foto e subito dopo il testo intero, che non viene mai tagliato a metà.
  en: If the message is short it becomes the photo caption; if it’s long, the photo goes first and the full text right after, never cut in half.
  es: Si el mensaje es corto se convierte en el pie de la foto; si es largo, sale primero la foto y justo después el texto entero, que nunca se corta por la mitad.
- Se la locandina non si disegna o Telegram la rifiuta, l'annuncio parte lo stesso come prima: chi ti aspetta viene avvisato comunque.
  en: If the poster can’t be drawn or Telegram rejects it, the announcement goes out anyway as before: the people waiting for you still get the alert.
  es: Si el cartel no se dibuja o Telegram lo rechaza, el anuncio sale igual que antes: quien te espera recibe el aviso de todas formas.

## 2026-09-05

- I suggerimenti che compaiono passando il cursore sopra un comando adesso li disegna il sito, col suo tema. Prima erano la scatoletta grigia del browser, che non si può cambiare.
  en: The tips that appear when you hover over a control are now drawn by the site, with its theme. Before, they were the browser’s little gray box, which can’t be changed.
  es: Las ayudas que aparecen al pasar el cursor sobre un control ahora las dibuja el sitio, con su tema. Antes eran la cajita gris del navegador, que no se puede cambiar.
- Compaiono anche arrivandoci col tasto di tabulazione: chi naviga da tastiera prima non li vedeva mai.
  en: They also appear when you reach them with the Tab key: people navigating by keyboard never saw them before.
  es: Aparecen también al llegar con la tecla de tabulación: quien navega con el teclado antes no las veía nunca.

- Il vinile che gira sull'overlay non si blocca più per ricominciare il giro da capo. Succedeva a ogni lettura del brano, e valeva anche per le onde e per il titolo che scorre.
  en: The spinning vinyl on the overlay no longer stops to restart its turn from the beginning. It happened every time the track was read, and the waves and scrolling title did it too.
  es: El vinilo que gira en el overlay ya no se detiene para empezar la vuelta de nuevo. Pasaba cada vez que se leía la canción, y también con las ondas y el título que se desplaza.

- Nel lettore musica «niente onde» adesso le toglie davvero, invece di lasciarle lì ferme. Le due impostazioni che si sovrapponevano sono diventate una sola.
  en: In the music player, “no bars” now really removes them instead of leaving them frozen there. The two settings that overlapped are now one.
  es: En el reproductor de música, «sin ondas» ahora las quita de verdad, en lugar de dejarlas ahí quietas. Los dos ajustes que se superponían ahora son uno solo.
- La copertina pulsa solo quando Spotify ci dice il tempo del brano. Quando non lo dice resta ferma, invece di pulsare a una velocità che non c'entrava niente con la canzone.
  en: The cover art pulses only when Spotify tells us the song’s tempo. When it doesn’t, it stays still instead of pulsing at a speed that had nothing to do with the song.
  es: La portada late solo cuando Spotify nos dice el tempo de la canción. Cuando no lo dice se queda quieta, en lugar de latir a una velocidad que no tenía nada que ver con la canción.
- Il titolo lungo scorre sempre, non più a volte sì e a volte no: si rimisura quando arriva il carattere, quando arriva la copertina e quando cambi la dimensione.
  en: A long title always scrolls now, not just sometimes: it’s measured again when the font arrives, when the cover art arrives and when you change the size.
  es: El título largo se desplaza siempre, ya no a veces sí y a veces no: se vuelve a medir cuando llega la fuente, cuando llega la portada y cuando cambias el tamaño.

- L'accesso con YouTube è pronto ma non ancora aperto: nella vetrina e nella scheda Piattaforme lo trovi in grigio, «in arrivo». Google deve prima approvare il permesso di leggere quale canale sei.
  en: Signing in with YouTube is ready but not open yet: on the showcase and in the Platforms tab you’ll find it grayed out, “coming soon”. Google first has to approve permission to read which channel you are.
  es: El acceso con YouTube está listo pero todavía no abierto: en el escaparate y en la pestaña Plataformas lo ves en gris, «próximamente». Google primero debe aprobar el permiso para leer qué canal eres.
- Se moderi già il canale di qualcun altro puoi chiedere tu l'accesso al suo pannello, senza aspettare che ti mandi un link. Lo trovi nella scheda Stato.
  en: If you already moderate someone else’s channel, you can ask for access to their panel yourself, without waiting for them to send you a link. You’ll find it in the Status tab.
  es: Si ya moderas el canal de otra persona, puedes pedir tú el acceso a su panel sin esperar a que te mande un enlace. Lo encuentras en la pestaña Estado.
- Su Twitch la richiesta arriva allo streamer già confermata: prima di mostrargliela chiediamo a Twitch chi modera quel canale.
  en: On Twitch the request reaches the streamer already confirmed: before showing it to them, we ask Twitch who moderates that channel.
  es: En Twitch la solicitud le llega al streamer ya confirmada: antes de mostrársela le preguntamos a Twitch quién modera ese canal.
- Chi ha il canale vede le richieste in attesa nella scheda Stato e risponde con un tasto. Finché non dice di sì, chi ha chiesto non vede niente e non occupa un posto del piano.
  en: The channel owner sees pending requests in the Status tab and answers with one button. Until they say yes, the person who asked sees nothing and doesn’t take up a spot on the plan.
  es: Quien tiene el canal ve las solicitudes pendientes en la pestaña Estado y responde con un botón. Hasta que no diga que sí, quien pidió no ve nada y no ocupa un lugar del plan.
- L'invito a un moderatore ora si manda anche a chi sta su Kick: scegli la piattaforma e scrivi il nome.
  en: Moderator invites can now go to people on Kick too: pick the platform and type the name.
  es: La invitación a un moderador ahora también se puede enviar a quien está en Kick: eliges la plataforma y escribes el nombre.
- Chi è stato invitato entra dalla sua piattaforma, non per forza da Twitch.
  en: Whoever was invited signs in from their own platform, not necessarily from Twitch.
  es: Quien fue invitado entra desde su plataforma, no necesariamente desde Twitch.

## 2026-09-04

- La chiave API del canale non si conserva più: ne resta solo un'impronta. Si vede una volta sola, quando la generi, e nemmeno noi possiamo rileggerla.
  en: The channel API key is no longer stored: only a fingerprint of it stays. You see it once, when you generate it, and not even we can read it back.
  es: La clave API del canal ya no se guarda: solo queda una huella de ella. Se ve una sola vez, cuando la generas, y ni siquiera nosotros podemos volver a leerla.
- I backup del database sono cifrati: una copia che esce di casa è rumore senza il segreto del server.
  en: Database backups are encrypted: a copy that leaves the house is just noise without the server’s secret.
  es: Las copias de seguridad de la base de datos están cifradas: una copia que sale de casa es ruido sin el secreto del servidor.
- I segreti dei collegamenti (bot Telegram, Spotify, TikTok, 7TV) non stanno più in chiaro nel database: ognuno ha la sua chiave, e quella chiave è a sua volta chiusa a chiave.
  en: Connection secrets (Telegram bot, Spotify, TikTok, 7TV) are no longer stored in plain text in the database: each one has its own key, and that key is locked away in turn.
  es: Los secretos de las conexiones (bot de Telegram, Spotify, TikTok, 7TV) ya no están en claro en la base de datos: cada uno tiene su clave, y esa clave está a su vez bajo llave.
- Ogni segreto è legato al suo posto: preso da un account e messo su un altro non si apre più.
  en: Every secret is tied to its place: taken from one account and put on another, it no longer opens.
  es: Cada secreto está atado a su lugar: tomado de una cuenta y puesto en otra, ya no se abre.
- Nell'Overlay Studio il titolo «Gira il telefono» non copre più l'icona sopra di sé.
  en: In Overlay Studio, the “Turn your phone” title no longer covers the icon above it.
  es: En Overlay Studio, el título «Gira el teléfono» ya no tapa el icono de arriba.
- I tre passi per mettere l'overlay in OBS tornano a leggersi come frasi intere, invece di spezzarsi in due colonne.
  en: The three steps for adding the overlay to OBS read as full sentences again, instead of splitting into two columns.
  es: Los tres pasos para poner el overlay en OBS vuelven a leerse como frases enteras, en lugar de partirse en dos columnas.
- Niente più schermate vuote scorrendo una scheda: alcune carte restavano spente e lasciavano al loro posto un buco alto quanto loro.
  en: No more empty screens while scrolling a tab: some cards stayed switched off and left a hole as tall as they were.
  es: Se acabaron las pantallas vacías al desplazarte por una pestaña: algunas tarjetas se quedaban apagadas y dejaban un hueco de su misma altura.
- Sul telefono il contorno non resta più acceso sull'ultimo tasto premuto: gli effetti del passaggio del mouse ora valgono solo dove un mouse c'è davvero.
  en: On phones the outline no longer stays lit on the last button you tapped: hover effects now apply only where there really is a mouse.
  es: En el teléfono el contorno ya no se queda encendido en el último botón pulsado: los efectos al pasar el mouse ahora valen solo donde hay un mouse de verdad.
- Su telefono le schede Notifiche, Moduli e Avvisi non escono più dallo schermo: il testo si tagliava a metà frase e la pagina scivolava di lato.
  en: On phones the Notifications, Modules and Alerts tabs no longer run off the screen: text was cut off mid-sentence and the page slid sideways.
  es: En el teléfono las pestañas Notificaciones, Módulos y Avisos ya no se salen de la pantalla: el texto se cortaba a media frase y la página se deslizaba de lado.
- La ricerca ha il tema del sito: contorno pieno, filtri a pastiglia e le voci che si sollevano. Prima era rimasta col disegno di prima.
  en: Search now has the site’s theme: a solid outline, pill-shaped filters and results that lift up. It had kept the old design.
  es: La búsqueda tiene el tema del sitio: contorno lleno, filtros en píldora y resultados que se elevan. Se había quedado con el diseño anterior.
- Anche gli elenchi, le schede della libreria, i blocchi della pagina link, i contatori e le spunte hanno il contorno giusto.
  en: Lists, library cards, link page blocks, counters and checkmarks have the right outline too.
  es: Las listas, las fichas de la biblioteca, los bloques de la página de enlaces, los contadores y las casillas también tienen el contorno correcto.
- Il bot legge la tua pagina link mentre risponde: titoli, testi, link, social, conti alla rovescia e soprattutto le FAQ che ci hai scritto tu.
  en: The bot reads your link page while it answers: titles, texts, links, socials, countdowns and above all the FAQs you wrote there.
  es: El bot lee tu página de enlaces mientras responde: títulos, textos, enlaces, redes, cuentas atrás y sobre todo las preguntas frecuentes que escribiste ahí.
- Cambi la pagina e cambia subito quello che sa, senza rifare niente. Se la spegni, smette di usarla.
  en: Change the page and what the bot knows changes right away, with nothing to redo. If you turn the page off, it stops using it.
  es: Cambias la página y cambia enseguida lo que sabe, sin rehacer nada. Si la apagas, deja de usarla.
- Nell'elenco «cosa sa il bot» ora compaiono anche quelle voci, marcate «dalla tua pagina link»: si cambiano sulla pagina, non da lì.
  en: The “What the bot knows” list now shows those entries too, marked “from your link page”: you change them on the page, not there.
  es: En la lista «Lo que sabe el bot» ahora aparecen también esas entradas, marcadas «de tu página de enlaces»: se cambian en la página, no ahí.
- Il manuale del bot e la guida della scheda Conoscenza sono aggiornati: scheda, quando, fissate, quaderno, parole da bloccare e pagina link.
  en: The bot manual and the guide for the Knowledge tab are up to date: profile card, when, pinned, notebook, words to block and link page.
  es: El manual del bot y la guía de la pestaña Conocimiento están al día: ficha, cuándo, fijadas, cuaderno, palabras a bloquear y página de enlaces.
- I contorni non vengono più tagliati: dentro le schede ogni bottone aveva l'ombra rasata sui quattro lati, e nelle colonne che scorrono il bordo spariva di lato.
  en: Outlines no longer get clipped: inside tabs every button had its shadow shaved off on all four sides, and in scrolling columns the edge vanished at the side.
  es: Los contornos ya no se recortan: dentro de las pestañas cada botón tenía la sombra rasurada por los cuatro lados, y en las columnas que se desplazan el borde desaparecía de lado.
- Sul tema chiaro tornano le ombre piene che mancavano: una riga di stile sbagliata le spegneva tutte, mentre sul tema scuro si sono sempre viste.
  en: The solid shadows that were missing are back in the light theme: one wrong style line turned them all off, while in the dark theme they always showed.
  es: En el tema claro vuelven las sombras llenas que faltaban: una línea de estilo equivocada las apagaba todas, mientras que en el tema oscuro siempre se vieron.
- Nella scheda puoi elencare le parole che il bot non deve mai scrivere (il cognome, la via, il nome della scuola): se una finisce in una risposta, il bot non la manda.
  en: In your profile card you can list words the bot must never write (your last name, your street, your school’s name): if one ends up in a reply, the bot doesn’t send it.
  es: En la ficha puedes enumerar las palabras que el bot nunca debe escribir (tu apellido, tu calle, el nombre de tu escuela): si una acaba en una respuesta, el bot no la envía.
- La scheda non parte più vuota: quando il bot rilegge il tuo profilo riempie chi sei, gli orari e dove ti trovano, senza toccare quello che hai scritto tu.
  en: The profile card no longer starts empty: when the bot rereads your profile it fills in who you are, your schedule and where to find you, without touching what you wrote.
  es: La ficha ya no empieza vacía: cuando el bot vuelve a leer tu perfil rellena quién eres, los horarios y dónde encontrarte, sin tocar lo que escribiste tú.
- Nella scheda Conoscenza puoi compilare la tua scheda: chi sei, cosa fai in diretta, gli orari, dove ti trovano, come deve chiamarti e cosa non deve dire di te.
  en: In the Knowledge tab you can fill in your profile card: who you are, what you do on stream, your schedule, where to find you, what to call you and what not to say about you.
  es: En la pestaña Conocimiento puedes completar tu ficha: quién eres, qué haces en directo, los horarios, dónde encontrarte, cómo debe llamarte y qué no debe decir de ti.
- Il bot sceglie le voci di conoscenza più vicine alla domanda, non le ultime che hai scritto. Puoi scriverne quante vuoi.
  en: The bot picks the knowledge entries closest to the question, not the last ones you wrote. You can write as many as you like.
  es: El bot elige las entradas de conocimiento más cercanas a la pregunta, no las últimas que escribiste. Puedes escribir tantas como quieras.
- Ogni voce può valere sempre, solo quando sei in diretta o solo quando sei offline. Puoi anche fissarla, così il bot ce l'ha davanti in ogni caso.
  en: Each entry can apply always, only when you’re live or only when you’re offline. You can also pin it, so the bot has it in front of it no matter what.
  es: Cada entrada puede valer siempre, solo cuando estás en directo o solo cuando estás desconectado. También puedes fijarla, así el bot la tiene delante en cualquier caso.
- Le frasi che scrivi in Personalità ora arrivano al bot come esempio del tuo modo di parlare. Prima restavano lì.
  en: The phrases you write in Personality now reach the bot as examples of how you talk. Before, they just sat there.
  es: Las frases que escribes en Personalidad ahora le llegan al bot como ejemplo de tu forma de hablar. Antes se quedaban ahí.
- Nel quaderno del bot scrivi come deve rispondere, e vedi anche quello che gli è già stato insegnato.
  en: In the bot’s notebook you write how it should answer, and you also see what it has already been taught.
  es: En el cuaderno del bot escribes cómo debe responder, y ves también lo que ya le han enseñado.
- Nella dashboard i menù a tendina restano in riga con i bottoni accanto, invece di andare a capo da soli.
  en: In the dashboard, dropdown menus stay in line with the buttons next to them instead of wrapping onto a new line by themselves.
  es: En el panel, los menús desplegables se quedan en línea con los botones de al lado, en lugar de saltar solos a otra línea.
- In chat pubblica risponde il bot del tuo canale: non si ricorda degli utenti e non parla di sé.
  en: In public chat, your channel’s bot is the one answering: it doesn’t remember users and doesn’t talk about itself.
  es: En el chat público responde el bot de tu canal: no recuerda a los usuarios y no habla de sí mismo.
- Le risposte salvate non escono più sempre uguali: il bot le riformula. Se contengono un link restano identiche.
  en: Saved answers no longer come out the same every time: the bot rephrases them. If they contain a link, they stay exactly as written.
  es: Las respuestas guardadas ya no salen siempre iguales: el bot las reformula. Si contienen un enlace, se quedan idénticas.
- Attorno a un video o a una musica incorporata non si vedono più gli spicchi vuoti negli angoli: li riempie il colore del bordo, così sembrano cornice.
  en: Around an embedded video or music player, the empty wedges in the corners are gone: the border color fills them, so they look like a frame.
  es: Alrededor de un video o una música incrustados ya no se ven huecos vacíos en las esquinas: los rellena el color del borde, así parecen un marco.
- Puoi scegliere il colore dietro al riquadro, per intonarlo a quello che si vede dentro al contenuto.
  en: You can pick the color behind the box, to match it to what shows inside the content.
  es: Puedes elegir el color detrás del recuadro, para combinarlo con lo que se ve dentro del contenido.
- I riquadri di video, musica e pagine incorporate, la copertina e i bottoni dell'informativa hanno lo stesso bordo e la stessa ombra del resto della pagina: prima avevano un filo sottile che non cambiava mai col tema.
  en: Boxes for embedded video, music and pages, the cover and the notice buttons have the same border and shadow as the rest of the page: before, they had a thin line that never changed with the theme.
  es: Los recuadros de video, música y páginas incrustadas, la portada y los botones del aviso tienen el mismo borde y la misma sombra que el resto de la página: antes tenían una línea fina que nunca cambiaba con el tema.
- La scritta che scorre è tornata a scorrere: si era fermata perché due cose diverse avevano lo stesso nome dentro al foglio di stile.
  en: The scrolling text scrolls again: it had stopped because two different things had the same name inside the style sheet.
  es: El texto que se desplaza vuelve a desplazarse: se había detenido porque dos cosas distintas tenían el mismo nombre en la hoja de estilo.
- La sua velocità funziona per la prima volta: «lenta», «media» e «veloce» non arrivavano mai alla pagina, andavano tutte alla stessa andatura.
  en: Its speed works for the first time: “Slow”, “Medium” and “Fast” never reached the page, and all ran at the same pace.
  es: Su velocidad funciona por primera vez: «Lenta», «Media» y «Rápida» nunca llegaban a la página, y todas iban al mismo ritmo.
- L'editor della pagina link è a tre zone come il banco dell'overlay: i pezzi a sinistra, l'anteprima al centro, i comandi del pezzo scelto a destra.
  en: The link page editor has three areas like the overlay workbench: the blocks on the left, the preview in the middle, the controls for the chosen block on the right.
  es: El editor de la página de enlaces tiene tres zonas como el banco del overlay: las piezas a la izquierda, la vista previa en el centro y los controles de la pieza elegida a la derecha.
- Scegli un pezzo (o cliccalo nell'anteprima) e i suoi comandi compaiono a destra, con scritto sopra di quale pezzo sono.
  en: Pick a block (or click it in the preview) and its controls appear on the right, labeled with which block they belong to.
  es: Elige una pieza (o haz clic en ella en la vista previa) y sus controles aparecen a la derecha, con el nombre de la pieza arriba.
- Il tutorial della pagina link parte chiuso e sta in fondo: aperto si mangiava mezza colonna e la lista dei pezzi non si vedeva.
  en: The link page tutorial starts collapsed and sits at the bottom: open, it ate half a column and you couldn’t see the list of blocks.
  es: El tutorial de la página de enlaces empieza cerrado y está al final: abierto se comía media columna y no se veía la lista de piezas.
- I pezzi della pagina link non sono più tutti spalancati insieme: una riga per pezzo, che si apre una alla volta e resta aperta anche se lo sposti o lo duplichi.
  en: Link page blocks are no longer all wide open at once: one row per block, opening one at a time and staying open even if you move or duplicate it.
  es: Las piezas de la página de enlaces ya no están todas abiertas a la vez: una fila por pieza, que se abre de una en una y sigue abierta aunque la muevas o la dupliques.
- Nel tema scuro il contorno disegnato si vede: era nero su nero, quindi non c'era, e restavano solo gli aloni rosa.
  en: In the dark theme the hand-drawn outline shows: it was black on black, so it wasn’t there, and only the pink glows were left.
  es: En el tema oscuro se ve el contorno dibujado: era negro sobre negro, así que no estaba, y solo quedaban los halos rosas.
- La barra in basso, la lente della ricerca e le icone parlano la stessa lingua del resto: contorno disegnato e ombra a timbro.
  en: The bottom bar, the search magnifier and the icons speak the same language as everything else: hand-drawn outline and stamp shadow.
  es: La barra de abajo, la lupa de la búsqueda y los iconos hablan el mismo idioma que el resto: contorno dibujado y sombra de sello.
- La barra in basso è opaca: su alcuni telefoni il testo della pagina si leggeva attraverso.
  en: The bottom bar is opaque: on some phones you could read the page text through it.
  es: La barra de abajo es opaca: en algunos teléfonos el texto de la página se leía a través.
- Le pagine link pubblicate non portano più i commenti del nostro codice: chi apriva gli strumenti del browser su una pagina qualsiasi ne trovava trentasette.
  en: Published link pages no longer carry the comments from our code: anyone opening the browser tools on any page found thirty-seven of them.
  es: Las páginas de enlaces publicadas ya no llevan los comentarios de nuestro código: quien abría las herramientas del navegador en cualquier página encontraba treinta y siete.
- La pagina link ora si allarga su tutto lo schermo come il banco dell'overlay: prima restava dentro una colonna da mille pixel e l'anteprima era piccola.
  en: The link page now spreads across the whole screen like the overlay workbench: before, it stayed inside a thousand-pixel column and the preview was small.
  es: La página de enlaces ahora ocupa toda la pantalla como el banco del overlay: antes se quedaba dentro de una columna de mil píxeles y la vista previa era pequeña.
- I titoli delle sezioni non sporgono più sopra la carta, e la freccetta che le apre è tornata una punta invece di un rombo.
  en: Section titles no longer stick out above the card, and the little arrow that opens them is a point again instead of a diamond.
  es: Los títulos de las secciones ya no sobresalen por encima de la tarjeta, y la flechita que las abre vuelve a ser una punta en lugar de un rombo.
- La pagina link ha molte più cose da cambiare: carattere dei titoli separato, maiuscolo, interlinea, aria fra i pezzi, colore del testo dei bottoni e spessore del bordo.
  en: The link page has many more things to change: a separate font for titles, uppercase, line spacing, room between blocks, button text color and border thickness.
  es: La página de enlaces tiene muchas más cosas para cambiar: fuente de títulos aparte, mayúsculas, interlineado, aire entre piezas, color del texto de los botones y grosor del borde.
- C'è una scheda «CSS» dove scrivere il tuo: arriva per ultimo, quindi vince su tutto il resto.
  en: There’s a “CSS” tab where you can write your own: it comes last, so it wins over everything else.
  es: Hay una pestaña «CSS» donde escribir el tuyo: llega al final, así que gana sobre todo lo demás.
- La pagina link: l'aspetto non è più una colonna sola da ventidue voci, ma sei schede (Temi, Impianto, Scrittura, Colori, Bottoni, Modi) con i campi affiancati.
  en: The link page look is no longer a single column of twenty-two settings, but six tabs (Themes, Layout, Type, Colors, Buttons, Behaviour) with the fields side by side.
  es: El aspecto de la página de enlaces ya no es una sola columna de veintidós opciones, sino seis pestañas (Temas, Estructura, Tipografía, Colores, Botones, Modos) con los campos lado a lado.
- L'anteprima della pagina link è passata a sinistra, con i comandi a destra: si legge come il banco dell'overlay.
  en: The link page preview moved to the left, with the controls on the right: it reads like the overlay workbench.
  es: La vista previa de la página de enlaces pasó a la izquierda, con los controles a la derecha: se lee como el banco del overlay.
- Puoi cambiare la grandezza del testo della pagina link (80–130%) e il suo spessore: leggero, medio o marcato. Prima era grassetto e basta.
  en: You can change the link page’s text size (80–130%) and weight: light, medium or bold. Before, it was bold and nothing else.
  es: Puedes cambiar el tamaño del texto de la página de enlaces (80–130%) y su grosor: ligero, medio o marcado. Antes era negrita y punto.
- Il puntatore disegnato adesso resta scelto: lo salvavi e alla ricarica tornava indietro da solo.
  en: The hand-drawn pointer now stays selected: you saved it and on reload it switched back by itself.
  es: El puntero dibujado ahora se queda elegido: lo guardabas y al recargar volvía atrás solo.
- Il titolo della home usa gli stessi due colori del resto della pagina: le parole nel colore del testo, quelle in risalto nel rosa del marchio. Prima aveva un rosa tutto suo che al buio restava scuro come il fondo.
  en: The home page title uses the same two colors as the rest of the page: words in the text color, highlighted ones in the brand pink. Before, it had a pink of its own that stayed as dark as the background at night.
  es: El título de la portada usa los mismos dos colores que el resto de la página: las palabras en el color del texto y las destacadas en el rosa de la marca. Antes tenía un rosa propio que de noche era oscuro como el fondo.
- I bottoni scelti e quelli rossi hanno di nuovo il loro contorno: il bordo era dello stesso colore del riempimento, quindi spariva dentro, e restava solo l'ombra su due lati: sembravano ritagliati male.
  en: Selected and red buttons have their outline back: the border was the same color as the fill, so it vanished into it, leaving only a two-sided shadow that looked badly cut out.
  es: Los botones elegidos y los rojos vuelven a tener su contorno: el borde era del mismo color que el relleno, así que desaparecía dentro, y solo quedaba la sombra en dos lados, como mal recortados.
- I riquadri «ultimo follower» e «ultimo sub» prendono la veste come tutto il resto: prima quei bottoni non facevano niente e le due etichette restavano com'erano mentre l'overlay cambiava tema.
  en: The “Latest follower” and “Latest sub” boxes take on the look like everything else: before, those buttons did nothing and the two labels stayed the same while the overlay changed theme.
  es: Los recuadros «Último seguidor» y «Último sub» toman el aspecto como todo lo demás: antes esos botones no hacían nada y las dos etiquetas seguían igual mientras el overlay cambiaba de tema.
- «a tutto l'overlay» adesso li prende davvero tutti: prima saltava quei due, il conto alla rovescia e i contatori.
  en: “To the whole overlay” now really applies to all of them: before, it skipped those two, the countdown and the counters.
  es: «A todo el overlay» ahora sí los incluye a todos: antes se saltaba esos dos, la cuenta atrás y los contadores.
- Ai due riquadri puoi scegliere forma, materia e cornice, come agli altri pezzi.
  en: For the two boxes you can pick shape, material and frame, like the other blocks.
  es: En los dos recuadros puedes elegir forma, materia y marco, como en las demás piezas.
- L'anteprima dei due riquadri mostra quello che va davvero in onda: prima ne disegnava uno e in diretta ne arrivava un altro.
  en: The preview of the two boxes shows what really goes on air: before, it drew one and a different one arrived on stream.
  es: La vista previa de los dos recuadros muestra lo que sale de verdad al aire: antes dibujaba uno y en directo llegaba otro.
- L'alone dell'alert e quello della materia neon si accendono: c'erano da sempre e non si erano mai visti.
  en: The alert’s glow and the neon material’s glow light up: they’d always been there and had never shown.
  es: El halo de la alerta y el de la materia neón se encienden: estaban desde siempre y nunca se habían visto.
- Con la veste manga l'ombra è netta invece che sfocata, come un secondo segno d'inchiostro.
  en: With the manga look the shadow is sharp instead of blurred, like a second ink stroke.
  es: Con el aspecto manga la sombra es nítida en lugar de difuminada, como un segundo trazo de tinta.
- Il sito era irraggiungibile: la configurazione del guardiano d'ingresso non era valida e lui, per questo, non si avviava. Rimessa a posto e verificata col programma vero prima di spingerla.
  en: The site was unreachable: the gatekeeper’s configuration wasn’t valid, so it wouldn’t start. It’s fixed and was checked with the real program before going out.
  es: El sitio no se podía alcanzar: la configuración del guardián de entrada no era válida y por eso no arrancaba. Quedó arreglada y probada con el programa real antes de publicarla.
- Un elemento con la Dimensione cambiata arriva davvero al bordo dello schermo: rimpicciolito si piantava prima e sembrava bloccato lì, ingrandito usciva dalla tela.
  en: An element with a changed Size really reaches the edge of the screen: shrunk, it used to stop short and seem stuck there, and enlarged it went off the canvas.
  es: Un elemento con el Tamaño cambiado llega de verdad al borde de la pantalla: reducido se frenaba antes y parecía atascado, agrandado se salía del lienzo.
- Segue il dito com'è giusto mentre lo trascini, a qualunque Dimensione.
  en: It follows your finger properly while you drag it, at any Size.
  es: Sigue al dedo como debe mientras lo arrastras, con cualquier Tamaño.
- Le immagini e i video dei comandi finiscono in diretta dove li hai messi nell'anteprima, anche quando li rimpicciolisci.
  en: Command images and videos end up on stream where you placed them in the preview, even when you shrink them.
  es: Las imágenes y los videos de los comandos acaban en directo donde los pusiste en la vista previa, incluso cuando los reduces.
- Il player non si strizza più a seconda di dove lo metti: posato al centro o a destra si stringeva, e il titolo finiva tagliato. Ora è largo quanto gli serve, ovunque lo porti.
  en: The player no longer squeezes depending on where you put it: set in the middle or on the right it narrowed, and the title got cut off. Now it’s as wide as it needs to be, wherever you move it.
  es: El reproductor ya no se encoge según dónde lo pongas: en el centro o a la derecha se estrechaba y el título quedaba cortado. Ahora es tan ancho como necesita, lo pongas donde lo pongas.
- Il player è cresciuto: le misure partono da dove prima finivano, e c'è la misura «enorme».
  en: The player got bigger: the sizes start where they used to end, and there’s a “Huge” size.
  es: El reproductor creció: las medidas empiezan donde antes terminaban, y está la medida «Enorme».
- «Enorme» c'è per tutti i widget, non solo per la chat: player, obiettivi, ultimo follower, ultimo sub, contatori.
  en: “Huge” is there for every widget, not just chat: player, goals, latest follower, latest sub, counters.
  es: «Enorme» está para todos los widgets, no solo para el chat: reproductor, objetivos, último seguidor, último sub, contadores.
- Il player ha i temi, e un tema prende la forma dell'oggetto vero. Cassetta: titolo e artista sull'etichetta, sotto la finestrella con le due bobine che girano.
  en: The player has themes, and a theme takes the shape of the real object. Cassette: title and artist on the label, and below it the little window with two spinning reels.
  es: El reproductor tiene temas, y un tema toma la forma del objeto real. Casete: título y artista en la etiqueta, y debajo la ventanita con los dos carretes que giran.
- Vinile: il disco esce dalla busta e gira, con i solchi e l'etichetta al centro.
  en: Vinyl: the record slides out of its sleeve and spins, with grooves and the label in the middle.
  es: Vinilo: el disco sale de la funda y gira, con los surcos y la etiqueta en el centro.
- Terminale: mono, prompt e cursore che lampeggia. Manga: retino, contorno d'inchiostro e il titolo in lettering.
  en: Terminal: monospace, a prompt and a blinking cursor. Manga: halftone, ink outline and the title in lettering.
  es: Terminal: monoespaciada, prompt y cursor que parpadea. Manga: trama, contorno de tinta y el título en lettering.
- Ha il corpo: **slim** se lo vuoi sottile, **cicciotto** se lo vuoi generoso. È un asse a parte dalla dimensione: uno cambia le proporzioni, l'altro la scala.
  en: It has a build: **slim** if you want it thin, **chunky** if you want it generous. It’s a separate axis from size: one changes the proportions, the other the scale.
  es: Tiene cuerpo: **slim** si lo quieres delgado, **gordito** si lo quieres generoso. Es un eje aparte del tamaño: uno cambia las proporciones y el otro la escala.
- Le onde ballano quanto è carico il brano: una ballata si muove piano, un pezzo tirato spinge. Lo dice Spotify, non lo inventiamo noi.
  en: The waves dance as hard as the song does: a ballad moves gently, an upbeat track pushes. Spotify says so, we don’t make it up.
  es: Las ondas bailan según la energía de la canción: una balada se mueve despacio, un tema intenso empuja. Lo dice Spotify, no lo inventamos nosotros.
- Un titolo lungo non allarga più il player a mezzo schermo: la colonna del testo ha il suo tetto e il titolo scorre, come deve.
  en: A long title no longer stretches the player across half the screen: the text column has its own cap and the title scrolls, as it should.
  es: Un título largo ya no estira el reproductor a media pantalla: la columna del texto tiene su tope y el título se desplaza, como debe.
- Quel tetto lo scegli tu: «Larghezza del testo» dice quanto può allargarsi prima che il titolo si metta a scorrere. A zero decide il corpo.
  en: You choose that cap: “Text width” says how far it can grow before the title starts scrolling. At zero, the build decides.
  es: Ese tope lo eliges tú: «Ancho del texto» dice cuánto puede crecer antes de que el título empiece a desplazarse. En cero decide el cuerpo.
- «Parti da quanti ne ho adesso» adesso è una spunta che resta, non un tasto da premere ogni volta. Il numero lo tengo allineato io a quello vero di Twitch.
  en: “Start from how many I have now” is now a checkbox that stays, not a button to press every time. I keep the number in line with Twitch’s real one.
  es: «Empieza desde cuántos tengo ahora» ahora es una casilla que se queda, no un botón que pulsar cada vez. El número lo mantengo alineado con el real de Twitch.
- La Plancia è disegnata come il resto del sito: contorno d'inchiostro, angoli tirati a mano, nomi in lettering.
  en: The Deck is drawn like the rest of the site: ink outline, hand-drawn corners, names in lettering.
  es: La Consola está dibujada como el resto del sitio: contorno de tinta, esquinas hechas a mano, nombres en lettering.
- Quando scorri fra le sezioni partono le linee di concentrazione dalla scheda che stai guardando, come in una vignetta.
  en: When you scroll between sections, focus lines burst from the tab you’re looking at, like in a comic panel.
  es: Cuando te desplazas entre secciones salen líneas de concentración desde la pestaña que estás mirando, como en una viñeta.
- Il tratto disegnato adesso arriva ovunque: interruttori, campi, cartellini e tutti i pulsantini hanno il contorno d'inchiostro e gli angoli tirati a mano.
  en: The hand-drawn stroke now reaches everywhere: switches, fields, tags and all the little buttons have the ink outline and hand-drawn corners.
  es: El trazo dibujado ahora llega a todas partes: interruptores, campos, etiquetas y todos los botoncitos tienen el contorno de tinta y las esquinas hechas a mano.
- Gli interruttori sono disegnati anche loro: contorno, pallina con il suo bordo, e lo scatto a scatti invece che scivolato.
  en: Switches are hand-drawn too: outline, a knob with its own border, and a snappy click instead of a slide.
  es: Los interruptores también están dibujados: contorno, bolita con su borde, y un salto seco en lugar de deslizarse.
- Le schede sono vignette: angoli quadri, contorno spesso e il titolo in una fascia d'inchiostro in alto, come la didascalia di una tavola.
  en: Tabs are comic panels: square corners, a thick outline and the title in an ink band at the top, like a caption on a page.
  es: Las pestañas son viñetas: esquinas rectas, contorno grueso y el título en una franja de tinta arriba, como el texto de apoyo de una página.
- Il grigio pieno è sparito: le superfici secondarie sono a retino, come il mezzotono stampato.
  en: Flat gray is gone: secondary surfaces use halftone, like printed screentone.
  es: El gris liso desapareció: las superficies secundarias van con trama, como el medio tono impreso.
- Il tratto ha una gerarchia: la vignetta è più spessa del comando, il comando più del dettaglio. È così che si legge la profondità.
  en: The stroke has a hierarchy: the panel is thicker than the control, the control thicker than the detail. That’s how depth reads.
  es: El trazo tiene jerarquía: la viñeta es más gruesa que el control, el control más que el detalle. Así se lee la profundidad.
- I pulsanti sono a tinta piatta, senza sfumature: in una tavola il colore è pieno o non c'è.
  en: Buttons are flat color, with no gradients: on a comic page, color is either solid or not there at all.
  es: Los botones son de color plano, sin degradados: en una página de cómic el color es lleno o no está.
- Quando arrivi con la tastiera su un comando si vede subito dove sei: cornice d'accento netta, senza niente che copra quello che hai intorno.
  en: When you reach a control with the keyboard, you see right away where you are: a crisp accent frame, with nothing covering what’s around it.
  es: Cuando llegas a un control con el teclado se ve enseguida dónde estás: un marco de acento nítido, sin nada que tape lo que hay alrededor.
- Il tema scuro non è più bianco e nero: il fondo tira al prugna e la carta al rosa, come i colori del logo. Anche di notte è la stessa pagina stampata.
  en: The dark theme is no longer black and white: the background leans plum and the paper pink, like the logo’s colors. Even at night it’s the same printed page.
  es: El tema oscuro ya no es blanco y negro: el fondo tira a ciruela y el papel a rosa, como los colores del logo. También de noche es la misma página impresa.
- Il titolo di una scheda è una targhetta nell'angolo, con la freccetta dentro: si legge come la didascalia di una vignetta.
  en: A tab’s title is a little plate in the corner, with the arrow inside: it reads like a comic panel caption.
  es: El título de una pestaña es una plaquita en la esquina, con la flechita dentro: se lee como el texto de una viñeta.
- Il sito scarica il 16% in meno: quello che arriva al browser è compresso.
  en: The site downloads 16% less: what reaches the browser is compressed.
  es: El sitio descarga un 16% menos: lo que llega al navegador va comprimido.
- L'anteprima che compare quando incolli un link di SocialBot è ridisegnata come il sito: lettering, retino e targhetta d'inchiostro.
  en: The preview that appears when you paste a SocialBot link is redrawn like the site: lettering, halftone and an ink plate.
  es: La vista previa que aparece cuando pegas un enlace de SocialBot está redibujada como el sitio: lettering, trama y plaquita de tinta.
- La pagina delle novità torna a mostrare le novità: era vuota, e con lei l'elenco nel pannello.
  en: The What’s new page shows the news again: it was empty, and so was the list in the panel.
  es: La página de novedades vuelve a mostrar las novedades: estaba vacía, y con ella la lista del panel.
- I titoli grandi sono contornati come le lettere del logo: pieno colorato dentro, tratto nero attorno.
  en: Big titles are outlined like the logo’s letters: solid color inside, black stroke around.
  es: Los títulos grandes tienen contorno como las letras del logo: relleno de color dentro y trazo negro alrededor.
- La vetrina si apre a scaglioni, un pezzo alla volta, con lo scatto dell'animazione giapponese invece della dissolvenza sfocata.
  en: The showcase opens in stages, one piece at a time, with the snap of Japanese animation instead of a blurry fade.
  es: El escaparate se abre por partes, una pieza a la vez, con el salto de la animación japonesa en lugar del fundido borroso.
- Anche il cambio di sezione ha perso la sfocatura: adesso è uno stacco netto, come si passa da una vignetta all'altra.
  en: Switching sections has lost the blur too: now it’s a clean cut, like going from one comic panel to the next.
  es: El cambio de sección también perdió el desenfoque: ahora es un corte seco, como pasar de una viñeta a otra.
- L'avviso di errore arriva con la sua scossa: si capisce che qualcosa è andato storto anche solo da come si muove.
  en: The error notice arrives with its own jolt: you can tell something went wrong just from the way it moves.
  es: El aviso de error llega con su sacudida: se entiende que algo salió mal solo por cómo se mueve.
- Il marchio in alto trema un attimo quando ci passi sopra, come una cosa disegnata a mano.
  en: The brand at the top wobbles for a moment when you hover over it, like something drawn by hand.
  es: La marca de arriba tiembla un instante cuando pasas por encima, como algo dibujado a mano.
- Di notte si legge: il contorno nero spariva nel fondo scuro, ora ha il filo di carta attorno come nelle tavole stampate.
  en: It’s readable at night: the black outline disappeared into the dark background, and now it has a thin paper edge around it like on printed pages.
  es: De noche se lee: el contorno negro desaparecía en el fondo oscuro, y ahora tiene un filo de papel alrededor como en las páginas impresas.
- Le linee di concentrazione dietro il titolo si sono calmate: erano un fondale che copriva tutto, adesso convergono sul titolo e gli lasciano aria attorno.
  en: The focus lines behind the title have calmed down: they were a backdrop covering everything, and now they converge on the title and leave it room to breathe.
  es: Las líneas de concentración detrás del título se calmaron: eran un telón que lo tapaba todo, y ahora convergen en el título y le dejan aire alrededor.
- Il titolo grande ha il pieno del marchio, lo stesso della «b» di bot, dentro il contorno: prima era una parete di colore piatto e su telefono le lettere si gonfiavano fino a chiudersi.
  en: The big title has the brand’s fill, the same as the “b” in bot, inside the outline: before, it was a wall of flat color, and on phones the letters swelled until they closed up.
  es: El título grande tiene el relleno de la marca, el mismo de la «b» de bot, dentro del contorno: antes era una pared de color plano, y en el teléfono las letras se hinchaban hasta cerrarse.
- La home non si ricompone più sotto gli occhi mentre carica: arriva già fatta, e non balla più.
  en: The home page no longer rearranges itself before your eyes while it loads: it arrives already built, and stops jumping around.
  es: La portada ya no se recompone ante tus ojos mientras carga: llega ya hecha, y no se mueve más.
- È la stessa per tutti: prima chi cercava su Google trovava una pagina scritta a parte, solo in italiano, diversa da quella che poi si apriva davvero.
  en: It’s the same for everyone: before, people searching on Google found a separately written page, only in Italian, different from the one that actually opened.
  es: Es la misma para todos: antes quien buscaba en Google encontraba una página escrita aparte, solo en italiano, distinta de la que luego se abría de verdad.
- Le tre lingue sono diventate indirizzi veri: cambiando lingua l'indirizzo cambia con te, e lo puoi salvare o mandare a qualcuno.
  en: The three languages are now real addresses: when you switch language the address changes with you, and you can save it or send it to someone.
  es: Los tres idiomas son ahora direcciones reales: al cambiar de idioma la dirección cambia contigo, y puedes guardarla o mandársela a alguien.
- Nell'Overlay Studio la veste si sceglie sempre, non solo quando crei un overlay: in cima a ogni barra ci sono le nove vesti, e sotto cambi quello che vuoi.
  en: In Overlay Studio you can always pick the look, not just when you create an overlay: the nine looks sit at the top of every bar, and below you change whatever you like.
  es: En Overlay Studio el aspecto se elige siempre, no solo cuando creas un overlay: arriba de cada barra están los nueve aspectos, y debajo cambias lo que quieras.
- «A tutto l'overlay» le applica in un colpo a tutti gli elementi, invece di rifare le stesse undici scelte per alert, chat e ogni widget.
  en: “To the whole overlay” applies them to every element in one go, instead of redoing the same eleven choices for alerts, chat and each widget.
  es: «A todo el overlay» los aplica de una vez a todos los elementos, en lugar de repetir las mismas once elecciones para alertas, chat y cada widget.
- Adesso una veste veste davvero tutto: prima sceglievi Manga e la chat restava a metà, gli obiettivi e il player non se ne accorgevano nemmeno.
  en: A look now really dresses everything: before, you picked Manga and the chat stayed halfway, while goals and the player didn’t even notice.
  es: Ahora un aspecto viste de verdad todo: antes elegías Manga y el chat se quedaba a medias, y los objetivos y el reproductor ni se enteraban.
- Il player segue la veste: «Nastro» lo fa diventare una cassetta, «Terminale» un terminale, «Manga» il manga.
  en: The player follows the look: “Ribbon” turns it into a cassette, “Terminal” into a terminal, “Manga” into manga.
  es: El reproductor sigue el aspecto: «Cinta» lo convierte en un casete, «Terminal» en una terminal, «Manga» en manga.
- Il manga adesso c'è dappertutto: overlay, pagina link (in chiaro e di notte) e grafiche social.
  en: Manga is now everywhere: the overlay, the link page (light and at night) and social graphics.
  es: El manga ahora está en todas partes: overlay, página de enlaces (en claro y de noche) y gráficas sociales.
- La pagina link in manga è carta e inchiostro davvero: contorni neri, ombra piena spostata, titoli a pennarello.
  en: The manga link page is real paper and ink: black outlines, a solid offset shadow, titles in marker.
  es: La página de enlaces en manga es papel y tinta de verdad: contornos negros, sombra llena desplazada, títulos a marcador.
- Il carattere a pennarello lo scarica solo chi sceglie quel tema: le altre pagine link restano leggere come prima.
  en: The marker font is only downloaded by people who pick that theme: the other link pages stay as light as before.
  es: La fuente de marcador solo la descarga quien elige ese tema: las demás páginas de enlaces siguen igual de ligeras.
- L'avatar segue il tema: prima aveva un alone sfumato suo che stonava su una pagina disegnata.
  en: The avatar follows the theme: before, it had a soft glow of its own that clashed on a hand-drawn page.
  es: El avatar sigue el tema: antes tenía un halo difuminado propio que desentonaba en una página dibujada.
- Nel riquadro che chiede il consenso, «Dettagli» finiva da solo schiacciato nell'angolo in basso a destra e sembrava caduto fuori: ora sta dentro la frase che spiega, e i due pulsanti si dividono la riga.
  en: In the consent box, “Details” ended up alone, squeezed into the bottom right corner, as if it had fallen out: now it sits inside the sentence that explains, and the two buttons share the row.
  es: En el recuadro que pide el consentimiento, «Detalles» quedaba solo, aplastado en la esquina de abajo a la derecha, como caído: ahora está dentro de la frase que explica, y los dos botones comparten la fila.
- Il tema Manga adesso è disegnato davvero: retino stampato sulla carta, contorni spessi coi pieni dentro, e di notte le linee di concentrazione che convergono sul tuo nome.
  en: The Manga theme is now really drawn: halftone printed on the paper, thick outlines with solid fills, and at night focus lines converging on your name.
  es: El tema Manga ahora está dibujado de verdad: trama impresa sobre el papel, contornos gruesos con rellenos dentro y, de noche, líneas de concentración que convergen en tu nombre.
- Puoi accendere un puntatore del mouse disegnato coi colori del tuo tema: una penna, e una stella su quello che si può premere. Su telefono non cambia niente.
  en: You can turn on a hand-drawn mouse pointer in your theme’s colors: a pen, and a star over things you can press. Nothing changes on phones.
  es: Puedes activar un puntero del mouse dibujado con los colores de tu tema: una pluma, y una estrella sobre lo que se puede pulsar. En el teléfono no cambia nada.
- Chi visita la tua pagina può cambiare idea sui contenuti di altri siti: prima la scelta era per sempre e il riquadro non tornava più. Ora nel piede c'è «Contenuti di altri siti» che lo riapre.
  en: Visitors to your page can change their mind about content from other sites: before, the choice was forever and the box never came back. Now “Content from other sites” in the footer opens it again.
  es: Quien visita tu página puede cambiar de idea sobre el contenido de otros sitios: antes la elección era para siempre. Ahora en el pie está «Contenido de otros sitios», que vuelve a abrir el recuadro.
- Se dice di no dopo aver detto di sì, il no vale davvero: la pagina si ricarica, così da quei siti non parte più niente.
  en: If they say no after saying yes, the no really counts: the page reloads, so nothing loads from those sites anymore.
  es: Si dice que no después de haber dicho que sí, el no vale de verdad: la página se recarga, así que de esos sitios ya no se carga nada.
- Sulla pagina link online non funzionava niente di quello che si clicca: il riquadro del consenso non compariva, «Carica il contenuto» non rispondeva, il conto alla rovescia stava fermo. Ora funziona.
  en: Nothing clickable worked on the live link page: the consent box didn’t appear, “Load the content” didn’t respond, the countdown stood still. Now it works.
  es: En la página de enlaces publicada no funcionaba nada de lo que se pulsa: el recuadro del consentimiento no aparecía, «Cargar el contenido» no respondía y la cuenta atrás estaba parada. Ahora funciona.
- Nell'interfaccia non ci sono più emoji di sistema: dove dicevano qualcosa («bloccato», «animato», «in attesa») ora c'è il segno disegnato, con lo stesso tratto del resto.
  en: There are no system emoji in the interface anymore: where they meant something (“blocked”, “animated”, “pending”) there’s now the drawn symbol, with the same stroke as the rest.
  es: En la interfaz ya no hay emojis del sistema: donde decían algo («bloqueado», «animado», «en espera») ahora está el signo dibujado, con el mismo trazo que el resto.
- Le emoji che il bot scrive in chat restano dov'erano: quella è la sua voce.
  en: The emoji the bot writes in chat stay where they were: that’s its voice.
  es: Los emojis que el bot escribe en el chat siguen donde estaban: esa es su voz.
- Gli obiettivi si impostano in un posto solo: il traguardo vale per tutti i tuoi overlay, e non lo devi rifare scena per scena. Dove sta e come si vede lo decidi ancora sull'overlay che stai componendo.
  en: Goals are set up in one place: the target applies to all your overlays, and you don’t have to redo it scene by scene. Where it sits and how it looks you still decide on the overlay you’re building.
  es: Los objetivos se configuran en un solo lugar: la meta vale para todos tus overlays y no hay que rehacerla escena por escena. Dónde está y cómo se ve lo sigues decidiendo en el overlay que estás armando.
- La barra di un obiettivo non torna più indietro: se arrivavano follower mentre il numero vero era ancora quello di poco prima, il totale a schermo calava. Ora no.
  en: A goal’s bar no longer goes backward: if followers arrived while the real number was still the one from a moment earlier, the on-screen total dropped. Not anymore.
  es: La barra de un objetivo ya no retrocede: si llegaban seguidores mientras el número real todavía era el de un momento antes, el total en pantalla bajaba. Ya no.
- Nell'anteprima dello Studio la barra di un obiettivo era vuota anche a 662 su 1000: adesso si riempie davvero.
  en: In the Studio preview, a goal’s bar was empty even at 662 out of 1000: now it really fills up.
  es: En la vista previa del Studio la barra de un objetivo estaba vacía incluso con 662 de 1000: ahora se llena de verdad.
- L'anteprima non ti mostra più un overlay diverso da quello che va in onda: la cornice degli elementi era disegnata in un modo qui e in un altro in diretta.
  en: The preview no longer shows you a different overlay from the one that goes on air: element frames were drawn one way here and another way on stream.
  es: La vista previa ya no te muestra un overlay distinto del que sale al aire: el marco de los elementos se dibujaba de una forma aquí y de otra en directo.
- Il titolo lungo del player scorre anche nell'anteprima, invece di restare tagliato.
  en: The player’s long title scrolls in the preview too, instead of staying cut off.
  es: El título largo del reproductor también se desplaza en la vista previa, en lugar de quedarse cortado.
- Spuntare «parti da quanti ne ho adesso» non ti butta più fuori dalla scheda che stavi modificando.
  en: Checking “Start from how many I have now” no longer kicks you out of the tab you were editing.
  es: Marcar «Empieza desde cuántos tengo ahora» ya no te saca de la pestaña que estabas editando.
- I comandi delle onde del player dicono cosa fanno: uno le mostra o le nasconde, l'altro decide cosa balla a tempo.
  en: The player’s wave controls say what they do: one shows or hides them, the other decides what dances in time.
  es: Los controles de las ondas del reproductor dicen lo que hacen: uno las muestra u oculta, el otro decide qué baila al ritmo.
- Google mostrava ancora il logo vecchio: l'indirizzo da cui lo prende non cambiava mai, quindi non aveva motivo di riscaricarlo. Adesso cambia.
  en: Google was still showing the old logo: the address it gets it from never changed, so it had no reason to download it again. Now it changes.
  es: Google seguía mostrando el logo viejo: la dirección de donde lo toma nunca cambiaba, así que no tenía motivo para volver a descargarlo. Ahora cambia.

## 2026-09-03

- Nell'overlay c'è il player: quello che stai ascoltando su Spotify, a schermo. Compare quando la musica parte e sparisce quando la fermi.
  en: The overlay has a player: what you’re listening to on Spotify, on screen. It appears when the music starts and disappears when you stop it.
  es: El overlay tiene un reproductor: lo que estás escuchando en Spotify, en pantalla. Aparece cuando empieza la música y desaparece cuando la paras.
- Il player è tuo dalla copertina in giù: quadrata, tonda o un vinile che gira, avanzamento come barra o come anello attorno alla copertina, onde che ballano a tempo.
  en: The player is yours from the cover art down: square, round or a spinning vinyl, progress as a bar or a ring around the cover, and waves that dance in time.
  es: El reproductor es tuyo de la portada para abajo: cuadrada, redonda o un vinilo que gira, el avance como barra o como anillo alrededor de la portada, y ondas que bailan al ritmo.
- Ancora: lo sfondo può prendere la copertina sfocata o i colori del disco che scorrono, il titolo lungo scorre e l'entrata in scena la scegli tu.
  en: The background can use the blurred cover art or the record’s colors flowing by, long titles scroll, and you pick how it enters the scene.
  es: El fondo puede tomar la portada desenfocada o los colores del disco en movimiento, los títulos largos se desplazan y la entrada en escena la eliges tú.
- Il player va a tempo con quello che suona: le onde ballano sul battito vero del brano, e volendo pulsa anche la copertina.
  en: The player keeps time with what’s playing: the waves dance to the song’s real beat, and if you like, the cover art pulses too.
  es: El reproductor va al ritmo de lo que suena: las ondas bailan con el pulso real de la canción y, si quieres, también late la portada.
- Il player non sparisce più mentre la canzone va: un intoppo di Spotify o il vuoto fra due tracce lo spegnevano per un attimo, e poi rientrava.
  en: The player no longer disappears while the song is playing: a Spotify hiccup or the gap between two tracks switched it off for a moment, and then it came back.
  es: El reproductor ya no desaparece mientras suena la canción: un tropiezo de Spotify o el silencio entre dos pistas lo apagaban un momento, y luego volvía.
- In pausa invece sparisce davvero, se è quello che hai scelto: prima restava lì.
  en: When paused, though, it really does disappear, if that’s what you chose: before, it stayed there.
  es: En pausa, en cambio, desaparece de verdad, si es lo que elegiste: antes se quedaba ahí.
- Player e conto alla rovescia se ne vanno con una dissolvenza, non di colpo.
  en: The player and the countdown fade out instead of vanishing all at once.
  es: El reproductor y la cuenta atrás se van con un fundido, no de golpe.
- Le forme con gli angoli tagliati non lasciano più uno spigolo chiaro: l'ombra seguiva il rettangolo invece della forma.
  en: Shapes with cut corners no longer leave a light corner behind: the shadow followed the rectangle instead of the shape.
  es: Las formas con esquinas cortadas ya no dejan una esquina clara: la sombra seguía el rectángulo en lugar de la forma.
- La disposizione è tua: copertina a sinistra, a destra, sopra come un poster, o solo la copertina col cerchio che si riempie.
  en: The layout is up to you: cover art on the left, on the right, on top like a poster, or just the cover with a ring that fills up.
  es: La disposición la decides tú: portada a la izquierda, a la derecha, arriba como un póster, o solo la portada con el círculo que se llena.
- Titolo e artista possono stare su due righe, e nei testi si può usare anche il nome dell'album.
  en: Title and artist can go on two lines, and the album name can be used in the texts too.
  es: Título y artista pueden ir en dos líneas, y en los textos también se puede usar el nombre del álbum.
- C'è il conto alla rovescia di inizio diretta: scegli i minuti e parte. Sta nel canale, quindi ricaricare l'overlay o riavviare tutto non lo azzera.
  en: There’s a countdown to the start of your stream: pick the minutes and it starts. It lives in the channel, so reloading the overlay or restarting everything doesn’t reset it.
  es: Hay una cuenta atrás para el inicio del directo: eliges los minutos y arranca. Vive en el canal, así que recargar el overlay o reiniciarlo todo no la pone a cero.
- Un obiettivo può partire da dove sei già: «1000 follower» invece di «altri 1000». Il tasto «Quanti ne ho adesso» va a chiedere il numero vero a Twitch.
  en: A goal can start from where you already are: “1000 followers” instead of “1000 more”. The “How many I have now” button asks Twitch for the real number.
  es: Un objetivo puede empezar desde donde ya estás: «1000 seguidores» en lugar de «1000 más». El botón «Cuántos tengo ahora» le pide a Twitch el número real.
- Spostare le cose nello Studio non le fa più saltare: prendevi un elemento e scattava sotto il cursore, tanto più lontano quanto più era vicino a un bordo.
  en: Moving things in the Studio no longer makes them jump: you grabbed an element and it snapped under the cursor, farther away the closer it was to an edge.
  es: Mover cosas en el Studio ya no las hace saltar: agarrabas un elemento y se colocaba de golpe bajo el cursor, más lejos cuanto más cerca estaba de un borde.
- Un elemento non può più uscire dallo schermo mentre lo trascini.
  en: An element can no longer leave the screen while you drag it.
  es: Un elemento ya no puede salirse de la pantalla mientras lo arrastras.
- «Allinea a sinistra» adesso lo attacca davvero al bordo.
  en: “Align left” now really snaps it to the edge.
  es: «Alinear a la izquierda» ahora sí lo pega al borde.
- L'occhio di un livello si vede quando è chiuso: prima l'elemento spariva ma l'icona restava un occhio aperto.
  en: A layer’s eye now shows when it’s closed: before, the element disappeared but the icon stayed an open eye.
  es: El ojo de una capa se ve cuando está cerrado: antes el elemento desaparecía pero el icono seguía siendo un ojo abierto.
- Il puntino del cursore non sparisce più quando si aggancia a un pulsante: con il cursore nascosto era l'unico modo di sapere dove stavi puntando.
  en: The cursor dot no longer disappears when it locks onto a button: with the cursor hidden, it was the only way to know where you were pointing.
  es: El puntito del cursor ya no desaparece cuando se engancha a un botón: con el cursor oculto era la única forma de saber adónde apuntabas.

- Un elemento dell'overlay si modifica in un posto solo, accanto alla tela: scegli e hai davanti tutto quello che lo riguarda, senza scendere sotto e perdere di vista l'anteprima.
  en: An overlay element is edited in one place, next to the canvas: pick it and everything about it is right there, without scrolling down and losing sight of the preview.
  es: Un elemento del overlay se edita en un solo lugar, junto al lienzo: lo eliges y tienes delante todo lo que le concierne, sin bajar y perder de vista la vista previa.
- Anche i contatori hanno i loro comandi lì: cosa scrivono, colori, carattere, con o senza sfondo.
  en: Counters have their controls there too: what they say, colors, font, with or without a background.
  es: Los contadores también tienen sus controles ahí: qué escriben, colores, fuente, con o sin fondo.
- I comandi di un elemento sono raggruppati a fisarmonica: prima si scorreva per dodici schermate solo per l'alert, ora ne basta una.
  en: An element’s controls are grouped in collapsible sections: before, the alert alone took twelve screens of scrolling, now one is enough.
  es: Los controles de un elemento se agrupan en acordeón: antes había que desplazarse doce pantallas solo para la alerta, ahora basta con una.
- Il player ha la stazza di un player: la copertina era grande un francobollo perché seguiva la misura delle pastiglie.
  en: The player is now player-sized: the cover art was the size of a stamp because it followed the size of the pills.
  es: El reproductor tiene tamaño de reproductor: la portada era del tamaño de un sello porque seguía la medida de las píldoras.
- Scegliendo un elemento non compare più l'aspetto di un altro: una regola di stile teneva a schermo un blocco che era stato nascosto.
  en: Picking an element no longer shows the look settings of another one: a style rule kept a hidden block on screen.
  es: Al elegir un elemento ya no aparece el aspecto de otro: una regla de estilo mantenía en pantalla un bloque que se había ocultado.
- Anche gli obiettivi si modificano tutti dal pannello: conta, traguardo, partenza e dove stavano ancora nella carta sotto la tela. Nell'elenco resta il nome, il conteggio e i due tasti.
  en: Goals are now fully edited from the panel too: what they count, target, start and position were still in the card under the canvas. The list keeps the name, the count and the two buttons.
  es: Los objetivos también se editan por completo desde el panel: qué cuentan, meta, inicio y posición seguían en la tarjeta bajo el lienzo. En la lista quedan el nombre, la cuenta y los dos botones.
- Nello Studio la tela ha tutto: obiettivi e contatori si trascinano come gli alert, con maniglie, frecce, aggancio e annulla. Prima si potevano mettere in posizione solo scrivendo numeri in un modulo.
  en: In the Studio the canvas has everything: goals and counters drag like alerts, with handles, arrow keys, snapping and undo. Before, you could only position them by typing numbers into a form.
  es: En el Studio el lienzo lo tiene todo: objetivos y contadores se arrastran como las alertas, con asas, flechas, ajuste y deshacer. Antes solo se podían colocar escribiendo números en un formulario.
- Gli angoli della tela sono quelli veri dell'overlay: un obiettivo «in alto a destra» sta a filo dello schermo, e non usciva più dal riquadro come faceva prima.
  en: The canvas corners are the overlay’s real corners: a goal set to “top right” sits flush with the edge of the screen instead of spilling out of the frame like before.
  es: Las esquinas del lienzo son las reales del overlay: un objetivo «arriba derecha» queda al ras de la pantalla, y ya no se sale del recuadro como antes.
- Livelli e Proprietà non coprono più la tela: sono due sponde ai lati, si arrotolano per far spazio, si staccano trascinandole e si riagganciano con un doppio clic.
  en: Layers and Properties no longer cover the canvas: they’re two side panels that roll up to make room, detach when you drag them and dock back with a double click.
  es: Capas y Propiedades ya no tapan el lienzo: son dos paneles a los lados que se enrollan para dejar espacio, se sueltan arrastrándolos y se vuelven a anclar con un doble clic.
- Dimensione e Rotazione hanno un comando solo, cursore e casella insieme: erano due comandi separati che si contraddicevano, e sullo schermo si leggevano tre numeri diversi per lo stesso valore.
  en: Size and Rotation have a single control, slider and box together: they were two separate controls that contradicted each other, showing three different numbers for the same value.
  es: Tamaño y Rotación tienen un solo control, deslizador y casilla juntos: eran dos controles separados que se contradecían, y en pantalla se leían tres números distintos para el mismo valor.
- Annulla riporta indietro anche il player e il conto alla rovescia: li spostavi e Annulla li lasciava dov'erano.
  en: Undo now brings back the player and the countdown too: you moved them and Undo left them where they were.
  es: Deshacer ahora también devuelve el reproductor y la cuenta atrás: los movías y Deshacer los dejaba donde estaban.
- Nei Livelli ogni elemento dice dov'è in percentuale, come le Proprietà e la barra sotto la tela: prima un elemento appena scelto diceva «in alto a sinistra» mentre le Proprietà dicevano già 2%.
  en: In Layers every element shows where it is as a percentage, like Properties and the bar under the canvas: before, a freshly picked element said “top left” while Properties already said 2%.
  es: En Capas cada elemento dice dónde está en porcentaje, como Propiedades y la barra bajo el lienzo: antes un elemento recién elegido decía «arriba izquierda» mientras Propiedades ya decía 2%.
- La regolazione fine sopravvive al salvataggio: le frecce dello Studio spostano di un pixel, ma il salvataggio arrotondava a percentuali intere e ricaricando l'elemento tornava indietro, fino a dieci pixel.
  en: Fine adjustments survive saving: the Studio’s arrow keys move by one pixel, but saving rounded to whole percentages, so on reload the element jumped back by up to ten pixels.
  es: El ajuste fino sobrevive al guardado: las flechas del Studio mueven un píxel, pero al guardar se redondeaba a porcentajes enteros y, al recargar, el elemento retrocedía hasta diez píxeles.
- I contatori seguono le stesse regole degli altri elementi su misure, colori e caratteri: quello che imposti resta nei limiti previsti.
  en: Counters follow the same rules as the other elements for sizes, colors and fonts: whatever you set stays within the intended limits.
  es: Los contadores siguen las mismas reglas que los demás elementos en medidas, colores y fuentes: lo que configuras se mantiene dentro de los límites previstos.
- La maniglia per ruotare si raggiunge sempre: per un elemento in cima alla tela finiva tagliata fuori dal riquadro, e ora passa sotto.
  en: The rotate handle is always within reach: for an element at the top of the canvas it got cut off outside the frame, and now it moves underneath.
  es: El asa para girar siempre se alcanza: en un elemento arriba del lienzo quedaba cortada fuera del recuadro, y ahora pasa por debajo.
- L'elemento che stai modificando sta davanti agli altri: prima un vicino gli copriva le maniglie e si prendeva il clic.
  en: The element you’re editing stays in front of the others: before, a neighbor covered its handles and took the click.
  es: El elemento que estás editando queda delante de los demás: antes uno cercano le tapaba las asas y se llevaba el clic.
- Ogni overlay è una sessione di lavoro a sé: quello che sposti in uno resta lì. Prima player, conto alla rovescia, obiettivi e contatori avevano una posizione sola per tutto il canale e ti seguivano ovunque.
  en: Each overlay is its own workspace: what you move in one stays there. Before, the player, countdown, goals and counters had a single position for the whole channel and followed you everywhere.
  es: Cada overlay es un espacio de trabajo aparte: lo que mueves en uno se queda ahí. Antes reproductor, cuenta atrás, objetivos y contadores tenían una sola posición para todo el canal y te seguían a todas partes.
- Ogni overlay ha il suo Annulla: annullare in una scena non disfa quello che hai fatto in un'altra.
  en: Each overlay has its own Undo: undoing in one scene doesn’t undo what you did in another.
  es: Cada overlay tiene su propio Deshacer: deshacer en una escena no deshace lo que hiciste en otra.
- Lo Studio ha la marcia fine: tieni Ctrl (o ⌘) mentre trascini e il puntatore va a un quinto, così arrivi sotto il pixel. Prima il movimento più piccolo possibile col mouse era di due pixel e mezzo di overlay.
  en: The Studio has a fine gear: hold Ctrl (or ⌘) while dragging and the pointer moves at a fifth of the speed, so you get below a pixel. Before, the smallest mouse move was two and a half overlay pixels.
  es: El Studio tiene marcha fina: con Ctrl (o ⌘) al arrastrar, el puntero va a un quinto de velocidad y llegas por debajo del píxel. Antes el mínimo movimiento con el mouse era de dos píxeles y medio del overlay.
- Con Maiusc premuto l'elemento resta dritto sull'asse in cui l'hai avviato, senza sbandare.
  en: With Shift held down, the element stays straight on the axis you started on, without drifting.
  es: Con Mayús pulsado, el elemento sigue recto en el eje en que empezaste, sin desviarse.
- La rotellina non ridimensiona più da sola: scorrendo la pagina sopra la tela cambiavi misura all'elemento senza volerlo. Ora serve Alt per la misura e Maiusc per la rotazione.
  en: The scroll wheel no longer resizes on its own: scrolling the page over the canvas changed the element’s size by accident. Now you need Alt for size and Shift for rotation.
  es: La rueda del mouse ya no cambia el tamaño sola: al desplazar la página sobre el lienzo cambiabas el tamaño del elemento sin querer. Ahora hace falta Alt para el tamaño y Mayús para la rotación.
- Lo zoom della tela arriva al 400%, perché sotto il 227% un pixel dell'overlay non si vede nemmeno.
  en: Canvas zoom goes up to 400%, because below 227% you can’t even see a single overlay pixel.
  es: El zoom del lienzo llega al 400%, porque por debajo del 227% un píxel del overlay ni se ve.
- Il sito ha preso il tema dal marchio: la sfumatura dal magenta al vino che c'è nel logo passa ora nei titoli e nei pulsanti, e il contorno scuro che tiene insieme le lettere tiene anche i pulsanti e le pastiglie.
  en: The site took its theme from the brand: the magenta-to-wine gradient in the logo now runs through titles and buttons, and the dark outline holding the letters together holds buttons and pills too.
  es: El sitio tomó el tema de la marca: el degradado de magenta a vino del logo pasa ahora a títulos y botones, y el contorno oscuro que une las letras une también botones y píldoras.
- Vale dentro e fuori, in chiaro e in scuro: sul fondo scuro il contorno ha un filo di luce, così si legge come si legge il marchio.
  en: It applies inside and out, in light and dark: on a dark background the outline gets a thin line of light, so it reads the way the brand does.
  es: Vale dentro y fuera, en claro y en oscuro: sobre fondo oscuro el contorno tiene un hilo de luz, así se lee como se lee la marca.
- L'occhio dei Livelli toglie l'elemento dalla scena in cui stai lavorando, non da tutte: puoi avere una scena con un obiettivo e un'altra con un altro.
  en: The eye in Layers removes the element from the scene you’re working on, not from all of them: you can have one scene with one goal and another with a different one.
  es: El ojo de Capas quita el elemento de la escena en la que estás trabajando, no de todas: puedes tener una escena con un objetivo y otra con otro.
- L'interruttore di un elemento, quello nel suo pannello, resta invece valido ovunque: uno spegne l'elemento, l'altro lo toglie da una scena sola.
  en: An element’s switch, the one in its panel, still applies everywhere: one turns the element off, the other removes it from a single scene.
  es: El interruptor de un elemento, el de su panel, en cambio vale en todas partes: uno apaga el elemento, el otro lo quita de una sola escena.
- Il sito è disegnato a mano come il marchio: i titoli hanno il tratto del logo, i riquadri hanno angoli storti come tirati a penna e i pulsanti portano l'ombra piena dell'inchiostro.
  en: The site is hand-drawn like the brand: titles have the logo’s stroke, boxes have crooked corners as if drawn in pen, and buttons carry a solid ink shadow.
  es: El sitio está dibujado a mano como la marca: los títulos tienen el trazo del logo, los recuadros tienen esquinas torcidas como hechas a pluma y los botones llevan la sombra llena de la tinta.
- I pulsanti si timbrano invece di illuminarsi: premendoli scendono sull'ombra come un timbro sulla carta.
  en: Buttons stamp instead of lighting up: when you press them they sink onto their shadow like a stamp on paper.
  es: Los botones se estampan en lugar de iluminarse: al pulsarlos bajan sobre su sombra como un sello sobre el papel.
- Il carattere disegnato è ospitato sul nostro server come tutti gli altri, quindi la pagina non chiede niente a nessuno per disegnarsi.
  en: The hand-drawn font is hosted on our server like all the others, so the page doesn’t ask anyone for anything to draw itself.
  es: La fuente dibujada está alojada en nuestro servidor como todas las demás, así que la página no le pide nada a nadie para dibujarse.
- Il sito è una tavola di manga: il fondo è carta, dietro al titolo ci sono le linee che convergono e sopra passa il retino a puntini.
  en: The site is a manga page: the background is paper, speed lines converge behind the title, and a halftone dot screen runs over the top.
  es: El sitio es una página de manga: el fondo es papel, detrás del título convergen las líneas y por encima pasa la trama de puntos.
- Dentro e fuori parlano la stessa lingua: pulsanti, menù, pannelli, elenchi e perfino il cursore hanno il contorno d'inchiostro.
  en: Inside and out speak the same language: buttons, menus, panels, lists and even the cursor have the ink outline.
  es: Dentro y fuera hablan el mismo idioma: botones, menús, paneles, listas y hasta el cursor tienen el contorno de tinta.
- Le parole in risalto del titolo si colorano da sinistra a destra quando la pagina arriva, come le colorerebbe un disegnatore.
  en: The highlighted words in the title fill with color from left to right as the page loads, the way an artist would color them.
  es: Las palabras destacadas del título se colorean de izquierda a derecha cuando llega la página, como las colorearía un dibujante.
- I testi piccoli sono più scuri: su carta chiara quelli di prima si leggevano male.
  en: Small text is darker: on light paper the old one was hard to read.
  es: Los textos pequeños son más oscuros: sobre papel claro los de antes se leían mal.
- Il lettering disegnato è dei titoli, dei comandi e del marchio; il testo che si legge ha un carattere pulito, come in una tavola vera.
  en: The hand-drawn lettering is for titles, controls and the brand; the text you read has a clean font, like on a real comic page.
  es: El lettering dibujado es para los títulos, los controles y la marca; el texto que se lee tiene una fuente limpia, como en una página de verdad.
- La schermata di caricamento è una vignetta: linee che convergono sul marchio, retino e il logo che si timbra.
  en: The loading screen is a comic panel: lines converging on the brand, halftone and the logo stamping in.
  es: La pantalla de carga es una viñeta: líneas que convergen en la marca, trama y el logo que se estampa.
- Su telefono le ultime righe in fondo alla pagina non finiscono più sotto la barra dei pulsanti.
  en: On phones, the last lines at the bottom of the page no longer end up under the button bar.
  es: En el teléfono, las últimas líneas al final de la página ya no quedan debajo de la barra de botones.
- Menù, cassetto, campi e interruttori hanno il contorno d'inchiostro come tutto il resto.
  en: Menus, the drawer, fields and switches have the ink outline like everything else.
  es: Menús, cajón, campos e interruptores tienen el contorno de tinta como todo lo demás.
- Il puntatore è disegnato: una freccia con il contorno d'inchiostro, e non insegue più il mouse, quindi non resta mai indietro.
  en: The pointer is hand-drawn: an arrow with an ink outline, and it no longer chases the mouse, so it never lags behind.
  es: El puntero está dibujado: una flecha con contorno de tinta, y ya no persigue al mouse, así que nunca se queda atrás.
- Anche le guide e l'anteprima dei link sono tavole: carta, linee che convergono, retino e lettering disegnato.
  en: Guides and link previews are comic pages too: paper, converging lines, halftone and hand-drawn lettering.
  es: Las guías y la vista previa de los enlaces también son páginas de cómic: papel, líneas que convergen, trama y lettering dibujado.
- Il marchio nella schermata di caricamento è dentro la pagina stessa: non lo si chiede più alla rete, quindi non può mancare.
  en: The brand on the loading screen is built into the page itself: it’s no longer fetched from the network, so it can’t go missing.
  es: La marca de la pantalla de carga está dentro de la propia página: ya no se pide a la red, así que no puede faltar.
- Sopra le cose che si cliccano il puntatore diventa un lampo a quattro punte: cambia forma senza rincorrere il mouse, quindi non resta indietro.
  en: Over clickable things the pointer turns into a four-pointed spark: it changes shape without chasing the mouse, so it doesn’t lag behind.
  es: Sobre lo que se puede pulsar, el puntero se vuelve un destello de cuatro puntas: cambia de forma sin perseguir al mouse, así que no se queda atrás.
- Passando sopra un pulsante, attorno a lui si allarga una sagoma d'inchiostro, e la stella del puntatore ci si muove dentro.
  en: Hovering over a button spreads an ink shape around it, and the pointer’s star moves around inside it.
  es: Al pasar sobre un botón, a su alrededor se abre una silueta de tinta, y la estrella del puntero se mueve dentro.
- Il lettering del sito è il pennarello del marchio, non un carattere tondo da fumetto per bambini.
  en: The site’s lettering is the brand’s marker, not a rounded kids’ comic font.
  es: El lettering del sitio es el marcador de la marca, no una fuente redonda de cómic infantil.
- Se il sito non riesce a caricarsi resta comunque la sua pagina, vestita come tutto il resto, invece di una schermata spoglia.
  en: If the site can’t load, you still get its own page, dressed like everything else, instead of a bare screen.
  es: Si el sitio no logra cargar, queda igualmente su página, vestida como todo lo demás, en lugar de una pantalla vacía.
- Anche il carattere «manga» che puoi scegliere per l'overlay ora è un pennarello vero.
  en: The “Manga” font you can pick for the overlay is now a real marker too.
  es: La fuente «Manga» que puedes elegir para el overlay ahora también es un marcador de verdad.
- Le cose arrivano a scatti invece di scivolare, come i disegni tenuti due fotogrammi nell'animazione giapponese: si sente più veloce.
  en: Things arrive in snaps instead of sliding, like drawings held for two frames in Japanese animation: it feels faster.
  es: Las cosas llegan a saltos en lugar de deslizarse, como los dibujos que duran dos fotogramas en la animación japonesa: se siente más rápido.
- Gli avvisi entrano di slancio e quelli di errore danno una scrollata, così non passano inosservati.
  en: Notices burst in, and error notices give a shake, so they don’t go unnoticed.
  es: Los avisos entran con impulso y los de error dan una sacudida, así no pasan desapercibidos.
- Barre di avanzamento, equalizzatore e misuratore del volume si muovono senza far ricalcolare la pagina: il movimento è più fluido, soprattutto sull'overlay in diretta.
  en: Progress bars, the equalizer and the volume meter move without making the page recalculate its layout: motion is smoother, especially on the live overlay.
  es: Las barras de progreso, el ecualizador y el medidor de volumen se mueven sin que la página se recalcule: el movimiento es más fluido, sobre todo en el overlay en directo.
- Il puntatore disegnato ora vale ovunque: prima su alcune intestazioni e barre di sezione tornava quello di sistema.
  en: The hand-drawn pointer now works everywhere: before, the system one came back on some headers and section bars.
  es: El puntero dibujado ahora vale en todas partes: antes, en algunos encabezados y barras de sección, volvía el del sistema.
- Scegliendo un obiettivo sulla tela le sue proprietà (colori, carattere, forma, cornice, opacità) si aprono lì accanto, come per ogni altro elemento.
  en: Picking a goal on the canvas opens its properties (colors, font, shape, frame, opacity) right next to it, like any other element.
  es: Al elegir un objetivo en el lienzo, sus propiedades (colores, fuente, forma, marco, opacidad) se abren al lado, como con cualquier otro elemento.
- Trascinare un contatore non lo fa più saltare a metà schermo, e ora si può anche ruotare.
  en: Dragging a counter no longer makes it jump to the middle of the screen, and now it can be rotated too.
  es: Arrastrar un contador ya no lo hace saltar a media pantalla, y ahora también se puede girar.
- L'occhio di «Obiettivo» e «Contatori» funziona davvero: prima si spegneva e al ricaricamento tornava acceso, quindi non si potevano togliere da un overlay.
  en: The eye on “Goal” and “Counters” really works: before, it turned off and came back on after a reload, so you couldn’t remove them from an overlay.
  es: El ojo de «Objetivo» y «Contadores» funciona de verdad: antes se apagaba y al recargar volvía a encenderse, así que no se podían quitar de un overlay.
- Il giro guidato insegna invece di raccontare: ogni tappa è un passo da fare, con la luce puntata sul comando che nomina, e se sta dentro una sezione chiusa, la apre.
  en: The guided tour teaches instead of telling: each stop is a step to take, with the spotlight on the control it names, and if that’s inside a closed section, it opens it.
  es: El recorrido guiado enseña en lugar de contar: cada parada es un paso que dar, con el foco en el control que nombra, y si está dentro de una sección cerrada, la abre.
- Tre schede che il giro saltava (Avatar 3D, Grafiche social, Scudo anti-bot) adesso ce l'hanno.
  en: Three tabs the tour skipped (Avatar 3D, Social graphics, Anti-bot shield) now have one.
  es: Tres pestañas que el recorrido se saltaba (Avatar 3D, Gráficas sociales, Escudo anti-bot) ahora lo tienen.

## 2026-09-02

- Gli obiettivi sono quanti ne vuoi, non uno: ognuno col suo traguardo, il suo angolo e il suo aspetto: colori, carattere, forma, cornice, dimensione, opacità.
  en: You can have as many goals as you like, not just one: each with its own target, its own corner and its own look: colors, font, shape, frame, size, opacity.
  es: Puedes tener tantos objetivos como quieras, no solo uno: cada uno con su meta, su esquina y su aspecto: colores, fuente, forma, marco, tamaño, opacidad.
- Due obiettivi che contano la stessa cosa salgono insieme: una scala («100 follower», «500 follower») si fa senza rifare niente a mano.
  en: Two goals that count the same thing go up together: a ladder (“100 followers”, “500 followers”) needs nothing redone by hand.
  es: Dos objetivos que cuentan lo mismo suben juntos: una escalera («100 seguidores», «500 seguidores») se arma sin rehacer nada a mano.
- C'è il manuale dell'overlay: i sette elementi, i valori di base, le parole da usare nei testi degli alert e cosa fare quando non si vede niente.
  en: The overlay has its own manual: the seven elements, the defaults, the words to use in alert texts, and what to do when nothing shows up.
  es: El overlay tiene su manual: los siete elementos, los valores de base, las palabras para los textos de las alertas y qué hacer cuando no se ve nada.
- Nell'overlay c'è l'obiettivo: una barra che si riempie da sola mentre arrivano follower, sub o bit, col conto vero e un tasto per ripartire da zero.
  en: The overlay has a goal: a bar that fills up by itself as followers, subs or bits come in, with the real count and a button to start over from zero.
  es: El overlay tiene un objetivo: una barra que se llena sola a medida que llegan seguidores, subs o bits, con la cuenta real y un botón para volver a empezar de cero.
- I contatori sono diventati un elemento dell'overlay come gli altri: si spengono dall'elenco e prendono la veste della scena, senza perdere i colori che gli hai dato tu.
  en: Counters are now an overlay element like the others: you turn them off from the list and they take on the scene’s style, without losing the colors you gave them.
  es: Los contadores ahora son un elemento del overlay como los demás: se apagan desde la lista y toman el estilo de la escena, sin perder los colores que les diste.
- Gli sfondi dell'overlay c'erano ma non si vedevano: alert, chat e widget uscivano trasparenti, quindi scritte bianche appoggiate sul gioco. Ora si vedono.
  en: Overlay backgrounds were there but didn’t show: alerts, chat and widgets came out transparent, so white text sat right on top of the game. Now they show.
  es: Los fondos del overlay estaban, pero no se veían: alertas, chat y widgets salían transparentes, así que el texto blanco quedaba encima del juego. Ahora se ven.
- L'overlay non è più viola Twitch di serie.
  en: The overlay no longer comes in Twitch purple by default.
  es: El overlay ya no viene en morado de Twitch por defecto.
- La prima volta che entri in una scheda, il bot te la fa vedere passo passo: a cosa serve, cosa c'è dentro con la luce puntata sopra, e dove leggere di più.
  en: The first time you open a tab, the bot walks you through it: what it’s for, what’s inside with a spotlight on it, and where to read more.
  es: La primera vez que entras en una pestaña, el bot te la muestra paso a paso: para qué sirve, qué hay dentro con un foco encima y dónde leer más.
- Il giro si vede una volta sola e si rifà quando vuoi dal «?». Se stai già facendo qualcosa non parte.
  en: The tour shows up only once, and you can replay it whenever you like from the “?”. If you’re already in the middle of something, it doesn’t start.
  es: El recorrido se ve una sola vez y lo repites cuando quieras desde el «?». Si ya estás haciendo algo, no arranca.
- I comandi pronti sono tradotti: nome e spiegazione escono in italiano, inglese e spagnolo come il resto del pannello.
  en: Built-in commands are translated: name and description come out in Italian, English and Spanish, like the rest of the panel.
  es: Los comandos de serie están traducidos: nombre y explicación salen en italiano, inglés y español, como el resto del panel.
- I giochi si creano tutti da un posto solo: prima c'erano due riquadri che facevano la stessa cosa e uno ti spostava in un'altra scheda per finire il lavoro.
  en: All games are created from one place: before, there were two boxes doing the same thing, and one sent you to another tab to finish the job.
  es: Todos los juegos se crean desde un solo lugar: antes había dos recuadros que hacían lo mismo, y uno te mandaba a otra pestaña para terminar.
- Si sceglie chi lancia il gioco (il bot a sorpresa, o uno spettatore che scrive un comando) e il resto si adatta.
  en: You choose who starts the game (the bot, as a surprise, or a viewer typing a command) and everything else adapts.
  es: Eliges quién lanza el juego (el bot por sorpresa, o un espectador que escribe un comando) y el resto se adapta.
- Nell'editor dei giochi le parole magiche offerte sono quelle che a un gioco servono: monete, caso, numeri, chi scrive. Le altre restano a un clic.
  en: In the game editor, the magic words on offer are the ones a game needs: coins, chance, numbers, who’s typing. The rest are one click away.
  es: En el editor de juegos, las palabras mágicas que se ofrecen son las que un juego necesita: monedas, azar, números, quién escribe. Las demás están a un clic.
- Sul telefono il «?» apre guide, manuali e novità dentro al menù, come righe: prima usciva una tendina più larga del menù e si leggeva mezza parola.
  en: On your phone, the “?” opens guides, manuals and what’s new inside the menu, as rows: before, a dropdown wider than the menu popped up and you could read half a word.
  es: En el teléfono, el «?» abre guías, manuales y novedades dentro del menú, como filas: antes salía un desplegable más ancho que el menú y se leía media palabra.
- Anche il cambio canale sul telefono è diventato un elenco, per lo stesso motivo.
  en: Switching channels on your phone is now a list too, for the same reason.
  es: El cambio de canal en el teléfono ahora también es una lista, por el mismo motivo.
- Tutto quello che si chiama con un «!» adesso si gestisce: una quarantina di comandi pronti, ognuno da spegnere, rinominare o riservare a sub, VIP e moderatori. Li trovi in Comandi, in fondo.
  en: Everything you call with a “!” can now be managed: about forty built-in commands, each one you can turn off, rename or keep for subs, VIPs and mods. You’ll find them at the bottom of Commands.
  es: Todo lo que se llama con un «!» ahora se gestiona: unos cuarenta comandos de serie que puedes apagar, renombrar o reservar a subs, VIP y moderadores. Los encuentras al final de Comandos.
- «!giochi» risponde una volta sola: prima usciva l'elenco dei giochi di chat e, subito sotto, quello dei giochi con la webcam, anche a chi la webcam non la usa.
  en: “!giochi” answers only once: before, it listed the chat games and, right below, the webcam games, even for people who don’t use a webcam.
  es: «!giochi» responde una sola vez: antes salía la lista de juegos del chat y, justo debajo, la de juegos con webcam, incluso a quien no usa la webcam.
- Un comando di una famiglia spenta non risponde più e il pannello te lo dice, invece di lasciarti indovinare perché tace.
  en: A command from a family that’s turned off no longer answers, and the panel tells you so instead of leaving you to guess why it’s silent.
  es: Un comando de una familia apagada ya no responde, y el panel te lo dice en lugar de dejarte adivinar por qué calla.
- Ogni gioco si accende e si spegne da solo, si rinomina e si può riservare a sub, VIP o moderatori: prima i comandi erano fissi e non si poteva toccarne nemmeno uno.
  en: Each game can be turned on and off by itself, renamed, and kept for subs, VIPs or mods: before, the commands were fixed and you couldn’t touch a single one.
  es: Cada juego se enciende y se apaga por separado, se renombra y se puede reservar a subs, VIP o moderadores: antes los comandos eran fijos y no se podía tocar ni uno.
- La scheda Giochi elenca tutti i comandi veri: ne mostrava dieci su trenta, e cinque giochi (pesca, roulette, furto, regala, manche) non li nominava affatto mentre il bot li annunciava in chat.
  en: The Games tab lists all the real commands: it showed ten out of thirty, and five games (Fishing, Roulette, Heist, gift, Rounds) weren’t named at all while the bot announced them in chat.
  es: La pestaña Juegos enumera todos los comandos reales: mostraba diez de treinta, y cinco juegos (Pesca, Ruleta, Robo, regalo, Rondas) ni se nombraban mientras el bot los anunciaba en el chat.
- «!giochi» in chat dice i giochi accesi coi nomi che hai scelto tu, invece di un elenco fisso che poteva non corrispondere.
  en: “!giochi” in chat lists the games that are on, with the names you picked, instead of a fixed list that might not match.
  es: «!giochi» en el chat dice los juegos activos con los nombres que elegiste, en lugar de una lista fija que podía no coincidir.
- La promo social è passata dalle Notifiche, dove sta di casa: nella scheda Giochi non c'entrava niente.
  en: The social promo moved to Notifications, where it belongs: it had nothing to do with the Games tab.
  es: La promo social pasó a Notificaciones, donde le corresponde: en la pestaña Juegos no tenía nada que ver.
- Ogni scheda del pannello ha il suo manuale o la sua guida: prima ce l'avevano sei schede su ventiquattro, e nelle altre il «?» in barra non aveva niente da offrire.
  en: Every tab in the panel has its own manual or guide: before, only six tabs out of twenty-four had one, and in the others the “?” in the bar had nothing to offer.
  es: Cada pestaña del panel tiene su manual o su guía: antes solo lo tenían seis de veinticuatro, y en las demás el «?» de la barra no tenía nada que ofrecer.
- Sette manuali nuovi: il bot, la moderazione, sondaggi e sorteggi, la diretta, la vetrina, l'abbonamento e le emote. Con i valori di base e i limiti veri, non descrizioni generiche.
  en: Seven new manuals: the bot, moderation, polls and giveaways, the live stream, the showcase, the subscription and emotes. With the real defaults and limits, not generic descriptions.
  es: Siete manuales nuevos: el bot, la moderación, encuestas y sorteos, el directo, el escaparate, la suscripción y los emotes. Con los valores de base y los límites reales, no descripciones genéricas.
- Il sito ha i colori del logo, chiaro e scuro: prima la carta era calda e l'accento arancione, e con un marchio magenta non c'entravano niente.
  en: The site now has the logo’s colors, in light and dark: before, the paper was warm and the accent orange, which had nothing to do with a magenta brand.
  es: El sitio tiene los colores del logo, en claro y oscuro: antes el papel era cálido y el acento naranja, y con una marca magenta no tenían nada que ver.
- Sul tema scuro il logo ha di nuovo l'alone dietro anche nella pagina pubblica e nelle guide: ce l'aveva solo la barra in alto.
  en: In the dark theme, the logo has its glow behind it again on the public page and in the guides too: only the top bar had it.
  es: En el tema oscuro, el logo vuelve a tener el halo detrás también en la página pública y en las guías: solo lo tenía la barra de arriba.
- L'anteprima che esce quando condividi un link, e l'icona dell'app, sono dei colori nuovi: restavano indietro di un marchio.
  en: The preview that shows up when you share a link, and the app icon, now use the new colors: they were one brand behind.
  es: La vista previa que sale cuando compartes un enlace, y el icono de la app, tienen los colores nuevos: se habían quedado una marca atrás.
- Le scritte più tenui, il verde e l'ambra adesso si leggono: stavano sotto la soglia di contrasto anche prima del cambio.
  en: The faintest text, the green and the amber are now readable: they were below the contrast threshold even before the change.
  es: Los textos más tenues, el verde y el ámbar ahora se leen: estaban por debajo del umbral de contraste incluso antes del cambio.
- Nella barra c'è un «?» che porta a guide, manuali e novità, e in cima quella della scheda che stai guardando.
  en: The bar has a “?” that leads to guides, manuals and what’s new, with the one for the tab you’re looking at on top.
  es: En la barra hay un «?» que lleva a guías, manuales y novedades, y arriba la de la pestaña que estás mirando.
- L'avviso della guida impara: dove sei già entrato e uscito senza fare niente arriva prima, e se gli dici due volte «non serve» sta zitto per un mese.
  en: The guide prompt learns: where you’ve already come and gone without doing anything it shows up sooner, and if you tell it “No thanks” twice it stays quiet for a month.
  es: El aviso de la guía aprende: donde ya entraste y saliste sin hacer nada aparece antes, y si le dices dos veces «No hace falta» se calla un mes.
- Quando si vede che sei in difficoltà (fermo, un errore appena uscito, la rotella su e giù, o ci torni per la terza volta) il bot ti dice che per quella scheda c'è una guida. Si zittisce per sempre con un clic.
  en: When it’s clear you’re stuck (not moving, an error just popped up, scrolling up and down, or back for the third time), the bot tells you there’s a guide for that tab. One click silences it for good.
  es: Cuando se nota que tienes dificultades (quieto, un error recién salido, la rueda arriba y abajo, o vuelves por tercera vez), el bot te dice que esa pestaña tiene una guía. Se calla para siempre con un clic.
- Se è una guida, si apre sul punto che dice cosa fare in SocialBot: non su una spiegazione generica.
  en: If it’s a guide, it opens at the part that says what to do in SocialBot, not at a generic explanation.
  es: Si es una guía, se abre en la parte que dice qué hacer en SocialBot, no en una explicación genérica.
- Privacy, termini, invito ai moderatori e sblocco hanno lo stesso aspetto del resto del sito e seguono il tema che hai scelto: erano rimaste scure e viola.
  en: Privacy, terms, the moderator invite and unlock look like the rest of the site and follow the theme you picked: they had stayed dark and purple.
  es: Privacidad, términos, la invitación a moderadores y el desbloqueo tienen el mismo aspecto que el resto del sitio y siguen el tema que elegiste: se habían quedado oscuros y morados.
- Su Kick il bot scrive con il tuo account, come su Twitch: prima provava con un account suo e Kick rifiutava, quindi in chat non usciva niente.
  en: On Kick the bot writes with your account, like on Twitch: before, it tried with an account of its own and Kick refused it, so nothing showed up in chat.
  es: En Kick el bot escribe con tu cuenta, como en Twitch: antes lo intentaba con una cuenta propia y Kick la rechazaba, así que en el chat no salía nada.
- La pagina pubblica è dello stesso colore del resto del bot e segue il tema che hai scelto, chiaro o scuro: prima era scura e basta, anche se avevi scelto chiaro.
  en: The public page has the same colors as the rest of the bot and follows the theme you picked, light or dark: before, it was always dark, even if you’d chosen light.
  es: La página pública tiene los mismos colores que el resto del bot y sigue el tema que elegiste, claro u oscuro: antes era oscura y punto, aunque hubieras elegido claro.
- Dalla pagina pubblica si arriva a guide, manuali e novità con un clic: prima stavano solo in fondo alla pagina.
  en: From the public page, guides, manuals and what’s new are one click away: before, they were only at the bottom of the page.
  es: Desde la página pública se llega a guías, manuales y novedades con un clic: antes solo estaban al final de la página.
- Quando condividi un link di SocialBot esce l'anteprima giusta: privacy, termini, invito ai moderatori, sblocco e mini app non ne avevano nessuna, e le chat mostravano una cartolina vecchia.
  en: When you share a SocialBot link, the right preview shows up: privacy, terms, the moderator invite, unlock and the mini app had none, and chats showed an old postcard.
  es: Cuando compartes un enlace de SocialBot sale la vista previa correcta: privacidad, términos, invitación a moderadores, desbloqueo y mini app no tenían ninguna, y los chats mostraban una postal vieja.
- Se Kick non manda niente, il pannello dice quale delle quattro cause è, e c'è un tasto per rifare l'iscrizione agli eventi senza ricollegare l'account.
  en: If Kick sends nothing, the panel tells you which of the four causes it is, and there’s a button to redo the event subscription without reconnecting your account.
  es: Si Kick no manda nada, el panel te dice cuál de las cuatro causas es, y hay un botón para rehacer la suscripción a los eventos sin volver a conectar la cuenta.
- Ci si registra anche con Kick: se trasmetti solo lì non ti serve un account Twitch, e le parti che senza Twitch non funzionerebbero il pannello te le dice spente invece di fingere.
  en: You can sign up with Kick too: if you only stream there you don’t need a Twitch account, and the panel shows the parts that wouldn’t work without Twitch as off instead of pretending.
  es: Ahora te puedes registrar también con Kick: si solo emites ahí no necesitas una cuenta de Twitch, y el panel te muestra apagadas las partes que sin Twitch no funcionarían, en lugar de fingir.
- Il bot funziona davvero su Kick: gli eventi che Kick ci mandava venivano rifiutati dal sito, quindi il collegamento riusciva e poi non arrivava niente.
  en: The bot really works on Kick: the site was rejecting the events Kick sent us, so the connection went through and then nothing arrived.
  es: El bot funciona de verdad en Kick: el sitio rechazaba los eventos que Kick nos mandaba, así que la conexión se hacía y luego no llegaba nada.
- Su Kick il bot non si ascolta più da solo: le sue risposte non contano come messaggi della chat.
  en: On Kick the bot no longer listens to itself: its replies don’t count as chat messages.
  es: En Kick el bot ya no se escucha a sí mismo: sus respuestas no cuentan como mensajes del chat.
- Il menù laterale si chiude cliccando fuori, non solo con la X: su schermi larghi restava aperto.
  en: The side menu closes when you click outside it, not just with the X: on wide screens it stayed open.
  es: El menú lateral se cierra haciendo clic fuera, no solo con la X: en pantallas anchas se quedaba abierto.
- Ci sono due manuali, uno per i giochi e uno per i moduli: cosa fa ogni comando, quanto costa, quanto paga, e cosa vuol dire ogni variabile. Li apri dalle schede Giochi e Comandi.
  en: There are two manuals, one for games and one for modules: what each command does, what it costs, what it pays, and what each variable means. You open them from the Games and Commands tabs.
  es: Hay dos manuales, uno para los juegos y otro para los módulos: qué hace cada comando, cuánto cuesta, cuánto paga y qué significa cada variable. Los abres desde las pestañas Juegos y Comandos.
- C'è una pagina Novità, e in cima al pannello trovi quello che è cambiato da quando non guardavi: se aggiungiamo qualcosa, adesso lo sai.
  en: There’s a What’s new page, and at the top of the panel you find what changed since you last looked: when we add something, now you know.
  es: Hay una página de Novedades, y arriba en el panel encuentras lo que cambió desde la última vez que miraste: si añadimos algo, ahora lo sabes.
- Le pagine che si aprono senza login tornano a funzionare: la home restava sotto il velo di caricamento, l'overlay in OBS era bianco, e l'invito ai moderatori e lo sblocco con passkey non facevano niente.
  en: Pages that open without logging in work again: the home page was stuck under the loading screen, the overlay in OBS was blank, and the moderator invite and passkey unlock did nothing.
  es: Las páginas que se abren sin iniciar sesión vuelven a funcionar: la portada se quedaba bajo el velo de carga, el overlay en OBS estaba en blanco, y la invitación y el desbloqueo con passkey no hacían nada.
- Il marchio nuovo: il logo nella barra in alto al posto della scritta, e la schermata di caricamento che respira invece dello sfondo.
  en: The new brand: the logo in the top bar instead of the wordmark, and a loading screen that breathes instead of the background.
  es: La marca nueva: el logo en la barra de arriba en lugar del texto, y la pantalla de carga que respira en vez del fondo.
- Il logo nuovo arriva anche a chi era già passato dal sito: prima restava incastrato quello vecchio nella linguetta del browser.
  en: The new logo reaches people who had already visited the site too: before, the old one stayed stuck in the browser tab.
  es: El logo nuevo llega también a quien ya había pasado por el sitio: antes el viejo se quedaba atascado en la pestaña del navegador.
- Nella scheda Giochi c'è "Inventa un gioco tuo": i giochi non sono più solo quelli pronti, te li costruisci come i comandi.
  en: The Games tab has “Make up your own game”: games are no longer just the ready-made ones, you build them like commands.
  es: En la pestaña Juegos está «Inventa tu propio juego»: los juegos ya no son solo los que vienen hechos, te los armas como los comandos.
- Sei ricette a punti da cui partire: slot, scommessa, regalo, furto, saldo e "dai punti".
  en: Six points recipes to start from: slots, bet, gift, heist, balance and “give points”.
  es: Seis recetas con puntos para empezar: tragaperras, apuesta, regalo, robo, saldo y «dar puntos».
- Il costo di un gioco può essere una cifra che scrive chi gioca, non solo un numero fisso.
  en: A game’s cost can be an amount the player types in, not just a fixed number.
  es: El costo de un juego puede ser una cifra que escribe quien juega, no solo un número fijo.
- Puoi aggiustare le monete di qualcuno a mano dal pannello, senza passare dalla chat.
  en: You can adjust someone’s coins by hand from the panel, without going through chat.
  es: Puedes ajustar las monedas de alguien a mano desde el panel, sin pasar por el chat.
- Nelle risposte a punti puoi usare la cifra davvero mossa e il nome di chi l'ha subita, così un furto racconta quello che è successo.
  en: In points replies you can use the amount actually moved and the name of whoever it happened to, so a heist tells what really happened.
  es: En las respuestas con puntos puedes usar la cifra que se movió de verdad y el nombre de quien la sufrió, así un robo cuenta lo que pasó.
- Un comando che ti sei costruito tu vince sempre su quello pronto con lo stesso nome.
  en: A command you built yourself always wins over a built-in one with the same name.
  es: Un comando que armaste tú siempre gana sobre el de serie con el mismo nombre.
- "Scarica i miei dati" funziona anche su iPhone: prima non partiva niente.
  en: “Download my data” works on iPhone too: before, nothing happened.
  es: «Descargar mis datos» funciona también en iPhone: antes no pasaba nada.
- La barra in alto si ritira quando non ci sta, invece di accavallarsi su schermi stretti.
  en: The top bar tucks away when it doesn’t fit, instead of overlapping on narrow screens.
  es: La barra de arriba se repliega cuando no cabe, en lugar de superponerse en pantallas estrechas.
- Le dirette dal browser (Studio Web) sono spente: erano promesse in ventun punti e non funzionavano.
  en: Streaming from the browser (Web Studio) is turned off: it was promised in twenty-one places and didn’t work.
  es: Las transmisiones desde el navegador (Estudio Web) están apagadas: se prometían en veintiún lugares y no funcionaban.

## 2026-08-29

- Due classifiche separate: una del pubblico e una dello staff, così i moderatori non coprono più i primi posti.
  en: Two separate leaderboards: one for the audience and one for the staff, so mods no longer take up the top spots.
  es: Dos clasificaciones separadas: una del público y otra del staff, así los moderadores ya no ocupan los primeros puestos.
- Il premio in VIP salta chi ce l'ha già per sempre e passa al successivo, invece di accorciarglielo.
  en: The VIP prize skips anyone who already has VIP for good and moves on to the next person, instead of shortening theirs.
  es: El premio de VIP se salta a quien ya lo tiene para siempre y pasa al siguiente, en lugar de acortárselo.
- La barra "non hai salvato" indica il salva della zona che stai modificando, e sparisce quando salvi lì.
  en: The “not saved” bar points to the Save button of the area you’re editing, and disappears when you save there.
  es: La barra de «no guardado» señala el botón Guardar de la zona que estás editando, y desaparece cuando guardas ahí.
- Le immagini che arrivano da fuori, emote comprese, non si rompono più.
  en: Images that come from outside, emotes included, no longer break.
  es: Las imágenes que llegan de fuera, emotes incluidos, ya no se rompen.

## 2026-08-28

- Caricare emote nuove su 7TV funziona di nuovo.
  en: Uploading new emotes to 7TV works again.
  es: Subir emotes nuevos a 7TV vuelve a funcionar.
- Il bot parla su Kick: comandi, moderazione e avvisi, con lo stesso pannello.
  en: The bot talks on Kick: commands, moderation and alerts, from the same panel.
  es: El bot habla en Kick: comandos, moderación y avisos, con el mismo panel.
- Un !comando scritto su Kick non riceve più la risposta su Twitch.
  en: A !command typed on Kick no longer gets its reply on Twitch.
  es: Un !comando escrito en Kick ya no recibe la respuesta en Twitch.
- Puoi scegliere su quali piattaforme gira ogni singolo comando; quelli che hai già restano come stanno.
  en: You can choose which platforms each command runs on; the ones you already have stay as they are.
  es: Puedes elegir en qué plataformas funciona cada comando; los que ya tienes se quedan como están.
- L'avviso di diretta è uno solo per tutte le piattaforme, non uno per ognuna.
  en: The go-live alert is a single one for all platforms, not one for each.
  es: El aviso de directo es uno solo para todas las plataformas, no uno para cada una.
- Porti qui i comandi che hai già su un altro bot, senza riscriverli a mano.
  en: You can bring over the commands you already have on another bot, without retyping them by hand.
  es: Puedes traer aquí los comandos que ya tienes en otro bot, sin reescribirlos a mano.
- Puoi scaricare tutti i tuoi dati quando vuoi, in un file solo.
  en: You can download all your data whenever you want, in a single file.
  es: Puedes descargar todos tus datos cuando quieras, en un solo archivo.
- La libreria dei media si apre da ogni campo dove serve un'immagine o un suono, non solo dalla sua scheda.
  en: The media library opens from any field that needs an image or a sound, not just from its own tab.
  es: La biblioteca de medios se abre desde cualquier campo que necesite una imagen o un sonido, no solo desde su pestaña.
- Telegram: "Rileva gruppo" non dà più errore.
  en: Telegram: “Detect group” no longer throws an error.
  es: Telegram: «Detectar grupo» ya no da error.
- Se finisci su una pagina senza cruscotto, adesso c'è come tornare indietro.
  en: If you end up on a page without the dashboard, there’s now a way back.
  es: Si terminas en una página sin el panel, ahora hay forma de volver atrás.
