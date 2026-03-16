const axios = require('axios');

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

function getAuthUrl(clientId, redirectUri) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all'
  });
  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

async function exchangeToken(clientId, clientSecret, code) {
  const response = await axios.post(STRAVA_TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code'
  });
  return response.data;
}

async function refreshToken(clientId, clientSecret, refreshToken) {
  const response = await axios.post(STRAVA_TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  return response.data;
}

async function getActivities(accessToken, perPage = 10) {
  const response = await axios.get(`${STRAVA_API_BASE}/athlete/activities`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { per_page: perPage }
  });
  return response.data;
}

async function getActivityDetails(accessToken, activityId) {
  const response = await axios.get(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: { include_all_efforts: false }
  });
  return response.data;
}

async function getAthlete(accessToken) {
  const response = await axios.get(`${STRAVA_API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data;
}

module.exports = { getAuthUrl, exchangeToken, refreshToken, getActivities, getActivityDetails, getAthlete };
