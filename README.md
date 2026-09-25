# Runaway Runner

A side-scrolling browser game where you play as a runner dodging hazards on the trail while collecting power-ups for toilet roll shields.

## How to Play

- **Move up/down** between lanes using **↑/↓** arrow keys or **W/S**
- **Dodge enemies** coming from the right: 💩 Poos, 🐕 Dogs, 🎂 Cake, 💦 Puddles
- **Collect power-ups**: ⚡ Energy Gels and 👟 Carbon Shoes grant toilet roll shields (max 3)
- Shields absorb one hit each — the runner trips and flashes while recovering
- Without shields, hits cost a life — you have 3 lives
- Game ends when all lives are lost

## How Scoring Works

Score increases from:
- **Distance**: continuous points as you run (faster = more points per frame)
- **Dodging obstacles**: each enemy that passes you without a hit gives bonus points (10–20 depending on type)
- **Collecting power-ups**: each pickup gives 25 bonus points
- Speed increases every 5 seconds, raising both the challenge and the distance scoring rate

## Setup and Running

```bash
npm install
PORT=3000 npm start
```

Open `http://127.0.0.1:3000` in a browser.

The server respects the `PORT` environment variable (default: 3000). It serves both the game page and the scores API from a single Express server. Scores are stored in a SQLite database (`scores.db`) that persists across restarts.

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/scores` | Returns top 20 scores as JSON |
| `POST` | `/api/scores` | Submit a score. Body: `{"name": "string", "score": integer}` |

Validation rules for POST:
- `name`: non-empty string, max 30 characters
- `score`: integer between 0 and 999,999

## Hosting

- All page URLs are relative — works behind a reverse proxy with a path prefix
- No external CDN, fonts, or third-party scripts
- No cookies, localStorage, or session-based storage
- CORS enabled for cross-origin API access including preflight
- Form submission handled via JavaScript fetch with preventDefault
