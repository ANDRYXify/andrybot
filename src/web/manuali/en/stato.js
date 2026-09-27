// Manuale in inglese: la scheda Stato. Traduzione di src/web/manuali/it/stato.js (vedi docs/LINGUE.md).
export default {
  id: 'stato',
  slug: 'status',
  titolo: 'Status tab manual: your stream, bot and permissions | SocialBot',
  h1: 'Status tab manual',
  desc: 'What the Status tab tells you: your current or next stream, the bot switch, when it joins chat, Twitch permissions and what to do if it disconnects.',
  corpo: [
    { h2: 'Status', scheda: 'stato', p: [
      'It\'s the tab that opens when you log into the panel, the first one in the menu. It answers one question: <strong>how are things right now?</strong> Are you live, is the bot in chat, is there something to fix.',
      'The cards show up in this order. The ones that flag a problem appear only when the problem is there: if everything is fine, the tab starts with «Your stream».',
      'When permissions are missing or the bot is off, the owner may also see a note in the bottom right corner, «Some permissions are missing» or «The bot is off», with «Show me» bringing you here. How these notes work is in the <a href="/en/manual/account">account and subscription manual</a>.',
    ] },

    { h3: 'You’re managing the channel of @…' },
    { p: [
      'Only people logged in as a <strong>moderator</strong> of someone else\'s channel see it, and it\'s always the first card. It reminds you whose channel you\'re working on.',
      'A moderator takes care of commands, modules, effects, games, notifications, rules and memory. Twitch permissions and the list of moderators stay with the owner.',
      'How to become a moderator of a channel is in the <a href="/en/manual/account">account and subscription manual</a>.',
    ] },

    { h3: 'The bot is disconnected from chat' },
    { p: [
      'A red card, only for the owner of a Twitch channel. It appears when Twitch rejects the key the bot uses to join chat: the permission has <strong>expired or was revoked</strong>. This happens if you remove SocialBot from the connected apps on your Twitch account, or if Twitch invalidates authorizations, for example after a password change.',
      'The bot keeps retrying on its own, and on the next attempt it also tries to renew the permission. If that works, it rejoins chat and the card goes away. If it doesn\'t, press «Reconnect permissions»: Twitch opens, you confirm, and you\'re back in the panel.',
      'If you\'ve connected Telegram and the bot messages you privately, you also get a message there, so you know even with the panel closed. At most one every 6 hours.',
    ] },

    { h3: 'Activate the bot: grant permissions' },
    { p: [
      'Only for the owner of a Twitch channel who hasn\'t granted permissions yet. Without them, the bot can\'t write in your chat. The button is «Grant permissions on Twitch».',
      'The bot writes in chat <strong>with your account</strong>, not with an account of its own. That\'s why it asks Twitch for the channel permissions, one for each feature that uses them:',
    ] },
    { tabella: [
      ['What the bot does', 'Permissions it needs'],
      ['Read and write in chat', 'Chat, with your account.'],
      ['Follow the stream', 'Follows, subs, Bits, hype trains and channel-point redemptions.'],
      ['Clips', 'Creating clips, by hand and automatically.'],
      ['Moderate', 'Deleting messages, anti-spam timeouts, follower-only or slow chat, Twitch Shield Mode, blocking fake followers.'],
      ['Official commands', 'Shoutouts and chat announcements.'],
      ['Coins and leaderboards', 'Who is in chat (for watch time) and who your moderators are (to keep the two leaderboards apart).'],
      ['Channel and control room', 'VIPs, category and title, polls, predictions, channel-point rewards, raids, ads and their scheduling, the channel Schedule.'],
      ['Web Studio', 'The stream key, requested only when Web Studio is on.'],
    ] },

    { h3: 'New permissions to grant' },
    { p: [
      'A yellow card, only for the owner of a Twitch channel. It appears when new features have arrived since you connected your channel: they need permissions you hadn\'t granted, and until you grant them those features stay off.',
      'In parentheses you see what they\'re for, up to eight features. Press «Update permissions»: Twitch asks you to confirm the whole list, and they all update together.',
    ] },

    { h3: 'Your stream' },
    { p: [
      'The card tells you whether you\'re live. It refreshes on its own <strong>every minute</strong> while the tab is open, and right away when you come back to the window. It isn\'t there if your channel is on Discord only.',
    ] },
    { p: ['<strong>When you\'re live</strong> you see «Live», how long you\'ve been on (hours, minutes and seconds, ticking), the title, the category and these numbers:'] },
    { tabella: [
      ['Number', 'What it counts', 'When it\'s there'],
      ['«watching now»', 'Viewers at this moment.', 'Twitch only.'],
      ['«tonight’s peak»', 'The highest viewer count of the stream.', 'Once there\'s viewer data.'],
      ['«messages»', 'Chat messages since the stream started.', 'Always.'],
      ['«people in chat»', 'How many different people have written.', 'Always.'],
      ['«new followers»', 'Follows that came in during the stream.', 'Always.'],
      ['subs, raids, bits, clips', 'Tonight\'s ones.', 'Only if there\'s at least one.'],
    ] },
    { p: [
      'Below are «Open the control room», for Twitch channels only, and «Watch the channel», which opens your page on the platform you stream on.',
      'On Twitch, what Twitch says goes: as soon as the stream ends, the card switches to «You’re not live». On Kick and YouTube, title, category and viewers don\'t come through: the card shows how long you\'ve been live and the chat numbers.',
      'Tonight\'s numbers are the same ones that end up in the stream report: the card and the «Streams» tab can\'t say two different things. The report is explained in the <a href="/en/manual/live">live stream manual</a>.',
    ] },
    { p: ['<strong>When you\'re not live</strong> you see «You’re not live» and two blocks:'] },
    { ul: [
      '«Next up»: the day and time of your next stream, taken from «Your week». If it\'s today, you also see how many minutes or hours are left. Below it are what you\'re doing and the category. If the week is empty, the owner sees an invitation to fill it in and the «Your week» button. How to fill it in is in the <a href="/en/manual/showcase">showcase manual</a>.',
      '«The last one»: when the previous stream ended, how long it lasted, the «viewer peak» if there was data, the «new followers» and the «messages». The «All your streams» button takes you to the tab with all the reports.',
    ] },
    { p: ['If the panel can\'t tell whether you\'re live, the card says «I can’t tell right now whether you’re live. I’ll try again in a minute.» and retries on its own.'] },

    { h3: 'Your bot' },
    { p: ['The card for turning the bot on and deciding when it stays in chat.'] },
    { tabella: [
      ['Control', 'What it does', 'Default'],
      ['«Bot on» / «Bot off» switch', 'Turns the bot on or off for the channel. The change applies right away, confirmed by «Bot on!» or «Bot off.».', 'On.'],
      ['«in chat now» / «not connected»', 'Tells you whether the bot is inside your Twitch chat. It\'s read when you open the panel.', 'Read only.'],
      ['«When it should be active»', '«Always (24/7)» or «Only when you’re live».', '«Always (24/7)».'],
      ['«Save mode»', 'Saves the choice in the menu above. It answers «Mode saved ✓».', ''],
    ] },
    { p: [
      'With <strong>«Always (24/7)»</strong> the bot stays in chat day and night, as long as the switch is on.',
      'With <strong>«Only when you’re live»</strong> it joins your Twitch chat by itself when the stream starts and leaves when it ends. It usually notices right away, within a couple of minutes at most. Off air, in this mode, the badge says «not connected» and that\'s normal.',
      'The switch overrides the mode: when it\'s off, the bot doesn\'t answer in any case.',
      '<strong>Turning it off deletes nothing.</strong> Commands, coins, memory and settings stay, and when you turn it back on it picks up where it left off.',
      'A moderator can use the switch and the mode too.',
      'If you stream on Kick or YouTube, the status of the connection with those chats is in the «Your platforms» card of the «Your account» tab.',
    ] },
    { p: ['The owner of a Twitch channel also sees the «Permissions:» row with six badges. Green with a check mark means granted, yellow with «to grant» means it\'s missing.'] },
    { tabella: [
      ['Badge', 'What it turns on'],
      ['chat', 'The bot talking in your chat.'],
      ['VIP', 'The VIP reward and the VIPs given by the bot.'],
      ['moderation', 'Deleting messages and giving timeouts.'],
      ['shoutout', 'Twitch\'s official shoutout from commands.'],
      ['announcements', 'Highlighted announcements in chat.'],
      ['watch time', 'The <code>!ore</code> command and viewer loyalty.'],
    ] },
    { p: [
      'Below it is «Update permissions»: it opens Twitch, you confirm, and they all update, new ones included. If something isn\'t working, it\'s the first button to press.',
      'Instead of the row, a moderator sees «Bot permissions:» with «chat active» or «chat not active». Only the owner grants permissions.',
    ] },

    { h3: 'You’re trying … for free' },
    { p: [
      'It appears only during a <strong>free trial</strong>. The title says what you\'re trying («Base» or «everything») and a badge says how long is left: «5 days left», «ends tomorrow», «ends today». Below it is the date it ends.',
      'The trial doesn\'t ask for a card and charges nothing. When it ends you go back to Essenziale: what you\'ve set up stays, the extra features switch off. The «See the packages» button takes you to the «Subscription» tab.',
    ] },
  ],
  faq: [
    { d: 'The bot doesn\'t answer in chat. Where do I start?', r: 'From this tab. Check the switch: it should say «Bot on». Check the mode: with «Only when you’re live» the bot isn\'t there when you\'re off air. If the red card «The bot is disconnected from chat» is at the top, press «Reconnect permissions».' },
    { d: 'I changed my Twitch password and the bot disappeared.', r: 'Twitch invalidated the permission. The bot tries to renew it on its own. If it can\'t, the «The bot is disconnected from chat» card appears: press «Reconnect permissions», confirm on Twitch and the bot comes back.' },
    { d: 'The shoutout or <code>!ore</code> doesn\'t work.', r: 'Look at the «Permissions:» row in the «Your bot» card. If the badge is yellow with «to grant», press «Update permissions».' },
    { d: 'I\'m live but the card says «You’re not live».', r: 'The card refreshes once a minute. Wait a minute, or switch to another window and come back: that refreshes it too.' },
    { d: '«Next up» doesn\'t show.', r: 'It comes from «Your week». If you haven\'t written down the days you go live, the owner sees the «Your week» button to fill it in.' },
    { d: 'Why can\'t I see how many viewers I have?', r: 'Only Twitch provides the viewer count. On Kick and YouTube the card shows the duration and the chat numbers.' },
    { d: 'Does turning the bot off delete anything?', r: 'No. The bot just leaves chat: when you turn it back on, everything is still there.' },
    { d: 'Can a moderator turn the bot off?', r: 'Yes: a moderator can use the switch and the mode too. Twitch permissions, on the other hand, are granted only by the owner.' },
    { d: '«Some permissions are missing» shows up in the bottom right corner. What do I do?', r: 'Press «Show me»: it brings you here, to the «New permissions to grant» card. Press «Update permissions» and confirm on Twitch. Once the permissions are in place, the note doesn\'t come back.' },
    { d: 'The panel is stuck on the splash screen.', r: 'It happens on a slow connection, or on the first load after an update. After 6 seconds the splash screen says «just a moment more…». After 25 seconds it says «this is taking longer than usual» and «Try again» appears, which reloads the page.' },
  ],
};
