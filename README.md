# Endsieg 🎲

**A real-time multiplayer Monopoly-style browser game with customizable boards and rules**

Endsieg is a feature-rich, multiplayer board game built entirely from scratch with no external game frameworks. Players can join rooms, roll dice, buy properties, build houses, auction properties, trade with each other, and compete to be the last player standing. The game features real-time synchronization, customizable game rules, custom board configurations, and a visual map editor.

**Play with up to 8 players** • **Fully customizable boards** • **Real-time gameplay** • **No installation required**

---

## ✨ Features

### Core Gameplay
- 🎲 **Classic Monopoly Mechanics**: Roll dice, move around the board, buy properties, build houses, and collect rent
- 👥 **Multiplayer Support**: Up to 8 players per room with real-time synchronization
- 🎨 **Customizable Player Colors**: Choose from 10 distinct colors or use custom hex codes
- 💰 **Property Management**: Buy, mortgage, unmortgage, and trade properties
- 🏠 **House Building**: Build houses on properties to increase rent
- 🔨 **Property Auctions**: Optional auction system when players skip buying properties
- 🤝 **Player Trading**: Direct player-to-player trading of properties and cash
- 🗳️ **Vote Kick System**: Democratic player removal system
- 💬 **In-Game Chat**: Real-time chat between players
- 🎯 **Chance & Community Chest Cards**: Customizable event cards with multiple action types

### Advanced Features
- 📋 **Custom Board Configurations**: Create entirely custom boards by editing `client/boardConfig.json`
- 🗺️ **Visual Map Editor**: Python-based GUI tool for creating and editing board layouts
- ⚙️ **Configurable Game Rules**:
  - Double rent on complete property sets
  - Vacation Cash (Free Parking pool)
  - Auction on skip
  - No rent collection while in jail
  - Property mortgaging
  - Even build rule (balanced house construction)
- 💵 **Adjustable Starting Funds**: Set starting cash from $500 to $10,000
- 🔄 **Reconnection Support**: Players can rejoin games if disconnected
- ⏱️ **Grace Period System**: Temporary disconnection handling before player removal
- 🛡️ **Rate Limiting**: Built-in DDoS protection with express-rate-limit

### Technical Features
- 🚀 **Zero Build Step**: Pure vanilla JavaScript, HTML5, and CSS3 - no compilation required
- 📡 **WebSocket Communication**: Real-time bi-directional communication via Socket.IO
- 🎮 **Client-Side State Management**: Efficient game state synchronization
- 🔒 **Input Validation**: Server-side validation and sanitization of all user inputs
- 📱 **Responsive Design**: Works on desktop and mobile devices with viewport-based scaling
- 🎨 **CSS Variables**: Centralized theming with responsive breakpoints

---

## 🎮 How to Play

### Getting Started

1. **Open the game** in your web browser (locally or on a deployed server)
2. **Enter your name** and choose a player color
3. **Create a new room** or join an existing one with a 4-character room code
4. **Share the room code** with friends
5. **Host configures game settings**:
   - Set starting funds (default: $1,500)
   - Enable/disable game rules
   - Optionally load a custom board configuration
6. **Host starts the game** once all players are ready

### Gameplay

- **Roll Dice**: Click "Roll Dice" on your turn to move
- **Buy Properties**: Land on unowned properties to purchase them
- **Build Houses**: Own all properties in a color group to build houses
- **Trade**: Propose trades with other players (properties and/or cash)
- **Mortgage**: Get cash by mortgaging properties when low on funds
- **Auction**: When a player skips buying, an auction starts (if enabled)
- **Special Tiles**:
  - **GO**: Collect $200 when passing or landing
  - **Jail**: Visit or get sent to jail
  - **Chance/Community Chest**: Draw event cards
  - **Tax Tiles**: Pay the specified tax amount
  - **Free Parking**: Collect accumulated taxes (if Vacation Cash enabled)

### Winning

The last player with money remaining wins! Players are eliminated when they go bankrupt.

---

## 🛠️ Tech Stack

### Frontend
- **HTML5**: Semantic markup with accessibility considerations
- **CSS3**: Modern CSS with flexbox, grid, CSS variables, and responsive design
- **Vanilla JavaScript**: No frameworks - pure ES6+ JavaScript with WebSocket client

### Backend
- **Node.js**: JavaScript runtime (v18+ recommended)
- **Express.js**: Web server and static file serving
- **Socket.IO**: Real-time WebSocket communication
- **UUID**: Unique room code generation

### Development Tools
- **Nodemon**: Auto-reload during development
- **Python + tkinter**: Visual map editor (optional)

### Dependencies
```json
{
  "express": "^4.18.2",
  "express-rate-limit": "^8.3.1",
  "socket.io": "^4.7.2",
  "uuid": "^9.0.0"
}
```

---

## 🚀 Local Development

### Prerequisites
- **Node.js** v18+ and npm
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- **Python 3.6+** and tkinter (optional, for map editor)

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Panther114/Endsieg.git
   cd Endsieg
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   ```
   http://localhost:3000
   ```

### Development Mode

For auto-reload during development (using nodemon):

```bash
npm run dev
```

The server will automatically restart when you modify server files. For client files, simply refresh the browser.

### Project Structure

```
Endsieg/
├── package.json              # Project metadata and dependencies
├── Procfile                  # Deployment config for Railway/Render
├── server/
│   ├── index.js              # Express server + Socket.IO setup
│   ├── gameManager.js        # Room management and player tracking
│   ├── gameLogic.js          # Core game state machine and rules engine
│   ├── boardData.js          # Default 44-tile board definition
│   └── cardsConfig.json      # Chance & Community Chest card definitions
├── client/
│   ├── index.html            # Lobby page (room creation/joining)
│   ├── game.html             # In-game page (board and controls)
│   ├── boardConfig.json      # Custom board configuration overrides
│   ├── bg.png                # Optional background image
│   ├── logo.png              # Optional logo image
│   ├── css/
│   │   ├── main.css          # Lobby styles and global CSS variables
│   │   └── board.css         # Board grid, tiles, tokens, responsive design
│   └── js/
│       ├── main.js           # Lobby WebSocket logic
│       └── game.js           # In-game rendering and WebSocket handlers
└── editor/
    ├── README.md             # Map editor documentation
    └── map_editor.py         # Python GUI for board editing
```

---

## ☁️ Deployment

### Deploy to Railway

[Railway](https://railway.app) provides the easiest deployment with automatic builds and free hosting.

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Click **New Project** → **Deploy from GitHub**
   - Select your `Endsieg` repository
   - Railway auto-detects Node.js and runs `npm start`

3. **Get your URL**:
   - Railway provides a free `.railway.app` domain
   - Optionally configure a custom domain

**Environment Variables**: Set `PORT` if needed (Railway sets this automatically).

---

### Deploy to Render

[Render](https://render.com) offers free static site hosting and web services.

1. **Go to Render**:
   - Visit [render.com](https://render.com)
   - Click **New Web Service**

2. **Connect Repository**:
   - Link your GitHub account
   - Select `Panther114/Endsieg`

3. **Configure Build Settings**:
   - **Build command**: `npm install`
   - **Start command**: `node server/index.js`
   - **Environment**: Node

4. **Deploy**:
   - Click **Create Web Service**
   - Free tier available with auto-deploy on push

---

### Deploy to Hugging Face Spaces

[Hugging Face Spaces](https://huggingface.co/spaces) supports Docker deployments for free.

1. **Create a Space**:
   - Go to [huggingface.co/spaces](https://huggingface.co/spaces)
   - Create a new **Docker Space**

2. **Add Dockerfile**:
   Create a `Dockerfile` in the repository root:

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

3. **Push to Space**:
   - Connect your GitHub repo or push directly
   - The Space will auto-build and serve on port 7860

---

### Deploy to Other Platforms

Endsieg can be deployed to any platform that supports Node.js:

- **Heroku**: Add `Procfile` (already included)
- **DigitalOcean App Platform**: Auto-detects Node.js
- **AWS/Google Cloud/Azure**: Use container or Node.js runtime
- **Vercel**: Add `vercel.json` for serverless deployment
- **Fly.io**: Use `fly.toml` configuration

**Requirements**:
- Node.js v18+
- Port configuration via `process.env.PORT`
- WebSocket support (for Socket.IO)

---

## 🎨 Customization

### Custom Board Configuration

Endsieg supports fully customizable board layouts via `client/boardConfig.json`. You can modify tile names, prices, colors, rent values, and even tile types.

#### Editing boardConfig.json

The configuration file overrides the default board defined in `server/boardData.js`. Only include tiles you want to customize:

```json
{
  "_comment": "Full board configuration",
  "_schema": { /* field descriptions */ },
  "tiles": [
    {
      "id": 1,
      "type": "property",
      "name": "Custom Property",
      "price": 100,
      "rent": [10, 50, 150, 450, 625, 750],
      "color": "brown",
      "group": 0
    }
  ]
}
```

**Supported Fields**:
- `id` (required): Tile ID (0-43 for default 44-tile board)
- `name`: Display name
- `type`: `go`, `jail`, `free_parking`, `go_to_jail`, `property`, `railroad`, `utility`, `chance`, `chest`, `tax`
- `price`: Purchase price (for properties, railroads, utilities)
- `rent`: Array of 6 rent values `[base, 1house, 2houses, 3houses, 4houses, hotel]`
- `color`: Property color group
- `group`: Numeric group ID (properties with same group form a monopoly)
- `cost`: Tax amount (for tax tiles)
- `reward`: Reward amount (for GO tile)

**Supported Colors**:
`brown`, `cyan`, `pink`, `orange`, `red`, `yellow`, `green`, `darkblue`, `purple`, `navy`, `teal`, `lime`, `maroon`, `coral`, `gold`, `violet`, `indigo`, `emerald`, `white`, `black`

---

### Visual Map Editor

A Python-based GUI tool for editing board configurations without manually editing JSON.

#### Installation

```bash
cd editor
python map_editor.py
```

Or load an existing configuration:

```bash
python map_editor.py ../client/boardConfig.json
```

#### Features

- Visual tile list with live preview
- Form-based property editing
- Type-specific field validation
- Load/save JSON files
- Rent array editor
- Color picker for property groups

#### Creating a Windows Executable

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --name "Endsieg Map Editor" map_editor.py
```

The `.exe` will be in the `dist/` folder.

See [`editor/README.md`](editor/README.md) for full documentation.

---

### Custom Card Decks

Modify Chance and Community Chest cards by editing `server/cardsConfig.json`.

#### Card Actions

- `collect`: Player receives money from bank
- `pay`: Player pays money to bank (goes to Free Parking pool if Vacation Cash enabled)
- `advance_to`: Move to specific tile (collect $200 if passing GO)
- `go_to_jail`: Send player directly to jail
- `move_back`: Move backward by specified spaces
- `nearest_railroad`: Advance to nearest railroad tile
- `jail_free`: Receive Get Out of Jail Free card
- `pay_each`: Pay money to each other player
- `collect_each`: Collect money from each other player

#### Example Card

```json
{
  "text": "Bank pays you dividend of $50.",
  "action": "collect",
  "amount": 50
}
```

**Note**: Changes take effect after server restart.

---

### Optional Assets

Place these images in the `client/` directory to enhance visual appearance:

| File | Purpose | Recommended Specs |
|------|---------|-------------------|
| `client/bg.png` | Background image for board center area | 600 × 300 px minimum, dark tones preferred |
| `client/logo.png` | Logo shown in lobby header | Transparent PNG, ~300 × 80 px |

The UI gracefully falls back to CSS gradients if images are missing.

---

### Game Rules Configuration

The host can enable/disable these rules before starting each game:

- **Double Rent on Full Set**: Properties in complete color groups charge 2× rent (even without houses)
- **Vacation Cash (Free Parking Pool)**: Tax payments accumulate on Free Parking for lucky players
- **Auction on Skip**: When a player skips buying, the property goes to auction
- **No Rent While in Jail**: Players in jail cannot collect rent
- **Mortgage Properties**: Players can mortgage properties for half their value
- **Even Build Rule**: Houses must be built evenly across color group properties

---

## 🧑‍💻 Architecture & Design

### Server Architecture

**gameManager.js**: Room lifecycle management
- Creates and tracks game rooms with unique 4-character codes
- Manages player connections and socket mappings
- Implements grace period for reconnections
- Handles room cleanup and host migration

**gameLogic.js**: Core game engine
- Implements complete Monopoly game state machine
- Handles all game actions (roll, buy, build, trade, auction, etc.)
- Manages turn phases and player states
- Validates all actions and enforces rules
- Processes Chance/Community Chest cards

**boardData.js**: Board configuration
- Defines default 44-tile board layout
- Supports custom board configurations
- Merges custom configs with defaults

**index.js**: Server entry point
- Express server with static file serving
- Socket.IO WebSocket server
- Rate limiting middleware
- Event handlers for all client actions

### Client Architecture

**main.js** (Lobby):
- Room creation and joining
- Player list management
- Color selection
- Host controls for game settings

**game.js** (In-game):
- Real-time board rendering
- Player token animations
- UI state management
- Action buttons and controls
- Trade interface
- Chat system

**CSS Architecture**:
- CSS variables for theming and responsive breakpoints
- Responsive font sizing with `vw` units and `clamp()`
- Mobile-first responsive design
- Cross-browser compatibility (Chrome, Firefox, Edge, Safari)

### WebSocket Events

**Client → Server**:
- `create_room`, `join_room`, `start_game`
- `roll_dice`, `buy_property`, `skip_buy`
- `build_house`, `mortgage_property`, `unmortgage_property`
- `place_bid`, `pass_bid`
- `trade_offer`, `trade_accept`
- `vote_kick`, `undo_vote_kick`, `declare_bankruptcy`, `quit_game`
- `chat_message`, `request_game_state`

**Server → Client**:
- `room_created`, `room_updated`, `game_started`, `game_updated`
- `auction_started`, `auction_ended`
- `trade_proposed`, `player_kicked`, `player_left`
- `chat_message`, `error`

### State Management

Game state is authoritative on the server. The client receives full state updates after each action and renders the UI accordingly. This prevents cheating and ensures synchronization across all players.

---

## 🔒 Security Considerations

### Implemented Protections

- **Input Validation**: All user inputs (names, amounts, tile IDs) are validated and sanitized
- **Rate Limiting**: 60 requests per minute per IP to prevent abuse
- **WebSocket Origin Validation**: CORS configured for Socket.IO
- **Rule Sanitization**: Game rules are whitelisted to prevent injection
- **Custom Map Validation**: Board configs are validated before use
- **Max Player Limit**: 8 players per room enforced server-side
- **Action Authorization**: Players can only perform actions during their turn
- **Chat Message Length**: Limited to 200 characters
- **Player Name Length**: Limited to 16 characters

### Best Practices

- Keep dependencies updated: `npm audit` and `npm update`
- Use environment variables for sensitive configuration
- Deploy behind HTTPS in production
- Consider adding authentication for private games
- Implement proper logging for security monitoring

---

## 🐛 Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**WebSocket connection failed**:
- Check firewall settings
- Ensure WebSocket support on hosting platform
- Verify CORS configuration in `server/index.js`

**Players can't join room**:
- Verify room code is correct (case-insensitive, 4 characters)
- Check if game already started
- Ensure room hasn't reached 8 player limit

**Board not displaying correctly**:
- Check browser console for JavaScript errors
- Verify `boardConfig.json` syntax is valid JSON
- Clear browser cache and reload

**Custom board not loading**:
- Validate JSON syntax: `node -e "console.log(JSON.parse(require('fs').readFileSync('client/boardConfig.json')))"`
- Check that tile IDs match server board layout
- Restart server after modifying configuration

---

## 📝 License

This project is open source. Feel free to use, modify, and distribute as needed.

---

## 🤝 Contributing

Contributions are welcome! Here are some ways to contribute:

- Report bugs and issues
- Suggest new features or game rules
- Improve documentation
- Submit pull requests
- Create custom board themes

---

## 🌟 Credits

**Inspired by**: richup.io and classic Monopoly

**Created by**: Gavania / Panther114

**Built with**: Vanilla JavaScript, Express, Socket.IO, and lots of coffee ☕

---

## 📚 Additional Resources

- **Socket.IO Documentation**: [socket.io/docs](https://socket.io/docs/)
- **Express.js Guide**: [expressjs.com](https://expressjs.com/)
- **Monopoly Rules Reference**: [hasbro.com](https://www.hasbro.com/)
- **Python tkinter Tutorial**: [docs.python.org/3/library/tkinter.html](https://docs.python.org/3/library/tkinter.html)

---

**Have fun playing Endsieg! 🎲🎮**
