# Endsieg

A real-time multiplayer Monopoly-inspired strategy board game featuring a World War II aesthetic. Built with vanilla JavaScript and Node.js, Endsieg delivers an engaging competitive experience for up to 6 players with property acquisition, house building, trading mechanics, and auction systems.

## Overview

Endsieg is a browser-based multiplayer board game that combines classic property trading mechanics with modern real-time gameplay. Players compete to bankrupt their opponents through strategic property acquisition, development, and negotiation in a dark, military-themed environment.

## Key Features

- **Multiplayer Support**: Host games for 2-6 players with real-time synchronization
- **Complete Game Mechanics**: Property ownership, house and hotel construction, rent collection, trading system, and auctions
- **Interactive Gameplay**: Dice rolling, tile-by-tile movement animations, and dynamic turn-based progression
- **Strategic Trading**: Player-to-player property and money exchanges with proposal and acceptance system
- **Auction System**: Automated auctions when players decline to purchase properties
- **Responsive Design**: Adaptive board layout with cross-browser font consistency and fullscreen support
- **Real-Time Communication**: Built-in chat system and event logging
- **Modern UI/UX**: Dark military aesthetic with gold accents, smooth animations, and intuitive controls

## Technology Stack

**Frontend**
- HTML5, CSS3, JavaScript (vanilla, no frameworks)
- CSS Grid for responsive board layout
- WebSocket client for real-time updates

**Backend**
- Node.js runtime
- Express.js web framework
- Socket.IO for WebSocket communication
- In-memory game state management

## Getting Started

### Prerequisites

- Node.js (version 14 or higher recommended)
- npm (comes with Node.js)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Panther114/Endsieg.git
cd Endsieg
npm install
```

### Running Locally

Start the development server:

```bash
npm start
```

The game will be accessible at `http://localhost:3000`

For development with auto-reload:

```bash
npm run dev
```

## How to Play

1. Navigate to the game URL in your web browser
2. Enter your player name
3. Create a new room or join an existing room with a 6-character code
4. Wait for other players to join (2-6 players total)
5. Host starts the game when all players are ready
6. Take turns rolling dice, purchasing properties, building houses, and negotiating trades
7. Last player remaining (not bankrupt) wins the game

### Game Mechanics

- **Rolling Dice**: Click the Roll button to move your token
- **Purchasing Properties**: Buy available properties when you land on them
- **Building Houses**: Develop complete color sets with houses and hotels for increased rent
- **Trading**: Propose trades with other players for properties and money
- **Auctions**: Properties go to auction if declined, with all players bidding
- **Special Tiles**: Land on Chance, Community Chest, Tax, and other special tiles for various effects

## Deployment

### Railway

1. Push your code to GitHub
2. Visit [railway.app](https://railway.app)
3. Create a new project and connect your GitHub repository
4. Railway will automatically detect Node.js and deploy
5. Access your game via the provided Railway URL

### Render

1. Go to [render.com](https://render.com)
2. Create a New Web Service
3. Connect your GitHub repository
4. Configure build and start commands:
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
5. Deploy and access via the Render URL

### Hugging Face Spaces (Docker)

1. Create a new Docker Space at [huggingface.co/spaces](https://huggingface.co/spaces)
2. Add a `Dockerfile` to your repository root:

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

3. Push to the Space repository
4. The application will automatically build and serve on port 7860

## Project Structure

```
Endsieg/
├── server/
│   ├── index.js           # Express server and Socket.IO setup
│   ├── gameManager.js     # Room and player management
│   ├── gameLogic.js       # Core game rules and state machine
│   ├── boardData.js       # Board tile definitions and configuration
│   └── cardsConfig.json   # Chance and Community Chest card data
├── client/
│   ├── index.html         # Lobby and room creation interface
│   ├── game.html          # Main game board and UI
│   ├── css/
│   │   ├── main.css       # Global styles and lobby design
│   │   └── board.css      # Game board, tiles, and tokens
│   ├── js/
│   │   ├── main.js        # Lobby WebSocket logic
│   │   └── game.js        # Game rendering and client-side logic
│   └── boardConfig.json   # Optional tile name and price overrides
├── package.json
└── README.md
```

## Configuration

### Board Customization

Tile names and properties can be customized without modifying server code by editing `client/boardConfig.json`. This file allows you to override:

- Tile names and display text
- Property prices and rent values
- Property color groups
- Tax amounts and special tile rewards

See the `_schema` section in `boardConfig.json` for the complete list of configurable fields.

### Visual Assets

Optional image assets can be added to enhance the visual experience:

- `client/bg.png` - Board center background image (recommended: 600×300px minimum, dark tones)
- `client/logo.png` - Lobby header logo (recommended: 300×80px, transparent PNG)

The game will function without these assets, using fallback styles and text.

## Game Rules

Endsieg follows traditional Monopoly-style rules with some adaptations:

- Players start with $1500
- Passing GO awards $200
- Properties can be purchased, traded, or auctioned
- Complete color sets allow house construction
- Rent increases with property development
- Landing on opponent properties requires rent payment
- Bankruptcy occurs when unable to pay debts
- Last solvent player wins

## Browser Compatibility

Endsieg is designed for modern browsers with support for:
- CSS Grid Layout
- CSS Custom Properties
- ES6 JavaScript
- WebSocket (via Socket.IO)

Tested and optimized for:
- Google Chrome 90+
- Microsoft Edge 90+
- Mozilla Firefox 88+
- Safari 14+

## Contributing

Contributions are welcome. Please ensure your code follows the existing style and test thoroughly before submitting pull requests.

## License

This project is provided as-is for educational and entertainment purposes.

## Support

For issues, bugs, or feature requests, please open an issue on the GitHub repository.
