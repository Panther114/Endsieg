# Last Stand 🎲

A real-time multiplayer Monopoly-style board game built with Node.js, Express, and Socket.IO. Up to 8 players can compete in strategic property acquisition, trading, and economic warfare to become the last one standing!

**🎮 Play Now:** [laststand.up.railway.app](https://laststand.up.railway.app)

---

## ✨ Features

### Core Gameplay
- **Real-time Multiplayer**: Up to 8 players per room with WebSocket synchronization
- **Classic Monopoly Mechanics**: Buy properties, build houses and hotels, collect rent, and bankrupt your opponents
- **Property Management**: Mortgage/unmortgage properties, build evenly across color groups
- **Trading System**: Propose and negotiate property trades with other players
- **Chance & Community Chest**: Configurable card decks with diverse effects (move, collect, pay, etc.)
- **Auction System**: Optional property auctions when players decline to buy
- **Jail Mechanics**: Roll doubles to escape, pay bail, or serve your time

### Advanced Features
- **Custom Game Rules**: Toggle double rent on full sets, vacation cash (Free Parking pool), auction mode, even build requirements, and more
- **Custom Board Maps**: Upload custom JSON board configurations to create unique game experiences
- **Reconnection Support**: 12-second grace period allows players to reconnect without losing their position
- **Vote Kick System**: Democratic player removal system for inactive or disruptive players
- **In-Game Chat**: Communicate with other players during the game
- **Responsive Design**: Optimized for various screen sizes with viewport-based scaling

### Technical Highlights
- **No Framework Dependencies**: Pure vanilla JavaScript on the frontend for minimal overhead
- **Real-time Updates**: Socket.IO provides instant game state synchronization
- **Room-Based Architecture**: Isolated game sessions with unique 4-digit room codes
- **Configurable Starting Funds**: Set starting money from $500 to $10,000
- **Bankruptcy Protection**: Automatic bankruptcy detection prevents negative balance exploits

---

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ and npm

### Local Development

```bash
# Clone the repository
git clone https://github.com/Panther114/Endsieg.git
cd Endsieg

# Install dependencies
npm install

# Start the server
npm start
```

The game will be available at `http://localhost:3000`

### Development Mode (Auto-reload)

```bash
npm run dev
```

Uses nodemon to automatically restart the server when files change.

---

## 🎯 How to Play

1. **Create or Join a Room**
   - Enter your name and choose a color
   - Click "Create New Room" to host, or enter a 4-digit room code to join

2. **Host Settings (Room Creator)**
   - Set starting funds ($500-$10,000)
   - Configure game rules (double rent, auctions, mortgage, etc.)
   - Optionally upload a custom board map
   - Click "Start Game" when all players are ready

3. **During the Game**
   - **Roll Dice**: Move around the board clockwise
   - **Buy Properties**: Purchase unowned properties you land on
   - **Build Houses**: Own all properties in a color group to build (max 5 houses = 1 hotel)
   - **Pay Rent**: Landing on opponents' properties requires rent payment
   - **Trade**: Propose property and money trades with other players
   - **Mortgage**: Convert properties to cash when funds are low
   - **End Turn**: Pass the turn to the next player (or roll again if you got doubles)

4. **Winning the Game**
   - Bankrupt all opponents to win
   - Players with negative money are automatically eliminated
   - Last player standing wins!

---

## 📁 Project Structure

```
Last Stand/
├── server/
│   ├── index.js           # Express server + Socket.IO event handlers
│   ├── gameLogic.js       # Core game state machine (GameRoom class)
│   ├── gameManager.js     # Room registry and player connection management
│   ├── boardData.js       # 44-tile board definition with configuration system
│   └── cardsConfig.json   # Configurable Chance & Community Chest card decks
├── client/
│   ├── index.html         # Lobby page (create/join rooms)
│   ├── game.html          # In-game page (board + UI)
│   ├── css/
│   │   ├── main.css       # Global styles + lobby
│   │   └── board.css      # Board grid, tiles, tokens, modals
│   ├── js/
│   │   ├── main.js        # Lobby socket logic + room management
│   │   └── game.js        # In-game rendering, animations, and socket handlers
│   └── boardConfig.json   # Optional board customization file
├── editor/
│   ├── map_editor.py      # Visual board editor (Python + tkinter)
│   └── README.md          # Map editor documentation
├── package.json
├── Procfile               # Deployment config for Railway/Render
└── README.md
```

---

## ⚙️ Configuration

### Game Rules (Configurable at Room Start)

| Rule | Default | Description |
|------|---------|-------------|
| **Double Rent on Full Set** | ✓ | Properties with complete color groups charge 2× rent (without houses) |
| **Vacation Cash** | ✗ | Taxes and fees accumulate in Free Parking; landing collects the pool |
| **Auction on Skip** | ✗ | Declined properties go to auction instead of staying unowned |
| **No Rent While in Jail** | ✓ | Players in jail cannot collect rent from their properties |
| **Mortgage Properties** | ✓ | Allows mortgaging properties for 50% of their price |
| **Even Build Rule** | ✓ | Must build houses evenly across all properties in a color group |

### Card Decks

Chance and Community Chest cards are fully configurable in `server/cardsConfig.json`. Supported actions:

- `collect` / `pay` — Transfer money to/from the bank
- `advance_to` — Move to specific tile (collect GO if passing)
- `go_to_jail` — Send player to jail
- `move_back` — Move backwards a number of spaces
- `nearest_railroad` — Advance to nearest railroad tile
- `jail_free` — Get Out of Jail Free card
- `pay_each` / `collect_each` — Exchange money with all other players

### Custom Board Maps

Create custom boards using the visual editor (`editor/map_editor.py`) or by editing `client/boardConfig.json` directly. Upload custom maps when creating a room.

**Board Tile Types:**
- `go` — Starting tile (collect reward)
- `property` — Purchasable property with rent progression
- `railroad` — Special property (rent scales with number owned)
- `utility` — Special property (rent based on dice roll)
- `tax` — Pay fixed amount to bank
- `chance` / `chest` — Draw cards
- `jail` — Jail visitor space
- `go_to_jail` — Sends player to jail
- `free_parking` — Free space (collects pool if Vacation Cash enabled)

---

## 🌐 Deployment

### Deploy to Railway

1. Fork this repository on GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select your forked repository
4. Railway auto-detects Node.js and runs `npm start`
5. Your game will be live at `*.railway.app`

### Deploy to Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
4. Deploy and access via your `*.onrender.com` URL

### Deploy to Hugging Face Spaces (Docker)

1. Create a Docker Space at [huggingface.co/spaces](https://huggingface.co/spaces)
2. Add a `Dockerfile` to the repository root:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 7860
ENV PORT=7860
CMD ["node", "server/index.js"]
```

3. Push to the Space — it will auto-build and serve on port 7860

---

## 🎨 Customization

### Visual Assets

Place these optional images in the `client/` directory:

| File | Purpose | Recommended Specs |
|------|---------|-------------------|
| `client/bg.png` | Background image for the board center | 600×300+ px, dark tones |
| `client/logo.png` | Logo shown in lobby header | 300×80 px, transparent PNG |

If missing, the UI falls back to CSS gradients and text.

### Styling

The game uses a dark military-strategy aesthetic with gold accents. Main style variables are in `client/css/main.css` and `client/css/board.css`. Key design elements:

- **Fonts**: Cinzel (titles), Rajdhani (UI), Inter (body)
- **Colors**: Dark background (`#0a0e12`), gold accents (`#d4af37`)
- **Responsive**: CSS variables + media queries for 768px, 1366px, 1920px+ breakpoints

---

## 🔧 Development

### Server Architecture

- **Express**: Serves static files and handles HTTP requests
- **Socket.IO**: Manages real-time bidirectional communication
- **GameRoom Class**: Encapsulates all game logic (turns, properties, money, bankruptcy, etc.)
- **gameManager**: Tracks active rooms and handles player connections/disconnections

### Key Socket Events

**Client → Server:**
- `create_room`, `join_room`, `start_game`
- `roll_dice`, `buy_property`, `skip_buy`, `end_turn`
- `build_house`, `mortgage_property`, `unmortgage_property`
- `trade_offer`, `trade_accept`
- `place_bid`, `pass_bid` (auctions)
- `vote_kick`, `declare_bankruptcy`, `quit_game`

**Server → Client:**
- `room_created`, `room_updated`, `game_started`, `game_updated`
- `auction_started`, `auction_ended`
- `trade_proposed`, `player_kicked`, `player_left`
- `error`, `chat_message`

### Testing

No automated tests are currently included. Manual testing workflow:

1. Start server locally
2. Open multiple browser windows/tabs
3. Create room in one window, join from others
4. Test gameplay mechanics (buy, trade, build, bankruptcy, etc.)

---

## 🐛 Bug Fixes & Recent Changes

### Version 1.0 (Current)

**Bug Fixes:**
- ✅ Added bankruptcy checks after all money deductions (tax, rent, cards, jail fees)
- ✅ Fixed hardcoded board size in client path calculation (now supports custom board sizes)
- ✅ Added null check for railroad-less boards in "nearest railroad" card logic
- ✅ Improved eliminatePlayer re-entry protection

**Rebranding:**
- Changed game name from "Endsieg" to "Last Stand" throughout all files
- Updated all UI text, page titles, and code comments
- Renamed sessionStorage keys for player name persistence

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available for educational and personal use.

---

## 🙏 Acknowledgments

- Inspired by the classic Monopoly board game and richup.io
- Built by Gavania
- WWII-themed board design with historical battle locations

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on the [GitHub repository](https://github.com/Panther114/Endsieg/issues).

**Happy gaming! May the last one standing prevail! 🏆**
