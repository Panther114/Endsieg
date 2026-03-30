'use strict';

const { v4: uuidv4 } = require('uuid');
const { GameRoom } = require('./gameLogic');

const rooms = new Map();
// socketId -> roomId map for quick disconnect lookup
const socketRooms = new Map();
// `${roomId}:${playerName.toLowerCase()}` -> { timer, roomId, playerName }
const disconnectTimers = new Map();

const RECONNECT_GRACE_MS = 12000; // 12s grace for page-navigation disconnects

const ROOM_CODE_PARTS = ['13', '69', '67', '78', '91'];

function generateRoomCode() {
  const codes = [];
  for (const a of ROOM_CODE_PARTS) {
    for (const b of ROOM_CODE_PARTS) {
      codes.push(a + b);
    }
  }
  const available = codes.filter(c => !rooms.has(c));
  if (!available.length) return codes[Math.floor(Math.random() * codes.length)];
  return available[Math.floor(Math.random() * available.length)];
}

function createRoom(hostId, hostName, hostColor) {
  const id = generateRoomCode();
  const room = new GameRoom(id, hostId, hostName, hostColor);
  rooms.set(id, room);
  socketRooms.set(hostId, id);
  return room;
}

function getRoom(id) {
  return rooms.get(id) || null;
}

function addSocketToRoom(socketId, roomId) {
  socketRooms.set(socketId, roomId);
}

function removeSocketMapping(socketId) {
  socketRooms.delete(socketId);
}

/**
 * Called when a socket reconnects via request_game_state.
 * Cancels any pending disconnect grace timer for this player by name.
 */
function cancelGraceTimer(roomId, playerName) {
  const key = `${roomId}:${playerName.toLowerCase()}`;
  const entry = disconnectTimers.get(key);
  if (entry) {
    clearTimeout(entry.timer);
    disconnectTimers.delete(key);
  }
}

function removePlayer(socketId, io) {
  const roomId = socketRooms.get(socketId);
  socketRooms.delete(socketId);
  if (!roomId) return { room: null, leftPlayerName: null };

  const room = rooms.get(roomId);
  if (!room) return { room: null, leftPlayerName: null };

  if (!room.started) {
    // Lobby: remove immediately
    room.players = room.players.filter(p => p.id !== socketId);
    if (room.players.length === 0) {
      rooms.delete(roomId);
      return { room: null, leftPlayerName: null };
    }
    // Transfer host if host left
    if (room.hostId === socketId && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }
    return { room, leftPlayerName: null };
  }

  // Game in progress — use grace period to allow reconnect after page navigation
  const player = room.players.find(p => p.id === socketId);
  if (!player || player.bankrupt) {
    return { room, leftPlayerName: null };
  }

  const playerName = player.name;
  const key = `${roomId}:${playerName.toLowerCase()}`;

  // Cancel any existing timer for this player (safety)
  const existing = disconnectTimers.get(key);
  if (existing) clearTimeout(existing.timer);

  // Start grace period — only eliminate if they don't reconnect in time
  const timer = setTimeout(() => {
    disconnectTimers.delete(key);
    const currentRoom = rooms.get(roomId);
    if (!currentRoom) return;

    // Check that the player hasn't reconnected (socket mapping re-established)
    const hasReconnected = currentRoom.players.find(
      p => p.name.toLowerCase() === playerName.toLowerCase() &&
        !p.bankrupt &&
        socketRooms.get(p.id) === roomId
    );

    if (!hasReconnected) {
      const stillThere = currentRoom.players.find(
        p => p.name.toLowerCase() === playerName.toLowerCase() && !p.bankrupt
      );
      if (stillThere) {
        currentRoom.eliminatePlayer(stillThere);
      }
      const activePlayers = currentRoom.players.filter(p => !p.bankrupt);
      if (activePlayers.length === 0) {
        rooms.delete(roomId);
      } else if (io) {
        io.to(roomId).emit('game_updated', currentRoom.getState());
        io.to(roomId).emit('player_left', { playerName });
      }
    }
  }, RECONNECT_GRACE_MS);

  disconnectTimers.set(key, { timer, roomId, playerName });

  return { room: null, leftPlayerName: playerName, gracePending: true };
}

module.exports = { createRoom, getRoom, addSocketToRoom, removeSocketMapping, removePlayer, cancelGraceTimer };
