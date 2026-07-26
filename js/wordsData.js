/**
 * Bangla Typing Fighter - Word Dictionary by 7 Campaign Levels (Single Words Only)
 */

const WORDS_DATABASE = {
  level1: [
    { word: "chaa", bangla: "চা", category: "Drink", hint: "Tong er cha" },
    { word: "taka", bangla: "টাকা", category: "Economy", hint: "Bangladeshi Currency" },
    { word: "bhaat", bangla: "ভাত", category: "Food", hint: "Steamed staple rice" },
    { word: "lathi", bangla: "লাঠি", category: "Culture", hint: "Bamboo stick" },
    { word: "pitha", bangla: "পিঠা", category: "Food", hint: "Winter sweet" }
  ],

  level2: [
    { word: "fuchka", bangla: "ফুচকা", category: "Food", hint: "Crispy street food" },
    { word: "gamcha", bangla: "গামছা", category: "Culture", hint: "Cotton towel" },
    { word: "hilsa", bangla: "ইলিশ", category: "Fish", hint: "National fish" },
    { word: "borhani", bangla: "বোরহানি", category: "Drink", hint: "Spiced yogurt" },
    { word: "singara", bangla: "সিঙ্গাড়া", category: "Snack", hint: "Evening snack" }
  ],

  level3: [
    { word: "kacchi", bangla: "কাচ্চি", category: "Food", hint: "Mutton Biryani" },
    { word: "bhetki", bangla: "ভেটকি", category: "Fish", hint: "Fish fry" },
    { word: "jilapi", bangla: "জিলিপী", category: "Sweet", hint: "Sticky spirals" },
    { word: "mishti", bangla: "মিষ্টি", category: "Sweet", hint: "Bogura sweet" },
    { word: "shorshe", bangla: "সর্ষে", category: "Food", hint: "Mustard paste" }
  ],

  level4: [
    { word: "sylhet", bangla: "সিলেট", category: "Place", hint: "Tea gardens" },
    { word: "padma", bangla: "পদ্মা", category: "River", hint: "Mighty river" },
    { word: "lalbagh", bangla: "লালবাগ", category: "History", hint: "Mughal fort" },
    { word: "meghna", bangla: "মেঘনা", category: "River", hint: "Deepest river" },
    { word: "boishakh", bangla: "বৈশাখ", category: "Festival", hint: "New Year" }
  ],

  level5: [
    { word: "sundarban", bangla: "সুন্দরবন", category: "Landmark", hint: "Mangrove forest" },
    { word: "coxsbazar", bangla: "কক্সবাজার", category: "Landmark", hint: "Sea beach" },
    { word: "jamdani", bangla: "জামদানি", category: "Heritage", hint: "GI saree" },
    { word: "rickshaw", bangla: "রিকশা", category: "Transport", hint: "Three wheeler art" },
    { word: "sonargaon", bangla: "সোনারগাঁও", category: "History", hint: "Ancient capital" }
  ],

  level6: [
    { word: "nakshi", bangla: "নকশী", category: "Craft", hint: "Embroidered pattern" },
    { word: "muktijoddha", bangla: "মুক্তিযোদ্ধা", category: "Hero", hint: "Freedom Fighter" },
    { word: "ekushey", bangla: "একুশে", category: "History", hint: "Language Movement" },
    { word: "panam", bangla: "পানাম", category: "History", hint: "Historic town" }
  ],

  level7: [
    { word: "sonar", bangla: "সোনার", category: "Anthem", hint: "Golden" },
    { word: "joy", bangla: "জয়", category: "Slogan", hint: "Victory" },
    { word: "shahid", bangla: "শহীদ", category: "Monument", hint: "Martyr" },
    { word: "smritisoudho", bangla: "স্মৃতিসৌধ", category: "Monument", hint: "Martyrs memorial" },
    { word: "tiger", bangla: "টাইগার", category: "Wildlife", hint: "Bengal Tiger" },
    { word: "manzil", bangla: "মঞ্জিল", category: "Landmark", hint: "Pink palace" },
    { word: "digital", bangla: "ডিজিটাল", category: "Tech", hint: "Tech vision" },
    { word: "smart", bangla: "স্মার্ট", category: "Future", hint: "Future vision" }
  ],

  superMoves: [
    { word: "lathial", damage: 40, bangla: "লাঠিয়াল", name: "BAMBOO CYCLONE" },
    { word: "tiger", damage: 50, bangla: "টাইগার", name: "SUNDARBAN ROAR" },
    { word: "padma", damage: 45, bangla: "পদ্মা", name: "TSUNAMI SLASH" },
    { word: "bir", damage: 60, bangla: "বীর", name: "HEROIC FINISHER" }
  ]
};

/**
 * Shuffle-Queue Word System — ensures no word repeats until ALL words have been shown.
 * For each level, we build a shuffled queue from the level's own words PLUS adjacent
 * level words, giving a much larger unique pool per round.
 */

// Stores shuffled word queues per level key, e.g. { "level1": [...], "level2": [...] }
const _wordQueues = {};
// Stores shuffled super move queue
let _superMoveQueue = [];

/**
 * Fisher-Yates shuffle (in-place).
 */
function _shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build (or rebuild) the shuffled queue for a given level.
 * Pulls words from the target level + one level below and one level above
 * to increase the pool size and variety.
 */
function _buildWordQueue(level) {
  const lvl = Math.min(7, Math.max(1, level));
  const lvlKey = `level${lvl}`;
  
  // Collect words from current level + neighbors for a bigger pool
  const pool = [];
  const addedWords = new Set();
  
  for (let l = Math.max(1, lvl - 1); l <= Math.min(7, lvl + 1); l++) {
    const key = `level${l}`;
    const words = WORDS_DATABASE[key];
    if (words) {
      for (const w of words) {
        // Deduplicate by the romanized word string
        if (!addedWords.has(w.word)) {
          addedWords.add(w.word);
          pool.push(w);
        }
      }
    }
  }
  
  _wordQueues[lvlKey] = _shuffle([...pool]);
}

function getRandomWord(level) {
  const lvlKey = `level${Math.min(7, Math.max(1, level))}`;
  
  // If queue is empty or doesn't exist, build a fresh shuffled queue
  if (!_wordQueues[lvlKey] || _wordQueues[lvlKey].length === 0) {
    _buildWordQueue(level);
  }
  
  // Pop the next unique word from the queue
  return _wordQueues[lvlKey].pop();
}

function getRandomSuperMove() {
  // Rebuild if empty
  if (!_superMoveQueue || _superMoveQueue.length === 0) {
    _superMoveQueue = _shuffle([...WORDS_DATABASE.superMoves]);
  }
  return _superMoveQueue.pop();
}

/**
 * Call this when starting a new game to reset all queues,
 * ensuring a completely fresh word experience.
 */
function resetWordQueues() {
  for (const key in _wordQueues) {
    delete _wordQueues[key];
  }
  _superMoveQueue = [];
}
