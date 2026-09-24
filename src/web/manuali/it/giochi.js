// Manuale: Manuale dei giochi e delle monete. La forma dei manuali e il perche' stanno in
// src/web/manuali.js; le lingue in docs/LINGUE.md.
import { DI_SERIE, RESA, CIFRA, ATTESE, ATTESA, righeRegole, righePesca, presenzaOraria, MANCHE_TIPI } from '../numeri.js';

export default {
  slug: 'giochi',
  schede: ['giochi'],
  titolo: 'Manuale dei giochi e delle monete | SocialBot',
  h1: 'Manuale dei giochi e delle monete',
  desc: 'Come si guadagnano le monete del canale, cosa fa ogni comando di gioco, quanto costa e quanto paga, e come inventarsi un gioco proprio.',
  aggiornata: '2026-09-04',
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
    { h3: 'La serie di presenze' },
    { p: [
      'Le ore dicono <em>quanto</em> uno ha guardato; la serie dice <em>quante volte</em> è venuto, e se viene di fila. Chi resta in chat almeno <strong>dieci minuti</strong> è presente a quella diretta, anche in silenzio. Presente anche alla diretta dopo, la serie sale a due; chi ne salta una riparte da uno, e il record resta.',
      'Il bonus arriva quando la presenza viene contata: <strong>bonus × serie</strong>, con un tetto oltre il quale non cresce più. Con i valori di base sono 10 monete alla prima diretta, 30 alla terza di fila, 100 dalla decima in poi. Ai traguardi (3, 5, 10, 25, 50, 100 di fila) il bot lo dice in chat, se glielo lasci fare.',
      'Una diretta è una sessione: se il bot o Twitch cadono e tornano entro mezz\'ora, è ancora la stessa. Ognuno vede la sua serie con <code>!serie</code>, e la classifica con <code>!classificaserie</code>.',
    ] },

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
      ['Quanti in classifica', '5', '3–10', 'Righe mostrate da !classifica.'],
    ] },

    { h2: 'Le regole di ogni gioco' },
    { p: [
      'Nella carta «Le regole di ogni gioco» ogni gioco ha le sue manopole: costi, premi, attese, probabilità e i testi che dice in chat. Accanto al nome vedi quanto rende con i valori che hai scelto, e cambia mentre li muovi.',
      `Di serie il banco vince sempre un po', e un gioco gratis non rende più della presenza: in un'ora di presenza e partecipazione si prendono ${CIFRA(presenzaOraria({}))} monete, e la pesca al ritmo massimo ne dà ${CIFRA(RESA('pesca').perOra)}. Puoi cambiare tutto: il pannello ti mostra cosa succede all'economia, e se un gioco comincia a creare monete lo dice in rosso.`,
      'Un testo con un segnaposto che quel gioco non conosce non si salva: in chat uscirebbe con le graffe.',
      'Ogni gioco ha due attese, e le scegli tu. <strong>A testa</strong>: dopo che una persona ha giocato, aspetta lei. <strong>Per tutti</strong>: dopo che qualcuno ha giocato, aspetta tutto il canale. Zero vuol dire nessuna attesa. L\'attesa parte quando si gioca davvero: un comando scritto male non la consuma. Chi la trova se lo sente dire una volta, con quanto manca, e poi il bot tace fino alla fine; per <code>!colpisci</code> tace sempre, perché si scrive a raffica.',
    ] },
    { tabella: righeRegole() },

    { h2: 'I comandi pronti' },
    { p: ['Funzionano appena i giochi sono accesi, senza configurare niente. <code>!giochi</code> li elenca in chat — e l\'elenco che scrive è quello vero: i giochi accesi, coi nomi che hai scelto tu.'] },
    { tabella: [
      ['Comando', 'Anche', 'Cosa fa', 'Attesa'],
      ['<code>!dado</code>', '<code>!roll</code>', 'Tira un dado. <code>!dado 2d20</code> per tirarne altri.', ATTESE('dado')],
      ['<code>!moneta</code>', '<code>!coin</code>', 'Testa o croce.', ATTESE('moneta')],
      ['<code>!8ball</code>', '<code>!palla8</code>', 'Risponde a una domanda. Serve la domanda.', ATTESE('8ball')],
      ['<code>!monete</code>', '<code>!punti</code> <code>!bilancio</code>', 'Quante ne hai.', '—'],
      ['<code>!classifica</code>', '<code>!top</code>', 'I primi del pubblico.', '—'],
      ['<code>!classifica mod</code>', '<code>!classificamod</code> <code>!classificastaff</code> <code>!topmod</code>', 'I primi dello staff.', '—'],
      ['<code>!slot</code>', '—', 'Macchinetta: paghi, giri, forse vinci.', ATTESE('slot')],
      ['<code>!duello @nome</code>', '<code>!duel</code>', 'Sfida chi è in chat. Vince uno dei due.', ATTESE('duello')],
      ['<code>!trivia</code>', '<code>!quiz</code>', 'Apre una domanda per tutti.', ATTESE('manche')],
      ['<code>!manche</code>', '<code>!gioca</code>', 'Apre una manche a caso fra quelle del giro. <code>!manche impiccato</code> per sceglierla.', ATTESE('manche')],
      ['<code>!pesca</code>', '<code>!fish</code>', 'Cala la canna. Può uscire di tutto.', ATTESE('pesca')],
      ['<code>!roulette</code>', '<code>!rul</code>', 'Punti su rosso, nero, verde o un numero.', ATTESE('roulette')],
      ['<code>!furto @nome</code>', '<code>!rapina</code>', 'Provi a rubare. Se ti beccano, paghi.', ATTESE('furto')],
      ['<code>!conta</code>', '<code>!count</code>', 'Apre la conta: la chat scrive 1, 2, 3, un numero a testa e mai due di fila.', ATTESE('conta')],
      ['<code>!catena</code>', '<code>!parole</code>', 'Apre la catena di parole: ogni parola comincia con le ultime due lettere della precedente.', ATTESE('catena')],
      ['<code>!colpo</code>', '<code>!heist</code>', 'Organizzi un colpo, o entri nella banda. <code>!colpo 100</code> per scegliere la posta.', ATTESE('colpo')],
      ['<code>!boss</code>', '—', 'Fa arrivare un boss da battere insieme. Solo mod e streamer.', '—'],
      ['<code>!colpisci</code>', '<code>!attacca</code> <code>!hit</code>', 'Colpisci il boss di turno.', ATTESE('boss')],
      ['<code>!blackjack 50</code>', '<code>!bj</code> <code>!21</code>', 'Una mano contro il banco: due carte a te e due a lui, una coperta.', ATTESE('blackjack')],
      ['<code>!carta</code>', '—', 'Un\'altra carta nella tua mano di blackjack.', '—'],
      ['<code>!stai</code>', '<code>!stand</code>', 'Ti fermi: gioca il banco, e si vede chi vince.', '—'],
      ['<code>!corsa 2 50</code>', '<code>!race</code>', 'Punti su un corridore, col numero o col nome. <code>!corsa</code> da solo apre le puntate.', ATTESE('corsa')],
      ['<code>!patata</code>', '<code>!potato</code>', 'Lanci la patata bollente: ce l\'hai in mano tu.', ATTESE('patata')],
      ['<code>!passa @nome</code>', '<code>!pass</code>', 'Passi la patata a chi è in chat. Senza nome va a qualcuno a caso.', '—'],
      ['<code>!regala @nome 50</code>', '<code>!dona</code>', 'Passi monete a qualcun altro.', '—'],
      ['<code>!duello @nome 50</code>', '—', 'Un duello con la posta: l\'altro accetta o rifiuta, e chi vince prende la posta dell\'altro.', `${ATTESA(DI_SERIE('duello').scadenza)} per rispondere`],
      ['<code>!accetta</code>', '—', 'Accetti la sfida con posta che ti hanno fatto.', '—'],
      ['<code>!rifiuta</code>', '—', 'Dici di no, e nessuno perde niente.', '—'],
      ['<code>!morra carta</code>', '<code>!rps</code>', 'Sasso, carta o forbice contro il bot. <code>!morra carta 20</code> per giocarci delle monete.', ATTESE('morra')],
      ['<code>!sblocca</code>', '—', `Spendi monete per mettere la chat in solo emote per ${DI_SERIE('sblocca').minuti} minuti. <code>!sblocca 5</code> per cinque.`, ATTESE('sblocca')],
      ['<code>!abbraccio @nome</code>', '<code>!abbraccia</code> <code>!hug</code>', 'Abbracci chi è in chat. Senza nome, tutta la chat.', ATTESE('abbraccio')],
      ['<code>!bacio @nome</code>', '<code>!bacino</code> <code>!kiss</code>', 'Un bacino a chi è in chat. Senza nome, a tutta la chat.', ATTESE('bacio')],
      ['<code>!cinque @nome</code>', '<code>!highfive</code> <code>!hi5</code>', 'Alzi la mano per qualcuno, o per chiunque senza nome. Chi risponde con <code>!cinque</code> la batte.', ATTESE('cinque')],
      ['<code>!nococcole</code>', '—', 'Niente abbracci, bacini e cinque verso di te. Riscrivilo per tornare.', '—'],
      ['<code>!serie</code>', '<code>!presenze</code> <code>!streak</code>', 'A quante dirette di fila sei stato presente, e a quante in tutto. Con un nome, di quella persona.', '—'],
      ['<code>!classificaserie</code>', '<code>!serietop</code> <code>!topserie</code>', 'Chi è venuto a più dirette di fila.', '—'],
    ] },

    { h2: 'Ogni comando si accende, si rinomina, si riserva' },
    { p: ['Dalla scheda <em>Giochi</em>, nella carta «Comandi dei giochi», ogni riga è un comando vero: quello che vedi lì è quello che risponde in chat. Vale per <strong>tutti</strong> i comandi pronti del bot, non solo per i giochi — l\'elenco completo sta in <em>Comandi</em>, in fondo.'] },
    { tabella: [
      ['Cosa puoi fare', 'Cosa succede'],
      ['Spegnerlo', 'Il comando smette di esistere: non risponde e sparisce da <code>!giochi</code>. Niente si cancella — monete, classifiche e impostazioni restano.'],
      ['Dargli un nome tuo', 'Risponde solo al tuo. <strong>I nomi di serie smettono di rispondere</strong>: un gioco ha un nome, e lo scegli tu.'],
      ['Riservarlo', 'Lo usano solo abbonati, VIP o moderatori. Chi non ci arriva riceve una risposta che glielo dice, invece del silenzio.'],
    ] },
    { p: ['Due giochi non possono chiamarsi allo stesso modo: il secondo non partirebbe mai e nessuno capirebbe perché. Se ci provi, il pannello rifiuta e ti dice quale nome è già preso.'] },
    { p: ['<code>!giochi</code> non è un elenco scritto a mano da qualche parte: legge la stessa tabella. Se spegni la slot, sparisce anche da lì.'] },
    { h3: 'La famiglia conta più del singolo' },
    { p: ['Un comando può essere acceso e restare muto lo stesso, perché la <strong>famiglia</strong> a cui appartiene è spenta. I giochi con la webcam, per esempio, rispondono solo se il tracking è acceso: se non lo è, il pannello te li mostra sbarrati e <code>!giochi</code> non li nomina.'] },
    { p: ['È il motivo per cui prima <code>!giochi</code> rispondeva <strong>due volte</strong> — i giochi di chat e, subito sotto, quelli con la webcam — anche a chi la webcam non la usa: erano due elenchi scritti a mano che non sapevano l\'uno dell\'altro. Adesso la risposta è una sola e dice quello che risponde davvero.'] },

    { h3: 'Slot' },
    { p: [`Paghi il costo (${CIFRA(DI_SERIE('slot').costo)} di base) e girano tre simboli. I tris si scalano tutti dal tris di 💎 (${CIFRA(DI_SERIE('slot').jackpot)} di base):`] },
    { tabella: [
      ['Esito', 'Vinci', 'Con i valori di base'],
      ['Tris di 💎', 'il tris pieno', CIFRA(DI_SERIE('slot').jackpot)],
      ['Tris di 7️⃣', 'tre quarti', CIFRA(Math.round(DI_SERIE('slot').jackpot * 0.75))],
      ['Qualsiasi altro tris', 'due quinti', CIFRA(Math.round(DI_SERIE('slot').jackpot * 0.4))],
      ['Due uguali', 'la coppia', CIFRA(DI_SERIE('slot').coppia)],
      ['Niente', '—', 'perdi il costo'],
    ] },
    { p: [`Su 100 monete giocate, di serie, ne tornano in media ${CIFRA(RESA('slot').perCento)}: il banco vince un po', come deve. Se non hai abbastanza monete il bot te lo dice e non ti fa giocare.`] },

    { h3: 'Roulette' },
    { p: [
      'Si scrive <code>!roulette 50 rosso</code> oppure <code>!roulette 50 17</code>. Vanno bene anche <em>nero</em>, <em>verde</em> e i nomi inglesi.',
      `È una roulette europea: 37 caselle, lo zero è verde. Su rosso, nero o un numero tornano in media ${CIFRA(RESA('roulette').perCento)} monete ogni 100 puntate.`,
    ] },
    { tabella: [
      ['Punti su', 'Se esce', 'Ti torna'],
      ['Un numero (0–36)', 'quel numero', '36 volte la puntata'],
      ['Rosso o nero', 'quel colore', '2 volte la puntata'],
      ['Verde', 'lo zero', '14 volte la puntata'],
    ] },

    { h3: 'Pesca' },
    { p: [`Una volta ogni ${ATTESA(DI_SERIE('pesca').attesaTesta)} a testa. Non è a caso puro: ogni preda ha il suo peso, e più vale meno esce. In media un lancio vale ${CIFRA(RESA('pesca').media)} monete, cioè fino a ${CIFRA(RESA('pesca').perOra)} in un'ora: quanto la presenza, non di più. Cosa si pesca lo scrivi tu, nelle regole della pesca.`] },
    { tabella: righePesca() },

    { h3: 'Duello' },
    { p: [
      'Si sfida <strong>solo chi è in chat</strong> — chi ha parlato negli ultimi trenta minuti. Serviva: prima si poteva sfidare un nome inventato, e le monete finivano su un profilo che non esisteva.',
      `Vince uno dei due a testa o croce. Di serie il duello senza posta si gioca per l'onore e non dà monete: un premio che nasce dal nulla a ogni sfida gonfiava l'economia. Se vuoi, glielo dai nelle regole del duello. Un duello alla volta per canale, uno ogni ${ATTESA(DI_SERIE('duello').attesaTutti)}.`,
    ] },

    { h3: 'Duello con la posta' },
    { p: [
      `Con <code>!duello @nome 50</code> la sfida vale delle monete: l'altro ha ${ATTESA(DI_SERIE('duello').scadenza)} per scrivere <code>!accetta</code> o <code>!rifiuta</code>. Se accetta, chi vince prende la posta dell'altro: le monete passano di tasca, non se ne creano.`,
      'Le monete non si mettono da parte mentre si aspetta: si controlla chi le ha nel momento in cui l\'altro accetta. Se il bot si riavvia nel mezzo la sfida salta, e nessuno perde niente. Una sfida alla volta a testa.',
    ] },

    { h3: 'Morra cinese' },
    { p: [
      `<code>!morra sasso</code>, <code>carta</code> o <code>forbice</code> contro il bot. Senza puntata è solo per ridere; con la puntata (<code>!morra carta 20</code>) se vinci ti torna ${CIFRA(DI_SERIE('morra').vincita / 100)} volte la puntata, se fai pari ti torna la puntata, se perdi la perdi. Di serie su 100 monete giocate ne tornano in media ${CIFRA(RESA('morra').perCento)}: è un gioco giusto, e nelle regole decidi quanto paga la vittoria.`,
    ] },

    { h3: 'Conta insieme' },
    { p: [
      'Con <code>!conta</code> la chat conta insieme: 1, poi 2, poi 3, un numero a messaggio e mai due di fila la stessa persona. Chi scrive il numero sbagliato, o conta due volte di fila, fa ricominciare tutti da uno. Mentre si conta giusto il bot tace: il gioco è la chat.',
      `Non si vincono monete: si batte il record del canale, che resta anche quando il bot si riavvia, e quando lo si supera il bot lo dice. Ogni ${DI_SERIE('conta').traguardo} numeri applaude, e se per ${ATTESA(DI_SERIE('conta').pausa)} nessuno conta la conta si chiude da sola. Mentre si conta non partono manche, perché anche loro leggono i numeri in chat.`,
    ] },

    { h3: 'La catena di parole' },
    { p: [
      `Con <code>!catena</code> il bot dice una parola, e la chat continua: ogni parola comincia con le ultime due lettere della precedente, casa, sasso, sole, leone. Conta solo un messaggio fatto di una parola che comincia con le due lettere giuste: il resto è chiacchiera e non tocca niente. Gli accenti non contano.`,
      `La catena si rompe se una parola era già stata detta o se la stessa persona ne scrive due di fila: il bot dice perché e riparte da una parola nuova. Si batte il record del canale, che resta anche quando il bot si riavvia. Ogni ${DI_SERIE('catena').traguardo} parole il bot applaude, e se per ${ATTESA(DI_SERIE('catena').pausa)} nessuno trova la parola la catena si chiude. Le parole da cui si parte le scegli tu, nelle regole.`,
      'Manche, conta e catena leggono tutte la chat, quindi ne gira una alla volta: finché una è aperta, le altre aspettano, e il bot lo dice.',
    ] },

    { h3: 'Colpo di gruppo' },
    { p: [
      `Chi scrive <code>!colpo</code> organizza un colpo con ${CIFRA(DI_SERIE('colpo').posta)} monete di posta (o quante ne scrive: <code>!colpo 100</code>), e per ${ATTESA(DI_SERIE('colpo').raccolta)} chiunque può entrare nella banda allo stesso modo. Chi entra non viene salutato uno per uno: gli ingressi si dicono insieme, una riga ogni tanto.`,
      `Poi si parte, se la banda è di almeno ${DI_SERIE('colpo').minimo} persone. Da soli si scappa ${DI_SERIE('colpo').riuscita} volte su 100, e ogni persona in più ne aggiunge ${DI_SERIE('colpo').perPersona}, fino a ${DI_SERIE('colpo').riuscitaMax}. Ognuno tira per sé: chi scappa riprende la posta e ${DI_SERIE('colpo').vincita - 100} su 100 in più, chi è preso la perde. Con la banda più grande, su 100 monete di posta ne tornano in media ${CIFRA(RESA('colpo').perCento)}.`,
      'Le monete si muovono solo alla fine: entrare non toglie niente, e chi quando si parte non ha più la sua posta resta fuori senza perdere niente. Se il bot si riavvia nel mezzo il colpo salta, e nessuno ci rimette.',
    ] },

    { h3: 'Il boss da battere insieme' },
    { p: [
      `Un boss arriva quando un mod scrive <code>!boss</code>, con un raid di almeno ${DI_SERIE('boss').dopoRaid} persone, e se vuoi da solo ogni tanto mentre sei in diretta. Ha ${DI_SERIE('boss').vitaPerPersona} punti vita per ogni persona che ha scritto in chat negli ultimi dieci minuti: chi guarda in silenzio non conta, così il boss è alla portata di chi c'è davvero.`,
      `La chat lo colpisce con <code>!colpisci</code>, un colpo ogni ${ATTESA(DI_SERIE('boss').attesaTesta)} a testa, da ${DI_SERIE('boss').dannoMin} a ${DI_SERIE('boss').dannoMax} di danno. Ha ${ATTESA(DI_SERIE('boss').durata)} prima di scappare. Se cade, il bottino va a chi l'ha colpito in proporzione al danno: se tutti colpiscono uguale ognuno prende ${CIFRA(DI_SERIE('boss').bottino)}, e chi colpisce di più prende di più, fino a ${CIFRA(RESA('boss').massimo)} a testa. Se scappa non prende niente nessuno, ma nessuno perde niente. Il bot non risponde a ogni colpo: poco dopo il primo, e poi al massimo ogni venti secondi, scrive chi ha colpito e quanto, la vita che resta e i secondi che mancano. Nell'overlay la sua carta (nome, vita, tempo che resta, chi colpisce e quanto) è un elemento dello Studio: la sposti, la ingrandisci e la vesti lì, e la spegni per overlay.`,
      'Sull\'overlay, con gli effetti accesi, compare la barra della vita che scende a ogni colpo, col tempo che resta. Nelle regole scegli anche una festa: se il boss cade, la chat va in solo emote per qualche minuto e poi torna com\'era.',
    ] },

    { h3: 'Blackjack' },
    { p: [
      `Con <code>!bj 50</code> punti 50 monete: due carte a te e due al banco, di cui una coperta. Poi <code>!carta</code> per un'altra o <code>!stai</code> per fermarti, e se per ${ATTESA(DI_SERIE('blackjack').tempo)} non scrivi niente stai da solo. Il banco gioca dopo di te e sta su ogni 17.`,
      `Vince chi va più vicino a 21 senza passarlo: la vittoria ti rende il doppio della puntata, il pari te la rende, e il blackjack servito (asso e una figura o un dieci) ne rende ${CIFRA(DI_SERIE('blackjack').vincitaBJ / 100)} volte, cioè 3 a 2. Se il banco ha blackjack lo dice subito, e la mano finisce lì.`,
      `Di serie, giocando al meglio, su 100 monete puntate ne tornano in media ${CIFRA(RESA('blackjack').perCento)}: il banco vince un po', come al tavolo vero, e chi gioca a caso perde di più. Nelle regole scegli quanto paga il blackjack, la puntata massima e il tempo per decidere.`,
      'La puntata esce appena si aprono le carte. Se il bot si riavvia con una mano aperta, la puntata torna a chi l\'aveva messa.',
    ] },

    { h3: 'La corsa' },
    { p: [
      `Con <code>!corsa</code> si aprono le puntate per ${ATTESA(DI_SERIE('corsa').raccolta)}: il bot scrive i corridori, dal favorito al più lento, ognuno con quanto paga. Si punta con <code>!corsa 2 50</code> (il secondo corridore, 50 monete) o col nome, <code>!corsa lepre 50</code>; una puntata a testa. Poi si parte, e qualche secondo dopo il bot dice il podio e chi ha vinto quanto.`,
      `Il favorito vince spesso e paga poco, l'ultimo vince di rado e paga tanto, e le quote sono fatte perché ogni corridore renda uguale: di serie, su 100 monete puntate ne tornano in media ${CIFRA(RESA('corsa').perCento)}, qualunque corridore si scelga. Non esiste la puntata furba. Nelle regole scegli quanto rende, i nomi dei corridori (da 2 a 8) e la puntata massima.`,
      'Le monete si muovono solo all\'arrivo, e fra la partenza e l\'arrivo non si dice niente su come va: se il bot si riavvia nel mezzo la corsa salta, e nessuno perde niente.',
    ] },

    { h3: 'La patata bollente' },
    { p: [
      `Con <code>!patata</code> la lanci, e ce l'hai in mano tu. Chi ce l'ha la passa con <code>!passa @nome</code>, oppure con <code>!passa</code> e va a qualcuno a caso fra chi è in chat. Scoppia dopo un tempo che nessuno conosce, di serie fra ${ATTESA(DI_SERIE('patata').miccia)} e ${ATTESA(DI_SERIE('patata').micciaMax)}, deciso quando la lanci: passarla non lo cambia.`,
      'Si passa solo a una persona in chat: non a te, non a chi non c\'è, non a un bot, che non potrebbe ripassarla. Di serie non costa niente a nessuno. Se vuoi, nelle regole metti una multa: chi resta con la patata ne dà tante a chi gliel\'ha passata, ma solo se aveva già giocato, cioè l\'aveva lanciata o passata. Chi la riceve senza averla mai toccata si brucia e basta.',
    ] },

    { h3: 'Abbracci, bacini e il cinque perfetto' },
    { p: [
      'Non costano e non fanno vincere niente: servono a stare insieme. Si abbraccia e si bacia solo chi ha scritto in chat di recente, e chi scrive <code>!nococcole</code> non ne riceve più finché non lo riscrive.',
      `Il cinque vuole due persone. <code>!cinque @nome</code> alza la mano per qualcuno, <code>!cinque</code> da solo per chiunque; chi risponde con <code>!cinque</code> la batte. Ogni tanto, a sorpresa, viene un <strong>cinque perfetto</strong> (di serie ${DI_SERIE('cinque').perfetti} volte su 100). Se nessuno risponde in ${ATTESA(DI_SERIE('cinque').scadenza)} la mano resta a mezz'aria.`,
      'Succede tutto in chat. Nelle regole cambi quanto spesso viene perfetto, i tempi e tutte le frasi.',
    ] },

    { h3: 'Furto' },
    { p: [
      `Una prova ogni ${ATTESA(DI_SERIE('furto').attesaTesta)} a testa, e solo su chi ha almeno 20 monete. Va a buon fine <strong>${DI_SERIE('furto').riuscita} volte su 100</strong>: prendi fra 10 e ${CIFRA(DI_SERIE('furto').bottino)} monete (mai più di quante ne ha la vittima).`,
      `Se ti beccano paghi una multa fino a ${CIFRA(DI_SERIE('furto').multa)} monete, <strong>alla vittima</strong> e non al nulla: il furto passa monete di tasca, non ne crea.`,
    ] },

    { h3: 'Sbloccare la chat' },
    { p: [
      `Con <code>!sblocca</code> chi ha le monete mette la chat in solo emote per ${DI_SERIE('sblocca').minuti} minuti, o per quanti ne scrive (<code>!sblocca 5</code>, fino a ${DI_SERIE('sblocca').massimo}). Costa ${CIFRA(DI_SERIE('sblocca').costoMinuto)} monete al minuto, e dopo uno sblocco il canale aspetta ${ATTESA(DI_SERIE('sblocca').attesaTutti)} prima del prossimo. Nelle regole scegli cosa si sblocca (solo emote o messaggi unici), il costo e i tempi.`,
      'Si paga solo se la chat cambia davvero: se la modalità è già accesa da un mod non costa niente, e se Twitch dice di no le monete restano tue. Alla fine la chat torna com\'era da sola, anche se nel frattempo il bot si riavvia. È un modo di <strong>spendere</strong> le monete: escono dall\'economia invece di girare.',
    ] },

    { h2: 'Le modalità della chat a tempo' },
    { p: [
      'Twitch ha le modalità della chat ma non il tempo: si accendono e restano lì finché qualcuno si ricorda di spegnerle. Qui si accendono <strong>per un tempo</strong>, e si spengono da sole.',
      'I mod le accendono in chat. Senza durata sono due minuti, con una durata è quella: <code>5m</code>, <code>90s</code>, <code>10</code> (minuti). Con <code>off</code> finiscono subito.',
    ] },
    { tabella: [
      ['Comando', 'Cosa fa'],
      ['<code>!soloemote</code>', 'Solo emote. <code>!soloemote 5m</code> per cinque minuti.'],
      ['<code>!messaggiunici</code>', 'Nessuno può ripetere un messaggio già scritto.'],
      ['<code>!soloabbonati</code>', 'Scrivono solo gli abbonati.'],
    ] },
    { p: [
      'Le stesse modalità le accende un Modulo, con l\'azione «Modalità della chat a tempo»: un premio a punti canale, un evento (un hype train, un raid), un comando tuo come <code>!festa $arg1</code>.',
      'Se la modalità era già accesa da un mod, il bot non la tocca e alla fine non la spegne: sarebbe disfare la scelta di un altro. Chat lenta e soli follower non ci sono apposta: le usa lo scudo contro gli attacchi, e uno sblocco per gioco non deve riaprire una serranda in mezzo a un raid.',
    ] },

    { h2: 'Le manche automatiche' },
    { p: [
      `Una manche è una domanda aperta a tutta la chat: chi risponde per primo prende il premio della manche (${CIFRA(DI_SERIE('manche').premio)} di base). Si aprono da sole ogni tanto (da <em>Giochi</em> scegli ogni quanti minuti, da 1 a 360, e se solo in diretta) oppure a mano con <code>!manche</code>, che ne apre una a caso, o col nome: <code>!manche impiccato</code>.`,
      `I tipi sono ${MANCHE_TIPI.length}. Nelle regole delle manche scegli quali stanno nel giro di quelle automatiche, e il bot ne pesca uno che riesca a costruire:`,
    ] },
    { tabella: [
      ['Tipo', 'Come funziona', 'Tempo', 'Materiale tuo'],
      ['Quiz', 'Una domanda, si risponde in chat.', '45s', 'le tue domande'],
      ['Reflex', 'Il primo che scrive la parola vince.', '30s', 'le tue parole'],
      ['Numero', 'Ha pensato un numero: indovinatelo.', '40s', '—'],
      ['Anagramma', 'Lettere mescolate da rimettere a posto.', '45s', 'le tue parole'],
      ['Sequenza', 'Una sequenza di simboli da ripetere.', '30s', 'i tuoi simboli'],
      ['Domanda tua', 'Domanda e risposte scritte da te.', 'da 10s a 5 min', 'domanda + risposte'],
      ['Calcolo veloce', 'Un conto da fare di corsa, generato ogni volta: 7 × 8 + 3.', '30s', '—'],
      ['Rebus', 'Emoji da leggere: 🕷️🧑 è Spiderman. Film, giochi e cartoni di serie.', '45s', 'i tuoi rebus'],
      ['Più o meno', 'Un numero da 1 a 100. Chi scrive un numero stringe l\'intervallo per tutti, e il bot lo dice ogni pochi secondi.', '90s', '—'],
      ['Impiccato', 'Una parola da scoprire una lettera alla volta, o tutta insieme. Sei lettere sbagliate e vince l\'impiccato.', '2 min', 'le tue parole'],
      ['Wordle', 'Una parola di cinque lettere. Ogni parola di cinque lettere scritta in chat è un tentativo, e il bot risponde coi quadratini: 🟩 al posto giusto, 🟨 c\'è ma altrove, ⬛ non c\'è. Venti tentativi per tutta la chat.', '3 min', 'le tue parole'],
    ] },
    { p: ['Nel più o meno e nell\'impiccato il bot non risponde a ogni messaggio: raccoglie i tentativi e dice come sta la partita al massimo ogni quattro secondi. In una chat viva, se no, parlerebbe più lui di tutti gli altri.'] },
    { p: ['Il materiale che aggiungi non sostituisce quello di serie: quando ce n\'è di tuo, il bot lo pesca <strong>due volte su tre</strong>, così la chat non impara le domande a memoria.'] },

    { h2: 'Le classifiche' },
    { p: [
      'Sono <strong>due</strong>, e sono separate apposta: <code>!classifica</code> è quella del pubblico, <code>!classifica mod</code> quella dello staff. Senza la divisione i moderatori — che stanno in chat tutto il giorno — occupavano i primi posti e la gara del pubblico non esisteva più.',
      'Chi è staff lo dice Twitch, non «chi ha guadagnato mentre era moderatore»: se promuovi qualcuno, le sue monete si spostano nella classifica giusta. <code>!classifica tutti</code> mostra la vecchia vista unica.',
    ] },

    { h2: 'Il premio in VIP' },
    { p: [
      'Sono <strong>due gare</strong>, e vanno avanti insieme: chi ha più <strong>monete</strong> — la classifica è la tua — e chi ha messo più <strong>Bit</strong> — quella è di Twitch. Ognuna ha il suo interruttore e il suo ritmo: ogni settimana o ogni mese.',
      'Per ogni gara decidi <strong>le posizioni</strong>, da una a cinque. Ogni posizione ha il <strong>suo nome</strong> — re, principe, cavaliere, o come ti pare: è la parola che esce in chat — e la <strong>sua durata</strong>: il primo posto può valere cinque dirette e il terzo una.',
      '<strong>Dirette, non giorni.</strong> Un VIP che scade sul calendario si spegne mentre tu non trasmetti, e chi l\'ha vinto non se lo gode. Qui il conto scende quando una diretta <em>finisce</em>: se salti una settimana, il premio ti aspetta. E se il bot è giù proprio alla fine di una diretta, quel giro non si conta: il premio dura una sera in più.',
      'Chi ha già il VIP <strong>per sempre</strong> viene saltato e il posto scorre al successivo: dargli un premio a scadenza significherebbe togliergli quello che aveva. Si può disattivare, ma è acceso di base. Né il tuo staff né tu entrate fra i candidati: Twitch rifiuta di dare il VIP a un moderatore, quindi il posto va a chi può davvero riceverlo.',
      'Chi vince il primo posto dei Bit diventa il <strong>re</strong>: porta una corona accanto al nome nella chat a schermo fino al premio dopo, e la prima volta che torna a scrivere il bot lo saluta — con la frase che scrivi tu, o con nessuna se la lasci vuota. Se Twitch non risponde il premio non salta: si riprova più tardi, perché «non lo so» non è «non ha cheerato nessuno».',
    ] },

    { h2: 'Fare un gioco tuo' },
    { p: [
      'I giochi pronti sono un punto di partenza, non il confine. Nella scheda <em>Giochi</em>, in <strong>«I tuoi giochi»</strong>, si fa tutto da un posto solo. La prima domanda è anche l\'unica che conta davvero: <strong>chi lo lancia?</strong>',
    ] },
    { tabella: [
      ['Chi lo lancia', 'Che gioco è', 'Da cosa parti'],
      ['<strong>Ci pensa il bot</strong>', 'Ogni tanto, a sorpresa, parte una manche e il primo che risponde vince.', 'Cinque forme pronte: quiz, parola veloce, anagramma, sequenza di simboli, una domanda tua.'],
      ['<strong>Lo scrive uno spettatore</strong>', 'Un comando che costa monete, tira il dado e paga — o no.', 'Sei ricette già scritte: le apri, cambi i numeri e le parole, ed è tuo.'],
    ] },
    { p: [
      'Il secondo caso è un <a href="/manuale/moduli">Modulo</a> a tutti gli effetti — innesco, condizioni, azioni — ma si costruisce <strong>lì dentro</strong>: prima ti spostava in <em>Comandi</em>, e per una cosa sola c\'erano due schede e tre elenchi.',
      'Nell\'editor dei giochi le <strong>parole magiche</strong> offerte sono quelle che a un gioco servono davvero — le monete, il caso, i numeri, chi scrive — invece di tutte e quaranta. Le altre restano a un clic.',
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
    { d: 'Posso spegnere solo un gioco?', r: 'Sì: nella carta «Comandi dei giochi» ogni riga ha il suo interruttore. Da lì lo puoi anche rinominare o riservare a sub, VIP o moderatori.' },
    { d: 'Le monete si possono togliere a qualcuno?', r: 'Sì, dal pannello puoi aggiustare il saldo di chiunque, in più o in meno, senza passare dalla chat. Serve quando qualcuno bara o quando vuoi premiare a mano.' },
    { d: 'Le monete valgono anche su Kick?', r: 'Sì: la chat è una sola per il bot. Un comando può anche essere limitato a una piattaforma sola, se preferisci.' },
    { d: 'Come si chiama la moneta?', r: 'Come vuoi tu: fino a venti caratteri, dalla scheda Giochi. Il bot userà quel nome ovunque, anche nei messaggi dei giochi pronti.' },
  ],
};
