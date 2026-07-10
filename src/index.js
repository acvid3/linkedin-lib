const auth = require('./auth');
const post = require('./post');
const reactions = require('./reactions');

/**
 * Build LinkedIn OAuth authorization URL. Redirect user here to authorize.
 * @param {string} redirectUri - Local callback URL (e.g. http://localhost:3456/callback).
 * @param {string} [scope='openid profile email w_member_social'] - OAuth scopes.
 * @param {string} [state=''] - CSRF state parameter.
 * @returns {string} Authorization URL to open in browser.
 */
function getAuthorizationUrl(redirectUri, scope = 'openid profile email w_member_social', state = '') {
  return auth.getAuthorizationUrl(redirectUri, scope, state);
}

/**
 * Exchange authorization code for access token.
 * @param {string} code - Code from callback query param.
 * @param {string} redirectUri - Must match the one used in getAuthorizationUrl.
 * @returns {Promise<{access_token: string, refresh_token?: string, expires_in: number}>}
 */
function getAccessToken(code, redirectUri) {
  return auth.getAccessToken(code, redirectUri);
}

/**
 * Refresh an expired access token.
 * @param {string} refreshToken - From getAccessToken response.
 * @returns {Promise<{access_token: string, refresh_token?: string}>}
 */
function refreshAccessToken(refreshToken) {
  return auth.refreshAccessToken(refreshToken);
}

/**
 * Get authenticated user's profile.
 * @param {string} accessToken
 * @returns {Promise<{sub: string, name?: string, email?: string, picture?: string}>}
 */
function getUserInfo(accessToken) {
  return auth.getUserInfo(accessToken);
}

/**
 * Create a post on LinkedIn feed.
 * @param {string} accessToken
 * @param {string} authorUrn - `urn:li:person:{id}` or `urn:li:organization:{id}`.
 * @param {string} commentary - Post text.
 * @param {object} [options]
 * @param {object} [options.image] - Single image: `{ buffer: Buffer, mimeType: string }`.
 * @param {object[]} [options.images] - Multiple images (2-20): `[{ buffer: Buffer, mimeType: string }]`.
 * @param {object} [options.video] - Attach video: `{ buffer: Buffer, mimeType: string }`.
 * @param {object} [options.article] - Attach article: `{ url: string, title: string }`.
 * @param {string} [options.visibility='PUBLIC']
 * @returns {Promise<{id: string, urn: string}>} `{ id: '123', urn: 'urn:li:share:123' }`
 */
function createPost(accessToken, authorUrn, commentary, options) {
  return post.createPost(accessToken, authorUrn, commentary, options);
}

/**
 * Delete a post.
 * @param {string} accessToken
 * @param {string} postIdOrUrn - Numeric ID or full URN.
 * @returns {Promise<{deleted: boolean, urn: string}>}
 */
function deletePost(accessToken, postIdOrUrn) {
  return post.deletePost(accessToken, postIdOrUrn);
}

/**
 * React to a post. Requires `w_member_social_feed` scope.
 * @param {string} accessToken
 * @param {string} postUrn - Post URN (e.g. `urn:li:share:123`).
 * @param {'LIKE'|'PRAISE'|'EMPATHY'|'INTEREST'|'APPRECIATION'|'ENTERTAINMENT'} [reactionType='LIKE']
 * @returns {Promise<{reacted: boolean, post: string, reaction: string}>}
 */
function reactToPost(accessToken, postUrn, reactionType) {
  return reactions.reactToPost(accessToken, postUrn, reactionType);
}

/**
 * Remove your reaction from a post.
 * @param {string} accessToken
 * @param {string} postUrn - Post URN.
 * @returns {Promise<{deleted: boolean, post: string}>}
 */
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
