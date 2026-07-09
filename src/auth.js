const AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

function getAuthorizationUrl(redirectUri, scope = 'openid profile email w_member_social', state = '') {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    throw new Error('LINKEDIN_CLIENT_ID is not set');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

async function getAccessToken(code, redirectUri) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(data.error_description || data.error || 'Token request failed'), { response: { status: res.status, data } });
  }

  return data;
}

async function refreshAccessToken(refreshToken) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(data.error_description || data.error || 'Token refresh failed'), { response: { status: res.status, data } });
  }

  return data;
}

async function getUserInfo(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error('Failed to fetch user info'), { response: { status: res.status, data } });
  }

  return data;
}

module.exports = {
  getAuthorizationUrl,
  getAccessToken,
  refreshAccessToken,
  getUserInfo,
};
