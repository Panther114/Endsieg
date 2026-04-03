'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { createRoom, getRoom, addSocketToRoom, removeSocketMapping, removePlayer, cancelGraceTimer, setRoomCustomMap } = require('./gameManager');
const { PLAYER_COLORS } = require('./gameLogic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const pageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(express.static(path.join(__dirname, '..', 'client')));

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
      resolvedColor = PLAYER_COLORS.find(c => !takenColors.has(c)) || PLAYER_COLORS[0];
    }

    const added = room.addPlayer(socket.id, playerName.trim().slice(0, 16), resolvedColor);
    if (!added) return socket.emit('error', { message: 'Could not join room.' });

    addSocketToRoom(socket.id, roomId.toUpperCase());
    socket.join(roomId.toUpperCase());
    io.to(roomId.toUpperCase()).emit('room_updated', room.getState());
  });

  socket.on('start_game', ({ roomId, startingFunds, rules, customMap }) => {
    const room = getRoom(roomId);
    if (!room) return socket.emit('error', { message: 'Room not found.' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only host can start.' });
    if (room.players.length < 1) return socket.emit('error', { message: 'Need at least 1 player.' });
    const funds = (typeof startingFunds === 'number' && startingFunds >= 500 && startingFunds <= 10000)
      ? startingFunds : 1500;
    // Sanitise rules object: only allow known boolean keys
    let sanitisedRules = null;
    if (rules && typeof rules === 'object') {
      const allowed = ['doubleRentFullSet', 'vacationCash', 'auction', 'noRentInJail', 'mortgage', 'evenBuild'];
      sanitisedRules = {};
      for (const key of allowed) {
        if (typeof rules[key] === 'boolean') sanitisedRules[key] = rules[key];
      }
    }
    // Validate and sanitise custom map if provided
    if (customMap && typeof customMap === 'object' && Array.isArray(customMap.tiles)) {
      try {
        // Validate custom map structure
        const tiles = customMap.tiles;
        for (const tile of tiles) {
          if (typeof tile.id !== 'number' || typeof tile.type !== 'string' || typeof tile.name !== 'string') {
            throw new Error('Invalid tile structure');
          }
        }
        setRoomCustomMap(roomId, customMap);
      } catch (err) {
        console.warn('[start_game] Invalid custom map:', err.message);
        // Continue without custom map
      }
    }
    room.start(funds, sanitisedRules);
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

  socket.on('skip_buy', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const { state, auctionInfo } = room.skipBuy(socket.id);
    io.to(roomId).emit('game_updated', state);
    if (auctionInfo) {
      io.to(roomId).emit('auction_started', auctionInfo);
    }
  });

  socket.on('place_bid', ({ roomId, tileId, amount }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const prevAuction = room.auctionState;
    const state = room.placeBid(socket.id, tileId, amount);
    io.to(roomId).emit('game_updated', state);
    // If auction ended (auctionState cleared), emit auction_ended
    if (prevAuction && !room.auctionState) {
      const winnerPlayer = state.players.find(p => p.properties.includes(tileId));
      io.to(roomId).emit('auction_ended', {
        tileName: prevAuction.tileName,
        winner: winnerPlayer ? { name: winnerPlayer.name, amount } : null
      });
    }
  });

  socket.on('pass_bid', ({ roomId, tileId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const prevAuction = room.auctionState;
    const state = room.passBid(socket.id, tileId);
    io.to(roomId).emit('game_updated', state);
    if (prevAuction && !room.auctionState) {
      const winnerPlayer = state.players.find(p => p.properties.includes(tileId));
      io.to(roomId).emit('auction_ended', {
        tileName: prevAuction.tileName,
        winner: winnerPlayer ? { name: winnerPlayer.name } : null
      });
    }
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

  socket.on('mortgage_property', ({ roomId, tileId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const state = room.mortgageProperty(socket.id, tileId);
    io.to(roomId).emit('game_updated', state);
  });

  socket.on('unmortgage_property', ({ roomId, tileId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const state = room.unmortgageProperty(socket.id, tileId);
    io.to(roomId).emit('game_updated', state);
  });

  socket.on('trade_offer', ({ roomId, toId, offer }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
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

  socket.on('vote_kick', ({ roomId, targetId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const result = room.voteKick(socket.id, targetId);
    if (result && result.kicked) {
      io.to(roomId).emit('player_kicked', { playerName: result.playerName });
    }
    io.to(roomId).emit('game_updated', room.getState());
  });

  socket.on('undo_vote_kick', ({ roomId, targetId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    room.undoVoteKick(socket.id, targetId);
    io.to(roomId).emit('game_updated', room.getState());
  });

  socket.on('declare_bankruptcy', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.bankrupt) return;
    room.eliminatePlayer(player);
    io.to(roomId).emit('game_updated', room.getState());
  });

  socket.on('quit_game', ({ roomId }) => {
    const room = getRoom(roomId);
    if (!room || !room.started) return;
    const playerName = room.removePlayerFromGame(socket.id);
    if (playerName) {
      io.to(roomId).emit('player_left', { playerName });
    }
    io.to(roomId).emit('game_updated', room.getState());
  });

  socket.on('request_game_state', ({ roomId, playerName }) => {
    if (!roomId) return socket.emit('error', { message: 'Room ID is required.' });
    const room = getRoom(roomId.toUpperCase());
    if (!room) {
      return socket.emit('error', { message: 'Room not found or expired.' });
    }

    if (room.started) {
      const name = (playerName || '').toLowerCase().trim();
      const existingPlayer = room.players.find(p => p.name.toLowerCase() === name);
      if (existingPlayer) {
        const oldId = existingPlayer.id;
        existingPlayer.id = socket.id;
        for (const tileId of Object.keys(room.propertyOwners)) {
          if (room.propertyOwners[tileId] === oldId) {
            room.propertyOwners[tileId] = socket.id;
          }
        }
        if (room.hostId === oldId) room.hostId = socket.id;
        // Update kickVotes references
        for (const targetId of Object.keys(room.kickVotes)) {
          room.kickVotes[targetId] = room.kickVotes[targetId].map(id => id === oldId ? socket.id : id);
        }
        if (room.kickVotes[oldId]) {
          room.kickVotes[socket.id] = room.kickVotes[oldId];
          delete room.kickVotes[oldId];
        }
        removeSocketMapping(oldId);
        addSocketToRoom(socket.id, roomId.toUpperCase());
        socket.join(roomId.toUpperCase());
        cancelGraceTimer(roomId.toUpperCase(), existingPlayer.name);
        // Only send current state — no game logic triggered
        socket.emit('game_updated', room.getState());
      } else {
        socket.emit('error', { message: 'Game already started without you.' });
      }
    } else {
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
