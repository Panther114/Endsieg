'use strict';

/* ── In-Game Socket + Rendering Logic ── */

const socket  = io();
const params  = new URLSearchParams(window.location.search);
const roomId  = params.get('room');

let myId       = null;
let gameState  = null;
let pendingTrade = null; // incoming trade

// Color map for board property groups
const COLOR_MAP = {
  brown:'#8B4513', cyan:'#00BCD4', pink:'#E91E63', orange:'#FF9800',
  red:'#F44336', yellow:'#FFC107', green:'#4CAF50', darkblue:'#1a237e'
};

// ── FORMAT TILE NAME ───────────────────────────────────────────────
// Splits words longer than 5 chars into ≤5-char chunks for compact display
function formatTileName(name) {
  return name.split(' ').map(word => {
    if (word.length <= 5) return word;
    const chunks = [];
    for (let i = 0; i < word.length; i += 5) {
      chunks.push(word.slice(i, i + 5));
    }
    return chunks.join(' ');
  }).join(' ');
}

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

// ── DICE FACES removed — using numeric display ──────────────────────

// ── BOARD LAYOUT ───────────────────────────────────────────────────
// Maps tile id -> [gridRow, gridCol] (1-indexed, 14x10 grid)
// Matches server/boardData.js clockwise layout — GO at top-left corner:
//   Top row   (row  1): ids  0–13,  col 1→14  (left to right)
//   Right col (col 14): ids 14–21,  row 2→9
//   Bottom row (row 10): ids 22–35, col 14→1  (right to left)
//   Left col  (col  1): ids 36–43,  row 9→2
function buildPositionMap() {
  const pos = {};
  // Top row (row 1): tiles 0–13, col 1→14 (left to right)
  for (let i = 0; i <= 13; i++) pos[i] = [1, i + 1];
  // Right col (col 14): tiles 14–21, row 2→9
  for (let i = 14; i <= 21; i++) pos[i] = [i - 12, 14];
  // Bottom row (row 10): tiles 22–35, col 14→1 (right to left)
  for (let i = 22; i <= 35; i++) pos[i] = [10, 36 - i];
  // Left col (col 1): tiles 36–43, row 9→2
  for (let i = 36; i <= 43; i++) pos[i] = [45 - i, 1];
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
}

// ── RENDER ALL ─────────────────────────────────────────────────────
function renderAll(state) {
  renderBoard(state);
  renderPlayers(state);
  renderLog(state.log);
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

    // Color band (with house/hotel icons and price) — property tiles only
    const houseOwner = state.players.find(p => p.id === (state.propertyOwners && state.propertyOwners[tile.id]));
    if (tile.type === 'property' && tile.color) {
      const band = document.createElement('div');
      band.className = `color-band band-${tile.color}`;

      // Price inside band for maximum readability
      if (tile.price) {
        const priceInBand = document.createElement('div');
        priceInBand.className = 'tile-price-band';
        priceInBand.textContent = `$${tile.price}`;
        band.appendChild(priceInBand);
      }

      // Add house/hotel icons to the band
      const houseCount = (houseOwner && houseOwner.houses && houseOwner.houses[tile.id]) || 0;
      if (houseCount > 0) {
        band.style.display = 'flex';
        band.style.flexDirection = 'column';
        band.style.alignItems = 'center';
        band.style.justifyContent = 'flex-end';
        band.style.gap = '1px';
        band.style.padding = '1px';
        if (houseCount === 5) {
          const hotel = document.createElement('span');
          hotel.className = 'hotel-icon';
          hotel.textContent = '🏨';
          band.appendChild(hotel);
        } else {
          for (let h = 0; h < houseCount; h++) {
            const house = document.createElement('span');
            house.className = 'house-icon';
            house.textContent = '🏠';
            band.appendChild(house);
          }
        }
      }
      el.appendChild(band);
    }

    // Owner outline (replaces overlay)
    const ownerId = state.propertyOwners && state.propertyOwners[tile.id];
    if (ownerId) {
      const owner = state.players.find(p => p.id === ownerId);
      if (owner) {
        el.style.outline = `3px solid ${owner.color}`;
        el.style.outlineOffset = '-2px';
        el.style.boxShadow = `0 0 8px 2px ${owner.color}, inset 0 0 6px 1px ${owner.color}88`;
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

      // Price tag for railroad and utility tiles only (no color band)
      if ((tile.type === 'railroad' || tile.type === 'utility') && tile.price) {
        const price = document.createElement('div');
        price.className = 'tile-price';
        price.textContent = `$${tile.price}`;
        el.appendChild(price);
      }
      // Pay cost label for tax tiles only
      if (tile.type === 'tax' && tile.cost) {
        const cost = document.createElement('div');
        cost.className = 'tile-price';
        cost.textContent = `Pay $${tile.cost}`;
        el.appendChild(cost);
      }
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

    // Tile click — show info popup
    el.addEventListener('click', () => showTileInfo(tile.id));

    boardEl.appendChild(el);
  });

  // Board center actions
  const center = document.createElement('div');
  center.className = 'board-center-actions';
  center.id = 'boardCenterActions';
  center.style.gridRow    = '2 / 10';
  center.style.gridColumn = '2 / 14';
  updateBoardCenter(state, center);
  boardEl.appendChild(center);
}

// ── BOARD CENTER ACTIONS ───────────────────────────────────────────
function updateBoardCenter(state, centerEl) {
  const el = centerEl || document.getElementById('boardCenterActions');
  if (!el) return;
  el.innerHTML = '';

  const isMyTurn = state.currentPlayerId === myId;
  const myPlayer = state.players.find(p => p.id === myId);
  const phase = state.turnPhase;
  const currPlayer = state.players.find(p => p.id === state.currentPlayerId);

  // Turn indicator bar (thin colored stripe at top)
  const turnBar = document.createElement('div');
  turnBar.className = 'turn-indicator-bar';
  turnBar.style.background = currPlayer ? currPlayer.color : 'transparent';
  el.appendChild(turnBar);

  // Title
  const title = document.createElement('div');
  title.className = 'center-title';
  title.textContent = 'ENDSIEG';
  el.appendChild(title);

  const sub = document.createElement('div');
  sub.className = 'center-subtitle';
  sub.textContent = 'By Gavania';
  el.appendChild(sub);

  // Dice
  const diceContainer = document.createElement('div');
  diceContainer.className = 'dice-container';
  diceContainer.id = 'diceDisplay';
  if (state.lastRoll) {
    renderDice(state.lastRoll, diceContainer);
  } else {
    diceContainer.innerHTML = '<div class="die">?</div><div class="die">?</div>';
  }
  el.appendChild(diceContainer);

  // Turn info
  const info = document.createElement('div');
  info.className = 'center-player-info';
  if (currPlayer) {
    if (isMyTurn && myPlayer && !myPlayer.bankrupt) {
      info.innerHTML = `<strong style="color:${currPlayer.color}">Your turn!</strong><span>Phase: ${phase}</span>`;
    } else {
      info.innerHTML = `<strong style="color:${currPlayer.color}">${escapeHtml(currPlayer.name)}'s turn</strong>`;
    }
  }
  el.appendChild(info);

  // Action buttons (only if it's my turn)
  if (isMyTurn && myPlayer && !myPlayer.bankrupt) {
    const btnRow = document.createElement('div');
    btnRow.className = 'center-btn-row';

    if (phase === 'roll') {
      btnRow.appendChild(makeCenterBtn('🎲 Roll', 'roll', rollDice));
      btnRow.appendChild(makeCenterBtn('🤝 Trade', 'trade', openTradeModal));
      if (myPlayer.inJail && myPlayer.money >= 50) {
        btnRow.appendChild(makeCenterBtn('🔓 Pay Jail', 'pay', payJail));
      }
    }

    if (phase === 'action') {
      const tile = state.board && state.board[myPlayer.position];
      const owned = state.propertyOwners && state.propertyOwners[myPlayer.position];
      if (tile && ['property','railroad','utility'].includes(tile.type) && !owned && myPlayer.money >= tile.price) {
        btnRow.appendChild(makeCenterBtn('💰 Buy', 'buy', buyProperty));
      }

      // Build house button if any owned monopoly exists
      const canBuild = myPlayer.properties.some(pid => {
        const t = state.board && state.board[pid];
        if (!t || t.type !== 'property') return false;
        const groupTiles = state.board.filter(b => b.group === t.group && b.type === 'property');
        return groupTiles.every(b => state.propertyOwners && state.propertyOwners[b.id] === myId);
      });
      if (canBuild) btnRow.appendChild(makeCenterBtn('🏠 Build', 'build', openBuildModal));

      btnRow.appendChild(makeCenterBtn('🤝 Trade', 'trade', openTradeModal));
      btnRow.appendChild(makeCenterBtn('✅ End Turn', 'end', endTurn));
    }

    if (phase === 'end') {
      btnRow.appendChild(makeCenterBtn('✅ End Turn', 'end', endTurn));
    }

    el.appendChild(btnRow);
  }
}

function makeCenterBtn(label, type, fn) {
  const btn = document.createElement('button');
  btn.className = `btn-center-action btn-center-${type}`;
  btn.textContent = label;
  btn.addEventListener('click', fn);
  return btn;
}

const BOARD_ROWS = 10;
const BOARD_COLS = 14;

function buildTileClass(tile, row, col) {
  let cls = `tile tile-${tile.type}`;
  if (isCorner(row, col))       cls += ' tile-corner';
  else if (row === BOARD_ROWS)  cls += ' tile-bottom';
  else if (row === 1)           cls += ' tile-top';
  else if (col === 1)           cls += ' tile-left';
  else if (col === BOARD_COLS)  cls += ' tile-right';
  if (tile.type === 'property' && tile.color) cls += ' tile-has-band';
  return cls;
}

function isCorner(row, col) {
  return (row === 1 || row === BOARD_ROWS) && (col === 1 || col === BOARD_COLS);
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
    die.textContent = val;
    container.appendChild(die);
    setTimeout(() => die.classList.remove('rolling'), 500);
  });
}

// ── TILE INFO MODAL ────────────────────────────────────────────────
function showTileInfo(tileId) {
  if (!gameState) return;
  const tile = gameState.board && gameState.board[tileId];
  if (!tile) return;

  document.getElementById('tileInfoName').textContent = tile.name;

  const colorBar = document.getElementById('tileInfoColorBar');
  if (tile.color && COLOR_MAP[tile.color]) {
    colorBar.style.background = COLOR_MAP[tile.color];
    colorBar.style.display = 'block';
  } else {
    colorBar.style.display = 'none';
  }

  const body = document.getElementById('tileInfoBody');
  body.innerHTML = '';

  if (tile.type === 'property') {
    const ownerId = gameState.propertyOwners && gameState.propertyOwners[tileId];
    const owner = ownerId ? gameState.players.find(p => p.id === ownerId) : null;
    const ownerHouses = owner && owner.houses ? (owner.houses[tileId] || 0) : 0;

    let html = `<p class="tile-info-row"><span>Price</span><strong>$${tile.price}</strong></p>`;
    if (owner) {
      html += `<p class="tile-info-row"><span>Owner</span><strong style="color:${owner.color}">${escapeHtml(owner.name)}</strong></p>`;
      html += `<p class="tile-info-row"><span>Built</span><strong>${ownerHouses === 5 ? '🏨 Hotel' : ownerHouses > 0 ? `🏠 ×${ownerHouses}` : 'None'}</strong></p>`;
    } else {
      html += `<p class="tile-info-row"><span>Owner</span><strong>Unowned</strong></p>`;
    }
    html += `<table class="rent-table"><thead><tr><th>Level</th><th>Rent</th></tr></thead><tbody>`;
    const labels = ['Base', '1 House', '2 Houses', '3 Houses', '4 Houses', 'Hotel'];
    tile.rent.forEach((r, i) => {
      const active = ownerHouses === i;
      html += `<tr${active ? ' class="rent-active"' : ''}><td>${labels[i] || i}</td><td>$${r}</td></tr>`;
    });
    html += `</tbody></table>`;
    body.innerHTML = html;
  } else if (tile.type === 'railroad') {
    const ownerId = gameState.propertyOwners && gameState.propertyOwners[tileId];
    const owner = ownerId ? gameState.players.find(p => p.id === ownerId) : null;
    let html = `<p class="tile-info-row"><span>Price</span><strong>$${tile.price}</strong></p>`;
    html += `<p class="tile-info-row"><span>Owner</span><strong${owner ? ` style="color:${owner.color}"` : ''}>${owner ? escapeHtml(owner.name) : 'Unowned'}</strong></p>`;
    html += `<table class="rent-table"><thead><tr><th>RRs Owned</th><th>Rent</th></tr></thead><tbody>`;
    tile.rent.forEach((r, i) => {
      html += `<tr><td>${i + 1}</td><td>$${r}</td></tr>`;
    });
    html += `</tbody></table>`;
    body.innerHTML = html;
  } else if (tile.type === 'utility') {
    const ownerId = gameState.propertyOwners && gameState.propertyOwners[tileId];
    const owner = ownerId ? gameState.players.find(p => p.id === ownerId) : null;
    body.innerHTML = `
      <p class="tile-info-row"><span>Price</span><strong>$${tile.price}</strong></p>
      <p class="tile-info-row"><span>Owner</span><strong${owner ? ` style="color:${owner.color}"` : ''}>${owner ? escapeHtml(owner.name) : 'Unowned'}</strong></p>
      <p class="tile-info-desc">Rent: 4× dice (1 owned) or 10× dice (2 owned)</p>
    `;
  } else if (tile.type === 'tax') {
    body.innerHTML = `<p class="tile-info-row"><span>Pay</span><strong>$${tile.cost}</strong></p>`;
  } else {
    body.innerHTML = `<p class="tile-info-desc">${tile.name}</p>`;
  }

  document.getElementById('tileInfoModal').style.display = 'flex';
}

function closeTileInfo(e) {
  if (e.target === document.getElementById('tileInfoModal')) {
    document.getElementById('tileInfoModal').style.display = 'none';
  }
}
window.closeTileInfo = closeTileInfo;

// ── RENDER PLAYERS ─────────────────────────────────────────────────
function renderPlayers(state) {
  const container = document.getElementById('playerCards');
  container.innerHTML = '';

  if (!window._prevMoney) window._prevMoney = {};

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

    const prevMoney = window._prevMoney[p.id] !== undefined ? window._prevMoney[p.id] : p.money;
    window._prevMoney[p.id] = p.money;

    const money = document.createElement('div');
    money.className = 'player-money';
    money.textContent = `$${p.money.toLocaleString()}`;
    if (p.money > prevMoney) {
      money.classList.add('money-increase');
      money.addEventListener('animationend', () => money.classList.remove('money-increase'), { once: true });
    } else if (p.money < prevMoney) {
      money.classList.add('money-decrease');
      money.addEventListener('animationend', () => money.classList.remove('money-decrease'), { once: true });
    }

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
  const el = document.getElementById('eventLog');
  if (!el) return;
  el.innerHTML = '';
  const entries = (log || []).slice(-15);
  entries.forEach((entry, i) => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    const opacity = 0.25 + (i / Math.max(entries.length - 1, 1)) * 0.75;
    div.style.opacity = opacity.toFixed(2);
    if (typeof entry === 'string') {
      div.textContent = entry;
    } else {
      div.textContent = entry.text;
      div.classList.add(`log-${entry.type || 'info'}`);
    }
    el.appendChild(div);
  });
  el.scrollTop = el.scrollHeight;
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

    // Even building check: only show if we can build here
    const minHouses = Math.min(...groupTiles.map(t => myPlayer.houses && myPlayer.houses[t.id] || 0));
    if (current > minHouses) return;

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
  return COLOR_MAP[color] || '#888';
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
