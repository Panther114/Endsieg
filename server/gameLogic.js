'use strict';

const BOARD = require('./boardData');

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e91e63', '#ffd700'];

const CHANCE_CARDS = [
  { text: 'Advance to GO. Collect $200.', action: 'advance_to', target: 0 },
  { text: 'Go to Jail. Go directly to Jail.', action: 'go_to_jail' },
  { text: 'Bank pays you dividend of $50.', action: 'collect', amount: 50 },
  { text: 'Pay poor tax of $15.', action: 'pay', amount: 15 },
  { text: 'Go back 3 spaces.', action: 'move_back', amount: 3 },
  { text: 'Advance to nearest Railroad.', action: 'nearest_railroad' },
  { text: 'Get Out of Jail Free.', action: 'jail_free' },
  { text: 'Pay each player $50.', action: 'pay_each', amount: 50 }
];

const CHEST_CARDS = [
  { text: 'Bank error in your favor. Collect $200.', action: 'collect', amount: 200 },
  { text: "Doctor's fee. Pay $50.", action: 'pay', amount: 50 },
  { text: 'Pay school tax of $150.', action: 'pay', amount: 150 },
  { text: 'Receive holiday fund maturity. Collect $100.', action: 'collect', amount: 100 },
  { text: 'Go to Jail.', action: 'go_to_jail' },
  { text: 'Collect $10 from every player.', action: 'collect_each', amount: 10 },
  { text: 'Income tax refund. Collect $20.', action: 'collect', amount: 20 },
  { text: 'Life insurance matures. Collect $100.', action: 'collect', amount: 100 }
];

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
    // Default to next available palette color if none provided
    const resolvedColor = (color && /^#[0-9a-fA-F]{6}$/.test(color))
      ? color
      : PLAYER_COLORS[this.players.length % PLAYER_COLORS.length];
    this.players.push(this._makePlayer(id, name, resolvedColor));
    return true;
  }

  start(funds) {
    this.started = true;
    this.currentPlayerIndex = 0;
    this.turnPhase = 'roll';
    this.chanceCards = shuffle(CHANCE_CARDS);
    this.chestCards = shuffle(CHEST_CARDS);
    if (typeof funds === 'number' && funds >= 500 && funds <= 10000) {
      for (const p of this.players) p.money = funds;
    }
    this._addLog('Game started! ' + this.players.map(p => p.name).join(', ') + ' are playing.');
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
        this._addLog(`${player.name} rolled doubles and got out of Jail!`);
      } else {
        player.jailTurns++;
        if (player.jailTurns >= 3) {
          player.money -= 50;
          player.inJail = false;
          player.jailTurns = 0;
          this._addLog(`${player.name} paid $50 after 3 turns in Jail.`);
        } else {
          this._addLog(`${player.name} rolled ${d1}+${d2} — still in Jail (turn ${player.jailTurns}/3).`);
          this.turnPhase = 'end';
          return this.getState();
        }
      }
    }

    if (isDouble) {
      this._doubleCount++;
      if (this._doubleCount >= 3) {
        this._addLog(`${player.name} rolled 3 doubles — Go to Jail!`);
        this._doubleCount = 0;
        this.sendToJail(player);
        this.turnPhase = 'action';
        return this.getState();
      }
    } else {
      this._doubleCount = 0;
    }

    const prevPos = player.position;
    player.position = (player.position + roll) % 40;

    // Check passed GO (new position is less than old means we wrapped around)
    if (player.position < prevPos) {
      player.money += 200;
      this._addLog(`${player.name} passed GO and collected $200!`);
    }

    const tile = BOARD[player.position];
    this._addLog(`${player.name} rolled ${d1}+${d2}=${roll} → landed on ${tile.name}`);

    this.handleTile(player, tile);
    this.turnPhase = isDouble ? 'roll' : 'action';

    return this.getState();
  }

  handleTile(player, tile) {
    switch (tile.type) {
      case 'go':
        player.money += 200;
        this._addLog(`${player.name} landed on GO and collects $200!`);
        break;

      case 'tax':
        player.money -= tile.cost;
        this._addLog(`${player.name} paid $${tile.cost} tax.`);
        if (player.money < 0 && !player.bankrupt) {
          this.eliminatePlayer(player);
        }
        break;

      case 'go_to_jail':
        this.sendToJail(player);
        break;

      case 'property':
      case 'railroad':
      case 'utility': {
        const ownerId = this.propertyOwners[tile.id];
        if (!ownerId) {
          // unowned — player can buy it
          this._addLog(`${tile.name} is for sale at $${tile.price}.`);
        } else if (ownerId !== player.id) {
          const owner = this.players.find(p => p.id === ownerId);
          if (owner && !owner.bankrupt) {
            const rent = this._calcRent(tile, player);
            player.money -= rent;
            owner.money += rent;
            this._addLog(`${player.name} paid $${rent} rent to ${owner.name} for ${tile.name}.`);
            if (player.money < 0 && !player.bankrupt) {
              this.eliminatePlayer(player);
            }
          }
        }
        break;
      }

      case 'chance': {
        if (this.chanceCards.length === 0) this.chanceCards = shuffle(CHANCE_CARDS);
        const card = this.chanceCards.shift();
        this.chanceCards.push(card);
        this._addLog(`CHANCE: ${card.text}`);
        this._applyCard(player, card);
        break;
      }

      case 'chest': {
        if (this.chestCards.length === 0) this.chestCards = shuffle(CHEST_CARDS);
        const card = this.chestCards.shift();
        this.chestCards.push(card);
        this._addLog(`COMMUNITY CHEST: ${card.text}`);
        this._applyCard(player, card);
        break;
      }

      case 'jail':
      case 'free_parking':
      default:
        break;
    }
  }

  _applyCard(player, card) {
    switch (card.action) {
      case 'collect':
        player.money += card.amount;
        break;
      case 'pay':
        player.money -= card.amount;
        break;
      case 'advance_to': {
        const dest = card.target;
        if (dest < player.position) {
          player.money += 200;
          this._addLog(`${player.name} passed GO — collects $200!`);
        }
        player.position = dest;
        this.handleTile(player, BOARD[dest]);
        break;
      }
      case 'go_to_jail':
        this.sendToJail(player);
        break;
      case 'move_back': {
        player.position = (player.position - card.amount + 40) % 40;
        this.handleTile(player, BOARD[player.position]);
        break;
      }
      case 'nearest_railroad': {
        const railroads = [5, 15, 25, 35];
        let nearest = railroads[0];
        let minDist = 40;
        for (const r of railroads) {
          const dist = (r - player.position + 40) % 40;
          if (dist < minDist) { minDist = dist; nearest = r; }
        }
        if (nearest < player.position) {
          player.money += 200;
          this._addLog(`${player.name} passed GO — collects $200!`);
        }
        player.position = nearest;
        this.handleTile(player, BOARD[nearest]);
        break;
      }
      case 'jail_free':
        this._addLog(`${player.name} gets a Get Out of Jail Free card!`);
        break;
      case 'pay_each': {
        const activePlayers = this.players.filter(p => !p.bankrupt && p.id !== player.id);
        const total = card.amount * activePlayers.length;
        player.money -= total;
        for (const p of activePlayers) p.money += card.amount;
        this._addLog(`${player.name} paid $${card.amount} to each player.`);
        break;
      }
      case 'collect_each': {
        const activePlayers = this.players.filter(p => !p.bankrupt && p.id !== player.id);
        const total = card.amount * activePlayers.length;
        player.money += total;
        for (const p of activePlayers) p.money -= card.amount;
        this._addLog(`${player.name} collected $${card.amount} from each player.`);
        break;
      }
    }
  }

  _calcRent(tile, player) {
    if (tile.type === 'utility') {
      const roll = this.lastRoll ? this.lastRoll[0] + this.lastRoll[1] : 7;
      const utilsOwned = this._countOwnedInGroup(this.propertyOwners[tile.id], tile.type);
      return roll * (utilsOwned >= 2 ? 10 : 4);
    }
    if (tile.type === 'railroad') {
      const count = this._countRailroadsOwned(this.propertyOwners[tile.id]);
      return tile.rent[count - 1] || tile.rent[0];
    }
    // Houses are tracked on the owner's player object, not the landing player
    const ownerId = this.propertyOwners[tile.id];
    const ownerPlayer = this.players.find(p => p.id === ownerId);
    const houses = ownerPlayer && ownerPlayer.houses ? (ownerPlayer.houses[tile.id] || 0) : 0;
    // rent[0]=base, rent[1..4]=1-4 houses, rent[5]=hotel
    if (houses === 0) {
      // Double base rent if owner has full color group and no houses
      if (this._ownsFullGroup(ownerId, tile.group)) {
        return (tile.rent[0] || 0) * 2;
      }
      return tile.rent[0] || 0;
    }
    return tile.rent[Math.min(houses, tile.rent.length - 1)] || tile.rent[0];
  }

  _ownsFullGroup(ownerId, group) {
    if (group === undefined || group === null) return false;
    const groupTiles = BOARD.filter(t => t.group === group && t.type === 'property');
    return groupTiles.length > 0 && groupTiles.every(t => this.propertyOwners[t.id] === ownerId);
  }

  _countOwnedInGroup(ownerId, type) {
    return BOARD.filter(t => t.type === type && this.propertyOwners[t.id] === ownerId).length;
  }

  _countRailroadsOwned(ownerId) {
    return BOARD.filter(t => t.type === 'railroad' && this.propertyOwners[t.id] === ownerId).length;
  }

  _hasMonopoly(ownerId, group) {
    if (group === undefined || group === null) return false;
    const groupTiles = BOARD.filter(t => t.group === group && t.type === 'property');
    return groupTiles.length > 0 && groupTiles.every(t => this.propertyOwners[t.id] === ownerId);
  }

  buyProperty(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return this.getState();
    const tile = BOARD[player.position];
    if (!['property', 'railroad', 'utility'].includes(tile.type)) return this.getState();
    if (this.propertyOwners[tile.id]) return this.getState();
    if (player.money < tile.price) {
      this._addLog(`${player.name} can't afford ${tile.name} ($${tile.price}).`);
      return this.getState();
    }
    player.money -= tile.price;
    player.properties.push(tile.id);
    this.propertyOwners[tile.id] = playerId;
    this._addLog(`${player.name} bought ${tile.name} for $${tile.price}.`);
    return this.getState();
  }

  buildHouse(playerId, tileId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return this.getState();
    const tile = BOARD[tileId];
    if (!tile || tile.type !== 'property') return this.getState();
    if (this.propertyOwners[tile.id] !== playerId) return this.getState();
    if (!this._ownsFullGroup(playerId, tile.group)) {
      this._addLog(`${player.name} needs to own the full color group to build.`);
      return this.getState();
    }
    if (!player.houses) player.houses = {};
    const current = player.houses[tileId] || 0;
    if (current >= 5) {
      this._addLog(`${tile.name} already has a hotel.`);
      return this.getState();
    }
    // Enforce even building: can't build on this tile if another tile in the group has fewer houses
    const groupTiles = BOARD.filter(t => t.group === tile.group && t.type === 'property');
    const minHouses = Math.min(...groupTiles.map(t => player.houses[t.id] || 0));
    if (current > minHouses) {
      this._addLog(`${player.name} must build evenly across the group.`);
      return this.getState();
    }
    const cost = Math.floor(tile.price / 2);
    if (player.money < cost) {
      this._addLog(`${player.name} can't afford to build on ${tile.name} ($${cost}).`);
      return this.getState();
    }
    player.money -= cost;
    player.houses[tileId] = current + 1;
    const label = player.houses[tileId] === 5 ? 'hotel' : `${player.houses[tileId]} house(s)`;
    this._addLog(`${player.name} built on ${tile.name} (now ${label}).`);
    return this.getState();
  }

  endTurn(playerId) {
    const player = this.getCurrentPlayer();
    if (!player || player.id !== playerId) return this.getState();
    if (player.money < 0) {
      this.eliminatePlayer(player);
    } else {
      const activePlayers = this.players.filter(p => !p.bankrupt);
      const activeCount = activePlayers.length;
      if (activeCount > 0) {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        // Skip bankrupt players
        let safety = 0;
        while (this.players[this.currentPlayerIndex].bankrupt && safety < this.players.length) {
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
          safety++;
        }
      }
      this.turnPhase = 'roll';
      this._doubleCount = 0;
    }
    return this.getState();
  }

  trade(fromId, toId, offer) {
    const from = this.players.find(p => p.id === fromId);
    const to = this.players.find(p => p.id === toId);
    if (!from || !to) return this.getState();

    // offer = { fromMoney, fromProperties, toMoney, toProperties }
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
    if (from.money < fromMoney || to.money < toMoney) return this.getState();

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

    this._addLog(`${from.name} and ${to.name} completed a trade.`);
    return this.getState();
  }

  payJail(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || !player.inJail) return this.getState();
    if (player.money < 50) {
      this._addLog(`${player.name} can't afford the $50 jail fee.`);
      return this.getState();
    }
    player.money -= 50;
    player.inJail = false;
    player.jailTurns = 0;
    this._addLog(`${player.name} paid $50 to get out of Jail.`);
    return this.getState();
  }

  sendToJail(player) {
    player.position = 10;
    player.inJail = true;
    player.jailTurns = 0;
    this._addLog(`${player.name} was sent to Jail!`);
  }

  eliminatePlayer(player) {
    player.bankrupt = true;
    this._addLog(`${player.name} went bankrupt and is eliminated!`);

    // Return properties to bank
    for (const pid of player.properties) {
      delete this.propertyOwners[pid];
    }
    player.properties = [];
    player.houses = {};

    const active = this.players.filter(p => !p.bankrupt);
    if (active.length === 1) {
      this.winner = active[0];
      this._addLog(`${active[0].name} wins the game!`);
    } else if (active.length === 0) {
      // Shouldn't normally happen; no winner declared
      this._addLog('All players are bankrupt — no winner declared.');
    } else {
      // Advance to next active player
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

  _addLog(msg) {
    this.log.push(msg);
    if (this.log.length > 50) this.log.shift();
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
      board: BOARD
    };
  }
}

module.exports = { GameRoom, PLAYER_COLORS };
