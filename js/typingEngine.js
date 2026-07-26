/**
 * Bangla Typing Fighter - Typing Engine & Beginner Friendly Timer Matrix
 */

const LEVEL_DIFFICULTY = {
  1: { enemyTimer: 12.0, enemyAttackCooldown: 6.0, enemyDamage: 2, playerCharDamage: 6, playerWordDamage: 32, enemyHp: 100 },
  2: { enemyTimer: 10.0, enemyAttackCooldown: 5.0, enemyDamage: 3, playerCharDamage: 6, playerWordDamage: 34, enemyHp: 100 },
  3: { enemyTimer: 8.5, enemyAttackCooldown: 4.2, enemyDamage: 4, playerCharDamage: 7, playerWordDamage: 36, enemyHp: 100 },
  4: { enemyTimer: 7.0, enemyAttackCooldown: 3.6, enemyDamage: 5, playerCharDamage: 7, playerWordDamage: 38, enemyHp: 100 },
  5: { enemyTimer: 6.0, enemyAttackCooldown: 3.1, enemyDamage: 6, playerCharDamage: 7, playerWordDamage: 40, enemyHp: 100 },
  6: { enemyTimer: 4.5, enemyAttackCooldown: 2.4, enemyDamage: 7, playerCharDamage: 8, playerWordDamage: 42, enemyHp: 110 },
  7: { enemyTimer: 3.2, enemyAttackCooldown: 1.8, enemyDamage: 8, playerCharDamage: 8, playerWordDamage: 45, enemyHp: 115 }
};

function getLevelDifficulty(level) {
  const normalizedLevel = Math.min(7, Math.max(1, Number(level) || 1));
  return LEVEL_DIFFICULTY[normalizedLevel] || LEVEL_DIFFICULTY[1];
}

function splitGraphemes(text) {
  if (!text) return [];
  try {
    return Array.from(text.normalize('NFC').matchAll(/(\P{M}\p{M}*)/gu), match => match[0]);
  } catch (err) {
    // Fallback for browsers without Unicode property escapes
    return Array.from(text.normalize('NFC'));
  }
}

class TypingEngine {
  constructor() {
    this.currentWordObj = null;
    this.targetWord = "";
    this.targetLetters = [];
    this.typedIndex = 0;
    
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.errorKeystrokes = 0;
    this.wordsCompleted = 0;
    this.comboCount = 0;
    this.maxCombo = 0;
    
    this.startTime = null;
    this.enemyTimer = 0;
    this.maxEnemyTimer = 12;
    this.isSuperMoveActive = false;
  }

  startSession(level = 1) {
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.errorKeystrokes = 0;
    this.wordsCompleted = 0;
    this.comboCount = 0;
    this.maxCombo = 0;
    this.startTime = Date.now();
    this.isSuperMoveActive = false;

    this.setEnemyTimerByLevel(level);
  }

  setEnemyTimerByLevel(level) {
    const config = getLevelDifficulty(level);
    this.maxEnemyTimer = config.enemyTimer;
    this.enemyTimer = this.maxEnemyTimer;
  }

  setNextWord(wordObj, isSuper = false, mode = 'english') {
    this.currentWordObj = wordObj;
    if (mode === 'bangla' && wordObj && wordObj.bangla) {
      this.targetWord = wordObj.bangla.trim().normalize('NFC');
    } else {
      this.targetWord = (wordObj && wordObj.word) ? wordObj.word.toLowerCase() : "chaa";
    }
    this.targetLetters = Array.from(this.targetWord);
    this.typedIndex = 0;
    this.isSuperMoveActive = isSuper;
    this.enemyTimer = this.maxEnemyTimer;
  }

  handleKeyPress(key) {
    if (!this.targetWord) return { status: 'none' };

    const expectedChar = this.targetLetters[this.typedIndex] || this.targetWord[this.typedIndex];
    const inputKey = key.toLowerCase();

    this.totalKeystrokes++;

    if (inputKey === expectedChar) {
      this.correctKeystrokes++;
      this.typedIndex++;
      this.comboCount++;
      if (this.comboCount > this.maxCombo) {
        this.maxCombo = this.comboCount;
      }

      if (this.typedIndex >= this.targetLetters.length) {
        this.wordsCompleted++;
        const isSuper = this.isSuperMoveActive;
        this.isSuperMoveActive = false;
        return {
          status: 'word_completed',
          combo: this.comboCount,
          isSuperMove: isSuper,
          wordObj: this.currentWordObj
        };
      }

      return {
        status: 'char_correct',
        char: expectedChar,
        typedIndex: this.typedIndex,
        combo: this.comboCount
      };
    } else {
      this.errorKeystrokes++;
      this.comboCount = 0;
      return {
        status: 'char_error',
        expectedChar: expectedChar,
        inputKey: inputKey
      };
    }
  }

  getWPM() {
    if (!this.startTime) return 0;
    const minutes = (Date.now() - this.startTime) / 60000;
    if (minutes <= 0) return 0;
    return Math.round((this.correctKeystrokes / 5) / minutes) || 0;
  }

  getAccuracy() {
    if (this.totalKeystrokes === 0) return 100;
    return Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100);
  }
}

const typingEngine = new TypingEngine();
window.typingEngine = typingEngine;
window.splitGraphemes = splitGraphemes;
window.getLevelDifficulty = getLevelDifficulty;
