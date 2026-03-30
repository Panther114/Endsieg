# Endsieg 🎲

A multiplayer Monopoly-style browser game — inspired by richup.io, with a WWII aesthetic.

Up to 6 players can join a room, roll dice, buy properties, build houses, trade, and compete to bankrupt each other!

---

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (no frameworks)
- **Backend**: Node.js + Express + Socket.IO
- **Real-time**: Socket.IO WebSockets

---

## Local Development

```bash
npm install
npm start
# Open http://localhost:3000
```

For auto-reload during development:

```bash
npm run dev
```

---

## Deploy to Railway

1. Push to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select `Panther114/Endsieg`
4. Railway auto-detects Node.js and runs `npm start`
5. Get a free `.railway.app` domain instantly

---

## Deploy to Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect `Panther114/Endsieg`
3. **Build command**: `npm install`
4. **Start command**: `node server/index.js`
5. Free tier available

---

## Deploy to Hugging Face Spaces (Docker)

1. Create a new Docker Space at [huggingface.co/spaces](https://huggingface.co/spaces)
2. Add a `Dockerfile` to the repo root:

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

3. Push to the Space — it will auto-build and serve on port 7860.

---

## How to Play

1. Open the game URL in your browser
2. Enter your name and click **Create Room** (or join with a code)
3. Share the 6-character room code with friends
4. Host clicks **Start Game**
5. Take turns rolling dice, buying properties, and building houses
6. Last player standing wins!

---

## File Structure

```
Endsieg/
├── package.json
├── Procfile                ← Railway/Render: "web: node server/index.js"
├── server/
│   ├── index.js            ← Express + Socket.IO entrypoint
│   ├── gameManager.js      ← Room registry
│   ├── gameLogic.js        ← Full game state machine
│   └── boardData.js        ← 40 board tile definitions
└── client/
    ├── index.html          ← Lobby page
    ├── game.html           ← In-game page
    ├── css/
    │   ├── main.css        ← Lobby + global styles
    │   └── board.css       ← Board grid, tiles, tokens
    └── js/
        ├── main.js         ← Lobby socket logic
        └── game.js         ← In-game rendering + socket logic
```
