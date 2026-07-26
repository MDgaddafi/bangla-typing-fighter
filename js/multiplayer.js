/**
 * Bangla Typing Fighter - Client-Side Multiplayer Socket & Lobby Controller
 */

class MultiplayerController {
  constructor() {
    this.socket = null;
    this.currentChallengeTarget = null;
    this.incomingChallengerId = null;
    this.incomingDuration = 120;
    
    // DOM Elements
    this.localUsernameInput = null;
    this.onlinePlayersList = null;
    this.durationModal = null;
    this.waitingModal = null;
    this.incomingChallengeModal = null;
    this.isEditingName = false;
    this.lastAcceptedName = '';
    
    // Bind methods to preserve context
    this.handleLobbyUpdate = this.handleLobbyUpdate.bind(this);
    this.handleChallengeReceived = this.handleChallengeReceived.bind(this);
    this.handleChallengeCancelled = this.handleChallengeCancelled.bind(this);
    this.handleChallengeDeclined = this.handleChallengeDeclined.bind(this);
    this.handleMatchStart = this.handleMatchStart.bind(this);
  }

  init() {
    // Establish socket connection
    let serverUrl = window.location.origin;
    if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '') {
      serverUrl = localStorage.getItem('btf_server_url') || 'http://localhost:3000';
    } else {
      localStorage.setItem('btf_server_url', serverUrl);
    }
    
    this.socket = io(serverUrl);

    // Cache DOM Elements
    this.localUsernameInput = document.getElementById('localUsername');
    this.onlinePlayersList = document.getElementById('onlinePlayersList');
    this.durationModal = document.getElementById('durationModal');
    this.waitingModal = document.getElementById('waitingModal');
    this.incomingChallengeModal = document.getElementById('incomingChallengeModal');
    this.serverUrlInput = document.getElementById('serverUrlInput');

    if (this.serverUrlInput) {
      this.serverUrlInput.value = localStorage.getItem('btf_server_url') || 'http://localhost:3000';
    }

    // Register input listeners
    if (this.localUsernameInput) {
      // Start with the input in read-only mode to avoid accidental edits
      this.localUsernameInput.readOnly = true;
      this.localUsernameInput.setAttribute('tabindex', '0');
      // Load name from local storage if available
      const savedName = localStorage.getItem('btf_multiplayer_name');
      if (savedName) {
        this.localUsernameInput.value = savedName;
        // Ask server to reserve this name (avoid race that allows duplicates)
        setTimeout(() => this.socket.emit('request_name', savedName), 500);
      }

      // When input changes (commit via Enter/blur), emit name change to server
      this.localUsernameInput.addEventListener('change', (e) => {
        this.isEditingName = false;
        const newName = e.target.value.trim();
        if (newName.length > 0) {
          // Do NOT persist locally until server accepts the name
          this.socket.emit('change_name', newName);
        }
      });

      this.localUsernameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // commit and blur to trigger change event
          this.localUsernameInput.blur();
        }
      });

      this.localUsernameInput.addEventListener('focus', () => {
        this.isEditingName = true;
      });

      this.localUsernameInput.addEventListener('blur', () => {
        // small delay to allow change event to fire first
        setTimeout(() => { this.isEditingName = false; }, 50);
      });
      
      const editNameBtn = document.getElementById('editNameBtn');
      if (editNameBtn) {
        editNameBtn.addEventListener('click', () => {
          // Enable editing explicitly so focus and typing reliably work
          this.localUsernameInput.readOnly = false;
          this.localUsernameInput.focus();
          this.localUsernameInput.select();
          this.isEditingName = true;
        });
      }

      // When user types, mark editing state
      this.localUsernameInput.addEventListener('input', () => {
        this.isEditingName = true;
      });

      // On blur, commit name (server will accept/reject); keep input locked after blur
      this.localUsernameInput.addEventListener('blur', () => {
        const newName = this.localUsernameInput.value.trim();
        if (newName.length > 0) {
          this.socket.emit('change_name', newName);
        }
        this.localUsernameInput.readOnly = true;
        // small delay to clear editing flag after name sync
        setTimeout(() => { this.isEditingName = false; }, 50);
      });
    }

    // Duration modal buttons list
    const timeButtons = document.querySelectorAll('.btn-time');
    timeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const duration = parseInt(e.target.getAttribute('data-time'), 10);
        this.sendChallenge(duration);
      });
    });

    // Match challenge accept/decline triggers
    const acceptBtn = document.getElementById('acceptChallengeBtn');
    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => this.acceptChallenge());
    }

    const declineBtn = document.getElementById('declineChallengeBtn');
    if (declineBtn) {
      declineBtn.addEventListener('click', () => this.declineChallenge());
    }

    this.setupSocketListeners();
  }

  setupSocketListeners() {
    // Clear previous subscriptions to prevent duplicate events on reconnect
    this.socket.off('lobby_update');
    this.socket.off('challenge_received');
    this.socket.off('challenge_cancelled');
    this.socket.off('challenge_declined');
    this.socket.off('match_start');
    this.socket.off('opponent_action');
    this.socket.off('opponent_left');
    this.socket.off('name_accepted');
    this.socket.off('name_rejected');

    // Socket Observers
    this.socket.on('lobby_update', this.handleLobbyUpdate);
    this.socket.on('challenge_received', this.handleChallengeReceived);
    this.socket.on('challenge_cancelled', this.handleChallengeCancelled);
    this.socket.on('challenge_declined', this.handleChallengeDeclined);
    this.socket.on('match_start', this.handleMatchStart);
    // Server responses for name changes
    this.socket.on('name_accepted', (data) => {
      const name = data && data.name ? data.name : '';
      if (name && this.localUsernameInput) {
        // Persist accepted name locally and lock input
        localStorage.setItem('btf_multiplayer_name', name);
        this.localUsernameInput.value = name;
        this.localUsernameInput.readOnly = true;
        this.isEditingName = false;
        this.lastAcceptedName = name;
        // Clear any error state
        this.localUsernameInput.classList.remove('name-error');
        const msgEl = document.getElementById('nameErrorMsg');
        if (msgEl && msgEl.parentNode) msgEl.parentNode.removeChild(msgEl);
      }
    });

    this.socket.on('name_rejected', (data) => {
      const reason = data && data.reason ? data.reason : 'Rejected';
      // Revert to last accepted name (or saved name) and allow user to pick another
      const fallback = this.lastAcceptedName || localStorage.getItem('btf_multiplayer_name') || '';
      if (this.localUsernameInput) {
        this.localUsernameInput.value = fallback;
        this.localUsernameInput.readOnly = false;
        this.localUsernameInput.focus();
        this.localUsernameInput.select();
        this.isEditingName = true;
      }
      // Show inline error message and highlight input
      if (this.localUsernameInput) {
        this.localUsernameInput.classList.add('name-error');
        let msg = document.getElementById('nameErrorMsg');
        if (!msg) {
          msg = document.createElement('div');
          msg.id = 'nameErrorMsg';
          msg.className = 'name-error-msg';
          this.localUsernameInput.parentNode.appendChild(msg);
        }
        msg.innerText = `Name not accepted: ${reason}`;
      } else {
        alert(`Name not accepted: ${reason}`);
      }
    });
    
    this.socket.on('opponent_action', (data) => {
      if (window.gameEngine && window.gameEngine.state === 'MULTIPLAYER_FIGHTING') {
        window.gameEngine.handleOpponentAction(data);
      }
    });

    this.socket.on('opponent_left', () => {
      if (window.gameEngine && window.gameEngine.state === 'MULTIPLAYER_FIGHTING') {
        window.gameEngine.handleOpponentLeft();
      }
    });
  }

  handleLobbyUpdate(players) {
    if (!this.onlinePlayersList) return;
    
    // Clear list
    this.onlinePlayersList.innerHTML = '';
    
    const myId = this.socket.id;
    const otherPlayers = players.filter(p => p.id !== myId);

    // Sync local username displayed if server has a different default
    const me = players.find(p => p.id === myId);
    // Only sync server name into the input when user is not actively editing it
    if (me && this.localUsernameInput && !this.isEditingName && document.activeElement !== this.localUsernameInput) {
      // If the user has a locally saved preferred name, prefer it and re-sync to server
      const savedName = localStorage.getItem('btf_multiplayer_name');
        if (savedName && savedName !== me.name) {
        // Apply locally preferred name to input and ask server to reserve it
        this.localUsernameInput.value = savedName;
        setTimeout(() => {
          this.socket.emit('request_name', savedName);
        }, 250);
      } else {
        this.localUsernameInput.value = me.name;
        this.lastAcceptedName = me.name;
      }
    }

    // Update total online count badge
    const countElem = document.getElementById('onlineCount');
    if (countElem) {
      countElem.innerText = players.length;
    }

    if (otherPlayers.length === 0) {
      this.onlinePlayersList.innerHTML = '<li class="empty-list-placeholder">Looking for fighters...</li>';
      return;
    }

    otherPlayers.forEach(p => {
      const li = document.createElement('li');
      li.className = 'player-item';

      let statusText = 'Idle';
      let statusClass = 'status-idle';
      if (p.status === 'in_battle') {
        statusText = 'In Battle';
        statusClass = 'status-battle';
      } else if (p.status === 'challenging') {
        statusText = 'Challenging...';
        statusClass = 'status-challenging';
      }

      li.innerHTML = `
        <div class="player-info-meta">
          <span class="p-name">${escapeHTML(p.name)}</span>
          <span class="p-status ${statusClass}">${statusText}</span>
        </div>
        <button class="btn-challenge" ${p.status !== 'idle' ? 'disabled' : ''} onclick="multiplayer.openDurationModal('${p.id}')">
          ⚔️ CHALLENGE
        </button>
      `;
      this.onlinePlayersList.appendChild(li);
    });
  }

  openDurationModal(targetId) {
    this.currentChallengeTarget = targetId;
    if (this.durationModal) {
      this.durationModal.style.display = 'flex';
    }
  }

  closeDurationModal() {
    this.currentChallengeTarget = null;
    if (this.durationModal) {
      this.durationModal.style.display = 'none';
    }
  }

  sendChallenge(duration) {
    if (!this.currentChallengeTarget) return;

    this.socket.emit('challenge_player', {
      targetId: this.currentChallengeTarget,
      duration: duration
    });

    if (this.durationModal) this.durationModal.style.display = 'none';
    if (this.waitingModal) this.waitingModal.style.display = 'flex';
  }

  cancelChallenge() {
    if (this.currentChallengeTarget) {
      this.socket.emit('cancel_challenge', { targetId: this.currentChallengeTarget });
    }
    this.currentChallengeTarget = null;
    if (this.waitingModal) this.waitingModal.style.display = 'none';
  }

  handleChallengeReceived({ challengerId, challengerName, duration }) {
    this.incomingChallengerId = challengerId;
    this.incomingDuration = duration;

    const challengerNameDisplay = document.getElementById('challengerNameDisplay');
    const challengeDurationDisplay = document.getElementById('challengeDurationDisplay');

    if (challengerNameDisplay) challengerNameDisplay.innerText = challengerName;
    if (challengeDurationDisplay) challengeDurationDisplay.innerText = Math.round(duration / 60);

    if (this.incomingChallengeModal) {
      this.incomingChallengeModal.style.display = 'flex';
    }
  }

  handleChallengeCancelled() {
    this.incomingChallengerId = null;
    if (this.incomingChallengeModal) {
      this.incomingChallengeModal.style.display = 'none';
    }
  }

  handleChallengeDeclined({ opponentName }) {
    if (this.waitingModal) this.waitingModal.style.display = 'none';
    this.currentChallengeTarget = null;
    alert(`Challenge declined by ${opponentName}`);
  }

  acceptChallenge() {
    if (!this.incomingChallengerId) return;

    this.socket.emit('accept_challenge', {
      challengerId: this.incomingChallengerId,
      duration: this.incomingDuration
    });

    this.incomingChallengerId = null;
    if (this.incomingChallengeModal) {
      this.incomingChallengeModal.style.display = 'none';
    }
  }

  declineChallenge() {
    if (!this.incomingChallengerId) return;

    this.socket.emit('decline_challenge', {
      challengerId: this.incomingChallengerId
    });

    this.incomingChallengerId = null;
    if (this.incomingChallengeModal) {
      this.incomingChallengeModal.style.display = 'none';
    }
  }

  handleMatchStart({ matchId, role, opponentId, opponentName, duration, wordsList }) {
    // Hide all matchmaking modals
    if (this.waitingModal) this.waitingModal.style.display = 'none';
    if (this.incomingChallengeModal) this.incomingChallengeModal.style.display = 'none';
    if (this.durationModal) this.durationModal.style.display = 'none';

    // Start match in the main game engine
    if (window.gameEngine) {
      window.gameEngine.startMultiplayerMatch({
        matchId,
        role,
        opponentId,
        opponentName,
        duration,
        wordsList
      });
    }
  }

  sendMatchAction(action, value) {
    if (window.gameEngine && window.gameEngine.multiplayerMatchId) {
      this.socket.emit('match_action', {
        matchId: window.gameEngine.multiplayerMatchId,
        action: action,
        value: value
      });
    }
  }

  saveServerUrl() {
    if (!this.serverUrlInput) return;
    const url = this.serverUrlInput.value.trim();
    if (!url) return;

    localStorage.setItem('btf_server_url', url);
    alert("Server URL saved! Reconnecting to: " + url);

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(url);
    this.setupSocketListeners();
    this.socket.connect();

    // Re-verify nickname on the new server
    const currentName = this.localUsernameInput ? this.localUsernameInput.value.trim() : '';
    if (currentName) {
      setTimeout(() => this.socket.emit('change_name', currentName), 600);
    }
  }

  endMatch() {
    if (window.gameEngine && window.gameEngine.multiplayerMatchId) {
      this.socket.emit('match_end', {
        matchId: window.gameEngine.multiplayerMatchId
      });
    }
  }
}

// Helpers
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Instantiate and initialize on DOM content load
const multiplayer = new MultiplayerController();
window.multiplayer = multiplayer;
window.addEventListener('DOMContentLoaded', () => multiplayer.init());
