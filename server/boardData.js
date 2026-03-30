'use strict';

// 56-tile board laid out on a 20-column × 10-row rectangular grid.
// Corner positions: id 0 = GO (row 10, col 20), id 19 = Jail (row 10, col 1),
//                  id 28 = Free Parking (row 1, col 1), id 47 = Go To Jail (row 1, col 20)
// Bottom row (row 10): ids 0–19, col 20→1
// Left col  (col  1): ids 20–27, row 9→2
// Top row   (row  1): ids 28–47, col 1→20
// Right col (col 20): ids 48–55, row 2→9
const BOARD = [
  // ── BOTTOM ROW (col 20 → col 1) ───────────────────────────────────
  { id: 0,  type: 'go',           name: 'GO',            reward: 200 },
  { id: 1,  type: 'property',     name: 'Tobruk',        price: 60,  rent: [2,10,30,90,160,250],       color: 'brown',    group: 0 },
  { id: 2,  type: 'chest',        name: 'Intel' },
  { id: 3,  type: 'property',     name: 'El Alamein',    price: 60,  rent: [4,20,60,180,320,450],      color: 'brown',    group: 0 },
  { id: 4,  type: 'tax',          name: 'War Tax',       cost: 200 },
  { id: 5,  type: 'property',     name: 'Dunkirk',       price: 80,  rent: [6,30,90,270,400,550],      color: 'brown',    group: 0 },
  { id: 6,  type: 'railroad',     name: 'Luftwaffe',     price: 200, rent: [25,50,100,200] },
  { id: 7,  type: 'property',     name: 'Tunis',         price: 100, rent: [6,30,90,270,400,550],      color: 'cyan',     group: 1 },
  { id: 8,  type: 'property',     name: 'Casablanca',    price: 100, rent: [6,30,90,270,400,550],      color: 'cyan',     group: 1 },
  { id: 9,  type: 'chance',       name: 'Chance' },
  { id: 10, type: 'property',     name: 'Algiers',       price: 120, rent: [8,40,100,300,450,600],     color: 'cyan',     group: 1 },
  { id: 11, type: 'property',     name: 'Tripoli',       price: 120, rent: [8,40,100,300,450,600],     color: 'cyan',     group: 1 },
  { id: 12, type: 'utility',      name: 'F.Radio',       price: 150 },
  { id: 13, type: 'property',     name: 'Crete',         price: 140, rent: [10,50,150,450,625,750],    color: 'pink',     group: 2 },
  { id: 14, type: 'chest',        name: 'Intel' },
  { id: 15, type: 'property',     name: 'Athens',        price: 140, rent: [10,50,150,450,625,750],    color: 'pink',     group: 2 },
  { id: 16, type: 'utility',      name: 'Espionage',     price: 150 },
  { id: 17, type: 'property',     name: 'Belgrade',      price: 160, rent: [12,60,180,500,700,900],    color: 'pink',     group: 2 },
  { id: 18, type: 'property',     name: 'Bucharest',     price: 160, rent: [12,60,180,500,700,900],    color: 'pink',     group: 2 },
  { id: 19, type: 'jail',         name: 'Jail' },
  // ── LEFT COLUMN (row 9 → row 2) ───────────────────────────────────
  { id: 20, type: 'railroad',     name: 'Regia Air',     price: 200, rent: [25,50,100,200] },
  { id: 21, type: 'property',     name: 'Budapest',      price: 180, rent: [14,70,200,550,750,950],    color: 'orange',   group: 3 },
  { id: 22, type: 'chest',        name: 'Intel' },
  { id: 23, type: 'property',     name: 'Warsaw',        price: 180, rent: [14,70,200,550,750,950],    color: 'orange',   group: 3 },
  { id: 24, type: 'property',     name: 'Minsk',         price: 200, rent: [16,80,220,600,800,1000],   color: 'orange',   group: 3 },
  { id: 25, type: 'chance',       name: 'Chance' },
  { id: 26, type: 'property',     name: 'Kyiv',          price: 200, rent: [16,80,220,600,800,1000],   color: 'orange',   group: 3 },
  { id: 27, type: 'property',     name: 'Midway',        price: 180, rent: [14,70,200,550,750,950],    color: 'orange',   group: 3 },
  // ── TOP ROW (col 1 → col 20) ──────────────────────────────────────
  { id: 28, type: 'free_parking', name: 'Free Park' },
  { id: 29, type: 'property',     name: 'Kharkov',       price: 220, rent: [18,90,250,700,875,1050],   color: 'red',      group: 4 },
  { id: 30, type: 'property',     name: 'Kursk',         price: 220, rent: [18,90,250,700,875,1050],   color: 'red',      group: 4 },
  { id: 31, type: 'railroad',     name: 'VVS',           price: 200, rent: [25,50,100,200] },
  { id: 32, type: 'property',     name: 'Voronezh',      price: 240, rent: [20,100,300,750,925,1100],  color: 'red',      group: 4 },
  { id: 33, type: 'chest',        name: 'Intel' },
  { id: 34, type: 'property',     name: 'Stalingrad',    price: 240, rent: [20,100,300,750,925,1100],  color: 'red',      group: 4 },
  { id: 35, type: 'property',     name: 'Iwo Jima',      price: 220, rent: [18,90,250,700,875,1050],   color: 'red',      group: 4 },
  { id: 36, type: 'chance',       name: 'Chance' },
  { id: 37, type: 'property',     name: 'Rostov',        price: 260, rent: [22,110,330,800,975,1150],  color: 'yellow',   group: 5 },
  { id: 38, type: 'property',     name: 'Sevastopol',    price: 260, rent: [22,110,330,800,975,1150],  color: 'yellow',   group: 5 },
  { id: 39, type: 'property',     name: 'Odessa',        price: 280, rent: [24,120,360,850,1025,1200], color: 'yellow',   group: 5 },
  { id: 40, type: 'chest',        name: 'Intel' },
  { id: 41, type: 'property',     name: 'G.Canal',       price: 260, rent: [22,110,330,800,975,1150],  color: 'yellow',   group: 5 },
  { id: 42, type: 'railroad',     name: 'RAF',           price: 200, rent: [25,50,100,200] },
  { id: 43, type: 'property',     name: 'Leningrad',     price: 280, rent: [24,120,360,850,1025,1200], color: 'yellow',   group: 5 },
  { id: 44, type: 'property',     name: 'Arnhem',        price: 300, rent: [26,130,390,900,1100,1275], color: 'green',    group: 6 },
  { id: 45, type: 'tax',          name: 'Lux.Tax',       cost: 100 },
  { id: 46, type: 'property',     name: 'Caen',          price: 300, rent: [26,130,390,900,1100,1275], color: 'green',    group: 6 },
  { id: 47, type: 'go_to_jail',   name: 'Go To Jail' },
  // ── RIGHT COLUMN (row 2 → row 9) ──────────────────────────────────
  { id: 48, type: 'chance',       name: 'Chance' },
  { id: 49, type: 'property',     name: 'Normandy',      price: 320, rent: [28,150,450,1000,1200,1400], color: 'green',   group: 6 },
  { id: 50, type: 'property',     name: 'Vichy',         price: 320, rent: [28,150,450,1000,1200,1400], color: 'green',   group: 6 },
  { id: 51, type: 'tax',          name: 'Lux.Tax 2',     cost: 75 },
  { id: 52, type: 'property',     name: 'Bastogne',      price: 350, rent: [35,175,500,1100,1300,1500], color: 'darkblue', group: 7 },
  { id: 53, type: 'property',     name: 'Berlin',        price: 400, rent: [50,200,600,1400,1700,2000], color: 'darkblue', group: 7 },
  { id: 54, type: 'property',     name: 'M.Cassino',     price: 350, rent: [35,175,500,1100,1300,1500], color: 'darkblue', group: 7 },
  { id: 55, type: 'property',     name: 'Anzio',         price: 400, rent: [50,200,600,1400,1700,2000], color: 'darkblue', group: 7 },
];

module.exports = BOARD;
