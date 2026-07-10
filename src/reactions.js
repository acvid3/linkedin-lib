const API_BASE = 'https://api.linkedin.com';

function _headers(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202606',
  };
}

async function reactToPost(accessToken, postUrn, reactionType = 'LIKE') {
  const rootUrn = postUrn.includes('urn:li:') ? postUrn : `urn:li:share:${postUrn}`;
  const actor = encodeURIComponent('me');
  const res = await fetch(`${API_BASE}/rest/reactions?actor=${actor}`, {
    method: 'POST',
    headers: {
      ..._headers(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ root: rootUrn, reactionType }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw Object.assign(new Error(`Reaction failed with status code ${res.status}`), { response: { status: res.status, data } });
  }
  return { reacted: true, post: rootUrn, reaction: reactionType };
}

async function unlikePost(accessToken, postUrn) {
  const rootUrn = postUrn.includes('urn:li:') ? postUrn : `urn:li:share:${postUrn}`;
  const actor = encodeURIComponent('me');
  const entity = encodeURIComponent(rootUrn);
  const reactionId = `(actor:${actor},entity:${entity})`;

  const res = await fetch(`${API_BASE}/rest/reactions/${reactionId}`, {
    method: 'DELETE',
    headers: _headers(accessToken),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw Object.assign(new Error(`Unlike failed with status code ${res.status}`), { response: { status: res.status, data } });
  }
  return { deleted: true, post: rootUrn };
}

module.exports = {
  reactToPost,
  unlikePost,
};
