const auth = require('./auth');
const post = require('./post');
const reactions = require('./reactions');

/** Build LinkedIn OAuth authorization URL. Redirect user here. */
function getAuthorizationUrl(redirectUri, scope = 'openid profile email w_member_social', state = '') {
  return auth.getAuthorizationUrl(redirectUri, scope, state);
}

/** Exchange authorization code for access + refresh tokens. */
function getAccessToken(code, redirectUri) {
  return auth.getAccessToken(code, redirectUri);
}

/** Refresh an expired access token using a refresh token. */
function refreshAccessToken(refreshToken) {
  return auth.refreshAccessToken(refreshToken);
}

/** Get authenticated user's profile info (name, email, sub). */
function getUserInfo(accessToken) {
  return auth.getUserInfo(accessToken);
}

/**
 * Create a post on LinkedIn feed (Posts API).
 * @param {object} options - Optional parameters.
 * @param {object} options.image - Attach an image. Format: { buffer: Buffer, mimeType: string }.
 * @param {object} options.article - Attach an article link. Format: { url: string, title: string }.
 * @returns {Promise<{id: string, urn: string}>} `{ id: '123', urn: 'urn:li:share:123' }`
 */
function createPost(accessToken, authorUrn, commentary, options) {
  return post.createPost(accessToken, authorUrn, commentary, options);
}

/** Delete a post by numeric ID or full share URN. */
function deletePost(accessToken, postIdOrUrn) {
  return post.deletePost(accessToken, postIdOrUrn);
}

/** React to a post (LIKE, PRAISE, EMPATHY, INTEREST, APPRECIATION, ENTERTAINMENT). */
function reactToPost(accessToken, postUrn, reactionType) {
  return reactions.reactToPost(accessToken, postUrn, reactionType);
}

/** Remove your reaction from a post. */
function unlikePost(accessToken, postUrn) {
  return reactions.unlikePost(accessToken, postUrn);
}

module.exports = {
  getAuthorizationUrl,
  getAccessToken,
  refreshAccessToken,
  getUserInfo,
  createPost,
  deletePost,
  reactToPost,
  unlikePost,
};
