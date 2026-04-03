'use strict';

const fs   = require('fs');
const path = require('path');
const { getBoardWithCustomConfig } = require('./boardData');
const BOARD = require('./boardData');

const PLAYER_COLORS = [
  '#7C4DFF',  // Electric Violet   — no board tile conflict
  '#00BFA5',  // Teal               — distinct from board's bright cyan
  '#FF6D00',  // Deep Orange        — richer than board's amber orange
  '#1565C0',  // Navy Blue          — much darker than board's slate blue
  '#2E7D32',  // Forest Green       — darker than board's medium green
  '#AD1457',  // Berry              — deeper than board's hot pink
  '#37474F',  // Slate Grey         — neutral, no conflict
  '#4A148C',  // Dark Violet        — deep purple, no board tile
  '#F5F5F5',  // Near White         — not on board
  '#212121',  // Near Black         — not on board
];

// ── Load configurable card decks from server/cardsConfig.json ──────
let _cardsConfig = {};
try {
  const raw = fs.readFileSync(path.join(__dirname, 'cardsConfig.json'), 'utf8');
  _cardsConfig = JSON.parse(raw);
} catch (err) {
  if (err.code !== 'ENOENT') {
    console.warn('[gameLogic] Could not load cardsConfig.json:', err.message);
  }
}

const _defaultChanceCards = [
  { text: 'Advance to GO. Collect $200.', action: 'advance_to', target: 0 },
  { text: 'Go to Jail. Go directly to Jail.', action: 'go_to_jail' },
  { text: 'Bank pays you dividend of $50.', action: 'collect', amount: 50 },
  { text: 'Pay poor tax of $15.', action: 'pay', amount: 15 },
  { text: 'Go back 3 spaces.', action: 'move_back', amount: 3 },
  { text: 'Advance to nearest Railroad.', action: 'nearest_railroad' },
  { text: 'Get Out of Jail Free.', action: 'jail_free' },
  { text: 'Pay each player $50.', action: 'pay_each', amount: 50 }
];

const _defaultChestCards = [
  { text: 'Bank error in your favor. Collect $200.', action: 'collect', amount: 200 },
  { text: "Doctor's fee. Pay $50.", action: 'pay', amount: 50 },
  { text: 'Pay school tax of $150.', action: 'pay', amount: 150 },
  { text: 'Receive holiday fund maturity. Collect $100.', action: 'collect', amount: 100 },
  { text: 'Go to Jail.', action: 'go_to_jail' },
  { text: 'Collect $10 from every player.', action: 'collect_each', amount: 10 },
  { text: 'Income tax refund. Collect $20.', action: 'collect', amount: 20 },
  { text: 'Life insurance matures. Collect $100.', action: 'collect', amount: 100 }
];

const CHANCE_CARDS = (Array.isArray(_cardsConfig.chanceCards) && _cardsConfig.chanceCards.length > 0)
  ? _cardsConfig.chanceCards
  : _defaultChanceCards;

const CHEST_CARDS = (Array.isArray(_cardsConfig.chestCards) && _cardsConfig.chestCards.length > 0)
  ? _cardsConfig.chestCards
  : _defaultChestCards;

// Jail tile id: find the tile with type 'jail' on the board.
// boardConfig.json overrides boardData.js — tile 13 is 'jail' in the active config.
// Fallback 13 matches the board config used by this project.
function _findJailId() {
  const jailTile = BOARD.find(t => t.type === 'jail');
  return jailTile ? jailTile.id : 13;
}
const JAIL_TILE_ID = _findJailId();

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class GameRoom {
  constructor(id, hostId, hostName, hostColor) {
    this.id = id;
    this.hostId = hostId;
    this.started = false;
    this.players = [this._makePlayer(hostId, hostName, hostColor || PLAYER_COLORS[0])];
    this.currentPlayerIndex = 0;
    this.turnPhase = 'roll';
    this.log = [];
    this.winner = null;
    this.lastRoll = null;
    this._doubleCount = 0;
    this.chanceCards = [];
    this.chestCards = [];
    // property ownership: tileId -> playerId
    this.propertyOwners = {};
    // pending trade offers: tradeId -> trade object
    this.pendingTrades = {};
    this._jailFreeChance = null;
    this._jailFreeChest = null;
    this.customMap = null;  // Custom map data for this room
    this.board = null;      // Actual board data to use (will be set on start)

    // ── RICHUP RULES ──────────────────────────────────────────────
    this.rules = {
      doubleRentFullSet: true,
      vacationCash:      false,
      auction:           false,
      noRentInJail:      true,
      mortgage:          true,
      evenBuild:         true
    };
    this.freeParkingPool = 0;
    this.mortgaged = {};
    this.auctionState = null;

    // ── VOTEKICK ──────────────────────────────────────────────────
    this.kickVotes = {};
  }

  _makePlayer(id, name, color) {
    return {
      id,
      name,
      money: 1500,
      position: 0,
      properties: [],
      houses: {},
      inJail: false,
      jailTurns: 0,
      bankrupt: false,
      color: color || PLAYER_COLORS[0]
    };
  }

  addPlayer(id, name, color) {
    if (this.started || this.players.length >= 8) return false;
    if (this.players.find(p => p.id === id)) return false;
    const resolvedColor = (color && /^#[0-9a-fA-F]{6}$/.test(color))
      ? color
      : PLAYER_COLORS[this.players.length % PLAYER_COLORS.length];
    this.players.push(this._makePlayer(id, name, resolvedColor));
    return true;
  }

  start(funds, rules) {
    this.started = true;
    this.currentPlayerIndex = 0;
    this.turnPhase = 'roll';
    this.chanceCards = shuffle(CHANCE_CARDS);
    this.chestCards = shuffle(CHEST_CARDS);

    // Initialize board with custom map if provided
    if (this.customMap && this.customMap.tiles) {
      this.board = getBoardWithCustomConfig(this.customMap);
      console.log(`[GameRoom ${this.id}] Using custom map with ${this.board.length} tiles`);
    } else {
      this.board = BOARD;
    }

    if (typeof funds === 'number' && funds >= 500 && funds <= 10000) {
      for (const p of this.players) p.money = funds;
    }
    // Merge provided rules
    if (rules && typeof rules === 'object') {
      Object.assign(this.rules, rules);
    }
    this._addLog('Game started! ' + this.players.map(p => p.name).join(', ') + ' are playing.', 'system');
  }

  rollDice(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId || this.turnPhase !== 'roll') {
      return this.getState();
    }

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const roll = d1 + d2;
    const isDouble = d1 === d2;
    this.lastRoll = [d1, d2];

    if (player.inJail) {
      if (isDouble) {
        player.inJail = false;
        player.jailTurns = 0;
        this._addLog(`${player.name} rolled doubles and got out of Jail!`, 'jail');
      } else {
        player.jailTurns++;
        if (player.jailTurns >= 3) {
          player.money -= 50;
          player.inJail = false;
          player.jailTurns = 0;
          this._addLog(`${player.name} paid $50 after 3 turns in Jail.`, 'jail');
        } else {
          this._addLog(`${player.name} is still in Jail (turn ${player.jailTurns}/3).`, 'jail');
          this.turnPhase = 'end';
          return this.getState();
        }
      }
    }

    if (isDouble) {
      this._doubleCount++;
      if (this._doubleCount >= 3) {
        this._addLog(`${player.name} rolled 3 doubles — Go to Jail!`, 'jail');
        this._doubleCount = 0;
        this.sendToJail(player);
        this.turnPhase = 'action';
        return this.getState();
      }
    } else {
      this._doubleCount = 0;
    }

    const prevPos = player.position;
    player.position = (player.position + roll) % this.board.length;

    if (player.position < prevPos) {
      player.money += 200;
      this._addLog(`${player.name} passed GO and collected $200!`, 'system');
    }

    const tile = this.board[player.position];

    this.handleTile(player, tile);
    // Only update phase if the player didn't go bankrupt during handleTile.
    // eliminatePlayer() already advances the turn and sets turnPhase = 'roll'.
    if (!player.bankrupt) {
      // Double roll: player takes action first, THEN can roll again (set phase to 'action')
      // Regular roll: player takes action and ends turn
      this.turnPhase = 'action';
    }

    return this.getState();
  }

  handleTile(player, tile) {
    switch (tile.type) {
      case 'go':
        player.money += 200;
        this._addLog(`${player.name} landed on GO and collects $200!`, 'money');
        break;

      case 'tax': {
        const cost = tile.cost || 0;
        player.money -= cost;
        this._addLog(`${player.name} paid $${cost} tax.`, 'money');
        // Vacation cash: add tax to free parking pool
        if (this.rules.vacationCash) {
          this.freeParkingPool += cost;
        }
        break;
      }

      case 'go_to_jail':
        this.sendToJail(player);
        break;

      case 'free_parking':
        // Vacation cash payout
        if (this.rules.vacationCash && this.freeParkingPool > 0) {
          player.money += this.freeParkingPool;
          this._addLog(`${player.name} collected the Free Parking pool of $${this.freeParkingPool}!`, 'money');
          this.freeParkingPool = 0;
        }
        break;

      case 'property':
      case 'railroad':
      case 'utility': {
        const ownerId = this.propertyOwners[tile.id];
        if (!ownerId) {
          // unowned — player can buy it
        } else if (ownerId !== player.id) {
          const owner = this.players.find(p => p.id === ownerId);
          if (owner && !owner.bankrupt) {
            // No rent while owner is in jail
            if (this.rules.noRentInJail && owner.inJail) {
              this._addLog(`${player.name} landed on ${tile.name} — no rent (owner in jail).`, 'info');
              break;
            }
            // No rent on mortgaged property
            if (this.mortgaged[tile.id]) {
              this._addLog(`${player.name} landed on ${tile.name} — no rent (mortgaged).`, 'info');
              break;
            }
            const rent = this._calcRent(tile, player);
            player.money -= rent;
            owner.money += rent;
            this._addLog(`${player.name} paid $${rent} rent to ${owner.name} for ${tile.name}.`, 'money');
          }
        }
        break;
      }

      case 'chance': {
        if (this.chanceCards.length === 0) this.chanceCards = shuffle(CHANCE_CARDS);
        const card = this.chanceCards.shift();
        this.chanceCards.push(card);
        this._addLog(`CHANCE: ${card.text}`, 'card');
        this._applyCard(player, card);
        break;
      }

      case 'chest': {
        if (this.chestCards.length === 0) this.chestCards = shuffle(CHEST_CARDS);
        const card = this.chestCards.shift();
        this.chestCards.push(card);
        this._addLog(`COMMUNITY CHEST: ${card.text}`, 'card');
        this._applyCard(player, card);
        break;
      }

      case 'jail':
      default:
        break;
    }
  }

  _applyCard(player, card) {
    switch (card.action) {
      case 'collect':
        player.money += card.amount;
        break;
      case 'pay': {
        const amount = card.amount || 0;
        player.money -= amount;
        if (this.rules.vacationCash) {
          this.freeParkingPool += amount;
        }
        break;
      }
      case 'advance_to': {
        const dest = card.target;
        if (dest < player.position) {
          player.money += 200;
          this._addLog(`${player.name} passed GO — collects $200!`, 'system');
        }
        player.position = dest;
        this.handleTile(player, this.board[dest]);
        break;
      }
      case 'go_to_jail':
        this.sendToJail(player);
        break;
      case 'move_back': {
        player.position = (player.position - card.amount + this.board.length) % this.board.length;
        this.handleTile(player, this.board[player.position]);
        break;
      }
      case 'nearest_railroad': {
        const railroads = this.board.filter(t => t.type === 'railroad').map(t => t.id);
        let nearest = railroads[0];
        let minDist = this.board.length;
        for (const r of railroads) {
          const dist = (r - player.position + this.board.length) % this.board.length;
          if (dist < minDist) { minDist = dist; nearest = r; }
        }
        if (nearest < player.position && minDist !== 0) {
          player.money += 200;
          this._addLog(`${player.name} passed GO — collects $200!`, 'system');
        }
        player.position = nearest;
        this.handleTile(player, this.board[nearest]);
        break;
      }
      case 'jail_free':
        this._addLog(`${player.name} gets a Get Out of Jail Free card!`, 'card');
        break;
      case 'pay_each': {
        const activePlayers = this.players.filter(p => !p.bankrupt && p.id !== player.id);
        const perPlayer = card.amount || 0;
        const total = perPlayer * activePlayers.length;
        player.money -= total;
        // Note: pay_each is a player-to-player payment, not a bank payment,
        // so it does NOT go to the free parking pool even when vacationCash is on.
        for (const p of activePlayers) p.money += perPlayer;
        this._addLog(`${player.name} paid $${perPlayer} to each player.`, 'money');
        break;
      }
      case 'collect_each': {
        const activePlayers = this.players.filter(p => !p.bankrupt && p.id !== player.id);
        const total = card.amount * activePlayers.length;
        player.money += total;
        for (const p of activePlayers) {
          p.money -= card.amount;
        }
        this._addLog(`${player.name} collected $${card.amount} from each player.`, 'money');
        break;
      }
    }
  }

  _calcRent(tile, player) {
    // Mortgaged → no rent
    if (this.mortgaged[tile.id]) return 0;

    if (tile.type === 'utility') {
      const roll = this.lastRoll ? this.lastRoll[0] + this.lastRoll[1] : 7;
      const utilsOwned = this._countOwnedInGroup(this.propertyOwners[tile.id], tile.type);
      return roll * (utilsOwned >= 2 ? 10 : 4);
    }
    if (tile.type === 'railroad') {
      const count = this._countRailroadsOwned(this.propertyOwners[tile.id]);
      return tile.rent[count - 1] || tile.rent[0];
    }
    const ownerId = this.propertyOwners[tile.id];
    const ownerPlayer = this.players.find(p => p.id === ownerId);
    const houses = ownerPlayer && ownerPlayer.houses ? (ownerPlayer.houses[tile.id] || 0) : 0;
    if (houses === 0) {
      if (this.rules.doubleRentFullSet && this._ownsFullGroup(ownerId, tile.group)) {
        return (tile.rent[0] || 0) * 2;
      }
      return tile.rent[0] || 0;
    }
    return tile.rent[Math.min(houses, tile.rent.length - 1)] || tile.rent[0];
  }

  _ownsFullGroup(ownerId, group) {
    if (group === undefined || group === null) return false;
    const groupTiles = this.board.filter(t => t.group === group && t.type === 'property');
    return groupTiles.length > 0 && groupTiles.every(t => this.propertyOwners[t.id] === ownerId);
  }

  _countOwnedInGroup(ownerId, type) {
    return this.board.filter(t => t.type === type && this.propertyOwners[t.id] === ownerId).length;
  }

  _countRailroadsOwned(ownerId) {
    return this.board.filter(t => t.type === 'railroad' && this.propertyOwners[t.id] === ownerId).length;
  }

  buyProperty(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return this.getState();
    const tile = this.board[player.position];
    if (!['property', 'railroad', 'utility'].includes(tile.type)) return this.getState();
    if (this.propertyOwners[tile.id]) return this.getState();
    if (player.money < tile.price) {
      this._addLog(`${player.name} can't afford ${tile.name} ($${tile.price}).`, 'money');
      return this.getState();
    }
    player.money -= tile.price;
    player.properties.push(tile.id);
    this.propertyOwners[tile.id] = playerId;
    this._addLog(`${player.name} bought ${tile.name} for $${tile.price}.`, 'money');
    return this.getState();
  }

  buildHouse(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return this.getState();
    const tile = this.board[tileId];
    if (!tile || tile.type !== 'property') return this.getState();
    if (this.propertyOwners[tile.id] !== playerId) return this.getState();
    if (!this._ownsFullGroup(playerId, tile.group)) {
      this._addLog(`${player.name} needs to own the full color group to build.`, 'info');
      return this.getState();
    }

    // Cannot build while any tile in group is mortgaged
    const groupTiles = this.board.filter(t => t.group === tile.group && t.type === 'property');
    if (groupTiles.some(t => this.mortgaged[t.id])) {
      this._addLog(`Cannot build while a tile in this group is mortgaged.`, 'info');
      return this.getState();
    }

    if (!player.houses) player.houses = {};
    const current = player.houses[tileId] || 0;
    if (current >= 5) {
      this._addLog(`${tile.name} already has a hotel.`, 'info');
      return this.getState();
    }

    // Even build rule
    if (this.rules.evenBuild) {
      const minHouses = Math.min(...groupTiles.map(t => player.houses[t.id] || 0));
      if (current > minHouses) {
        this._addLog(`${player.name} must build evenly across the group.`, 'info');
        return this.getState();
      }
    }

    const cost = Math.floor(tile.price / 2);
    if (player.money < cost) {
      this._addLog(`${player.name} can't afford to build on ${tile.name} ($${cost}).`, 'money');
      return this.getState();
    }
    player.money -= cost;
    player.houses[tileId] = current + 1;
    const label = player.houses[tileId] === 5 ? 'hotel' : `${player.houses[tileId]} house(s)`;
    this._addLog(`${player.name} built on ${tile.name} (now ${label}).`, 'money');
    return this.getState();
  }

  endTurn(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return this.getState();

    // Check if player rolled doubles (and hasn't rolled 3 doubles in a row)
    const hasDoubles = this._doubleCount > 0;

    if (hasDoubles) {
      // Player rolled doubles: allow them to roll again
      this.turnPhase = 'roll';
      // Keep _doubleCount to track consecutive doubles
      return this.getState();
    }

    // No doubles: advance to next player
    const activePlayers = this.players.filter(p => !p.bankrupt);
    const activeCount = activePlayers.length;
    if (activeCount > 0) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      let safety = 0;
      while (this.players[this.currentPlayerIndex].bankrupt && safety < this.players.length) {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        safety++;
      }
    }
    this.turnPhase = 'roll';
    this._doubleCount = 0;
    return this.getState();
  }

  trade(fromId, toId, offer) {
    const from = this.players.find(p => p.id === fromId);
    const to = this.players.find(p => p.id === toId);
    if (!from || !to) return this.getState();

    const fromMoney = offer.fromMoney || 0;
    const toMoney = offer.toMoney || 0;
    const fromProps = offer.fromProperties || [];
    const toProps = offer.toProperties || [];

    // Validate ownership
    for (const pid of fromProps) {
      if (!from.properties.includes(pid)) return this.getState();
    }
    for (const pid of toProps) {
      if (!to.properties.includes(pid)) return this.getState();
    }
    // Validate balances
    if (fromMoney > from.money || toMoney > to.money) {
      this._addLog(`Trade rejected: insufficient funds.`, 'info');
      return this.getState();
    }

    // Execute trade
    from.money -= fromMoney;
    to.money += fromMoney;
    to.money -= toMoney;
    from.money += toMoney;

    for (const pid of fromProps) {
      from.properties = from.properties.filter(p => p !== pid);
      to.properties.push(pid);
      this.propertyOwners[pid] = toId;
    }
    for (const pid of toProps) {
      to.properties = to.properties.filter(p => p !== pid);
      from.properties.push(pid);
      this.propertyOwners[pid] = fromId;
    }

    this._addLog(`${from.name} and ${to.name} completed a trade.`, 'system');
    return this.getState();
  }

  payJail(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.inJail) return this.getState();
    if (player.money < 50) {
      this._addLog(`${player.name} can't afford the $50 jail fee.`, 'jail');
      return this.getState();
    }
    player.money -= 50;
    player.inJail = false;
    player.jailTurns = 0;
    this._addLog(`${player.name} paid $50 to get out of Jail.`, 'jail');
    return this.getState();
  }

  sendToJail(player) {
    // BUG FIX 3: Use the actual jail tile position from BOARD
    player.position = JAIL_TILE_ID;
    player.inJail = true;
    player.jailTurns = 0;
    this._addLog(`${player.name} was sent to Jail!`, 'jail');
  }

  // ── MORTGAGE ────────────────────────────────────────────────────
  mortgageProperty(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return this.getState();
    const tile = this.board[tileId];
    if (!tile || !['property', 'railroad', 'utility'].includes(tile.type)) return this.getState();
    if (this.propertyOwners[tileId] !== playerId) return this.getState();
    if (this.mortgaged[tileId]) return this.getState();
    // Cannot mortgage if houses are built on this tile
    if (player.houses && (player.houses[tileId] || 0) > 0) {
      this._addLog(`${player.name}: sell houses on ${tile.name} before mortgaging.`, 'info');
      return this.getState();
    }
    const value = Math.floor(tile.price / 2);
    this.mortgaged[tileId] = true;
    player.money += value;
    this._addLog(`${player.name} mortgaged ${tile.name} for $${value}.`, 'money');
    return this.getState();
  }

  unmortgageProperty(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return this.getState();
    const tile = this.board[tileId];
    if (!tile) return this.getState();
    if (this.propertyOwners[tileId] !== playerId) return this.getState();
    if (!this.mortgaged[tileId]) return this.getState();
    const cost = tile.price;
    if (player.money < cost) {
      this._addLog(`${player.name} can't afford to unmortgage ${tile.name} ($${cost}).`, 'money');
      return this.getState();
    }
    player.money -= cost;
    this.mortgaged[tileId] = false;
    this._addLog(`${player.name} unmortgaged ${tile.name} for $${cost}.`, 'money');
    return this.getState();
  }

  // ── AUCTION ─────────────────────────────────────────────────────
  startAuction(tile) {
    this.auctionState = {
      tileId:    tile.id,
      tileName:  tile.name,
      tilePrice: tile.price,
      bids:      {},
      passes:    []
    };
    this.turnPhase = 'auction';
    // Auto-pass players who can't afford initial bid
    this._autoPassInsolventBidders();
    return {
      tileId:    tile.id,
      tileName:  tile.name,
      tilePrice: tile.price,
      minBid:    1
    };
  }

  placeBid(playerId, tileId, amount) {
    if (!this.auctionState || this.auctionState.tileId !== tileId) return this.getState();
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.bankrupt) return this.getState();

    // Find current highest bid
    let currentHighest = 0;
    for (const [pid, bid] of Object.entries(this.auctionState.bids)) {
      if (bid > currentHighest) currentHighest = bid;
    }

    // The new bid must be higher than current highest bid
    if (typeof amount !== 'number' || amount <= currentHighest || amount > player.money) {
      return this.getState();
    }

    this.auctionState.bids[playerId] = amount;
    // Remove from passes if they changed their mind
    this.auctionState.passes = this.auctionState.passes.filter(id => id !== playerId);

    // After a new bid, auto-pass players who can't afford to outbid
    this._autoPassInsolventBidders();
    this._checkAuctionEnd();
    return this.getState();
  }

  passBid(playerId, tileId) {
    if (!this.auctionState || this.auctionState.tileId !== tileId) return this.getState();
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.bankrupt) return this.getState();
    if (!this.auctionState.passes.includes(playerId)) {
      this.auctionState.passes.push(playerId);
    }
    this._checkAuctionEnd();
    return this.getState();
  }

  // Auto-pass players who can't afford minimum increment above current bid
  _autoPassInsolventBidders() {
    if (!this.auctionState) return;

    // Find current highest bid
    let currentHighest = 0;
    for (const [pid, bid] of Object.entries(this.auctionState.bids)) {
      if (bid > currentHighest) currentHighest = bid;
    }

    // Minimum next bid is currentHighest + 1 (or +$2 based on UI)
    const minNextBid = currentHighest + 2;

    const activePlayers = this.players.filter(p => !p.bankrupt);
    for (const player of activePlayers) {
      // Skip if already passed or is highest bidder
      if (this.auctionState.passes.includes(player.id)) continue;
      const isHighestBidder = this.auctionState.bids[player.id] === currentHighest;
      if (isHighestBidder) continue;

      // Auto-pass if can't afford minimum next bid
      if (player.money < minNextBid) {
        if (!this.auctionState.passes.includes(player.id)) {
          this.auctionState.passes.push(player.id);
          this._addLog(`${player.name} automatically passed (insufficient funds).`, 'system');
        }
      }
    }
  }

  _checkAuctionEnd() {
    if (!this.auctionState) return null;
    const activePlayers = this.players.filter(p => !p.bankrupt);

    // Find current highest bidder
    let highestBidderId = null;
    let highestBid = 0;
    for (const [pid, amount] of Object.entries(this.auctionState.bids)) {
      if (amount > highestBid) {
        highestBid = amount;
        highestBidderId = pid;
      }
    }

    // Check if all players except the highest bidder have passed
    const otherPlayers = activePlayers.filter(p => p.id !== highestBidderId);
    const allOthersPassed = otherPlayers.every(p => this.auctionState.passes.includes(p.id));

    // Auction ends when all players except highest bidder have passed
    if (!allOthersPassed) return null;

    // Find highest bidder (recalculate to be safe)
    let winnerId = null;
    let winAmount = 0;
    for (const [pid, amount] of Object.entries(this.auctionState.bids)) {
      if (amount > winAmount) {
        winAmount = amount;
        winnerId = pid;
      }
    }

    const result = { tileId: this.auctionState.tileId, tileName: this.auctionState.tileName };
    if (winnerId) {
      const winner = this.players.find(p => p.id === winnerId);
      if (winner && winner.money >= winAmount) {
        winner.money -= winAmount;
        winner.properties.push(this.auctionState.tileId);
        this.propertyOwners[this.auctionState.tileId] = winnerId;
        this._addLog(`${winner.name} won the auction for ${this.auctionState.tileName} with a bid of $${winAmount}!`, 'money');
        result.winner = { id: winnerId, name: winner.name, amount: winAmount };
      }
    } else {
      this._addLog(`No bids placed — ${this.auctionState.tileName} remains unowned.`, 'system');
      result.winner = null;
    }

    this.auctionState = null;
    this.turnPhase = 'action';
    return result;
  }

  skipBuy(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return { state: this.getState(), auctionInfo: null };
    if (this.rules.auction) {
      const tile = this.board[player.position];
      if (tile && ['property', 'railroad', 'utility'].includes(tile.type) && !this.propertyOwners[tile.id]) {
        const auctionInfo = this.startAuction(tile);
        return { state: this.getState(), auctionInfo };
      }
    }
    this.turnPhase = 'end';
    return { state: this.getState(), auctionInfo: null };
  }

  // ── VOTEKICK ────────────────────────────────────────────────────
  voteKick(voterId, targetId) {
    if (!this.kickVotes[targetId]) this.kickVotes[targetId] = [];
    if (!this.kickVotes[targetId].includes(voterId)) {
      this.kickVotes[targetId].push(voterId);
    }
    const activePlayers = this.players.filter(p => !p.bankrupt && p.id !== targetId);
    const voteCount = this.kickVotes[targetId].length;
    if (voteCount >= activePlayers.length && activePlayers.length > 0) {
      const playerName = this.removePlayerFromGame(targetId);
      return { kicked: true, playerName };
    }
    return { kicked: false };
  }

  undoVoteKick(voterId, targetId) {
    this.kickVotes[targetId] = (this.kickVotes[targetId] || []).filter(id => id !== voterId);
  }

  removePlayerFromGame(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.bankrupt) return null;
    const name = player.name;
    player.bankrupt = true;
    this._addLog(`${name} was removed from the game.`, 'system');

    // Return all their properties to bank
    for (const pid of player.properties) {
      delete this.propertyOwners[pid];
      delete this.mortgaged[pid];
    }
    player.properties = [];
    player.houses = {};

    // Clear their kick votes
    delete this.kickVotes[playerId];

    // Check for winner
    const active = this.players.filter(p => !p.bankrupt);
    if (active.length === 1) {
      this.winner = active[0];
      this._addLog(`${active[0].name} wins the game!`, 'winner');
    } else if (active.length === 0) {
      this._addLog('All players are eliminated — no winner declared.', 'system');
    } else {
      // If it was their turn, advance
      if (this.players[this.currentPlayerIndex] && this.players[this.currentPlayerIndex].id === playerId) {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        let safety = 0;
        while (this.players[this.currentPlayerIndex].bankrupt && safety < this.players.length) {
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
          safety++;
        }
        this.turnPhase = 'roll';
      }
    }
    return name;
  }

  eliminatePlayer(player) {
    // BUG FIX 1: Guard against re-entry
    if (player.bankrupt) return;

    player.bankrupt = true;
    this._addLog(`${player.name} went bankrupt and is eliminated!`, 'system');

    for (const pid of player.properties) {
      delete this.propertyOwners[pid];
      delete this.mortgaged[pid];
    }
    player.properties = [];
    player.houses = {};

    const active = this.players.filter(p => !p.bankrupt);
    if (active.length === 1) {
      this.winner = active[0];
      this._addLog(`${active[0].name} wins the game!`, 'winner');
    } else if (active.length === 0) {
      this._addLog('All players are bankrupt — no winner declared.', 'system');
    } else {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      let safety = 0;
      while (this.players[this.currentPlayerIndex].bankrupt && safety < this.players.length) {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        safety++;
      }
      this.turnPhase = 'roll';
    }
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex] || null;
  }

  _addLog(msg, type = 'info') {
    this.log.push({ text: msg, type, ts: Date.now() });
    if (this.log.length > 100) this.log.shift();
  }

  getState() {
    return {
      id: this.id,
      hostId: this.hostId,
      started: this.started,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        money: p.money,
        position: p.position,
        properties: p.properties.slice(),
        houses: Object.assign({}, p.houses),
        inJail: p.inJail,
        jailTurns: p.jailTurns,
        bankrupt: p.bankrupt,
        color: p.color
      })),
      propertyOwners: Object.assign({}, this.propertyOwners),
      currentPlayerId: this.getCurrentPlayer() ? this.getCurrentPlayer().id : null,
      turnPhase: this.turnPhase,
      lastRoll: this.lastRoll ? this.lastRoll.slice() : null,
      log: this.log.slice(-20),
      winner: this.winner ? { id: this.winner.id, name: this.winner.name } : null,
      board: this.board || BOARD,
      rules: Object.assign({}, this.rules),
      freeParkingPool: this.freeParkingPool,
      mortgaged: Object.assign({}, this.mortgaged),
      auctionState: this.auctionState ? {
        tileId:    this.auctionState.tileId,
        tileName:  this.auctionState.tileName,
        tilePrice: this.auctionState.tilePrice,
        bids:      Object.assign({}, this.auctionState.bids),
        passes:    this.auctionState.passes.slice()
      } : null,
      kickVotes: Object.fromEntries(
        Object.entries(this.kickVotes).map(([k, v]) => [k, v.slice()])
      )
    };
  }
}

module.exports = { GameRoom, PLAYER_COLORS };
