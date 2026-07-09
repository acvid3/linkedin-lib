# linkedin-lib

LinkedIn Auth & Posting SDK. OAuth2, feed posts, image upload.

## Install

```bash
npm install git+https://github.com/acvid3/linkedin-lib.git
```

## Setup

Create a `.env` file:

```env
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

## Usage

```js
const {
  getAuthorizationUrl,
  getAccessToken,
  getUserInfo,
  createPost,
  createPostWithImage,
  deletePost,
} = require('linkedin-lib');
```

### 1. Authorization URL

```js
const url = getAuthorizationUrl('http://localhost:3456/callback');
// Open in browser → user authorizes → LinkedIn redirects back with ?code=
```

### 2. Exchange code for token

```js
const token = await getAccessToken(code, 'http://localhost:3456/callback');
// token.access_token  — use for API calls
// token.refresh_token — optional, for token refresh
```

### 3. Get user profile

```js
const user = await getUserInfo(token.access_token);
// user.sub → person ID for URN
const authorUrn = `urn:li:person:${user.sub}`;
```

### 4. Create a text post

```js
const post = await createPost(token.access_token, authorUrn, 'Hello LinkedIn!');
// post.id  → "7481035440674725889"
// post.urn → "urn:li:ugcPost:7481035440674725889"
```

### 5. Create a post with an image

```js
const fs = require('fs');
const buffer = fs.readFileSync('./photo.png');
const post = await createPostWithImage(token.access_token, authorUrn, 'My photo', buffer, 'image/png');
```

### 6. Delete a post

```js
await deletePost(token.access_token, post.id);
```

## API

| Method | Description |
|---|---|
| `getAuthorizationUrl(redirectUri, scope?, state?)` | Build OAuth2 authorization URL |
| `getAccessToken(code, redirectUri)` | Exchange auth code for access token |
| `refreshAccessToken(refreshToken)` | Refresh an expired access token |
| `getUserInfo(accessToken)` | Get authenticated user's profile |
| `createPost(accessToken, authorUrn, commentary, options?)` | Create a text or article post |
| `uploadImage(accessToken, authorUrn, buffer, mimeType)` | Upload an image, return asset URN |
| `createPostWithImage(accessToken, authorUrn, commentary, buffer, mimeType)` | Upload image and create a post |
| `deletePost(accessToken, postIdOrUrn)` | Delete a post by ID or share URN |

## Tests

```bash
npm test
```
