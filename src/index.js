const auth = require('./auth');
const post = require('./post');

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

/** Create a text post (or article post) on the member's LinkedIn feed. */
function createPost(accessToken, authorUrn, commentary, options) {
  return post.createPost(accessToken, authorUrn, commentary, options);
}

/** Register an image upload and upload binary data. Returns asset URN. */
function uploadImage(accessToken, authorUrn, imageBuffer, mimeType) {
  return post.uploadImage(accessToken, authorUrn, imageBuffer, mimeType);
}

/** Upload an image then create a post with it on the member's feed. */
function createPostWithImage(accessToken, authorUrn, commentary, imageBuffer, mimeType, options) {
  return post.createPostWithImage(accessToken, authorUrn, commentary, imageBuffer, mimeType, options);
}

/** Delete a post by numeric ID or full share URN. Only works for API-created posts. */
function deletePost(accessToken, postIdOrUrn) {
  return post.deletePost(accessToken, postIdOrUrn);
}

module.exports = {
  getAuthorizationUrl,
  getAccessToken,
  refreshAccessToken,
  getUserInfo,
  createPost,
  uploadImage,
  createPostWithImage,
  deletePost,
};
