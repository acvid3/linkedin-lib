# linkedin-lib

LinkedIn Auth & Posting SDK. OAuth2, feed posts, image upload. Supports both personal profiles and company pages.

## Install

```bash
npm i linkedin-lib
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
  deletePost,
} = require('linkedin-lib');
```

### 1. Authorization URL

```js
const url = getAuthorizationUrl('http://localhost:3456/callback');
// Open in browser → user authorizes → LinkedIn redirects back with ?code=
```

For company page posting, request the `w_organization_social` scope:

```js
const url = getAuthorizationUrl('http://localhost:3456/callback', 'openid profile email w_organization_social');
```

### 2. Exchange code for token

```js
const token = await getAccessToken(code, 'http://localhost:3456/callback');
```

### 3. Get user profile

```js
const user = await getUserInfo(token.access_token);
const authorUrn = `urn:li:person:${user.sub}`;
```

### 4. Create a text post

**On personal profile:**

```js
const post = await createPost(token.access_token, 'urn:li:person:12345', 'Hello LinkedIn!');
```

**On company page:**

```js
const post = await createPost(token.access_token, 'urn:li:organization:67890', 'Hello from our company!');
```

### 5. Create a post with image(s)

```js
const fs = require('fs');

// Single image
const post = await createPost(token.access_token, authorUrn, 'My photo', {
  image: { buffer: fs.readFileSync('./photo.png'), mimeType: 'image/png' }
});

// Multiple images (carousel)
const post = await createPost(token.access_token, authorUrn, 'Carousel', {
  images: [
    { buffer: fs.readFileSync('./img1.png'), mimeType: 'image/png' },
    { buffer: fs.readFileSync('./img2.jpg'), mimeType: 'image/jpeg' },
  ]
});
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
| `createPost(accessToken, authorUrn, commentary, options?)` | Create a post (text, image, or article). Image: `{ image: { buffer, mimeType } }` |
| `deletePost(accessToken, postIdOrUrn)` | Delete a post by ID or share URN |

The `authorUrn` parameter can be either a person (`urn:li:person:{id}`) or an organization (`urn:li:organization:{id}`). Company page posting requires the `w_organization_social` scope and the appropriate company page role (ADMINISTRATOR, CONTENT_ADMIN, or DIRECT_SPONSORED_CONTENT_POSTER).

## Tests

```bash
npm test
```
