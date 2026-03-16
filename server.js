require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { getAuthUrl, exchangeToken, refreshToken, getActivities, getAthlete } = require('./strava');
const { getTrainingAdvice } = require('./claude-coach');
const { athleteProfile, estimateTSS, getZoneForHR, getZoneForPower } = require('./athlete-profile');

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.STRAVA_CLIENT_ID || '118880';
const CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/auth/strava/callback`;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'strava-coach-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Middleware to refresh expired tokens
async function ensureValidToken(req, res, next) {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (req.session.tokens.expires_at && req.session.tokens.expires_at < now + 60) {
    try {
      const newTokens = await refreshToken(CLIENT_ID, CLIENT_SECRET, req.session.tokens.refresh_token);
      req.session.tokens = {
        ...req.session.tokens,
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: newTokens.expires_at
      };
    } catch (err) {
      req.session.destroy();
      return res.status(401).json({ error: 'Token refresh failed, please login again' });
    }
  }
  next();
}

// Routes

app.get('/auth/strava', (req, res) => {
  const url = getAuthUrl(CLIENT_ID, REDIRECT_URI);
  res.redirect(url);
});

app.get('/auth/strava/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/?error=access_denied');
  }

  try {
    const tokenData = await exchangeToken(CLIENT_ID, CLIENT_SECRET, code);
    req.session.tokens = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at
    };
    req.session.athlete = tokenData.athlete;
    res.redirect('/');
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.redirect('/?error=auth_failed');
  }
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/api/status', (req, res) => {
  if (req.session.tokens && req.session.athlete) {
    res.json({
      authenticated: true,
      athlete: {
        firstname: req.session.athlete.firstname,
        lastname: req.session.athlete.lastname,
        profile_medium: req.session.athlete.profile_medium,
        city: req.session.athlete.city,
        country: req.session.athlete.country
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/api/activities', ensureValidToken, async (req, res) => {
  try {
    const activities = await getActivities(req.session.tokens.access_token, 10);

    const enriched = activities.map(activity => {
      const zone = activity.average_watts
        ? getZoneForPower(activity.average_watts)
        : getZoneForHR(activity.average_heartrate);

      return {
        id: activity.id,
        name: activity.name,
        type: activity.type,
        start_date_local: activity.start_date_local,
        moving_time: activity.moving_time,
        distance: activity.distance,
        average_heartrate: activity.average_heartrate,
        max_heartrate: activity.max_heartrate,
        average_watts: activity.average_watts,
        max_watts: activity.max_watts,
        weighted_average_watts: activity.weighted_average_watts,
        suffer_score: activity.suffer_score,
        kilojoules: activity.kilojoules,
        tss: estimateTSS(activity),
        zone: zone ? { id: zone.id, name: zone.name, label: zone.label } : null
      };
    });

    res.json({ activities: enriched });
  } catch (err) {
    console.error('Activities error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.post('/api/analyse', ensureValidToken, async (req, res) => {
  try {
    const activities = await getActivities(req.session.tokens.access_token, 10);

    if (!activities || activities.length === 0) {
      return res.status(400).json({ error: 'Geen activiteiten gevonden' });
    }

    const advice = await getTrainingAdvice(activities);
    res.json({ advice });
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: 'Analyse mislukt: ' + err.message });
  }
});

app.get('/api/profile', (req, res) => {
  res.json({ profile: athleteProfile });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚴 Strava Coach running at http://localhost:${PORT}`);
  console.log(`📋 Add this callback URL in your Strava app settings:`);
  console.log(`   http://localhost:${PORT}/auth/strava/callback\n`);
});
