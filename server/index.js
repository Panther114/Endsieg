'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { createRoom, getRoom, addSocketToRoom, removePlayer } = require('./gameManager');

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

  socket.on('create_room', ({ playerName }) => {
    if (!playerName || !playerName.trim()) {
      return socket.emit('error', { message: 'Player name is required.' });
    }
    const room = createRoom(socket.id, playerName.trim().slice(0, 16));
    socket.join(room.id);
    socket.emit('room_created', room.getState());
  });

  socket.on('join_room', ({ roomId, playerName }) => {
    if (!playerName || !playerName.trim() || !roomId) {
      return socket.emit('error', { message: 'Player name and room code are required.' });
    }
    const room = getRoom(roomId.toUpperCase());
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.started) return socket.emit('error', { message: 'Game already started.' });
    if (room.players.length >= 6) return socket.emit('error', { message: 'Room is full.' });

    const added = room.addPlayer(socket.id, playerName.trim().slice(0, 16));
    if (!added) return socket.emit('error', { message: 'Could not join room.' });

    addSocketToRoom(socket.id, roomId.toUpperCase());
    socket.join(roomId.toUpperCase());
    io.to(roomId.toUpperCase()).emit('room_updated', room.getState());
  });

  socket.on('start_game', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only host can start.' });
    if (room.players.length < 1) return socket.emit('error', { message: 'Need at least 1 player.' });
    room.start();
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
    const room = removePlayer(socket.id);
    if (room) {
      const state = room.getState();
      io.to(room.id).emit('game_updated', state);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Endsieg server running on port ${PORT}`);
});
