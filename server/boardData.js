'use strict';

// Tile names and prices can be customized in client/boardConfig.json
// without modifying this file.

// 44-tile board on a 14-column x 10-row rectangular grid.
// Clockwise traversal starting from top-left corner:
// Top row   (row  1): ids  0-13,  col 1->14
// Right col (col 14): ids 14-21,  row 2->9
// Bottom row (row 10): ids 22-35,  col 14->1
// Left col  (col  1): ids 36-43,  row 9->2
// Corners: id 0 = GO (top-left), id 13 = Go To Jail (top-right),
//          id 22 = Jail (bottom-right), id 35 = Free Parking (bottom-left)
const BOARD = [
  // -- TOP ROW (col 1 -> col 14) --
  { id: 0,  type: 'go',           name: 'GO',           reward: 200 },
  { id: 1,  type: 'property',     name: 'Tobruk',       price: 60,  rent: [2,10,30,90,160,250],         color: 'brown',    group: 0 },
  { id: 2,  type: 'chest',        name: 'Intel' },
  { id: 3,  type: 'property',     name: 'El Alamein',   price: 60,  rent: [4,20,60,180,320,450],        color: 'brown',    group: 0 },
  { id: 4,  type: 'tax',          name: 'War Tax',      cost: 200 },
  { id: 5,  type: 'property',     name: 'Dunkirk',      price: 80,  rent: [6,30,90,270,400,550],        color: 'brown',    group: 0 },
  { id: 6,  type: 'railroad',     name: 'Luftwaffe',    price: 200, rent: [25,50,100,200] },
  { id: 7,  type: 'property',     name: 'Tunis',        price: 100, rent: [6,30,90,270,400,550],        color: 'cyan',     group: 1 },
  { id: 8,  type: 'property',     name: 'Casablanca',   price: 100, rent: [6,30,90,270,400,550],        color: 'cyan',     group: 1 },
  { id: 9,  type: 'chance',       name: 'Chance' },
  { id: 10, type: 'property',     name: 'Algiers',      price: 120, rent: [8,40,100,300,450,600],       color: 'cyan',     group: 1 },
  { id: 11, type: 'utility',      name: 'F.Radio',      price: 150 },
  { id: 12, type: 'chest',        name: 'Intel' },
  { id: 13, type: 'go_to_jail',   name: 'Go To Jail' },
  // -- RIGHT COLUMN (row 2 -> row 9) --
  { id: 14, type: 'property',     name: 'Budapest',     price: 180, rent: [14,70,200,550,750,950],      color: 'orange',   group: 3 },
  { id: 15, type: 'property',     name: 'Warsaw',       price: 180, rent: [14,70,200,550,750,950],      color: 'orange',   group: 3 },
  { id: 16, type: 'chance',       name: 'Chance' },
  { id: 17, type: 'property',     name: 'Minsk',        price: 200, rent: [16,80,220,600,800,1000],     color: 'orange',   group: 3 },
  { id: 18, type: 'property',     name: 'Kyiv',         price: 200, rent: [16,80,220,600,800,1000],     color: 'orange',   group: 3 },
  { id: 19, type: 'railroad',     name: 'Regia Air',    price: 200, rent: [25,50,100,200] },
  { id: 20, type: 'chest',        name: 'Intel' },
  { id: 21, type: 'utility',      name: 'Espionage',    price: 150 },
  // -- BOTTOM ROW (col 14 -> col 1) --
  { id: 22, type: 'jail',         name: 'Jail' },
  { id: 23, type: 'property',     name: 'Kharkov',      price: 220, rent: [18,90,250,700,875,1050],     color: 'red',      group: 4 },
  { id: 24, type: 'property',     name: 'Kursk',        price: 220, rent: [18,90,250,700,875,1050],     color: 'red',      group: 4 },
  { id: 25, type: 'railroad',     name: 'VVS',          price: 200, rent: [25,50,100,200] },
  { id: 26, type: 'property',     name: 'Voronezh',     price: 240, rent: [20,100,300,750,925,1100],    color: 'red',      group: 4 },
  { id: 27, type: 'chance',       name: 'Chance' },
  { id: 28, type: 'property',     name: 'Rostov',       price: 260, rent: [22,110,330,800,975,1150],    color: 'yellow',   group: 5 },
  { id: 29, type: 'property',     name: 'Odessa',       price: 260, rent: [22,110,330,800,975,1150],    color: 'yellow',   group: 5 },
  { id: 30, type: 'chest',        name: 'Intel' },
  { id: 31, type: 'property',     name: 'Leningrad',    price: 280, rent: [24,120,360,850,1025,1200],   color: 'yellow',   group: 5 },
  { id: 32, type: 'property',     name: 'Stalingrad',   price: 280, rent: [24,120,360,850,1025,1200],   color: 'yellow',   group: 5 },
  { id: 33, type: 'tax',          name: 'Lux.Tax',      cost: 100 },
  { id: 34, type: 'railroad',     name: 'RAF',          price: 200, rent: [25,50,100,200] },
  { id: 35, type: 'free_parking', name: 'Free Park' },
  // -- LEFT COLUMN (row 9 -> row 2) --
  { id: 36, type: 'property',     name: 'Crete',        price: 140, rent: [10,50,150,450,625,750],      color: 'pink',     group: 2 },
  { id: 37, type: 'property',     name: 'Athens',       price: 140, rent: [10,50,150,450,625,750],      color: 'pink',     group: 2 },
  { id: 38, type: 'property',     name: 'Belgrade',     price: 160, rent: [12,60,180,500,700,900],      color: 'pink',     group: 2 },
  { id: 39, type: 'property',     name: 'Arnhem',       price: 300, rent: [26,130,390,900,1100,1275],   color: 'green',    group: 6 },
  { id: 40, type: 'property',     name: 'Caen',         price: 300, rent: [26,130,390,900,1100,1275],   color: 'green',    group: 6 },
  { id: 41, type: 'property',     name: 'Normandy',     price: 320, rent: [28,150,450,1000,1200,1400],  color: 'green',    group: 6 },
  { id: 42, type: 'property',     name: 'Bastogne',     price: 350, rent: [35,175,500,1100,1300,1500],  color: 'darkblue', group: 7 },
  { id: 43, type: 'property',     name: 'Berlin',       price: 400, rent: [50,200,600,1400,1700,2000],  color: 'darkblue', group: 7 },
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

BOARD.forEach(tile => {
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

module.exports = BOARD;
