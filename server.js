const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const vm = require('vm');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(__dirname));

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Load words database dynamically using VM to avoid duplicate definitions
let wordsDb = null;
try {
  const codePath = path.join(__dirname, 'js', 'wordsData.js');
  if (fs.existsSync(codePath)) {
    const code = fs.readFileSync(codePath, 'utf8');
    const context = {};
    vm.createContext(context);
    // Append expression to end of code string so vm returns it
    const result = vm.runInContext(code + "\nWORDS_DATABASE;", context);
    if (result) {
      wordsDb = result;
      console.log("Successfully loaded wordsData.js for multiplayer word sync. Word levels loaded:", Object.keys(wordsDb).length);
    } else {
      console.error("Failed to extract WORDS_DATABASE from vm execution.");
    }
  } else {
    console.warn("wordsData.js not found in expected path.");
  }
} catch (err) {
  console.error("Error loading wordsData.js:", err);
}

// Generate shared word sequence for a match
function generateMatchWords() {
  const list = [];
  if (!wordsDb) {
    // Fallback if loading failed
    return [
      { word: "taka", bangla: "টাকা", category: "Economy", hint: "Currency", isSuper: false },
      { word: "chaa", bangla: "চা", category: "Drink", hint: "Tea", isSuper: false }
    ];
  }
  
  // Generate 80 words with a progression of difficulty and occasional super moves
  for (let i = 0; i < 80; i++) {
    const isSuper = (i > 0 && i % 6 === 0);
    if (isSuper && wordsDb.superMoves && wordsDb.superMoves.length > 0) {
      const idx = Math.floor(Math.random() * wordsDb.superMoves.length);
      list.push({ ...wordsDb.superMoves[idx], isSuper: true });
    } else {
      // Distribute difficulty: early words are easier, later words are harder
      let maxLvl = Math.min(7, Math.floor(i / 10) + 1);
      let lvl = Math.floor(Math.random() * maxLvl) + 1;
      const lvlKey = `level${lvl}`;
      const pool = wordsDb[lvlKey] || wordsDb.level1;
      const idx = Math.floor(Math.random() * pool.length);
      list.push({ ...pool[idx], isSuper: false });
    }
  }
  return list;
}

// Multiplayer lobby and match state
const players = {};
const matches = {};

io.on('connection', (socket) => {
  console.log(`Fighter connected: ${socket.id}`);
  
  // Create a default name for the player
  players[socket.id] = {
    id: socket.id,
    name: 'Lathial_' + Math.floor(Math.random() * 900 + 100),
    status: 'idle'
  };

  // Broadcast current players to the lobby
  io.emit('lobby_update', Object.values(players));

  // Handle request to reserve/apply a desired name (checks availability first)
  socket.on('request_name', (newName) => {
    if (newName && newName.trim().length > 0) {
      const formattedName = newName.trim().substring(0, 15);
      const duplicate = Object.values(players).some(p => p.id !== socket.id && p.name && p.name.toLowerCase() === formattedName.toLowerCase());
      if (duplicate) {
        socket.emit('name_unavailable', { reason: 'Name already in use' });
      } else {
        if (players[socket.id]) {
          players[socket.id].name = formattedName;
          io.emit('lobby_update', Object.values(players));
          socket.emit('name_accepted', { name: formattedName });
        }
      }
    }
  });

  // Handle name change
  socket.on('change_name', (newName) => {
    if (newName && newName.trim().length > 0) {
      const formattedName = newName.trim().substring(0, 15);

      // Check for duplicate (case-insensitive) among other connected players
      const duplicate = Object.values(players).some(p => p.id !== socket.id && p.name && p.name.toLowerCase() === formattedName.toLowerCase());
      if (duplicate) {
        socket.emit('name_rejected', { reason: 'Name already in use' });
      } else {
        if (players[socket.id]) {
          players[socket.id].name = formattedName;
          io.emit('lobby_update', Object.values(players));
          // Inform client that name was accepted
          socket.emit('name_accepted', { name: formattedName });
        }
      }
    }
  });

  // Handle challenge request
  socket.on('challenge_player', ({ targetId, duration }) => {
    const challenger = players[socket.id];
    const opponent = players[targetId];

    if (challenger && opponent && challenger.status === 'idle' && opponent.status === 'idle') {
      challenger.status = 'challenging';
      io.emit('lobby_update', Object.values(players));

      io.to(targetId).emit('challenge_received', {
        challengerId: socket.id,
        challengerName: challenger.name,
        duration: duration
      });
    }
  });

  // Handle challenge cancellation
  socket.on('cancel_challenge', ({ targetId }) => {
    if (players[socket.id]) players[socket.id].status = 'idle';
    if (players[targetId]) players[targetId].status = 'idle';
    io.emit('lobby_update', Object.values(players));
    io.to(targetId).emit('challenge_cancelled');
  });

  // Handle challenge decline
  socket.on('decline_challenge', ({ challengerId }) => {
    if (players[socket.id]) players[socket.id].status = 'idle';
    if (players[challengerId]) players[challengerId].status = 'idle';
    io.emit('lobby_update', Object.values(players));

    io.to(challengerId).emit('challenge_declined', {
      opponentName: players[socket.id] ? players[socket.id].name : 'Opponent'
    });
  });

  // Handle challenge accept
  socket.on('accept_challenge', ({ challengerId, duration }) => {
    const p1 = players[challengerId];
    const p2 = players[socket.id];

    if (p1 && p2 && p1.status === 'challenging' && p2.status === 'idle') {
      p1.status = 'in_battle';
      p2.status = 'in_battle';
      io.emit('lobby_update', Object.values(players));

      const matchId = `match_${challengerId}_${socket.id}`;
      const wordsList = generateMatchWords();

      matches[matchId] = {
        p1: challengerId,
        p2: socket.id,
        duration: duration,
        wordsList: wordsList
      };

      // Notify challenger (player1)
      io.to(challengerId).emit('match_start', {
        matchId: matchId,
        role: 'player1',
        opponentId: socket.id,
        opponentName: p2.name,
        duration: duration,
        wordsList: wordsList
      });

      // Notify acceptor (player2)
      io.to(socket.id).emit('match_start', {
        matchId: matchId,
        role: 'player2',
        opponentId: challengerId,
        opponentName: p1.name,
        duration: duration,
        wordsList: wordsList
      });
    }
  });

  // Relay live match actions (typing keystrokes, word completes, position updates, KO)
  socket.on('match_action', ({ matchId, action, value }) => {
    const match = matches[matchId];
    if (match) {
      const targetId = (socket.id === match.p1) ? match.p2 : match.p1;
      io.to(targetId).emit('opponent_action', { action, value });
    }
  });

  // End match cleanly
  socket.on('match_end', ({ matchId }) => {
    const match = matches[matchId];
    if (match) {
      if (players[match.p1]) players[match.p1].status = 'idle';
      if (players[match.p2]) players[match.p2].status = 'idle';
      delete matches[matchId];
      io.emit('lobby_update', Object.values(players));
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log(`Fighter disconnected: ${socket.id}`);
    
    // Check if player was in a match
    for (const matchId in matches) {
      const match = matches[matchId];
      if (match.p1 === socket.id || match.p2 === socket.id) {
        const opponentId = (socket.id === match.p1) ? match.p2 : match.p1;
        io.to(opponentId).emit('opponent_left');
        if (players[opponentId]) players[opponentId].status = 'idle';
        delete matches[matchId];
        break;
      }
    }

    delete players[socket.id];
    io.emit('lobby_update', Object.values(players));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Bangla Typing Fighter Server running at http://localhost:${PORT}`);
});
