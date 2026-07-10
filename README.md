# linkedin-lib

LinkedIn Auth & Posting SDK. OAuth2, feed posts, images (single & multi), video, reactions. Uses LinkedIn Posts API (`/rest/posts`).

## Install

```bash
npm i linkedin-lib
```

## Setup

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
  reactToPost,
  unlikePost,
} = require('linkedin-lib');
```

### Authorization

```js
const url = getAuthorizationUrl('http://localhost:3456/callback');
// Open in browser → user authorizes → LinkedIn redirects back with ?code=
```

For company page posting, request `w_organization_social` scope:

```js
const url = getAuthorizationUrl('http://localhost:3456/callback', 'openid profile email w_organization_social');
```

### Exchange code for token

```js
const token = await getAccessToken(code, 'http://localhost:3456/callback');
```

### Get user profile

```js
const user = await getUserInfo(token.access_token);
const authorUrn = `urn:li:person:${user.sub}`;
```

### Create a text post

```js
await createPost(token.access_token, 'urn:li:person:12345', 'Hello LinkedIn!');
```

### Create a post with one image

```js
const fs = require('fs');
await createPost(token.access_token, authorUrn, 'My photo', {
  image: { buffer: fs.readFileSync('./photo.png'), mimeType: 'image/png' }
});
```

### Create a post with multiple images (up to 20)

```js
const fs = require('fs');
await createPost(token.access_token, authorUrn, 'Gallery', {
  images: [
    { buffer: fs.readFileSync('./img1.png'), mimeType: 'image/png' },
    { buffer: fs.readFileSync('./img2.png'), mimeType: 'image/png' },
    { buffer: fs.readFileSync('./img3.png'), mimeType: 'image/png' },
  ]
});
```

### Create a post with video

```js
const fs = require('fs');
await createPost(token.access_token, authorUrn, 'My video', {
  video: { buffer: fs.readFileSync('./video.mp4'), mimeType: 'video/mp4' }
});
```

### Delete a post

```js
await deletePost(token.access_token, post.id);
```

### React to a post

```js
await reactToPost(token.access_token, post.urn, 'LIKE');
// Types: LIKE, PRAISE (Celebrate), EMPATHY (Love), INTEREST (Insightful),
//        APPRECIATION (Support), ENTERTAINMENT (Funny)
```

Requires `w_member_social_feed` scope.

### Remove reaction

```js
await unlikePost(token.access_token, post.urn);
```

## API

| Method | Description |
|---|---|
| `getAuthorizationUrl(redirectUri, scope?, state?)` | Build OAuth2 authorization URL |
| `getAccessToken(code, redirectUri)` | Exchange auth code for access token |
| `refreshAccessToken(refreshToken)` | Refresh an expired access token |
| `getUserInfo(accessToken)` | Get authenticated user's profile |
| `createPost(accessToken, authorUrn, commentary, options?)` | Create a post. Options: `image`, `images[]`, `video`, `article` |
| `deletePost(accessToken, postIdOrUrn)` | Delete a post |
| `reactToPost(accessToken, postUrn, reactionType?)` | React to a post (default: LIKE) |
| `unlikePost(accessToken, postUrn)` | Remove your reaction |

The `authorUrn` can be `urn:li:person:{id}` or `urn:li:organization:{id}`. Company posting requires `w_organization_social` scope and appropriate page role.

## Tests

```bash
npm test
```
