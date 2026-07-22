/**
 * Bangla Typing Fighter - Word Dictionary by 7 Campaign Levels
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
    { word: "nakshikantha", bangla: "নকশী কাঁথা", category: "Craft", hint: "Embroidered quilt" },
    { word: "muktijoddha", bangla: "মুক্তিযোদ্ধা", category: "Hero", hint: "Freedom Fighter" },
    { word: "ekushey", bangla: "একুশে", category: "History", hint: "Language Movement" },
    { word: "panamcity", bangla: "পানাম সিটি", category: "History", hint: "Historic town" }
  ],

  level7: [
    { word: "amarsonar", bangla: "আমার সোনার বাংলা", category: "Anthem", hint: "National anthem" },
    { word: "joybangla", bangla: "জয় বাংলা", category: "Slogan", hint: "Historic victory slogan" },
    { word: "shahidminar", bangla: "শহীদ মিনার", category: "Monument", hint: "Language memorial" },
    { word: "smritisoudho", bangla: "স্মৃতিসৌধ", category: "Monument", hint: "Martyrs memorial" },
    { word: "bengaltiger", bangla: "রয়্যাল বেঙ্গল টাইগার", category: "Wildlife", hint: "King of Sundarbans" },
    { word: "ahsanmanzil", bangla: "আহসান মঞ্জিল", category: "Landmark", hint: "Pink palace" },
    { word: "digitalbangladesh", bangla: "ডিজিটাল বাংলাদেশ", category: "Tech", hint: "Tech vision" },
    { word: "smartbangladesh", bangla: "স্মার্ট বাংলাদেশ", category: "Future", hint: "Future vision" }
  ],

  superMoves: [
    { word: "lathialstrike", damage: 40, bangla: "লাঠিয়াল স্ট্রাইক", name: "BAMBOO CYCLONE" },
    { word: "tigerrage", damage: 50, bangla: "টাইগার রেজ", name: "SUNDARBAN ROAR" },
    { word: "padmawave", damage: 45, bangla: "পদ্মা ওয়েভ", name: "TSUNAMI SLASH" },
    { word: "freedombir", damage: 60, bangla: "বীর মুক্তি", name: "HEROIC FINISHER" }
  ]
};

function getRandomWord(level) {
  const lvlKey = `level${Math.min(7, Math.max(1, level))}`;
  const pool = WORDS_DATABASE[lvlKey] || WORDS_DATABASE.level1;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

function getRandomSuperMove() {
  const index = Math.floor(Math.random() * WORDS_DATABASE.superMoves.length);
  return WORDS_DATABASE.superMoves[index];
}
