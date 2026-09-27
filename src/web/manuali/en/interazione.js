// Manuale in inglese: le schede Sondaggi, Giveaway e Penitenze. Traduzione di src/web/manuali/it/interazione.js (vedi docs/LINGUE.md).
export default {
  id: 'interazione',
  slug: 'polls-giveaways',
  titolo: 'Polls, giveaways and forfeits manual | SocialBot',
  h1: 'Polls, giveaways and forfeits manual',
  desc: 'Twitch polls and predictions, the giveaway with odds you set, channel-point forfeits counted by voice: every card and every command, explained.',
  corpo: [
    { p: [
      'Three tabs you use <strong>while you stream</strong>. They live in «Chat & audience», under «Games», next to «Games & leaderboards».',
      'The bot opens and closes Twitch votes, weighs the giveaway tickets and draws, listens to what you say during a forfeit and keeps count.',
    ] },

    { h2: 'Polls & predictions', scheda: 'sondaggi', p: [
      'You open <strong>real Twitch</strong> polls and predictions, the ones that show up above the player, without going through the Twitch dashboard.',
      'They only work on Twitch channels. Twitch gives polls and predictions to Affiliate and Partner channels. They\'re included in Essenziale, the free plan.',
      'From the panel, only the channel owner opens them. Moderators open them from chat, with the commands explained further down.',
      'You need Twitch\'s permissions for polls and predictions. If the panel asks you to grant them, go to the «Status» tab and press «Update permissions».',
    ] },

    { h3: 'Polls' },
    { p: ['Viewers vote from the Twitch app, and the result shows on the channel.'] },
    { tabella: [
      ['Control', 'Default', 'Limits', 'What it does'],
      ['«Question»', 'empty', 'Twitch keeps 60 characters', 'The poll question.'],
      ['«Options»', 'four empty fields', 'at least 2; 25 characters each', 'The answers people vote on. Empty fields don\'t count.'],
      ['«Duration (seconds)»', '120', '15–1800', 'How long voting stays open.'],
    ] },
    { p: [
      'Press «Launch poll». The panel says «Poll launched» and the bot announces the poll in chat, inviting people to vote on Twitch.',
      'While it\'s open, at the top of the card you see «Poll in progress:» with the question, and the «Close now» button. Closing early stops the vote and shows the result on Twitch.',
    ] },

    { h3: 'Predictions' },
    { p: ['Viewers bet channel points on the outcome. At the end, you decide who wins.'] },
    { tabella: [
      ['Control', 'Default', 'Limits', 'What it does'],
      ['«Title»', 'empty', 'Twitch keeps 45 characters', 'The question people bet on.'],
      ['«Outcomes»', 'four empty fields', 'at least 2; 25 characters each', 'The possible results. Empty fields don\'t count.'],
      ['«Betting window (seconds)»', '120', '30–1800', 'How long people can bet.'],
    ] },
    { p: [
      'Press «Open prediction». The panel says «Prediction opened» and the bot invites chat to bet.',
      'When the window is over, betting closes, and the prediction stays there until you resolve it. At the top of the card you see «Prediction in progress:» with the title, and below «Make it win:» one button per outcome. Press the right one: Twitch pays out whoever guessed right and the bot writes in chat who won.',
      'If the outcome can no longer be decided, press «Cancel and refund»: Twitch gives everyone their points back. Always close a prediction, because as long as it stays open the points people bet stay locked.',
      'Twitch allows one poll and one prediction at a time: if one is already open, the panel tells you Twitch rejected it.',
    ] },

    { h3: 'Chat commands' },
    { p: ['Moderators and you can use them. From chat, the duration is always two minutes.'] },
    { tabella: [
      ['Command', 'What it does'],
      ['<code>!sondaggio Question | option | option</code>', 'Opens a poll. From 2 to 5 options, separated by <code>|</code>. <code>!poll</code> does the same.'],
      ['<code>!sondaggio chiudi</code>', 'Closes the open one and shows the result. <code>stop</code>, <code>fine</code> and <code>termina</code> work too.'],
      ['<code>!predizione Title | outcome | outcome</code>', 'Opens a prediction, from 2 to 10 outcomes. The bot lists the outcomes with numbers. <code>!prediction</code> and <code>!pronostico</code> do the same.'],
      ['<code>!predizione vince 2</code>', 'Resolves on the given outcome, by number or by name, even just the start of the name. <code>risolvi</code>, <code>esito</code> and <code>win</code> work too.'],
      ['<code>!predizione annulla</code>', 'Cancels and <strong>refunds</strong> everyone\'s points. <code>cancella</code> and <code>rimborsa</code> work too.'],
    ] },
    { p: [
      'If a command is typed wrong, it answers with an example of how to open one. If the outcome name doesn\'t match, the bot answers with the numbered list of outcomes. If a permission is missing, the bot says so in chat.',
      'You turn these commands off, rename them or restrict them in the «Commands» tab, like the other built-in commands.',
    ] },

    { h2: 'Giveaway', scheda: 'giveaway', p: [
      'A prize draw: the community joins by typing a word in chat, and you draw the winner. The draw is weighted: you can give subscribers and VIPs better odds, but nobody is guaranteed to win.',
      'It\'s included in Essenziale, the free plan, and needs «Enable chat minigames» turned on in the «Games & leaderboards» tab. With minigames off, the giveaway won\'t open, neither from the panel nor from chat.',
      'From the panel, only the channel owner runs it. Moderators run it from chat.',
    ] },

    { h3: 'The Giveaway card' },
    { p: ['With no giveaway open, the card says «No giveaway in progress.» and shows the fields to open one.'] },
    { tabella: [
      ['Control', 'Default', 'Limits', 'What it does'],
      ['«Prize»', 'empty: «un premio a sorpresa» (a surprise prize)', 'up to 120 characters', 'What people win. The bot announces it in chat.'],
      ['«Join keyword»', 'join', 'up to 20 characters: letters without accents, digits and underscore', 'The word people type in chat to join, after the «!».'],
      ['«Winners (default)»', '1', '1–50', 'How many winners «Draw» picks if you don\'t change the number.'],
      ['«Subs» under «Odds (tickets each)»', '2', '1–20', 'Tickets for subscribers.'],
      ['«VIP»', '2', '1–20', 'Tickets for a VIP.'],
      ['«Mod»', '1', '1–20', 'Tickets for a moderator and for you.'],
      ['«Subscribers only (subs)»', 'off', 'on or off', 'Only subscribers, moderators and you can join.'],
    ] },
    { p: [
      'Press «Open the giveaway». The panel says «Giveaway opened!» and the bot announces it in chat, with the join keyword and the odds for subscribers and VIPs.',
      'With the giveaway open, the card shows «Giveaway in progress:» with the prize, the «subs only» label if it\'s restricted, how many participants there are, the word they join with and how many tickets there are in total.',
      'In the «How many» field you choose how many winners to draw, from 1 to 50: it starts from the «Winners (default)» number. Press «Draw». Below it, «Winner:» or «Winners:» appears with the names, and the bot announces them in chat. If nobody has joined, the card says «No participants yet.».',
      'Whoever wins leaves the draw: you can press «Draw» again for more winners, always different people.',
      '«Cancel» closes the giveaway, and the bot writes in chat that it\'s cancelled. Press it when you\'re done drawing too, to close it.',
    ] },
    { esempio: '🎁 GIVEAWAY APERTO: una gift card! Scrivete !join per partecipare. 🎫 sub ×2 · vip ×2 (più possibilità!) In bocca al lupo! 🍀' },

    { h3: 'The odds' },
    { p: ['Each participant has some <strong>tickets</strong>, and the draw is weighted: more tickets, better odds. «2» means twice the chance, «1» the same as everyone.'] },
    { tabella: [
      ['Who', 'Default tickets', 'Limits'],
      ['Everyone', '1', 'fixed'],
      ['Subscribers', '2', '1 to 20'],
      ['VIPs', '2', '1 to 20'],
      ['Moderators and you', '1', '1 to 20'],
      ['Extra tickets, given by hand', '0', 'up to 100 per person, with <code>!biglietti</code>'],
    ] },
    { p: [
      'Someone who is both a subscriber and a VIP gets the higher value, not the sum. Extra tickets are added on top.',
      'Moderators start at 1 because they usually run the giveaway rather than play it. If they play too in your channel, raise the number.',
      'Even with «Subscribers only (subs)» the draw stays weighted: among subscribers, anyone who is also a VIP or a moderator gets their own value.',
      'Odds are set only from the panel. A giveaway opened from chat uses the defaults: 2 for subscribers and VIPs, 1 for moderators.',
    ] },

    { h3: 'Joining and running it from chat' },
    { tabella: [
      ['Command', 'Who', 'What it does'],
      ['<code>!join</code>', 'everyone', 'Joins the giveaway. <code>!partecipa</code> and <code>!entra</code> work too. With a word of your own, people join only with that one, even without «!» if the message is just that word.'],
      ['<code>!giveaway prize</code>', 'mods and streamer', 'Opens the giveaway. <code>!giveaway sub prize</code> restricts it to subscribers, <code>!giveaway parola=win prize</code> sets the join keyword. <code>!sorteggio</code> and <code>!gw</code> work too.'],
      ['<code>!giveaway stato</code>', 'mods and streamer', 'Tells you the prize, participants and tickets, and which word people join with.'],
      ['<code>!biglietti @name 3</code>', 'mods and streamer', 'Gives 3 extra tickets to someone who has already joined. Without a number it gives one, with a negative number it takes them away. <code>!ticket</code> does the same.'],
      ['<code>!estrai</code>', 'mods and streamer', 'Draws a winner. <code>!estrai 3</code> draws three, up to 50. The bot also says how many are still in the running. <code>!draw</code> and <code>!vincitore</code> do the same.'],
      ['<code>!giveaway annulla</code>', 'mods and streamer', 'Closes the giveaway. <code>stop</code>, <code>cancella</code> and <code>chiudi</code> work too.'],
    ] },
    { p: [
      'People who join don\'t get a reply each: with a hundred people that would be a hundred messages. You see it from the participant count on the card, or with <code>!giveaway stato</code>.',
      'With a restricted giveaway, someone who isn\'t a subscriber types the word and nothing happens.',
      'One giveaway at a time per channel. If one is open with nobody in it, opening another replaces it. If someone has already joined, the panel says «There’s already an open giveaway.».',
      'The giveaway stays open even if the bot restarts, with its participants and their tickets. One left open and forgotten for more than seven days isn\'t picked up again.',
      'The giveaway commands are in the «Giveaways» family of the «Game commands» card, where you turn them off, rename them or restrict them: see the <a href="/en/manual/games">games manual</a>.',
    ] },

    { h2: 'Forfeits', scheda: 'penitenze', p: [
      'A viewer redeems a channel-point reward and picks a word. For a few minutes the bot <strong>listens to you</strong> and keeps a <strong>counter</strong>, with red «+1»s on screen. At the end, if you slipped up, <strong>one</strong> forfeit starts.',
      'There are two modes, each with its own reward. <strong>Ban the word</strong>: you must not say it, and every time you do it\'s +1. <strong>Use only the word</strong>: you can only say that word, and every sentence with a different word is +1.',
    ] },
    { p: [
      'What you need:',
    ] },
    { ul: [
      'a Twitch channel with <strong>channel points</strong>, which Twitch gives to Affiliate and Partner channels, and the channel-points permission;',
      'the <strong>«Comandi Vocali»</strong> add-on, on its own or in the «Tutto» bundle: you find it in the «Subscription» tab, explained in the <a href="/en/manual/account">account manual</a>;',
      'the <strong>listening page</strong> open while you\'re live: you open it from the «Voice commands» tab with «Open voice listening», explained in the <a href="/en/manual/commands">commands manual</a>.',
    ] },
    { p: [
      'The owner and the panel moderators can change the settings. Only the owner picks and creates the channel-point rewards, and only the owner tests the counter in the overlay.',
    ] },

    { h3: 'Channel-point forfeits' },
    { tabella: [
      ['Control', 'Default', 'Limits', 'What it does'],
      ['«Forfeits on» / «Forfeits off» switch', 'off', 'on or off', 'Turns forfeits on. When off, redeeming the two rewards starts nothing.'],
      ['«Duration (minutes)»', '2', '1–15', 'How long the bot listens and counts after a redemption.'],
      ['«The forfeit…»', '«I pick it from my list»', '«I pick it from my list» or «The AI makes it up»', 'Where the final forfeit comes from.'],
      ['«My list of forfeits (one per line: a random one starts)»', 'empty', 'up to 60 lines of 120 characters', 'Your forfeits. At the end a random one comes out.'],
      ['«Voice-recognition tolerance:»', '80', '50–100, in steps of 5', 'Higher: only near-identical words count. Lower: forgives transcription errors more.'],
      ['«Sound/effect when the forfeit triggers (optional)»', 'none', 'a ready-made sound or one of your effects', 'Plays when the forfeit triggers. The menu has «Ready-made sounds», «My uploaded sounds» and «Images / Videos».'],
    ] },
    { p: [
      'Press «Save»: the panel says «Forfeits saved». The switch, too, only takes effect after «Save».',
      'With «The AI makes it up» you don\'t need to write a list: if the AI doesn\'t answer, the bot picks from your list, and if that\'s empty, from a ready-made list. With «I pick it from my list» and an empty list, the AI makes up the forfeit.',
      'Next to the effect menu, the «From the library» button lets you pick an effect from the library and saves it right away: «Effect set ✓». The «Test» button plays a ready-made sound in your browser, and sends one of your effects to the overlay. Effects are uploaded in the «Effects & sounds» tab, explained in the <a href="/en/manual/effects">effects manual</a>.',
      'Controls that save on their own, like the effect from the library, the counter position and the reward for a mode, save the whole tab as it is at that moment, switch included.',
    ] },

    { h3: 'On-screen counter (overlay)' },
    { p: ['The «+1» and the counter appear in the stream overlay, the same one the effects use.'] },
    { tabella: [
      ['Control', 'Default', 'Limits', 'What it does'],
      ['«Position»', '«Top right»', 'top or bottom, left, center or right', 'Where the counter sits. It saves as soon as you change it: «Overlay saved ✓».'],
      ['«Color»', 'red', 'any color', 'The color of the counter and of the «+1»s. It saves as soon as you change it.'],
    ] },
    { p: ['Open the overlay in your streaming software, or in the browser, and press «Test the counter in the overlay»: a test runs with the word «esempio» (example), two «+1»s and the forfeit «10 flessioni» (10 push-ups). Your real forfeits aren\'t touched.'] },

    { h3: 'The channel-point rewards' },
    { p: [
      'You need rewards <strong>that require text</strong>, so the viewer types the word. You need one per mode: one under «Ban the word», one under «Use only the word».',
      'Each mode\'s menu lists only your rewards that require text, with their cost. Picking one saves it right away: «Reward set ✓».',
      'If you don\'t have any, the card says «You have no rewards that require text» and offers to create one. If you do, the same fields are under «Or create a ready-to-use reward».',
    ] },
    { tabella: [
      ['Control', 'Default', 'Limits', 'What it does'],
      ['«Name»', '«Ban me a word» or «Say only this word»', 'up to 45 characters', 'The reward\'s name on Twitch.'],
      ['«Cost (channel points)»', '500', 'at least 1', 'How many channel points it costs to redeem.'],
    ] },
    { p: [
      'Press «Create the reward on Twitch». The reward is created on Twitch with text input already set, becomes that mode\'s reward and turns forfeits on: the switch moves to «Forfeits on». The panel says «Reward created on Twitch!».',
      'If Twitch refuses, there\'s usually already a reward with that name: change «Name» and try again.',
      'The bot recognizes the reward by its name. If you rename it on Twitch, come back here and pick it again from the menu.',
      'If the channel-points permission is missing, the card tells you: in the «Status» tab press «Update permissions», then come back here.',
    ] },

    { h3: 'How a forfeit goes' },
    { passi: [
      { t: 'The redemption. ', d: 'A viewer redeems the reward and types a word. The first word they type counts, without accents or punctuation. If they type a single character, the challenge is on that letter.' },
      { t: 'The announcement. ', d: 'The bot writes in chat who banned or imposed what, and for how many minutes. The counter starts in the overlay.' },
      { t: 'The listening. ', d: 'The listening page notices the forfeit within a few seconds and, while it lasts, sends the bot everything you say, not just command phrases. Every slip makes the counter go up and a «+1» appears on screen.' },
      { t: 'The end. ', d: 'When time is up, if the counter is above zero the bot writes the forfeit, multiplied by the number of times you slipped, and the effect plays if you picked one. If the counter is at zero, the bot writes that you\'re safe.' },
    ] },
    { esempio: '🔒 Luca ti ha VIETATO la parola "praticamente" per 2 minuti! Se la dici… si conta. 😈\n⏱️ Tempo scaduto! La parola "praticamente": beccato 3 volte → PENITENZA: 10 flessioni ×3 😈' },
    { p: [
      'One forfeit, not three: the «×3» says how heavy it is. If two viewers redeem at the same time, two forfeits run, each with its own counter.',
      'If the bot restarts during a forfeit, it picks it up where it was. A forfeit that expired more than an hour ago isn\'t picked up again.',
    ] },

    { h3: 'How it counts' },
    { tabella: [
      ['Challenge', 'What makes +1'],
      ['Ban a word', 'Every time you say it, even several times in the same sentence.'],
      ['Use only one word', 'Every sentence where you say a different word. One-letter words, like «e» or «a» in Italian, don\'t count.'],
      ['Ban a letter', 'Every time that letter shows up in what you say.'],
      ['Use only one letter', 'Every sentence where that letter isn\'t there.'],
    ] },
    { p: [
      'Speech recognition mishears, so the comparison is <strong>tolerant</strong>: a word caught halfway but basically right counts, a different word that happens to look like it doesn\'t. How tolerant is up to «Voice-recognition tolerance:». Words of three letters or fewer must match exactly.',
      'The same sentence heard twice within three seconds counts only once.',
      'The audio stays on your computer: the listening page turns your voice into text and only the text reaches the bot. Everything you say goes into the count only while a forfeit is running.',
    ] },

    { h2: 'When something goes wrong' },
    { ul: [
      '<strong>The poll won\'t open.</strong> If the panel asks for a permission, press «Update permissions» in the «Status» tab. If it says Twitch rejected it, there may already be one open: close it. You need at least two options, and the channel must be Affiliate or Partner.',
      '<strong>The panel says «only the channel owner can do this».</strong> Polls, predictions and giveaways from the panel belong to the owner. As a moderator, use the chat commands.',
      '<strong>The giveaway won\'t open.</strong> Turn on «Enable chat minigames» in the «Games & leaderboards» tab. If there\'s already a giveaway with someone in it, close it first with «Cancel».',
      '<strong>Nobody joins the giveaway.</strong> Check the join keyword: if you changed it, that\'s the word to type in chat, not <code>!join</code>. With «Subscribers only (subs)» on, people who aren\'t subscribers can\'t join.',
      '<strong>The same people always win.</strong> Look at the odds: with high numbers a small group of subscribers dominates. Set everything to 1 and it becomes an even draw.',
      '<strong>The redemption doesn\'t start the forfeit.</strong> Check that forfeits are on and saved, and that the right reward is in that mode\'s menu. If you renamed the reward on Twitch, pick it again.',
      '<strong>The forfeit doesn\'t count.</strong> The listening page must be open and started with «Start listening», with microphone access allowed, in Chrome or Edge. You need the «Comandi Vocali» add-on. After the redemption, wait a few seconds: the page notices on its own.',
      '<strong>It counts words I didn\'t say.</strong> Raise «Voice-recognition tolerance:». Letters are more fragile than words: for long challenges a whole word works better.',
    ] },
  ],
  faq: [
    { d: 'Are the polls Twitch\'s own or something of yours?', r: 'Twitch\'s: they show up above the player as if you\'d opened them from the Twitch dashboard. The bot opens and closes them for you, from the panel or from chat.' },
    { d: 'Can a moderator open a poll or a giveaway?', r: 'Yes, from chat, with the commands on this page. From the panel, only the channel owner can.' },
    { d: 'Does the giveaway survive a bot restart?', r: 'Yes: it stays open with its participants and their tickets. One left open and forgotten for more than seven days isn\'t picked up again.' },
    { d: 'Can I draw several winners at once?', r: 'Yes: from the panel with «How many», from chat with !estrai 3. It always picks different people.' },
    { d: 'Do forfeits work without channel points?', r: 'No: everything starts from redeeming a channel-point reward. The «Test the counter in the overlay» button is only there to see how it looks.' },
    { d: 'Is the bot always listening to me?', r: 'The listening page listens, as long as you keep it open and started. During a forfeit it sends the bot everything you say, until it ends. The rest of the time it sends voice-command phrases, and what you say only if you\'ve turned on «Learns while I talk» (see the <a href="/en/manual/commands">commands manual</a>). The audio never leaves your computer: only the text gets through.' },
  ],
};
