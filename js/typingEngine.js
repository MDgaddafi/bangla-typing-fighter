/**
 * Bangla Typing Fighter - Typing Engine & Beginner Friendly Timer Matrix
 */

class TypingEngine {
  constructor() {
    this.currentWordObj = null;
    this.targetWord = "";
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
    const timerMatrix = {
      1: 12.0, // Ultra Generous Easy (12s)
      2: 10.0, // Very Easy (10s)
      3: 8.5,  // Easy (8.5s)
      4: 7.0,  // Casual (7s)
      5: 5.5,  // Moderate (5.5s)
      6: 4.0,  // Fast (4s)
      7: 3.0   // Final Boss (3s)
    };
    this.maxEnemyTimer = timerMatrix[level] || 8.0;
    this.enemyTimer = this.maxEnemyTimer;
  }

  setNextWord(wordObj, isSuper = false, mode = 'english') {
    this.currentWordObj = wordObj;
    if (mode === 'bangla' && wordObj && wordObj.bangla) {
      this.targetWord = wordObj.bangla.trim();
    } else {
      this.targetWord = (wordObj && wordObj.word) ? wordObj.word.toLowerCase() : "chaa";
    }
    this.typedIndex = 0;
    this.isSuperMoveActive = isSuper;
    this.enemyTimer = this.maxEnemyTimer;
  }

  handleKeyPress(key) {
    if (!this.targetWord) return { status: 'none' };

    const expectedChar = this.targetWord[this.typedIndex];
    const inputKey = key.toLowerCase();

    this.totalKeystrokes++;

    if (inputKey === expectedChar) {
      this.correctKeystrokes++;
      this.typedIndex++;
      this.comboCount++;
      if (this.comboCount > this.maxCombo) {
        this.maxCombo = this.comboCount;
      }

      if (this.typedIndex >= this.targetWord.length) {
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
