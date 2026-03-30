'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { createRoom, getRoom, addSocketToRoom, removeSocketMapping, removePlayer, cancelGraceTimer } = require('./gameManager');
const { PLAYER_COLORS } = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Rate limit page requests to protect file system access
const pageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

// Serve static client files
app.use(express.static(path.join(__dirname, '..', 'client')));

// Explicit routes with rate limiting
app.get('/', pageLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});
app.get('/game.html', pageLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'game.html'));
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('create_room', ({ playerName, color }) => {
    if (!playerName || !playerName.trim()) {
      return socket.emit('error', { message: 'Player name is required.' });
    }
    const resolvedColor = (color && /^#[0-9a-fA-F]{6}$/.test(color)) ? color : PLAYER_COLORS[0];
    const room = createRoom(socket.id, playerName.trim().slice(0, 16), resolvedColor);
    socket.join(room.id);
    socket.emit('room_created', room.getState());
  });

  socket.on('join_room', ({ roomId, playerName, color }) => {
    if (!playerName || !playerName.trim() || !roomId) {
      return socket.emit('error', { message: 'Player name and room code are required.' });
    }
    const room = getRoom(roomId.toUpperCase());
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.started) return socket.emit('error', { message: 'Game already started.' });
    if (room.players.length >= 8) return socket.emit('error', { message: 'Room is full.' });

    const takenColors = new Set(room.players.map(p => p.color));
    let resolvedColor;
    if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
      if (takenColors.has(color)) {
        return socket.emit('error', { message: 'Color already taken. Please choose another.' });
      }
      resolvedColor = color;
    } else {
      // Auto-assign first available palette color
      resolvedColor = PLAYER_COLORS.find(c => !takenColors.has(c)) || PLAYER_COLORS[0];
    }

    const added = room.addPlayer(socket.id, playerName.trim().slice(0, 16), resolvedColor);
    if (!added) return socket.emit('error', { message: 'Could not join room.' });

    addSocketToRoom(socket.id, roomId.toUpperCase());
    socket.join(roomId.toUpperCase());
    io.to(roomId.toUpperCase()).emit('room_updated', room.getState());
  });

  socket.on('start_game', ({ roomId, startingFunds }) => {
    const room = getRoom(roomId);
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only host can start.' });
    if (room.players.length < 1) return socket.emit('error', { message: 'Need at least 1 player.' });
    const funds = (typeof startingFunds === 'number' && startingFunds >= 500 && startingFunds <= 10000)
      ? startingFunds : 1500;
    room.start(funds);
    io.to(roomId).emit('game_started', room.getState());
  });

  socket.on('roll_dice', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const state = room.rollDice(socket.id);
    io.to(roomId).emit('game_updated', state);
  });

  socket.on('buy_property', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const state = room.buyProperty(socket.id);
    io.to(roomId).emit('game_updated', state);
  });

  socket.on('build_house', ({ roomId, tileId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const state = room.buildHouse(socket.id, tileId);
    io.to(roomId).emit('game_updated', state);
  });

  socket.on('end_turn', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const state = room.endTurn(socket.id);
    io.to(roomId).emit('game_updated', state);
  });

  socket.on('pay_jail', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const state = room.payJail(socket.id);
    io.to(roomId).emit('game_updated', state);
  });

  socket.on('trade_offer', ({ roomId, toId, offer }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    // Broadcast trade proposal to target
    io.to(roomId).emit('trade_proposed', {
      fromId: socket.id,
      toId,
      offer,
      fromName: (room.players.find(p => p.id === socket.id) || {}).name
    });
  });

  socket.on('trade_accept', ({ roomId, fromId, offer }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const state = room.trade(fromId, socket.id, offer);
    io.to(roomId).emit('game_updated', state);
  });

  socket.on('request_game_state', ({ roomId, playerName }) => {
    if (!roomId) return socket.emit('error', { message: 'Room ID is required.' });
    const room = getRoom(roomId.toUpperCase());
    if (!room) {
      return socket.emit('error', { message: 'Room not found or expired.' });
    }

    if (room.started) {
      // Find a matching player by name (for reconnect after redirect)
      const name = (playerName || '').toLowerCase().trim();
      const existingPlayer = room.players.find(p => p.name.toLowerCase() === name);
      if (existingPlayer) {
        // Update their socket ID to the new one
        const oldId = existingPlayer.id;
        existingPlayer.id = socket.id;
        // Update propertyOwners map
        for (const tileId of Object.keys(room.propertyOwners)) {
          if (room.propertyOwners[tileId] === oldId) {
            room.propertyOwners[tileId] = socket.id;
          }
        }
        // Update hostId if needed
        if (room.hostId === oldId) room.hostId = socket.id;
        // Clean up old socket mapping before adding the new one
        removeSocketMapping(oldId);
        addSocketToRoom(socket.id, roomId.toUpperCase());
        socket.join(roomId.toUpperCase());
        // Cancel any pending disconnect grace timer for this player
        cancelGraceTimer(roomId.toUpperCase(), existingPlayer.name);
        socket.emit('game_updated', room.getState());
      } else {
        socket.emit('error', { message: 'Game already started without you.' });
      }
    } else {
      // Game not yet started — re-join socket to room and send room state
      addSocketToRoom(socket.id, roomId.toUpperCase());
      socket.join(roomId.toUpperCase());
      socket.emit('room_updated', room.getState());
    }
  });

  socket.on('chat_message', ({ roomId, message }) => {
    if (!roomId || !message) return;
    const room = getRoom(roomId);
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    const playerName = player ? player.name : 'Unknown';
    io.to(roomId).emit('chat_message', {
      playerName,
      message: String(message).slice(0, 200),
      time: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    const { room, leftPlayerName, gracePending } = removePlayer(socket.id, io);
    if (room && !gracePending) {
      if (!room.started) {
        io.to(room.id).emit('room_updated', room.getState());
      } else {
        io.to(room.id).emit('game_updated', room.getState());
        if (leftPlayerName) {
          io.to(room.id).emit('player_left', { playerName: leftPlayerName });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Endsieg server running on port ${PORT}`);
});
