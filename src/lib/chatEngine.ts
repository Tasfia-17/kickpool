// CinePurr AI Chat Engine — Smart rule-based response system
// Deep knowledge of CinePurr features with contextual awareness

interface ChatResponse {
    reply: string;
    suggestions: string[];
}

interface ConversationContext {
    lastTopic: string | null;
    messageCount: number;
}

// Intent definitions with patterns and responses
interface Intent {
    id: string;
    patterns: RegExp[];
    keywords: string[];
    responses: string[];
    suggestions: string[];
}

const INTENTS: Intent[] = [
    // Greeting
    {
        id: 'greeting',
        patterns: [/^(hi|hey|hello|sup|yo|hiya|howdy|what'?s up)/i, /^(good\s*(morning|afternoon|evening|night))/i],
        keywords: ['hello', 'hi', 'hey', 'greetings'],
        responses: [
            "Hey there, friend! 🐱✨ Welcome to CinePurr — your cozy corner for watching together. What can I help you with today?",
            "Heya! 🎬 Your CinePurr AI concierge is here and ready to help. What's on your mind?",
            "Hello hello! 🐾 Ready to make your CinePurr experience purrfect. Ask me anything!",
            "Yo! 👋 CinePurr's AI assistant at your service. Need help with rooms, friends, games, or anything else?",
        ],
        suggestions: ['How do I create a room?', 'Tell me about XP', 'What are daily quests?', 'How do themes work?'],
    },

    // Create Room
    {
        id: 'create_room',
        patterns: [/create\s*(a\s*)?room/i, /make\s*(a\s*)?room/i, /start\s*(a\s*)?(room|watch\s*party)/i, /new\s*room/i, /how\s*to\s*(create|make|start)\s*(a\s*)?room/i],
        keywords: ['create', 'room', 'make', 'start', 'new room'],
        responses: [
            "Creating a room is super easy! 🎬\n\n**1.** Click the **Create Room** button on the homepage\n**2.** Give your room a name (something fun!)\n**3.** Choose **Public** (anyone can join) or **Private** (invite-only)\n**4.** Set the max number of users\n**5.** Hit create and you're rolling! 🎉\n\nYou'll earn **+25 XP** for creating a room! Pro tip: use Room Templates for quick setup.",
            "Wanna start a watch party? Here's how! 🐾\n\n• Hit the big **Create Room** button on the main page\n• Pick a name, set it public or private, and choose your max users\n• Once created, share the room code with friends!\n\nYou'll get **+25 XP** and progress on your daily quest! 🎮",
        ],
        suggestions: ['What are room templates?', 'How do I invite friends?', 'How does the queue work?', 'What is XP?'],
    },

    // Join Room
    {
        id: 'join_room',
        patterns: [/join\s*(a\s*)?room/i, /enter\s*(a\s*)?room/i, /how\s*to\s*join/i, /room\s*code/i],
        keywords: ['join', 'enter', 'code'],
        responses: [
            "There are two ways to join a room! 🚪\n\n**Option 1 — Browse:** Check out the **Server Browser** on the homepage. Public rooms are listed there with player counts!\n\n**Option 2 — Code:** Got a room code from a friend? Paste it in the **Enter Code** field and hit Join.\n\nYou earn **+10 XP** every time you join a room! 🎬",
        ],
        suggestions: ['How do I find popular rooms?', 'Can I favorite a room?', 'What is the server browser?'],
    },

    // XP & Leveling
    {
        id: 'xp',
        patterns: [/what\s*(is|are)\s*xp/i, /how\s*do(es)?\s*(xp|leveling|levels?)\s*work/i, /earn\s*xp/i, /experience\s*points?/i, /level(ing)?\s*(up|system)?/i],
        keywords: ['xp', 'experience', 'level', 'leveling'],
        responses: [
            "XP is your progress currency in CinePurr! 🌟\n\n**How to earn XP:**\n• 🏠 Create a room: **+25 XP**\n• 🚪 Join a room: **+10 XP**\n• 💬 Send messages: **+2 XP**\n• ✅ Complete daily quests: **+25 to +100 XP**\n• 🏆 Finish challenges: **+250 to +750 XP**\n\n**Level formula:** `level = floor(sqrt(totalXP / 100)) + 1`\n\nCheck your level in the **XP & Level** dock widget!",
        ],
        suggestions: ['What are daily quests?', 'Tell me about challenges', 'How do leaderboards work?', 'What are badges?'],
    },

    // Daily Quests
    {
        id: 'daily_quests',
        patterns: [/daily\s*quest/i, /quest(?:s)?/i, /what\s*(are|is)\s*(the\s*)?quests?/i, /today'?s?\s*quest/i],
        keywords: ['quest', 'daily', 'mission', 'task'],
        responses: [
            "Daily quests reset every day and give you bonus XP! 🎯\n\n**Today's quests:**\n1. 🚪 **Join a Room** — +50 XP (join any room)\n2. ⏱️ **Watch 30 Minutes** — +100 XP (watch videos together)\n3. 💬 **Send 5 Messages** — +25 XP (chat in a room)\n4. 🏠 **Create a Room** — +75 XP (host a watch party)\n\nTrack your progress in the **Daily Quests** dock widget! Complete all 4 for a big boost. 🚀",
        ],
        suggestions: ['How do I earn more XP?', 'What are challenges?', 'Show me the leaderboard', 'What are streaks?'],
    },

    // Streaks
    {
        id: 'streaks',
        patterns: [/streak/i, /login\s*streak/i, /daily\s*(login|streak)/i, /how\s*do\s*streaks?\s*work/i],
        keywords: ['streak', 'consecutive', 'daily login'],
        responses: [
            "Streaks reward your dedication! 🔥\n\nEvery day you log into CinePurr, your **login streak** increases. Keep it going!\n\n**Streak badges:**\n• 🥉 **7 days** — Week Warrior\n• 🥈 **30 days** — Monthly Master\n• 🥇 **100 days** — Century Legend\n\nYour current and longest streaks are shown in the **Streak** dock widget. Don't break the chain! 💪",
        ],
        suggestions: ['What are badges?', 'How does XP work?', 'What happens if I miss a day?'],
    },

    // Leaderboards
    {
        id: 'leaderboards',
        patterns: [/leaderboard/i, /ranking/i, /top\s*(players?|users?)/i, /who'?s?\s*(on\s*)?top/i],
        keywords: ['leaderboard', 'ranking', 'top', 'best'],
        responses: [
            "Climb the ranks! 🏆\n\nCinePurr has **5 leaderboard types:**\n1. ⏱️ **Watch Time** — Most hours watched\n2. 🏠 **Rooms Created** — Most rooms hosted\n3. 💬 **Messages Sent** — Most chatty\n4. 🔥 **Streak** — Longest login streak\n5. ⭐ **Level** — Highest XP level\n\nTop 3 get 🥇🥈🥉 badges! Check the **Leaderboard** from the dock.",
        ],
        suggestions: ['How do I earn XP?', 'What are daily quests?', 'Tell me about badges'],
    },

    // Themes
    {
        id: 'themes',
        patterns: [/theme/i, /change\s*(the\s*)?theme/i, /color\s*scheme/i, /how\s*do\s*themes?\s*work/i, /pokemon\s*theme/i, /cat\s*theme/i],
        keywords: ['theme', 'color', 'skin', 'appearance', 'pokemon'],
        responses: [
            "Themes make CinePurr truly yours! 🎨\n\nEach theme features a **Pokémon mascot** with matching colors:\n• Switch themes using the **color bar** at the bottom of the hero window\n• Each theme changes the entire UI color palette\n• Themes are saved to your browser — pick your fave!\n• Toggle **Dark Mode** from the user menu for a cozy night vibe 🌙\n\nAll themes feature pixel-art styling with thick borders and retro shadows!",
        ],
        suggestions: ['How do I toggle dark mode?', 'What Pokémon themes are available?', 'Can I customize my avatar?'],
    },

    // Friends
    {
        id: 'friends',
        patterns: [/friend/i, /add\s*(a\s*)?friend/i, /how\s*to\s*(add|find)\s*(a\s*)?friend/i, /friend\s*list/i, /social/i],
        keywords: ['friend', 'add', 'social', 'connect'],
        responses: [
            "Friends make everything better! 🐾💕\n\n**Adding friends:**\n• Click the **Friends** icon in the navbar (👥)\n• Search for a user by their username\n• Send a friend request — they'll get a notification!\n\n**Once friends:**\n• See their online status\n• Direct message them\n• See their activity in your feed\n• Join rooms they're in!\n\nYour activity feed shows what your friends are up to. 🎬",
        ],
        suggestions: ['How do DMs work?', 'What is the activity feed?', 'How do notifications work?'],
    },

    // Watch Together / Video
    {
        id: 'watch_together',
        patterns: [/watch\s*together/i, /sync(ed)?\s*(video|watch|playback)/i, /video\s*(sync|queue)/i, /how\s*does\s*(watching|playback)\s*work/i, /what\s*can\s*(i|we)\s*watch/i],
        keywords: ['watch', 'video', 'sync', 'playback', 'youtube'],
        responses: [
            "CinePurr syncs videos in real-time! 🎬✨\n\n**How it works:**\n• Paste a **YouTube URL** into the room player\n• Everyone in the room sees the same video, synced!\n• Play, pause, and seek — it updates for everyone\n• Chat while you watch in the room chat\n\n**Video Queue:**\n• Add multiple videos to the queue\n• Vote on which video to play next\n• The top-voted video gets highlighted!\n\nIt's like a virtual movie night with friends. 🍿",
        ],
        suggestions: ['How do I create a room?', 'What is video queue voting?', 'Can I add videos to a queue?'],
    },

    // Games / Minigames
    {
        id: 'games',
        patterns: [/game/i, /minigame/i, /play\s*(a\s*)?game/i, /what\s*games?/i, /multiplayer\s*game/i],
        keywords: ['game', 'games', 'minigame', 'play', 'multiplayer'],
        responses: [
            "CinePurr has multiplayer minigames! 🎮\n\nAccess them from the **Minigames** dock icon. Play games with friends while you watch — it's a whole vibe!\n\nGames are played within rooms, so everyone can join the fun. Challenge your friends and show off your skills!\n\nCheck the dock for the 🎮 **Minigames** button!",
        ],
        suggestions: ['How do I create a room?', 'Tell me about XP', 'What are challenges?'],
    },

    // Study Room
    {
        id: 'study',
        patterns: [/study\s*(room|session|together)/i, /pomodoro/i, /focus\s*(mode|session|room)/i],
        keywords: ['study', 'focus', 'pomodoro', 'homework', 'work'],
        responses: [
            "Need to focus? Try a **Study Room**! 📚\n\nCinePurr has dedicated study spaces with:\n• 🍅 **Pomodoro timer** — Focus intervals with breaks\n• 🎵 **Ambient sounds** — Lo-fi, rain, café vibes\n• 📊 **Session tracking** — See how long you studied\n• 👥 **Study buddies** — Focus with friends!\n\nAccess study rooms from the **Study Room** icon (📖) in the dock!",
        ],
        suggestions: ['What music can I listen to?', 'How do rooms work?', 'Tell me about XP'],
    },

    // Notifications
    {
        id: 'notifications',
        patterns: [/notification/i, /bell\s*icon/i, /alert/i, /how\s*do\s*(i\s*)?get\s*notified/i],
        keywords: ['notification', 'notify', 'alert', 'bell'],
        responses: [
            "Never miss a beat! 🔔\n\n**Notification types:**\n• 👥 Friend requests\n• 🏠 Room invites\n• 🏆 Achievement unlocks\n• 🎯 Quest completions\n\nClick the **bell icon** in the navbar to see all your notifications. Unread ones show a badge count! You can mark them as read individually or all at once.",
        ],
        suggestions: ['How do I add friends?', 'What are achievements?', 'Tell me about daily quests'],
    },

    // Challenges
    {
        id: 'challenges',
        patterns: [/challenge/i, /monthly\s*challenge/i, /watch\s*challenge/i],
        keywords: ['challenge', 'monthly', 'goal'],
        responses: [
            "Ready for a challenge? 🏆\n\nCinePurr has **monthly challenges** for big XP rewards:\n\n• 🎃 **Horror Marathon** — Watch horror content\n• 🦋 **Social Butterfly** — Join lots of rooms\n• 👥 **Friend Collector** — Add new friends\n\nRewards range from **250 to 750 XP** per challenge! Track your progress in the challenges widget. New challenges rotate monthly!",
        ],
        suggestions: ['How do I earn XP?', 'What are daily quests?', 'Show me the leaderboard'],
    },

    // Crates / Rewards
    {
        id: 'crates',
        patterns: [/crate/i, /loot\s*(box|crate)/i, /reward\s*(box|crate)/i, /what\s*(are\s*)?crates?/i],
        keywords: ['crate', 'loot', 'reward', 'box', 'open'],
        responses: [
            "Crates are surprise reward boxes! 🎁\n\nEarn crates through various activities on CinePurr. Open them to get random rewards! Check the **Crates** icon (🎁) in your dock to see what you've collected.",
        ],
        suggestions: ['How do I earn XP?', 'What are badges?', 'Tell me about challenges'],
    },

    // Account / Profile
    {
        id: 'account',
        patterns: [/account/i, /profile/i, /settings/i, /my\s*(account|profile)/i, /edit\s*profile/i, /avatar/i, /username/i],
        keywords: ['account', 'profile', 'settings', 'avatar', 'username'],
        responses: [
            "Your CinePurr profile is your identity! 🐱\n\n**To access your profile:**\n• Click your **avatar** in the top-right corner\n• Select **Profile** from the dropdown\n\n**Your profile shows:**\n• Your avatar & username\n• XP level & badges\n• Watch stats & activity\n• Friends list\n\nYou can customize your avatar and view your achievements from the profile page!",
        ],
        suggestions: ['How do themes work?', 'What are badges?', 'Show me my stats'],
    },

    // Stats
    {
        id: 'stats',
        patterns: [/stats?/i, /statistics/i, /my\s*stat/i, /watch\s*time/i, /how\s*much\s*(have\s*i|time)/i],
        keywords: ['stats', 'statistics', 'data', 'analytics', 'time'],
        responses: [
            "Track all your CinePurr stats! 📊\n\nVisit the **Stats page** (`/stats`) to see:\n• ⏱️ Total watch time\n• 🏠 Rooms created & joined\n• 💬 Messages sent\n• 👥 Friends count\n• 🏆 Badges earned\n• 🔥 Streak info\n• ⭐ Level & XP\n\nAll displayed in beautiful pixel-art stat cards! You can also see your stats from the dock widgets.",
        ],
        suggestions: ['How does XP work?', 'What are leaderboards?', 'Tell me about badges'],
    },

    // Dark Mode
    {
        id: 'dark_mode',
        patterns: [/dark\s*mode/i, /light\s*mode/i, /night\s*mode/i, /toggle\s*(dark|light|theme)/i],
        keywords: ['dark', 'light', 'night', 'mode'],
        responses: [
            "Dark mode is just a click away! 🌙\n\n**To toggle dark mode:**\n1. Click your **avatar** in the top-right\n2. Click the **🌙 Dark Mode** / **☀️ Light Mode** button in the dropdown\n\nDark mode works with all themes — the entire UI adjusts! It's saved to your browser, so it remembers your preference. Perfect for those late-night binge sessions. 🐱",
        ],
        suggestions: ['How do themes work?', 'Can I customize my avatar?', 'What other settings are there?'],
    },

    // Help / Features
    {
        id: 'help',
        patterns: [/help/i, /what\s*can\s*(you|this)\s*do/i, /feature/i, /how\s*does\s*(this|cinepurr)\s*work/i, /what\s*is\s*cinepurr/i, /capabilities/i],
        keywords: ['help', 'features', 'what', 'how', 'guide', 'tutorial'],
        responses: [
            "CinePurr is your cozy watch-together platform! 🐱🎬\n\n**Core Features:**\n• 🎬 **Watch Together** — Sync videos with friends in real-time\n• 💬 **Room Chat** — Chat while you watch\n• 🎮 **Minigames** — Play games with friends\n• 📚 **Study Rooms** — Focus sessions with Pomodoro\n• 🏆 **Gamification** — XP, levels, badges, quests\n• 👥 **Social** — Friends, DMs, activity feed\n• 🎨 **Themes** — Pokémon-themed color palettes\n• 🔔 **Notifications** — Stay updated\n• 📊 **Stats** — Track your engagement\n\nAsk me about any of these for details!",
        ],
        suggestions: ['How do I create a room?', 'How does XP work?', 'Tell me about themes', 'What are daily quests?'],
    },

    // Goodbye
    {
        id: 'goodbye',
        patterns: [/^(bye|goodbye|see ya|later|cya|gotta go|peace)/i, /^(thanks?|thank you|ty|thx)/i],
        keywords: ['bye', 'goodbye', 'thanks', 'later'],
        responses: [
            "See ya, friend! 🐾 Enjoy your time on CinePurr. Come back anytime you need help! 🎬✨",
            "Have fun watching! 🍿 If you need anything else, I'm always right here. Bye bye! 🐱",
            "You're welcome! Happy watching! 🎬💕 Don't forget your daily quests! 😸",
            "Thanks for chatting! 🐾 May your streams be buffer-free and your watch parties legendary! ✨",
        ],
        suggestions: ['How do I create a room?', 'What are daily quests?', 'Tell me about XP'],
    },

    // Music Player
    {
        id: 'music',
        patterns: [/music/i, /music\s*player/i, /how\s*(to\s*)?(play|listen)\s*(to\s*)?music/i, /lo-?fi/i, /background\s*music/i],
        keywords: ['music', 'player', 'listen', 'audio', 'lofi'],
        responses: [
            "CinePurr has a built-in **Mini Music Player**! 🎵\n\nYou'll find it in the bottom of your screen — it plays background music while you browse or hang out.\n\nPerfect for setting the mood during watch parties or study sessions! 🐾🎶",
        ],
        suggestions: ['Tell me about study rooms', 'How do rooms work?', 'What are themes?'],
    },

    // Easter Eggs
    {
        id: 'easter_eggs',
        patterns: [/easter\s*egg/i, /secret/i, /hidden\s*feature/i, /konami/i],
        keywords: ['easter', 'egg', 'secret', 'hidden', 'konami'],
        responses: [
            "Ooh, looking for secrets? 👀🐱\n\nI can neither confirm nor deny that CinePurr has hidden surprises. But I *will* say… try clicking the logo a few times on the homepage. And maybe try a certain famous code sequence? ⬆️⬆️⬇️⬇️⬅️➡️⬅️➡️🅱️🅰️\n\nThat's all I'm saying! 🤫✨",
        ],
        suggestions: ['What are badges?', 'Tell me about party mode', 'What features does CinePurr have?'],
    },

    // Badges / Achievements
    {
        id: 'badges',
        patterns: [/badge/i, /achievement/i, /how\s*to\s*(get|earn)\s*(a\s*)?badge/i, /unlock/i],
        keywords: ['badge', 'achievement', 'unlock', 'earn'],
        responses: [
            "Collect badges to show off your CinePurr journey! 🏅\n\n**How to earn badges:**\n• 🏠 **First Room** — Create your first room\n• 🔥 **7-Day Streak** — Login 7 days in a row\n• 🔥 **30-Day Streak** — Login 30 days in a row  \n• 🔥 **100-Day Streak** — Login 100 days in a row\n• 🎮 **Konami Master** — Find the secret code\n• 🎯 More from completing challenges!\n\nView all your badges in your **Profile** or the **Achievements** page!",
        ],
        suggestions: ['How do streaks work?', 'What are challenges?', 'Show me leaderboards'],
    },
];

// Fallback responses when no intent matches
const FALLBACK_RESPONSES = [
    "Hmm, I'm not quite sure about that one! 🤔 But I know a LOT about CinePurr — try asking me about rooms, XP, themes, friends, or any of our features!",
    "That's outside my area of expertise, but I'm a CinePurr whiz! 🐱 Ask me about creating rooms, daily quests, leaderboards, or anything else on the platform!",
    "I'm still learning about that topic! 🎓 In the meantime, I can help with rooms, XP & leveling, friends, themes, study rooms, minigames, and more!",
    "Not sure I can help with that specifically, but I know CinePurr inside and out! 🐾 What would you like to know about our features?",
];

const FALLBACK_SUGGESTIONS = ['What can you help with?', 'How do I create a room?', 'Tell me about XP', 'What are daily quests?'];

// Find the best matching intent for a message
function matchIntent(message: string): Intent | null {
    const lowerMessage = message.toLowerCase().trim();

    // First pass: check regex patterns (most precise)
    for (const intent of INTENTS) {
        for (const pattern of intent.patterns) {
            if (pattern.test(lowerMessage)) {
                return intent;
            }
        }
    }

    // Second pass: check keyword overlap (fuzzy matching)
    let bestMatch: Intent | null = null;
    let bestScore = 0;

    const words = lowerMessage.split(/\s+/);

    for (const intent of INTENTS) {
        let score = 0;
        for (const keyword of intent.keywords) {
            if (lowerMessage.includes(keyword)) {
                score += keyword.length; // Longer keyword matches score higher
            }
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = intent;
        }
    }

    // Only return keyword match if score is meaningful
    return bestScore >= 3 ? bestMatch : null;
}

// Pick a random item from an array
function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Main chat engine function
export function generateChatResponse(message: string, context?: ConversationContext): ChatResponse {
    const intent = matchIntent(message);

    if (intent) {
        return {
            reply: pickRandom(intent.responses),
            suggestions: intent.suggestions,
        };
    }

    // Fallback
    return {
        reply: pickRandom(FALLBACK_RESPONSES),
        suggestions: FALLBACK_SUGGESTIONS,
    };
}
