/**
 * Bangla Typing Fighter - Game Engine & Typing Forward March Engine
 */

const bgSundarbans = new Image();
bgSundarbans.src = 'assets/bg_sundarbans.png';

const bgLalbagh = new Image();
bgLalbagh.src = 'assets/bg_lalbagh.png';

const shivaSpritesheet = new Image();
shivaSpritesheet.src = 'assets/shiva_spritesheet.png';
shivaSpritesheet.onload = () => {
  Fighter.spritesheet = shivaSpritesheet;
};



class HypeText {
  constructor(text, x, y, color) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.color = color;
    this.life = 1.0;
    this.decay = 0.025;
    this.scale = 1.6;
  }

  update() {
    this.y -= 1.2;
    this.life -= this.decay;
    if (this.scale > 1.0) this.scale -= 0.03;
  }

  draw(ctx) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.font = '900 24px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeText(this.text, 0, 0);

    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    
    this.state = 'MENU';
    this.level = 1;
    this.maxLevels = 7;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('btf_highscore') || '0', 10);
    this.stageTheme = 1;
    
    this.player = null;
    this.enemy = null;
    this.particles = [];
    this.hypeTexts = [];
    
    this.roundTime = 30;
    this.roundTimerInterval = null;
    this.botActionCooldown = 0;
    this.enemiesDefeatedInRound = 0;
    
    this.lastFrameTime = 0;
    this.attackSeqIndex = 0;
    this.slowMoTimer = 0;

    // Multiplayer properties
    this.multiplayerMatchId = null;
    this.multiplayerRole = null;
    this.multiplayerOpponentId = null;
    this.multiplayerWords = [];
    this.multiplayerWordIndex = 0;
  }

  init() {
    this.canvas = document.getElementById('gameCanvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.player = new Fighter(true, 'Lathial Bir', '#0f5257', 200, 260);
    this.enemy = new Fighter(false, 'Dakat Sardar', '#2b2d42', 700, 260);

    window.addEventListener('keydown', (e) => this.onKeyDown(e));

    const inputElem = document.getElementById('hiddenTypingInput');
    if (inputElem) {
      inputElem.addEventListener('input', (e) => {
        if (this.typingMode === 'bangla') {
          let val = e.target.value;
          const targetWord = typingEngine.targetWord;
          
          // Auto-strip spaces if the target word does not contain spaces
          // This prevents Spacebar commits in IMEs from triggering errors
          if (targetWord && !targetWord.includes(' ')) {
            const stripped = val.replace(/\s+/g, '');
            if (stripped !== val) {
              val = stripped;
              e.target.value = val;
            }
          }
          
          // Calculate matching characters
          let matchCount = 0;
          while (matchCount < val.length && matchCount < targetWord.length && val[matchCount] === targetWord[matchCount]) {
            matchCount++;
          }
          
          if (matchCount > typingEngine.typedIndex) {
            const charsAdded = matchCount - typingEngine.typedIndex;
            for (let i = 0; i < charsAdded; i++) {
              const charToProcess = val[typingEngine.typedIndex];
              this.processKeystroke(charToProcess);
            }
          } else if (val.length < typingEngine.typedIndex) {
            // Sync typedIndex back on Backspace
            typingEngine.typedIndex = val.length;
          } else if (val.length > matchCount) {
            // Flash red on typing error but DO NOT clear the composition context
            soundEngine.playErrorSound();
            this.player.shakeAmount = 8;
            const targetElem = document.getElementById('wordTargetDisplay');
            if (targetElem) {
              targetElem.classList.add('shake-error');
              setTimeout(() => targetElem.classList.remove('shake-error'), 300);
            }
          }
        } else {
          // English phonetic direct input fallback
          if (e.target.value.length > 0) {
            const typedChar = e.target.value.slice(-1);
            e.target.value = '';
            this.processKeystroke(typedChar);
          }
        }
      });
    }

    this.typingMode = localStorage.getItem('btf_typing_mode') || 'english';
    const selectElem = document.getElementById('typingModeSelect');
    if (selectElem) {
      selectElem.value = this.typingMode;
    }

    requestAnimationFrame((ts) => this.gameLoop(ts));
    this.updateHighScoreDisplay();
  }

  focusTypingInput() {
    const inputElem = document.getElementById('hiddenTypingInput');
    if (inputElem && inputElem.focus) {
      inputElem.focus();
    }
  }

  resizeCanvas() {
    const container = document.getElementById('canvasContainer');
    if (container && this.canvas) {
      this.canvas.width = container.clientWidth || 900;
      this.canvas.height = 420;
      
      if (this.player && this.enemy) {
        this.player.groundY = 270;
        this.enemy.groundY = 270;
        this.player.y = 270;
        this.enemy.y = 270;
      }
    }
  }

  updateHighScoreDisplay() {
    const elem = document.getElementById('highScoreVal');
    if (elem) elem.innerText = this.highScore;
  }

  startNewGame() {
    this.level = 1;
    this.score = 0;
    this.stageTheme = 1;
    this.startRound();
  }

  startRound() {
    this.state = 'FIGHTING';
    
    // Restore default Max HP for single player campaign
    if (this.player) this.player.maxHp = 100;
    if (this.enemy) this.enemy.maxHp = 100;

    // Per-level round durations: increase to 2 minutes per level to allow comfortable typing
    const durationMatrix = { 1: 120, 2: 120, 3: 120, 4: 120, 5: 120, 6: 120, 7: 120 };
    this.roundTime = durationMatrix[this.level] || 120;
    
    this.enemiesDefeatedInRound = 0;
    this.attackSeqIndex = 0;
    this.slowMoTimer = 0;
    
    this.focusTypingInput();

    const canvasW = this.canvas ? this.canvas.width : 900;
    this.player.reset(canvasW * 0.22, 270);
    this.enemy.reset(canvasW * 0.78, 270);
    
    const enemyNames = [
      'Villager Bandit', 
      'Highway Dakat', 
      'Sundarban Bandit', 
      'Lalbagh Shadow', 
      'Rakkosh Warrior', 
      'Asur General', 
      '🏆 FINAL BOSS: ASUR KING'
    ];
    this.enemy.name = enemyNames[this.level - 1] || 'Dakat Sardar';
    
    const enemyNameElem = document.getElementById('enemyNameDisplay');
    if (enemyNameElem) enemyNameElem.innerText = `[LVL ${this.level}/7] ${this.enemy.name}`;

    typingEngine.startSession(this.level);
    this.loadNextWord();

    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
    this.roundTimerInterval = setInterval(() => {
      if (this.state === 'FIGHTING') {
        this.roundTime--;
        const timerElem = document.getElementById('roundTimerDisplay');
        if (timerElem) timerElem.innerText = this.roundTime;

        if (this.roundTime <= 0) {
              clearInterval(this.roundTimerInterval);
              // Only grant a round win on timeout if the player actually defeated at least
              // one enemy in the round. Prevents passive wins when player does not engage.
              if (this.player.hp > 0 && this.enemiesDefeatedInRound > 0) {
                this.triggerRoundWin();
              } else {
                this.triggerGameOver();
              }
            }
      }
    }, 1000);

    document.getElementById('startMenuModal').style.display = 'none';
    document.getElementById('victoryModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('fightHUD').style.display = 'flex';
    document.getElementById('wordTargetDisplay').style.display = 'block';

    this.updateHUD();
  }

  spawnNextEnemyWave() {
    this.enemiesDefeatedInRound++;
    soundEngine.playVictorySound();
    
    // Trigger Victory Pose on Player
    this.player.state = 'victory';
    setTimeout(() => { if (this.player.state === 'victory') this.player.state = 'idle'; }, 900);

    this.spawnHypeText(`⚔️ WAVE ${this.enemiesDefeatedInRound} KO! NEXT WAVE! ⚔️`, this.canvas.width * 0.5, 140, '#ffd166');
    this.score += 300;

    // Reset Enemy Position
    const canvasW = this.canvas ? this.canvas.width : 900;
    this.enemy.reset(canvasW * 0.78, 270);
    this.loadNextWord();
    this.updateHUD();
  }

  loadNextWord() {
    const isSuper = typingEngine.comboCount >= 5 && Math.random() < 0.35;
    let wordObj = isSuper ? getRandomSuperMove() : getRandomWord(this.level);

    const mode = this.typingMode || 'english';
    typingEngine.setNextWord(wordObj, isSuper, mode);

    // Clear the composition box for next word
    if (mode === 'bangla') {
      const inputElem = document.getElementById('hiddenTypingInput');
      if (inputElem) inputElem.value = '';
    }

    this.renderTargetWord();
  }

  renderTargetWord() {
    const container = document.getElementById('wordTargetDisplay');
    if (!container || !typingEngine.targetWord) return;

    const word = typingEngine.targetWord;
    const typedIdx = typingEngine.typedIndex;
    const obj = typingEngine.currentWordObj || {};
    const mode = this.typingMode || 'english';

    // Show/Hide input field based on Typing Mode
    const inputElem = document.getElementById('hiddenTypingInput');
    if (inputElem) {
      if (mode === 'bangla') {
        inputElem.className = 'visible-input-bangla';
        inputElem.placeholder = 'এখানে টাইপ করুন...';
      } else {
        inputElem.className = 'hidden-input-style';
        inputElem.placeholder = '';
      }
    }

    let html = '';
    if (typingEngine.isSuperMoveActive) {
      html += `<div class="super-move-badge">⚡ SUPER MOVE: ${obj.name || 'POWER'} ⚡</div>`;
    }

    if (mode === 'bangla' && obj.bangla) {
      html += `<div class="word-preview-large">${obj.bangla}</div>`;
    }

    html += `<div class="word-letters">`;
    for (let i = 0; i < word.length; i++) {
      if (i < typedIdx) {
        html += `<span class="letter typed">${word[i]}</span>`;
      } else if (i === typedIdx) {
        html += `<span class="letter current">${word[i]}</span>`;
      } else {
        html += `<span class="letter untyped">${word[i]}</span>`;
      }
    }
    html += `</div>`;

    if (mode === 'bangla') {
      html += `<div class="word-meaning">⌨️ Pronunciation: <strong>${obj.word}</strong> - <i>${obj.hint || ''}</i></div>`;
    } else {
      if (obj.bangla) {
        html += `<div class="word-meaning">🇧🇩 ${obj.bangla} - <i>${obj.hint || ''}</i></div>`;
      }
    }

    container.innerHTML = html;
  }

  onKeyDown(e) {
    if (this.state !== 'FIGHTING' && this.state !== 'MULTIPLAYER_FIGHTING') return;
    if (this.isKOPause) return; // Block input during KO transition

    // If the user is editing any input (like the username field), do not process
    // global game key events so typing goes into the focused input element.
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
      return;
    }

    // Bangla layouts require keyboard input to hit the hidden input field for IME composition
    if (this.typingMode === 'bangla') return;

    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key.length !== 1) return;

    e.preventDefault();
    this.processKeystroke(e.key);
  }

  processKeystroke(keyChar) {
    if (this.state !== 'FIGHTING' && this.state !== 'MULTIPLAYER_FIGHTING') return;
    if (this.isKOPause) return; // Block input during KO transition

    if (soundEngine) soundEngine.init();
    const result = typingEngine.handleKeyPress(keyChar);

    if (result.status === 'char_correct') {
      // --- TYPING-DRIVEN FORWARD MARCH ENGINE ---
      if (this.state === 'MULTIPLAYER_FIGHTING') {
        const dist = this.enemy.x - this.player.x;
        if (dist > 110) {
          this.player.x += 14;
        }
      } else {
        const maxForward = (this.canvas ? this.canvas.width : 900) * 0.70;
        if (this.player.x < maxForward) {
          this.player.x += 14;
        }
        const dist = this.enemy.x - this.player.x;
        if (dist < 110) {
          const maxBack = (this.canvas ? this.canvas.width : 900) * 0.88;
          if (this.enemy.x < maxBack) this.enemy.x += 12;
        }
      }

      const attackTypes = ['slash', 'punch', 'kick'];
      const action = attackTypes[this.attackSeqIndex % attackTypes.length];
      this.attackSeqIndex++;

      if (action === 'slash') {
        soundEngine.playAttackSlashSound();
        this.player.triggerAction('slash');
        this.spawnSparks(this.enemy.x - 30, this.enemy.y - 20, '#00f5d4', 12);
        
        if (result.combo % 3 === 0) {
          this.spawnHypeText("KATANA SLASH!!", this.enemy.x, this.enemy.y - 80, '#00f5d4');
        }
      } else if (action === 'punch') {
        soundEngine.playPunchSound();
        this.player.triggerAction('punch');
        this.spawnSparks(this.enemy.x - 20, this.enemy.y - 15, '#ff4d6d', 10);
      } else {
        soundEngine.playKickSound();
        this.player.triggerAction('kick');
        this.spawnSparks(this.enemy.x - 20, this.enemy.y + 10, '#ffd166', 10);
      }

      if (this.state === 'MULTIPLAYER_FIGHTING') {
        window.multiplayer.sendMatchAction('keystroke', {
          action: action,
          playerX: this.player.x,
          damage: 6
        });
        this.enemy.takeDamage(6);
        if (this.enemy.hp <= 0) {
          this.handleMultiplayerKO(true); // Local player scored KO
        }
      } else {
        this.enemy.takeDamage(6);
      }

      this.renderTargetWord();
    } 
    else if (result.status === 'word_completed') {
      // Player Forward Lunge Attack
      if (this.state === 'MULTIPLAYER_FIGHTING') {
        const dist = this.enemy.x - this.player.x;
        if (dist > 110) {
          this.player.x += Math.min(25, dist - 110);
        }
      } else {
        this.player.x += 25;
      }

      soundEngine.playJumpSound();
      this.player.jump();
      
      setTimeout(() => {
        soundEngine.playKickSound();
        this.player.triggerAction('jump_kick');
        
        let dmg = 35;
        if (result.isSuperMove) {
          soundEngine.playSuperMoveSound();
          dmg = 55;
          this.enemy.takeDamage(55);
          this.player.shakeAmount = 22;
          this.enemy.shakeAmount = 30;
          this.spawnSparks(this.enemy.x, this.enemy.y, '#ff0055', 35);
          this.spawnHypeText("⚡ LIGHTNING FINISHER! ⚡", this.canvas.width * 0.5, 140, '#ffd166');
          this.score += 250;
        } else {
          soundEngine.playAttackSlashSound();
          this.enemy.takeDamage(35);
          this.enemy.shakeAmount = 15;
          this.spawnSparks(this.enemy.x, this.enemy.y, '#06d6a0', 20);
          this.spawnHypeText("PERFECT COMBO!", this.enemy.x, this.enemy.y - 90, '#52b788');
          this.score += 100;
        }

        if (this.state === 'MULTIPLAYER_FIGHTING') {
          window.multiplayer.sendMatchAction('word_completed', {
            isSuperMove: result.isSuperMove,
            damage: dmg,
            playerX: this.player.x
          });

          if (this.enemy.hp <= 0) {
            this.handleMultiplayerKO(true); // Local player scored KO
          } else {
            this.loadNextMultiplayerWord();
          }
        } else {
          if (this.enemy.hp <= 0) {
            if (this.roundTime > 0) {
              this.spawnNextEnemyWave();
            } else {
              this.slowMoTimer = 1.2;
              setTimeout(() => this.triggerRoundWin(), 1200);
            }
          } else {
            this.loadNextWord();
          }
        }
      }, 120);
    } 
    else if (result.status === 'char_error') {
      soundEngine.playErrorSound();
      this.player.shakeAmount = 8;
      
      const targetElem = document.getElementById('wordTargetDisplay');
      if (targetElem) {
        targetElem.classList.add('shake-error');
        setTimeout(() => targetElem.classList.remove('shake-error'), 300);
      }
    }

    this.updateHUD();
  }

  spawnHypeText(text, x, y, color) {
    this.hypeTexts.push(new HypeText(text, x, y, color));
  }

  updateEnemyAI(dt) {
    if (this.state !== 'FIGHTING' || this.enemy.state === 'ko') return;

    this.botActionCooldown -= dt;

    const distance = Math.abs(this.enemy.x - this.player.x);
    if (distance > 170) {
      this.enemy.vx = -this.enemy.moveSpeed;
    } else if (distance < 120) {
      this.enemy.vx = this.enemy.moveSpeed;
    } else {
      this.enemy.vx = 0;
    }

    if (this.botActionCooldown <= 0) {
      // Softer early-level AI: increase cooldowns (slower actions) for levels 1-3
      const speedMatrix = { 1: 5.5, 2: 5.0, 3: 4.2, 4: 3.0, 5: 2.4, 6: 1.6, 7: 1.1 };
      this.botActionCooldown = speedMatrix[this.level] || 3.0;

      // Reduce damage on early levels to make progression smoother
      const damageMatrix = { 1: 2, 2: 3, 3: 5, 4: 7, 5: 9, 6: 12, 7: 15 };
      const dmg = damageMatrix[this.level] || 5;

      const randAction = Math.random();
      if (randAction < 0.35) {
        soundEngine.playJumpSound();
        this.enemy.jump();
      } else if (randAction < 0.7) {
        soundEngine.playPunchSound();
        this.enemy.triggerAction('punch');
        this.player.takeDamage(dmg);
        this.player.shakeAmount = 12;
        this.spawnSparks(this.player.x + 20, this.player.y - 10, '#ef233c', 12);
      } else {
        soundEngine.playKickSound();
        this.enemy.triggerAction('kick');
        this.player.takeDamage(dmg + 2);
        this.player.shakeAmount = 15;
        this.spawnSparks(this.player.x + 20, this.player.y + 10, '#ff7b00', 14);
      }

      this.updateHUD();
      if (this.player.hp <= 0) {
        this.slowMoTimer = 1.0;
        setTimeout(() => this.triggerGameOver(), 1000);
      }
    }
  }

  spawnSparks(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  updateHUD() {
    const pPercent = (this.player.hp / this.player.maxHp) * 100;
    const ePercent = (this.enemy.hp / this.enemy.maxHp) * 100;

    const pFill = document.getElementById('playerHpFill');
    const eFill = document.getElementById('enemyHpFill');
    if (pFill) pFill.style.width = `${pPercent}%`;
    if (eFill) eFill.style.width = `${ePercent}%`;

    const wpmElem = document.getElementById('wpmVal');
    const accElem = document.getElementById('accuracyVal');
    const comboElem = document.getElementById('comboVal');
    const scoreElem = document.getElementById('scoreVal');

    if (wpmElem) wpmElem.innerText = typingEngine.getWPM();
    if (accElem) accElem.innerText = typingEngine.getAccuracy() + '%';
    if (comboElem) comboElem.innerText = typingEngine.comboCount + 'x';
    if (scoreElem) scoreElem.innerText = this.score;

    if (this.state === 'MULTIPLAYER_FIGHTING') {
      const pNameElem = document.querySelector('.player-card .fighter-name');
      const eNameElem = document.querySelector('.enemy-card .fighter-name');
      if (pNameElem) pNameElem.innerHTML = `${this.player.name} <span class="tag" style="background:var(--cyan-accent); margin-left: 8px;">KOs: ${this.playerKOs || 0}</span>`;
      if (eNameElem) eNameElem.innerHTML = `${this.enemy.name} <span class="tag enemy-tag" style="margin-left: 8px;">KOs: ${this.enemyKOs || 0}</span>`;
    }

    const threatPercent = (typingEngine.enemyTimer / typingEngine.maxEnemyTimer) * 100;
    const threatFill = document.getElementById('threatTimerFill');
    if (threatFill) threatFill.style.width = `${Math.max(0, threatPercent)}%`;
  }

  triggerRoundWin() {
    this.state = 'ROUND_WIN';
    soundEngine.playVictorySound();

    // Trigger Two-Hands Raised Victory Pose on Hero
    this.player.state = 'victory';
    this.player.vx = 0;

    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('btf_highscore', this.highScore.toString());
      this.updateHighScoreDisplay();
    }

    const winLevelVal = document.getElementById('winLevelVal');
    if (winLevelVal) winLevelVal.innerText = `${this.level} / ${this.maxLevels}`;
    
    document.getElementById('winWpmVal').innerText = typingEngine.getWPM();
    document.getElementById('winAccVal').innerText = typingEngine.getAccuracy() + '%';
    document.getElementById('winScoreVal').innerText = this.score;

    const btnNext = document.querySelector('#victoryModal .btn-primary');
    if (this.level >= this.maxLevels) {
      document.querySelector('#victoryModal h2').innerText = '🏆 GRAND CHAMPION OF BANGLADESH!';
      if (btnNext) {
        btnNext.innerText = '🔄 PLAY AGAIN (আবার খেলুন)';
        btnNext.onclick = () => this.startNewGame();
      }
    } else {
      document.querySelector('#victoryModal h2').innerText = `🎉 LEVEL ${this.level} CLEARED!`;
      if (btnNext) {
        btnNext.innerText = `NEXT LEVEL (${this.level + 1}/${this.maxLevels}) ➔`;
        btnNext.onclick = () => this.nextLevel();
      }
    }

    document.getElementById('victoryModal').style.display = 'flex';
  }

  triggerGameOver() {
    this.state = 'GAME_OVER';
    soundEngine.playGameOverSound();
    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);

    document.getElementById('finalWpmVal').innerText = typingEngine.getWPM();
    document.getElementById('finalAccVal').innerText = typingEngine.getAccuracy() + '%';
    document.getElementById('finalScoreVal').innerText = this.score;
    // Configure retry button to restart the same level (instead of full campaign)
    const btnRetry = document.querySelector('#gameOverModal .btn-primary');
    if (btnRetry) {
      btnRetry.innerText = 'RETRY LEVEL (পুনরায় এই লেভেল)';
      btnRetry.onclick = () => {
        document.getElementById('gameOverModal').style.display = 'none';
        // Restart the round at the current level
        this.startRound();
      };
    }

    document.getElementById('gameOverModal').style.display = 'flex';
  }

  triggerTimeOut() {
    if (this.player.hp > 0) {
      this.triggerRoundWin();
    } else {
      this.triggerGameOver();
    }
  }

  nextLevel() {
    if (this.level < this.maxLevels) {
      this.level++;
      this.stageTheme = (this.stageTheme % 2) + 1;
      this.startRound();
    } else {
      this.startNewGame();
    }
  }

  startMultiplayerMatch({ matchId, role, opponentId, opponentName, duration, wordsList }) {
    this.state = 'MULTIPLAYER_FIGHTING';
    this.multiplayerMatchId = matchId;
    this.multiplayerRole = role;
    this.multiplayerOpponentId = opponentId;
    this.multiplayerWords = wordsList;
    this.multiplayerWordIndex = 0;
    
    this.roundTime = duration;
    this.enemiesDefeatedInRound = 0;
    this.attackSeqIndex = 0;
    this.slowMoTimer = 0;

    // Initialize multiplayer match variables
    this.playerKOs = 0;
    this.enemyKOs = 0;
    this.isKOPause = false;
    
    this.focusTypingInput();

    // Adjust HP for a fairer typing battle duration
    this.player.maxHp = 300;
    this.enemy.maxHp = 300;

    const canvasW = this.canvas ? this.canvas.width : 900;
    this.player.reset(canvasW * 0.22, 270);
    this.enemy.reset(canvasW * 0.78, 270);
    
    const localName = document.getElementById('localUsername') ? document.getElementById('localUsername').value.trim() : 'Lathial Bir';
    this.player.name = localName;
    this.enemy.name = opponentName;
    
    const enemyNameElem = document.getElementById('enemyNameDisplay');
    if (enemyNameElem) enemyNameElem.innerText = `⚔️ ${this.enemy.name}`;

    typingEngine.startSession(1);
    this.loadNextMultiplayerWord();

    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
    const timerElem = document.getElementById('roundTimerDisplay');
    if (timerElem) timerElem.innerText = this.roundTime;
    
    this.roundTimerInterval = setInterval(() => {
      if (this.state === 'MULTIPLAYER_FIGHTING') {
        this.roundTime--;
        if (timerElem) timerElem.innerText = this.roundTime;

        if (this.roundTime <= 0) {
          clearInterval(this.roundTimerInterval);
          this.handleMultiplayerTimeout();
        }
      }
    }, 1000);

    document.getElementById('startMenuModal').style.display = 'none';
    document.getElementById('victoryModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('fightHUD').style.display = 'flex';
    document.getElementById('wordTargetDisplay').style.display = 'block';

    this.updateHUD();
  }

  loadNextMultiplayerWord() {
    if (this.multiplayerWordIndex >= this.multiplayerWords.length) {
      this.multiplayerWordIndex = 0;
    }
    const wordObj = this.multiplayerWords[this.multiplayerWordIndex];
    this.multiplayerWordIndex++;
    
    const mode = this.typingMode || 'english';
    typingEngine.setNextWord(wordObj, wordObj.isSuper, mode);

    // Clear the composition box for next word
    if (mode === 'bangla') {
      const inputElem = document.getElementById('hiddenTypingInput');
      if (inputElem) inputElem.value = '';
    }

    this.renderTargetWord();
  }

  changeTypingMode(newMode) {
    this.typingMode = newMode;
    localStorage.setItem('btf_typing_mode', newMode);
    
    const selects = document.querySelectorAll('#typingModeSelect');
    selects.forEach(select => {
      select.value = newMode;
    });

    if (this.state === 'FIGHTING' || this.state === 'MULTIPLAYER_FIGHTING') {
      if (this.state === 'MULTIPLAYER_FIGHTING') {
        this.multiplayerWordIndex = Math.max(0, this.multiplayerWordIndex - 1);
        this.loadNextMultiplayerWord();
      } else {
        typingEngine.setNextWord(typingEngine.currentWordObj, typingEngine.isSuperMoveActive, newMode);
        this.renderTargetWord();
      }
    }
  }

  handleOpponentAction({ action, value }) {
    if (this.state !== 'MULTIPLAYER_FIGHTING') return;

    if (action === 'keystroke') {
      const canvasW = this.canvas ? this.canvas.width : 900;
      this.enemy.x = canvasW - value.playerX;
      this.enemy.triggerAction(value.action);
      this.player.takeDamage(value.damage);

      if (value.action === 'slash') {
        soundEngine.playAttackSlashSound();
        this.spawnSparks(this.player.x + 30, this.player.y - 20, '#ff0055', 10);
      } else if (value.action === 'punch') {
        soundEngine.playPunchSound();
        this.spawnSparks(this.player.x + 20, this.player.y - 15, '#ff4d6d', 8);
      } else {
        soundEngine.playKickSound();
        this.spawnSparks(this.player.x + 20, this.player.y + 10, '#ffd166', 8);
      }

      if (this.player.hp <= 0) {
        this.handleMultiplayerKO(false); // Opponent scored KO
      }
    } 
    else if (action === 'word_completed') {
      const canvasW = this.canvas ? this.canvas.width : 900;
      this.enemy.x = canvasW - value.playerX;
      
      soundEngine.playJumpSound();
      this.enemy.jump();

      setTimeout(() => {
        soundEngine.playKickSound();
        this.enemy.triggerAction('jump_kick');

        this.player.takeDamage(value.damage);
        this.player.shakeAmount = value.isSuperMove ? 22 : 15;
        this.enemy.shakeAmount = value.isSuperMove ? 30 : 15;

        if (value.isSuperMove) {
          soundEngine.playSuperMoveSound();
          this.spawnSparks(this.player.x, this.player.y, '#ff0055', 35);
          this.spawnHypeText("⚡ LIGHTNING FINISHER! ⚡", this.canvas.width * 0.5, 140, '#ffd166');
        } else {
          soundEngine.playAttackSlashSound();
          this.spawnSparks(this.player.x, this.player.y, '#06d6a0', 20);
          this.spawnHypeText("OPPONENT PERFECT!", this.player.x, this.player.y - 90, '#f42a41');
        }

        if (this.player.hp <= 0) {
          this.handleMultiplayerKO(false); // Opponent scored KO
        }
      }, 120);
    }
    else if (action === 'defeat') {
      if (!this.isKOPause) {
        this.handleMultiplayerKO(true); // Opponent notified of their defeat (meaning we won)
      }
    }

    this.updateHUD();
  }

  handleMultiplayerKO(isVictorious) {
    if (this.state !== 'MULTIPLAYER_FIGHTING') return;

    this.isKOPause = true;
    soundEngine.playVictorySound();

    if (isVictorious) {
      this.playerKOs++;
      this.enemy.state = 'ko';
      this.player.state = 'victory';
      this.spawnHypeText("🏆 K.O.!", this.canvas.width * 0.5, 140, '#ffd166');
    } else {
      this.enemyKOs++;
      this.player.state = 'ko';
      this.enemy.state = 'victory';
      this.spawnHypeText("💀 DEFEATED!", this.canvas.width * 0.5, 140, '#ff4d6d');
    }

    this.updateHUD();

    // After 1.5 seconds, reset round
    setTimeout(() => {
      if (this.state !== 'MULTIPLAYER_FIGHTING') return;

      const canvasW = this.canvas ? this.canvas.width : 900;
      this.player.reset(canvasW * 0.22, 270);
      this.enemy.reset(canvasW * 0.78, 270);
      
      this.player.hp = this.player.maxHp;
      this.enemy.hp = this.enemy.maxHp;
      
      this.player.state = 'idle';
      this.enemy.state = 'idle';
      
      this.isKOPause = false;
      this.loadNextMultiplayerWord();
      this.updateHUD();
    }, 1500);
  }

  triggerMultiplayerWin() {
    this.state = 'ROUND_WIN';
    soundEngine.playVictorySound();

    this.player.state = 'victory';
    this.player.vx = 0;

    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);

    document.querySelector('#victoryModal h2').innerText = '🏆 MULTIPLAYER VICTORY!';
    document.querySelector('#victoryModal p').innerText = `${this.enemy.name} কে সফলভাবে পরাজিত করেছেন!`;

    document.getElementById('winWpmVal').innerText = typingEngine.getWPM();
    document.getElementById('winAccVal').innerText = typingEngine.getAccuracy() + '%';
    document.getElementById('winScoreVal').innerText = this.score;

    const btnNext = document.querySelector('#victoryModal .btn-primary');
    if (btnNext) {
      btnNext.innerText = 'LOBBY (লবিতে ফিরুন)';
      btnNext.onclick = () => {
        window.multiplayer.endMatch();
        document.getElementById('victoryModal').style.display = 'none';
        document.getElementById('startMenuModal').style.display = 'flex';
        this.state = 'MENU';
      };
    }

    document.getElementById('victoryModal').style.display = 'flex';
  }

  triggerMultiplayerLose() {
    this.state = 'GAME_OVER';
    soundEngine.playGameOverSound();

    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);

    window.multiplayer.sendMatchAction('defeat', {});

    document.querySelector('#gameOverModal h2').innerText = '💀 DEFEAT';
    document.querySelector('#gameOverModal p').innerText = `${this.enemy.name} আপনাকে পরাজিত করেছে!`;

    document.getElementById('finalWpmVal').innerText = typingEngine.getWPM();
    document.getElementById('finalAccVal').innerText = typingEngine.getAccuracy() + '%';
    document.getElementById('finalScoreVal').innerText = this.score;

    const btnRetry = document.querySelector('#gameOverModal .btn-primary');
    if (btnRetry) {
      btnRetry.innerText = 'LOBBY (লবিতে ফিরুন)';
      btnRetry.onclick = () => {
        window.multiplayer.endMatch();
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('startMenuModal').style.display = 'flex';
        this.state = 'MENU';
      };
    }

    document.getElementById('gameOverModal').style.display = 'flex';
  }

  handleOpponentLeft() {
    if (this.state !== 'MULTIPLAYER_FIGHTING') return;
    if (this.roundTimerInterval) clearInterval(this.roundTimerInterval);
    
    alert("Opponent disconnected from the match.");
    
    window.multiplayer.endMatch();
    document.getElementById('victoryModal').style.display = 'none';
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('fightHUD').style.display = 'none';
    document.getElementById('wordTargetDisplay').style.display = 'none';
    document.getElementById('startMenuModal').style.display = 'flex';
    this.state = 'MENU';
  }

  handleMultiplayerTimeout() {
    if (this.playerKOs > this.enemyKOs) {
      this.triggerMultiplayerWin();
    } else if (this.playerKOs < this.enemyKOs) {
      this.triggerMultiplayerLose();
    } else {
      // Tie breaker by HP
      if (this.player.hp > this.enemy.hp) {
        this.triggerMultiplayerWin();
      } else if (this.player.hp < this.enemy.hp) {
        this.triggerMultiplayerLose();
      } else {
        this.state = 'MENU';
        alert("It's a DRAW! (সমতা)");
        window.multiplayer.endMatch();
        document.getElementById('fightHUD').style.display = 'none';
        document.getElementById('wordTargetDisplay').style.display = 'none';
        document.getElementById('startMenuModal').style.display = 'flex';
      }
    }
  }

  gameLoop(timestamp) {
    let dt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = timestamp;

    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= dt;
      dt *= 0.25;
    }

    if (this.state === 'FIGHTING') {
      this.updateEnemyAI(dt);

      typingEngine.enemyTimer -= dt;
      if (typingEngine.enemyTimer <= 0) {
        this.enemy.triggerAction('slash');
        // Match damage values with updateEnemyAI to keep consistency
        const damageMatrix = { 1: 2, 2: 3, 3: 5, 4: 7, 5: 9, 6: 12, 7: 15 };
        const dmg = damageMatrix[this.level] || 5;
        this.player.takeDamage(dmg);
        typingEngine.enemyTimer = typingEngine.maxEnemyTimer;
      }
      this.updateHUD();
    } else if (this.state === 'MULTIPLAYER_FIGHTING') {
      this.updateHUD();
    }

    if (this.ctx && this.canvas) {
      this.drawStage(this.ctx);

      this.player.update();
      this.enemy.update();

        // Clamp fighter positions to visible canvas bounds to prevent them from moving off-screen
        if (this.canvas) {
          const cw = this.canvas.width;
          const minPlayerX = cw * 0.06; // left margin
          const maxPlayerX = cw * 0.86; // right limit for player
          const minEnemyX = cw * 0.14;
          const maxEnemyX = cw * 0.96;

          this.player.x = Math.max(minPlayerX, Math.min(this.player.x, maxPlayerX));
          this.enemy.x = Math.max(minEnemyX, Math.min(this.enemy.x, maxEnemyX));

          // Ensure the enemy always stays to the right of the player with a small gap
          const minGap = 90;
          if (this.enemy.x - this.player.x < minGap) {
            this.enemy.x = Math.min(maxEnemyX, this.player.x + minGap);
          }
        }

      this.player.draw(this.ctx, this.stageTheme);
      this.enemy.draw(this.ctx, this.stageTheme);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.update();
        p.draw(this.ctx);
        if (p.life <= 0) this.particles.splice(i, 1);
      }

      for (let i = this.hypeTexts.length - 1; i >= 0; i--) {
        const ht = this.hypeTexts[i];
        ht.update();
        ht.draw(this.ctx);
        if (ht.life <= 0) this.hypeTexts.splice(i, 1);
      }
    }

    requestAnimationFrame((ts) => this.gameLoop(ts));
  }

  drawStage(ctx) {
    const w = this.canvas ? this.canvas.width : 900;
    const h = this.canvas ? this.canvas.height : 420;

    let activeBg = (this.stageTheme === 1) ? bgSundarbans : bgLalbagh;

    if (activeBg.complete && activeBg.naturalWidth > 0) {
      ctx.drawImage(activeBg, 0, 0, w, h);
    } else {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#2b0b3f');
      bgGrad.addColorStop(1, '#ff7b00');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);
    }

    const groundGrad = ctx.createLinearGradient(0, h - 70, 0, h);
    groundGrad.addColorStop(0, 'rgba(20, 10, 5, 0.4)');
    groundGrad.addColorStop(1, 'rgba(10, 5, 0, 0.9)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h - 70, w, 70);

    ctx.strokeStyle = 'rgba(233, 196, 106, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, h - 70);
    ctx.lineTo(w, h - 70);
    ctx.stroke();
  }
}

const gameEngine = new GameEngine();
window.gameEngine = gameEngine;
window.addEventListener('DOMContentLoaded', () => gameEngine.init());
