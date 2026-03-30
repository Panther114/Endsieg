'use strict';

/* ── Lobby Socket Logic ── */

const socket = io();

let mySocketId   = null;
let myRoomId     = null;
let myPlayerName = '';
let isHost       = false;
let roomState    = null;
let selectedColor = '#e74c3c'; // default to first color

// ── COLOR PICKER ─────────────────────────────────────────────────────

(function initColorPicker() {
  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach(sw => {
    sw.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selectedColor = sw.dataset.color;
    });
  });
})();

// ── HELPERS ──────────────────────────────────────────────────────────

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

function copyRoomCode() {
  if (!myRoomId) return;
  const el = document.getElementById('roomCode-display');
  const orig = el.textContent;
  const showCopied = () => {
    el.textContent = 'COPIED!';
    setTimeout(() => { el.textContent = orig; }, 1200);
  };
  const fallback = () => {
    // execCommand is deprecated but serves as a fallback for non-HTTPS environments
    const ta = document.createElement('textarea');
    ta.value = myRoomId;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy'); // eslint-disable-line no-undef
    document.body.removeChild(ta);
    showCopied();
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(myRoomId).then(showCopied).catch(fallback);
  } else {
    fallback();
  }
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

  // Grey out colors already taken by other players; auto-switch if ours was taken
  const takenColors = state.players.map(p => p.color.toLowerCase());
  // Check if our selected color was just taken by someone else
  const myEntry = state.players.find(p => p.color.toLowerCase() === selectedColor.toLowerCase());
  const weOwnIt = myEntry && myEntry.id === mySocketId;
  if (myEntry && !weOwnIt) {
    // Our color is taken — pick the first available one
    const allColors = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e91e63','#ffd700'];
    const available = allColors.find(c => !takenColors.includes(c.toLowerCase()));
    if (available) selectedColor = available;
  }

  const swatches = document.querySelectorAll('.color-swatch');
  swatches.forEach(sw => {
    const color = sw.dataset.color.toLowerCase();
    sw.classList.remove('selected', 'taken');
    sw.disabled = false;
    if (color === selectedColor.toLowerCase()) {
      sw.classList.add('selected');
    } else if (takenColors.includes(color)) {
      sw.classList.add('taken');
      sw.disabled = true;
    }
  });

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
  socket.emit('create_room', { playerName: name, color: selectedColor });
}

function joinRoom() {
  const name = document.getElementById('playerName').value.trim();
  const code = document.getElementById('roomCode').value.trim().toUpperCase();
  if (!name) return showError('Please enter your name.');
  if (!code || code.length !== 4) return showError('Please enter a valid 4-digit room code.');
  myPlayerName = name;
  sessionStorage.setItem('endsieg_playerName', name);
  socket.emit('join_room', { roomId: code, playerName: name, color: selectedColor });
}

function startGame() {
  if (!myRoomId) return;
  const fundsEl = document.getElementById('startingFunds');
  const startingFunds = fundsEl ? parseInt(fundsEl.value) || 1500 : 1500;
  socket.emit('start_game', { roomId: myRoomId, startingFunds });
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
