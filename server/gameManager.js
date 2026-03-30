'use strict';

const { v4: uuidv4 } = require('uuid');
const GameRoom = require('./gameLogic');

const rooms = new Map();
// socketId -> roomId map for quick disconnect lookup
const socketRooms = new Map();

function createRoom(hostId, hostName) {
  const id = uuidv4().replace(/-/g, '').slice(0, 6).toUpperCase();
  const room = new GameRoom(id, hostId, hostName);
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

function removePlayer(socketId) {
  const roomId = socketRooms.get(socketId);
  socketRooms.delete(socketId);
  if (!roomId) return null;

  const room = rooms.get(roomId);
  if (!room) return null;

  if (!room.started) {
    // Just remove from lobby
    room.players = room.players.filter(p => p.id !== socketId);
    if (room.players.length === 0) {
      rooms.delete(roomId);
      return null;
    }
    // Transfer host if host left
    if (room.hostId === socketId && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }
    return room;
  }

  // Game in progress — eliminate the player
  const player = room.players.find(p => p.id === socketId);
  if (player && !player.bankrupt) {
    room.eliminatePlayer(player);
  }

  const activePlayers = room.players.filter(p => !p.bankrupt);
  if (activePlayers.length === 0) {
    rooms.delete(roomId);
    return null;
  }

  return room;
}

module.exports = { createRoom, getRoom, addSocketToRoom, removePlayer };
