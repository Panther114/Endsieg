'use strict';

// Tile names and prices can be customized in client/boardConfig.json
// without modifying this file.

// 40-tile board on a 12-column x 12-row square grid.
// Clockwise traversal starting from top-left corner:
// Top row    (row  1): ids  0-10,  col 1->12 (11 tiles)
// Right col  (col 12): ids 11-19, row 2->10 (9 tiles)
// Bottom row (row 12): ids 20-30, col 12->1 (11 tiles)
// Left col   (col  1): ids 31-39, row 11->2 (9 tiles)
// Corners: id 0 = GO (top-left), id 10 = Go To Jail (top-right),
//          id 20 = Jail (bottom-right), id 30 = Free Parking (bottom-left)
const BOARD = [
  // -- TOP ROW (col 1 -> col 12): 11 tiles (ids 0-10) --
  { id: 0,  type: 'go',           name: 'GO',           reward: 200 },
  { id: 1,  type: 'property',     name: 'Tobruk',       price: 60,  rent: [2,10,30,90,160,250],         color: 'brown',    group: 0 },
  { id: 2,  type: 'chest',        name: 'Intel' },
  { id: 3,  type: 'property',     name: 'El Alamein',   price: 60,  rent: [4,20,60,180,320,450],        color: 'brown',    group: 0 },
  { id: 4,  type: 'tax',          name: 'War Tax',      cost: 200 },
  { id: 5,  type: 'railroad',     name: 'Luftwaffe',    price: 200, rent: [25,50,100,200] },
  { id: 6,  type: 'property',     name: 'Tunis',        price: 100, rent: [6,30,90,270,400,550],        color: 'cyan',     group: 1 },
  { id: 7,  type: 'property',     name: 'Casablanca',   price: 100, rent: [6,30,90,270,400,550],        color: 'cyan',     group: 1 },
  { id: 8,  type: 'chance',       name: 'Chance' },
  { id: 9,  type: 'property',     name: 'Algiers',      price: 120, rent: [8,40,100,300,450,600],       color: 'cyan',     group: 1 },
  { id: 10, type: 'go_to_jail',   name: 'Go To Jail' },
  // -- RIGHT COLUMN (row 2 -> row 10): 9 tiles (ids 11-19) --
  { id: 11, type: 'property',     name: 'Budapest',     price: 180, rent: [14,70,200,550,750,950],      color: 'orange',   group: 2 },
  { id: 12, type: 'property',     name: 'Warsaw',       price: 180, rent: [14,70,200,550,750,950],      color: 'orange',   group: 2 },
  { id: 13, type: 'chance',       name: 'Chance' },
  { id: 14, type: 'property',     name: 'Minsk',        price: 200, rent: [16,80,220,600,800,1000],     color: 'orange',   group: 2 },
  { id: 15, type: 'property',     name: 'Kyiv',         price: 200, rent: [16,80,220,600,800,1000],     color: 'orange',   group: 2 },
  { id: 16, type: 'railroad',     name: 'Regia Air',    price: 200, rent: [25,50,100,200] },
  { id: 17, type: 'chest',        name: 'Intel' },
  { id: 18, type: 'property',     name: 'Kharkov',      price: 220, rent: [18,90,250,700,875,1050],     color: 'red',      group: 3 },
  { id: 19, type: 'utility',      name: 'Espionage',    price: 150 },
  // -- BOTTOM ROW (col 12 -> col 1): 11 tiles (ids 20-30) --
  { id: 20, type: 'jail',         name: 'Jail' },
  { id: 21, type: 'property',     name: 'Kursk',        price: 220, rent: [18,90,250,700,875,1050],     color: 'red',      group: 3 },
  { id: 22, type: 'railroad',     name: 'VVS',          price: 200, rent: [25,50,100,200] },
  { id: 23, type: 'property',     name: 'Voronezh',     price: 240, rent: [20,100,300,750,925,1100],    color: 'red',      group: 3 },
  { id: 24, type: 'chance',       name: 'Chance' },
  { id: 25, type: 'property',     name: 'Rostov',       price: 260, rent: [22,110,330,800,975,1150],    color: 'yellow',   group: 4 },
  { id: 26, type: 'property',     name: 'Odessa',       price: 260, rent: [22,110,330,800,975,1150],    color: 'yellow',   group: 4 },
  { id: 27, type: 'chest',        name: 'Intel' },
  { id: 28, type: 'property',     name: 'Leningrad',    price: 280, rent: [24,120,360,850,1025,1200],   color: 'yellow',   group: 4 },
  { id: 29, type: 'tax',          name: 'Lux.Tax',      cost: 100 },
  { id: 30, type: 'free_parking', name: 'Free Park' },
  // -- LEFT COLUMN (row 11 -> row 2): 9 tiles (ids 31-39) --
  { id: 31, type: 'property',     name: 'Crete',        price: 140, rent: [10,50,150,450,625,750],      color: 'pink',     group: 5 },
  { id: 32, type: 'property',     name: 'Athens',       price: 140, rent: [10,50,150,450,625,750],      color: 'pink',     group: 5 },
  { id: 33, type: 'property',     name: 'Belgrade',     price: 160, rent: [12,60,180,500,700,900],      color: 'pink',     group: 5 },
  { id: 34, type: 'railroad',     name: 'RAF',          price: 200, rent: [25,50,100,200] },
  { id: 35, type: 'property',     name: 'Arnhem',       price: 300, rent: [26,130,390,900,1100,1275],   color: 'green',    group: 6 },
  { id: 36, type: 'property',     name: 'Caen',         price: 300, rent: [26,130,390,900,1100,1275],   color: 'green',    group: 6 },
  { id: 37, type: 'property',     name: 'Normandy',     price: 320, rent: [28,150,450,1000,1200,1400],  color: 'green',    group: 6 },
  { id: 38, type: 'property',     name: 'Bastogne',     price: 350, rent: [35,175,500,1100,1300,1500],  color: 'darkblue', group: 7 },
  { id: 39, type: 'property',     name: 'Berlin',       price: 400, rent: [50,200,600,1400,1700,2000],  color: 'darkblue', group: 7 },
];

// Load optional board config overrides from client/boardConfig.json
const fs   = require('fs');
const path = require('path');

let boardConfig = { tiles: [] };
try {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'client', 'boardConfig.json'), 'utf8');
  boardConfig = JSON.parse(raw);
} catch (err) {
  if (err.code !== 'ENOENT') {
    // File exists but could not be read or parsed — log a warning
    console.warn('[boardData] Could not load boardConfig.json:', err.message);
  }
  /* file not found — use defaults */
}

const configMap = {};
(boardConfig.tiles || []).forEach(t => { configMap[t.id] = t; });

// Tile types that can be purchased and have price/rent fields
const PURCHASABLE_TYPES = ['property', 'railroad', 'utility'];

function applyConfig(board, config) {
  const configMap = {};
  (config.tiles || []).forEach(t => { configMap[t.id] = t; });

  board.forEach(tile => {
    const cfg = configMap[tile.id];
    if (cfg) {
      const origType = tile.type;
      if (cfg.name   !== undefined) tile.name   = cfg.name;
      if (cfg.price  !== undefined) tile.price  = cfg.price;
      if (cfg.type   !== undefined) tile.type   = cfg.type;
      if (cfg.color  !== undefined) tile.color  = cfg.color;
      if (cfg.group  !== undefined) tile.group  = cfg.group;
      if (cfg.rent   !== undefined) tile.rent   = cfg.rent;
      if (cfg.cost   !== undefined) tile.cost   = cfg.cost;
      if (cfg.reward !== undefined) tile.reward = cfg.reward;

      // When the type changes, clear fields that belong exclusively to the
      // original type and were not explicitly re-specified in the config.
      if (cfg.type !== undefined && cfg.type !== origType) {
        if (!PURCHASABLE_TYPES.includes(tile.type)) {
          if (cfg.price  === undefined) delete tile.price;
          if (cfg.color  === undefined) delete tile.color;
          if (cfg.group  === undefined) delete tile.group;
          if (cfg.rent   === undefined) delete tile.rent;
        }
        if (tile.type !== 'tax' && cfg.cost === undefined) {
          delete tile.cost;
        }
        if (tile.type !== 'go' && cfg.reward === undefined) {
          delete tile.reward;
        }
      }
    }
  });
}

// Apply default config
applyConfig(BOARD, boardConfig);

// Export function to create board with custom config
function getBoardWithCustomConfig(customConfig) {
  // Deep clone the default board
  const board = JSON.parse(JSON.stringify(BOARD));
  if (customConfig && customConfig.tiles) {
    applyConfig(board, customConfig);
  }
  return board;
}

module.exports = BOARD;
module.exports.getBoardWithCustomConfig = getBoardWithCustomConfig;
