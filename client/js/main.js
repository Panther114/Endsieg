'use strict';

/* ── Lobby Socket Logic ── */

const socket = io();

let mySocketId  = null;
let myRoomId    = null;
let myPlayerName = '';
let isHost      = false;
let roomState   = null;

// ── HELPERS ──────────────────────────────────────────────────────────

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function copyRoomCode() {
  if (!myRoomId) return;
  navigator.clipboard.writeText(myRoomId).then(() => {
    const el = document.getElementById('roomCode-display');
    const orig = el.textContent;
    el.textContent = 'COPIED!';
    setTimeout(() => { el.textContent = orig; }, 1200);
  }).catch(() => {});
}
window.copyRoomCode = copyRoomCode;

function showRoomInfo(state) {
  roomState = state;
  document.getElementById('roomInfo').style.display = 'flex';
  document.getElementById('roomCode-display').textContent = state.id;

  const list = document.getElementById('playerList');
  list.innerHTML = state.players.map(p =>
    `<li>
       <span class="player-dot" style="background:${p.color}"></span>
       <span>${escapeHtml(p.name)}${p.id === state.hostId ? ' 👑' : ''}</span>
     </li>`
  ).join('');

  if (isHost) {
    document.getElementById('hostControls').style.display = 'block';
    document.getElementById('guestWait').style.display = 'none';
  } else {
    document.getElementById('hostControls').style.display = 'none';
    document.getElementById('guestWait').style.display = 'block';
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── ACTIONS ──────────────────────────────────────────────────────────

function createRoom() {
  const name = document.getElementById('playerName').value.trim();
  if (!name) return showError('Please enter your name.');
  myPlayerName = name;
  sessionStorage.setItem('endsieg_playerName', name);
  socket.emit('create_room', { playerName: name });
}

function joinRoom() {
  const name = document.getElementById('playerName').value.trim();
  const code = document.getElementById('roomCode').value.trim().toUpperCase();
  if (!name) return showError('Please enter your name.');
  if (!code || code.length !== 6) return showError('Please enter a valid 6-character room code.');
  myPlayerName = name;
  sessionStorage.setItem('endsieg_playerName', name);
  socket.emit('join_room', { roomId: code, playerName: name });
}

function startGame() {
  if (!myRoomId) return;
  socket.emit('start_game', { roomId: myRoomId });
}

// Expose to HTML onclick
window.createRoom = createRoom;
window.joinRoom   = joinRoom;
window.startGame  = startGame;

// ── KEYBOARD ─────────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const roomInfoVisible = document.getElementById('roomInfo').style.display !== 'none';
    if (roomInfoVisible && isHost) {
      startGame();
    } else if (!roomInfoVisible) {
      const code = document.getElementById('roomCode').value.trim();
      if (code) joinRoom(); else createRoom();
    }
  }
});

// ── SOCKET EVENTS ────────────────────────────────────────────────────

socket.on('connect', () => {
  mySocketId = socket.id;
});

socket.on('room_created', (state) => {
  myRoomId = state.id;
  isHost   = true;
  showRoomInfo(state);
});

socket.on('room_updated', (state) => {
  myRoomId = state.id;
  showRoomInfo(state);
});

socket.on('game_started', (state) => {
  sessionStorage.setItem('endsieg_playerName', myPlayerName);
  window.location.href = `/game.html?room=${encodeURIComponent(myRoomId)}`;
});

socket.on('error', ({ message }) => {
  showError(message);
});
