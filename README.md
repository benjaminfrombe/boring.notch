# 🚴 Strava Coach

AI-powered cycling training advice using your Strava data and Claude AI, personalized for Benjamin Jacobs's physiological profile.

## Features

- **Strava OAuth2 login** — connects securely to your Strava account
- **Last 10 activities** — fetches HR, power, duration, distance and estimates TSS + training zone
- **AI coaching** — sends your data + physiological profile to Claude for personalized Dutch-language advice
- **Clean UI** — dark theme, mobile friendly, activity table with zone distribution

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your secrets:

```bash
cp .env.example .env
```

```env
STRAVA_CLIENT_ID=118880
STRAVA_CLIENT_SECRET=your_strava_client_secret
CLAUDE_API_KEY=your_claude_api_key
SESSION_SECRET=any_random_string_here
PORT=3000
```

### 3. Configure Strava App

Go to [developers.strava.com](https://developers.strava.com) → My API Application and add:

```
Authorization Callback Domain: localhost
```

And ensure the callback URL is set to:
```
http://localhost:3000/auth/strava/callback
```

### 4. Run

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Athlete Profile

The app is hardcoded for:

| Parameter | Value |
|-----------|-------|
| Name | Benjamin Jacobs |
| Age | 47y |
| Weight | 73 kg |
| VO2max | 51.8 ml/min/kg |
| Max Power | 300W (4.1 W/kg) |
| Max HR | 179 bpm |
| Aerobic threshold | 177W / 130 bpm |
| Anaerobic threshold | 240W / 159 bpm |

### Training Zones

| Zone | Name | HR | Power |
|------|------|----|-------|
| Z1 | REC | <115 | <140W |
| Z2 | EDT1 | 115-125 | 140-165W |
| Z3 | EDT2 | 125-135 | 165-185W |
| Z4 | IDT | 135-155 | 185-230W |
| Z5 | EIT1 | 155-163 | 230-250W |
| Z6 | EIT2 | 163-173 | 250-280W |
| Z7 | IIT | >173 | >280W |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /auth/strava` | Redirect to Strava OAuth |
| `GET /auth/strava/callback` | OAuth callback |
| `GET /auth/logout` | Logout |
| `GET /api/status` | Check auth status |
| `GET /api/activities` | Fetch last 10 activities |
| `POST /api/analyse` | Run Claude analysis |
| `GET /api/profile` | Get athlete profile |

## Tech Stack

- **Backend**: Node.js + Express
- **Auth**: Manual Strava OAuth2 (no passport dependency)
- **AI**: Claude claude-sonnet-4-20250514 via `@anthropic-ai/sdk`
- **Sessions**: express-session
- **HTTP client**: axios
- **Frontend**: Vanilla JS, no framework
