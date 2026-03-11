# Podium501

Live scoreboard and judging app for STEAM competitions. Built for fast, mobile-friendly scoring at live events — judges use their phones on local WiFi, scores appear on the projected scoreboard in real time.

**Stack:** SvelteKit · TypeScript · SQLite (better-sqlite3) · Material 3 (dark theme) · PWA-ready

---

## Features

### Live Scoreboard (`/scoreboard`)
- Leaderboard polls `/api/leaderboard` every 2 seconds
- Animated score counter — numbers count up smoothly from the old value to the new value
- Row highlight + score chip spring animation on every update
- Floating `+N` popup above the updated score
- Confetti burst on any score change (canvas-confetti)
- Larger confetti + milestone banner when a team crosses 100 / 200 / 300 / 500 points
- Per-challenge score breakdown shown for each team (pills column)

### Judge Interface (`/judge`)
- PIN login screen — judges enter a 4-digit PIN verified against a server-side registry
- PIN and judge name are persisted in `localStorage` so the session survives page refreshes
- Log out button clears the session
- 3-step scoring wizard: **Challenge → Team → Score**
- Large Kahoot-style score buttons (+10 / +20 / +30 / −10) optimised for touch
- Audio beep feedback on score submission
- **Undo Last** removes the judge's most recent score event for the selected team + challenge
- **Live score breakdown** in the scoring card:
  - "This challenge so far" shows the current net total for the selected challenge
  - Full per-challenge breakdown panel lists all scored challenges for the team, highlighting the active one

### Admin Interface (`/admin`)
- Add / remove teams (name, school, colour)
- Add / remove challenges (name, description)
- Reset all scores
- CSV export of all score events

### API
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/leaderboard` | Ranked totals per team |
| `GET` | `/api/scores/breakdown` | Points per team per challenge |
| `POST` | `/api/scores` | Submit a score event |
| `DELETE` | `/api/scores/undo` | Remove last event for a team+challenge |
| `POST` | `/api/scores/reset` | Delete all score events |
| `GET` | `/api/scores/export` | CSV download of all events |
| `GET` | `/api/teams` | List teams |
| `POST` | `/api/teams` | Create a team |
| `GET` | `/api/challenges` | List challenges |
| `POST` | `/api/challenges` | Create a challenge |
| `POST` | `/api/judge-login` | Verify a judge PIN |

---

## Judge PINs

PINs are defined in [`src/routes/api/judge-login/+server.ts`](src/routes/api/judge-login/+server.ts) in the `JUDGE_PINS` object. Update this before each event:

```ts
const JUDGE_PINS: Record<string, string> = {
  '1264': 'Maria',
  '6564': 'Ana',
  '8942': 'Coach Kim'
};
```

---

## Development

```sh
npm install
npm run dev
```

The SQLite database is created automatically at `data/podium501.db` on first run.

## Production build

```sh
npm run build
node build/index.js
```

Uses `@sveltejs/adapter-node`. Set the `PORT` environment variable if needed (default 3000).

