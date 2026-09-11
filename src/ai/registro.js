// IL REGISTRO DA ASSISTENTE: le frasi che in una chat non dice nessuno.
//
// Un modello piccolo, davanti a una riga che non e' una domanda («ti si ama»),
// e a un prompt che gli elenca cosa non puo' fare, risponde come un assistente:
// «mi dispiace, l'implementazione attuale lo impedisce». E' successo. E una riga
// cosi' non e' solo brutta: finisce nella memoria della chat e torna al modello
// come esempio di come parla lui, e da li' ogni risposta suona uguale.
//
// Percio' il riconoscimento sta in un posto solo, e serve a due cose: l'unica
// uscita del bot (brain._finalizza) non lascia passare una riga cosi', e la
// storia che si rimanda al modello (brain._storiaRecente) non gliela mostra.
// Lo stesso elenco vive anche dove la riga nasce, nel cervello, che riprova una
// volta e poi tace.

export const DA_ASSISTENTE = new RegExp(
  'implementazion|come (un )?(modello|assistente|ia\\b|intelligenza)|intelligenza artificiale|assistente virtuale'
  + '|non (ho|abbiamo) (la |le |una )?(capacit|possibilit|funzion|accesso)|non sono (in grado|programmat|stat[oa] (progettat|addestrat|creat))'
  + '|non posso (aiutart|fornir|eseguir|accedere|effettuare)|cercher[oò] di risolvere|funzionalit[aà]'
  + '|non [eè] (ancora )?(supportat|disponibil|implementat)|in qualit[aà] di|sono (solo )?(un )?programma'
  + '|il mio (codice|sistema|creatore|sviluppatore)|sviluppator|limitazion[ei]|al momento non (posso|riesco|sono in grado)'
  + '|language model|as an ai|i cannot|i can\'t (help|assist|do that)', 'i');

export const daAssistente = (testo) => DA_ASSISTENTE.test(String(testo || ''));
