'use strict';

/* ── In-Game Socket + Rendering Logic ── */

const socket  = io();
const params  = new URLSearchParams(window.location.search);
const roomId  = params.get('room');

let myId       = null;
let gameState  = null;
let pendingTrade = null; // incoming trade

// ── LOADING TIMEOUT ────────────────────────────────────────────────
const loadingTimeout = setTimeout(() => {
  const ls = document.getElementById('loadingScreen');
  if (ls) {
    const p = ls.querySelector('p');
    if (p) {
      p.textContent = 'Could not connect to game room. ';
      const link = document.createElement('a');
      link.href = '/';
      link.textContent = 'Return to lobby';
      link.style.color = '#f1c40f';
      p.appendChild(link);
    }
  }
}, 8000);

// ── DICE FACES ─────────────────────────────────────────────────────
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

// ── BOARD LAYOUT ───────────────────────────────────────────────────
// Maps tile id -> [gridRow, gridCol] (1-indexed, 11x11 grid)
function buildPositionMap() {
  const pos = {};
  // Bottom row (row 11), tiles 0-10, right to left
  for (let i = 0; i <= 10; i++) {
    pos[i] = [11, 11 - i];
  }
  // Left column (col 1), tiles 11-19, bottom to top
  for (let i = 11; i <= 19; i++) {
    pos[i] = [11 - (i - 10), 1];
  }
  // Top row (row 1), tiles 20-30, left to right
  for (let i = 20; i <= 30; i++) {
    pos[i] = [1, i - 19];
  }
  // Right column (col 11), tiles 31-39, top to bottom
  for (let i = 31; i <= 39; i++) {
    pos[i] = [i - 29, 11];
  }
  return pos;
}
const TILE_POSITIONS = buildPositionMap();

// ── CONNECT ────────────────────────────────────────────────────────
socket.on('connect', () => {
  myId = socket.id;
  if (!roomId) {
    window.location.href = '/';
    return;
  }
  // Get playerName from sessionStorage (set by lobby before redirect)
  const playerName = sessionStorage.getItem('endsieg_playerName') || '';
  socket.emit('request_game_state', { roomId, playerName });
});

socket.on('room_updated', () => {
  // Game hasn't started yet — redirect back to lobby
  window.location.href = '/';
});

socket.on('game_started', (state) => {
  gameState = state;
  hideLoading();
  renderAll(state);
});

socket.on('game_updated', (state) => {
  gameState = state;
  hideLoading();
  renderAll(state);
  if (state.winner) showWinner(state.winner);
});

socket.on('chat_message', ({ playerName, message }) => {
  appendChat(playerName, message);
});

socket.on('trade_proposed', (trade) => {
  if (trade.toId !== myId) return;
  pendingTrade = trade;
  showIncomingTrade(trade);
});

socket.on('error', ({ message }) => {
  alert('Error: ' + message);
});

socket.on('player_left', ({ playerName }) => {
  const myName = sessionStorage.getItem('endsieg_playerName') || '';
  if (playerName !== myName) {
    showToast(`${playerName} has left the game.`);
  }
});

// ── HIDE LOADING ───────────────────────────────────────────────────
function hideLoading() {
  clearTimeout(loadingTimeout);
  const ls = document.getElementById('loadingScreen');
  if (ls) { ls.style.opacity = '0'; setTimeout(() => ls.remove(), 400); }
  document.getElementById('gameLayout').style.display = 'flex';
  document.getElementById('actionBar').style.display  = 'flex';
}

// ── RENDER ALL ─────────────────────────────────────────────────────
function renderAll(state) {
  renderBoard(state);
  renderPlayers(state);
  renderLog(state.log);
  renderActions(state);
}

// ── RENDER BOARD ───────────────────────────────────────────────────
function renderBoard(state) {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';

  const board = state.board || [];
  const myPlayer = state.players.find(p => p.id === myId);

  // Place 40 tiles
  board.forEach(tile => {
    const [row, col] = TILE_POSITIONS[tile.id] || [1, 1];
    const el = document.createElement('div');
    el.className = buildTileClass(tile, row, col);
    el.dataset.tileId = tile.id;
    el.style.gridRow    = row;
    el.style.gridColumn = col;

    // Color band
    if (tile.color) {
      const band = document.createElement('div');
      band.className = `color-band band-${tile.color}`;
      el.appendChild(band);
    }

    // Owner overlay
    const ownerId = state.propertyOwners && state.propertyOwners[tile.id];
    if (ownerId) {
      const owner = state.players.find(p => p.id === ownerId);
      if (owner) {
        const overlay = document.createElement('div');
        overlay.className = 'owner-overlay';
        overlay.style.background = owner.color;
        el.appendChild(overlay);
      }
    }

    // Content
    if (isCorner(row, col)) {
      el.appendChild(buildCornerContent(tile));
    } else {
      const name = document.createElement('div');
      name.className = 'tile-name';
      name.textContent = tile.name;
      el.appendChild(name);

      if (tile.price) {
        const price = document.createElement('div');
        price.className = 'tile-price';
        price.textContent = `$${tile.price}`;
        el.appendChild(price);
      }
      if (tile.cost) {
        const cost = document.createElement('div');
        cost.className = 'tile-price';
        cost.textContent = `Pay $${tile.cost}`;
        el.appendChild(cost);
      }
    }

    // Houses / hotel
    const houseOwner = state.players.find(p => p.id === ownerId);
    if (houseOwner && houseOwner.houses && houseOwner.houses[tile.id]) {
      const count = houseOwner.houses[tile.id];
      const hc = document.createElement('div');
      hc.className = 'houses-container';
      if (count === 5) {
        const hotel = document.createElement('div');
        hotel.className = 'hotel-sq';
        hc.appendChild(hotel);
      } else {
        for (let i = 0; i < count; i++) {
          const h = document.createElement('div');
          h.className = 'house-sq';
          hc.appendChild(h);
        }
      }
      el.appendChild(hc);
    }

    // Player tokens
    const tokensHere = state.players.filter(p => p.position === tile.id && !p.bankrupt);
    if (tokensHere.length) {
      const tc = document.createElement('div');
      tc.className = 'tokens-container';
      tokensHere.forEach(p => {
        const tok = document.createElement('div');
        tok.className = 'player-token';
        tok.style.background = p.color;
        tok.title = p.name;
        tok.textContent = p.name.charAt(0).toUpperCase();
        tc.appendChild(tok);
      });
      el.appendChild(tc);
    }

    // Highlight current player's tile
    if (myPlayer && tile.id === myPlayer.position) {
      el.classList.add('current-player-tile');
    }

    // Purchasable highlight
    const isCurrPlayer = state.currentPlayerId === myId;
    if (isCurrPlayer && myPlayer && tile.id === myPlayer.position &&
        ['property','railroad','utility'].includes(tile.type) &&
        !(state.propertyOwners && state.propertyOwners[tile.id])) {
      el.classList.add('purchasable');
    }

    boardEl.appendChild(el);
  });

  // Center area
  const center = document.createElement('div');
  center.className = 'board-center';
  center.style.gridRow    = '2 / 11';
  center.style.gridColumn = '2 / 11';

  const title = document.createElement('div');
  title.className = 'center-title';
  title.textContent = 'ENDSIEG';

  const sub = document.createElement('div');
  sub.className = 'center-subtitle';
  sub.textContent = 'Strategy Board Game';

  const diceContainer = document.createElement('div');
  diceContainer.className = 'dice-container';
  diceContainer.id = 'diceDisplay';
  if (state.lastRoll) {
    renderDice(state.lastRoll, diceContainer);
  } else {
    diceContainer.innerHTML = '<div class="die">🎲</div><div class="die">🎲</div>';
  }

  const info = document.createElement('div');
  info.className = 'center-player-info';
  const currPlayer = state.players.find(p => p.id === state.currentPlayerId);
  if (currPlayer) {
    info.innerHTML = `<strong style="color:${currPlayer.color}">${escapeHtml(currPlayer.name)}'s turn</strong><span>Phase: ${state.turnPhase}</span>`;
  }

  center.appendChild(title);
  center.appendChild(sub);
  center.appendChild(diceContainer);
  center.appendChild(info);
  boardEl.appendChild(center);
}

function buildTileClass(tile, row, col) {
  let cls = `tile tile-${tile.type}`;
  if (isCorner(row, col)) cls += ' tile-corner';
  else if (row === 11) cls += ' tile-bottom';
  else if (row === 1)  cls += ' tile-top';
  else if (col === 1)  cls += ' tile-left';
  else if (col === 11) cls += ' tile-right';
  return cls;
}

function isCorner(row, col) {
  return (row === 1 || row === 11) && (col === 1 || col === 11);
}

function buildCornerContent(tile) {
  const div = document.createElement('div');
  const iconMap = {
    go: '★', jail: '⚒', go_to_jail: '🚓', free_parking: '🅿'
  };
  const icon = document.createElement('span');
  icon.className = 'corner-icon';
  icon.textContent = iconMap[tile.type] || '?';
  const label = document.createElement('span');
  label.className = 'corner-label';
  label.textContent = tile.name;
  div.appendChild(icon);
  div.appendChild(label);
  return div;
}

function renderDice(roll, container) {
  container.innerHTML = '';
  roll.forEach(val => {
    const die = document.createElement('div');
    die.className = 'die rolling';
    die.textContent = DICE_FACES[val] || val;
    container.appendChild(die);
    setTimeout(() => die.classList.remove('rolling'), 500);
  });
}

// ── RENDER PLAYERS ─────────────────────────────────────────────────
function renderPlayers(state) {
  const container = document.getElementById('playerCards');
  container.innerHTML = '';

  state.players.forEach(p => {
    const card = document.createElement('div');
    card.className = `player-card${p.id === state.currentPlayerId ? ' active' : ''}${p.bankrupt ? ' bankrupt' : ''}`;

    const header = document.createElement('div');
    header.className = 'player-card-header';

    const token = document.createElement('div');
    token.className = 'player-token-sm';
    token.style.background = p.color;
    token.textContent = p.name.charAt(0).toUpperCase();

    const name = document.createElement('div');
    name.className = 'player-name-sm';
    name.textContent = p.name + (p.id === myId ? ' (you)' : '') + (p.bankrupt ? ' 💀' : '');

    header.appendChild(token);
    header.appendChild(name);

    const money = document.createElement('div');
    money.className = 'player-money';
    money.textContent = `$${p.money.toLocaleString()}`;

    const props = document.createElement('div');
    props.className = 'player-props';
    props.textContent = `${p.properties.length} properties${p.inJail ? ' • In Jail' : ''}`;

    card.appendChild(header);
    card.appendChild(money);
    card.appendChild(props);
    container.appendChild(card);
  });
}

// ── RENDER LOG ─────────────────────────────────────────────────────
function renderLog(log) {
  const panel = document.getElementById('logPanel');
  panel.innerHTML = '';
  (log || []).slice().reverse().forEach(entry => {
    const p = document.createElement('p');
    p.textContent = entry;
    panel.appendChild(p);
  });
}

// ── RENDER ACTIONS ─────────────────────────────────────────────────
function renderActions(state) {
  const isMyTurn = state.currentPlayerId === myId;
  const myPlayer = state.players.find(p => p.id === myId);
  const phase = state.turnPhase;

  const btnRoll    = document.getElementById('btnRoll');
  const btnBuy     = document.getElementById('btnBuy');
  const btnBuild   = document.getElementById('btnBuild');
  const btnPayJail = document.getElementById('btnPayJail');
  const btnEnd     = document.getElementById('btnEnd');
  const indicator  = document.getElementById('turnIndicator');

  // Hide all first
  btnRoll.style.display    = 'none';
  btnBuy.style.display     = 'none';
  btnBuild.style.display   = 'none';
  btnPayJail.style.display = 'none';
  btnEnd.style.display     = 'none';

  if (!isMyTurn || !myPlayer || myPlayer.bankrupt) {
    const currPlayer = state.players.find(p => p.id === state.currentPlayerId);
    indicator.textContent = currPlayer ? `${currPlayer.name}'s turn` : '';
    return;
  }

  indicator.textContent = 'Your turn!';

  if (phase === 'roll') {
    btnRoll.style.display = 'inline-flex';
    if (myPlayer.inJail && myPlayer.money >= 50) {
      btnPayJail.style.display = 'inline-flex';
    }
  }

  if (phase === 'action') {
    // Check if current tile is buyable
    const tile = state.board && state.board[myPlayer.position];
    const owned = state.propertyOwners && state.propertyOwners[myPlayer.position];
    if (tile && ['property','railroad','utility'].includes(tile.type) && !owned) {
      btnBuy.style.display = 'inline-flex';
    }

    // Build house button if any owned monopoly exists
    const canBuild = myPlayer.properties.some(pid => {
      const t = state.board && state.board[pid];
      if (!t || t.type !== 'property') return false;
      const groupTiles = state.board.filter(b => b.group === t.group && b.type === 'property');
      return groupTiles.every(b => state.propertyOwners && state.propertyOwners[b.id] === myId);
    });
    if (canBuild) btnBuild.style.display = 'inline-flex';

    btnEnd.style.display = 'inline-flex';
  }

  if (phase === 'end') {
    btnEnd.style.display = 'inline-flex';
  }
}

// ── CHAT ───────────────────────────────────────────────────────────
function appendChat(playerName, message) {
  const log = document.getElementById('chatLog');
  const p = document.createElement('p');
  p.innerHTML = `<b>${escapeHtml(playerName)}:</b> ${escapeHtml(message)}`;
  log.appendChild(p);
  log.scrollTop = log.scrollHeight;
}

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg || !roomId) return;
  socket.emit('chat_message', { roomId, message: msg });
  input.value = '';
}
window.sendChat = sendChat;

document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChat();
    });
  }
});

// ── GAME ACTIONS ───────────────────────────────────────────────────
function rollDice()    { if (roomId) socket.emit('roll_dice',    { roomId }); }
function buyProperty() { if (roomId) socket.emit('buy_property', { roomId }); }
function endTurn()     { if (roomId) socket.emit('end_turn',     { roomId }); }
function payJail()     { if (roomId) socket.emit('pay_jail',     { roomId }); }

window.rollDice    = rollDice;
window.buyProperty = buyProperty;
window.endTurn     = endTurn;
window.payJail     = payJail;

// ── BUILD MODAL ────────────────────────────────────────────────────
function openBuildModal() {
  if (!gameState) return;
  const myPlayer = gameState.players.find(p => p.id === myId);
  if (!myPlayer) return;

  const opts = document.getElementById('buildOptions');
  opts.innerHTML = '';

  myPlayer.properties.forEach(pid => {
    const tile = gameState.board && gameState.board[pid];
    if (!tile || tile.type !== 'property') return;
    const groupTiles = gameState.board.filter(b => b.group === tile.group && b.type === 'property');
    const hasMonopoly = groupTiles.every(b => gameState.propertyOwners && gameState.propertyOwners[b.id] === myId);
    if (!hasMonopoly) return;

    const current = (myPlayer.houses && myPlayer.houses[pid]) || 0;
    if (current >= 5) return;

    const cost = Math.floor(tile.price / 2);
    const btn = document.createElement('button');
    btn.className = 'build-option-btn';
    const label = current === 4 ? 'Build Hotel' : `Build House ${current + 1}/4`;
    btn.innerHTML = `<span><span class="player-dot" style="background:${colorForGroup(tile.color)};display:inline-block;"></span> ${escapeHtml(tile.name)}</span><span>$${cost} — ${label}</span>`;
    btn.onclick = () => {
      socket.emit('build_house', { roomId, tileId: pid });
      closeBuildModal();
    };
    opts.appendChild(btn);
  });

  if (!opts.children.length) {
    opts.innerHTML = '<p style="color:#aaa;font-size:0.82rem;">No eligible properties to build on.</p>';
  }

  document.getElementById('buildModal').style.display = 'flex';
}

function closeBuildModal() {
  document.getElementById('buildModal').style.display = 'none';
}

window.openBuildModal  = openBuildModal;
window.closeBuildModal = closeBuildModal;

// ── TRADE MODAL ────────────────────────────────────────────────────
function openTradeModal() {
  if (!gameState) return;
  const myPlayer = gameState.players.find(p => p.id === myId);
  if (!myPlayer) return;

  // Populate target players
  const select = document.getElementById('tradeTarget');
  select.innerHTML = '';
  gameState.players.filter(p => p.id !== myId && !p.bankrupt).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });

  if (!select.options.length) {
    alert('No other active players to trade with.');
    return;
  }

  // My properties
  renderTradeProps('tradeFromProps', myPlayer.properties, gameState);
  select.onchange = updateTargetProps;
  updateTargetProps();

  document.getElementById('tradeFromMoney').value = 0;
  document.getElementById('tradeToMoney').value   = 0;

  document.getElementById('tradeModal').style.display = 'flex';
}

function updateTargetProps() {
  const select = document.getElementById('tradeTarget');
  const toId = select.value;
  const target = gameState && gameState.players.find(p => p.id === toId);
  if (target) renderTradeProps('tradeToProps', target.properties, gameState);
}

function renderTradeProps(containerId, properties, state) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  properties.forEach(pid => {
    const tile = state.board && state.board[pid];
    if (!tile) return;
    const item = document.createElement('label');
    item.className = 'trade-prop-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = pid;
    item.appendChild(cb);
    const dot = document.createElement('span');
    dot.className = 'player-dot';
    dot.style.background = colorForGroup(tile.color);
    dot.style.display = 'inline-block';
    item.appendChild(dot);
    item.appendChild(document.createTextNode(' ' + tile.name));
    container.appendChild(item);
  });
}

function submitTrade() {
  const select   = document.getElementById('tradeTarget');
  const toId     = select.value;
  const fromMoney = parseInt(document.getElementById('tradeFromMoney').value) || 0;
  const toMoney   = parseInt(document.getElementById('tradeToMoney').value)   || 0;

  const fromProps = Array.from(document.querySelectorAll('#tradeFromProps input:checked')).map(cb => parseInt(cb.value));
  const toProps   = Array.from(document.querySelectorAll('#tradeToProps input:checked')).map(cb => parseInt(cb.value));

  socket.emit('trade_offer', { roomId, toId, offer: { fromMoney, fromProperties: fromProps, toMoney, toProperties: toProps } });
  closeTradeModal();
}

function closeTradeModal() {
  document.getElementById('tradeModal').style.display = 'none';
}

window.openTradeModal  = openTradeModal;
window.closeTradeModal = closeTradeModal;
window.submitTrade     = submitTrade;

// ── INCOMING TRADE ─────────────────────────────────────────────────
function showIncomingTrade(trade) {
  const details = document.getElementById('incomingTradeDetails');
  if (!gameState) return;

  const fromPlayer = gameState.players.find(p => p.id === trade.fromId);
  const offer = trade.offer;

  const fromPropsNames = (offer.fromProperties || []).map(pid => {
    const t = gameState.board && gameState.board[pid];
    return t ? t.name : `#${pid}`;
  });
  const toPropsNames = (offer.toProperties || []).map(pid => {
    const t = gameState.board && gameState.board[pid];
    return t ? t.name : `#${pid}`;
  });

  details.innerHTML = `
    <p><strong>${escapeHtml(fromPlayer ? fromPlayer.name : 'Someone')}</strong> offers:</p>
    <ul>
      ${offer.fromMoney ? `<li>$${offer.fromMoney}</li>` : ''}
      ${fromPropsNames.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
    </ul>
    <p>In exchange for:</p>
    <ul>
      ${offer.toMoney ? `<li>$${offer.toMoney}</li>` : ''}
      ${toPropsNames.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
    </ul>
  `;

  document.getElementById('incomingTradeModal').style.display = 'flex';
}

function acceptTrade() {
  if (!pendingTrade) return;
  socket.emit('trade_accept', { roomId, fromId: pendingTrade.fromId, offer: pendingTrade.offer });
  pendingTrade = null;
  document.getElementById('incomingTradeModal').style.display = 'none';
}

function declineTrade() {
  pendingTrade = null;
  document.getElementById('incomingTradeModal').style.display = 'none';
}

window.acceptTrade  = acceptTrade;
window.declineTrade = declineTrade;

// ── WINNER ─────────────────────────────────────────────────────────
function showWinner(winner) {
  document.getElementById('winnerName').textContent = winner.name;
  document.getElementById('winnerOverlay').style.display = 'flex';
}

// ── HELPERS ────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colorForGroup(color) {
  const map = {
    brown: '#955436', cyan: '#aae0fa', pink: '#d93a96',
    orange: '#f7941d', red: '#ed1b24', yellow: '#fef200',
    green: '#1fb25a', blue: '#0072bb'
  };
  return map[color] || '#888';
}

// ── TOAST NOTIFICATIONS ────────────────────────────────────────────
function showToast(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  // Trigger transition
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
