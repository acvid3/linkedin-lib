const API_BASE = 'https://api.linkedin.com';
const UGC_POSTS_URL = `${API_BASE}/v2/ugcPosts`;
const REGISTER_UPLOAD_URL = `${API_BASE}/v2/assets?action=registerUpload`;

function _headers(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

async function _request(url, options) {
  const res = await fetch(url, options);
  const data = res.status !== 204 ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw Object.assign(new Error(`Request failed with status code ${res.status}`), { response: { status: res.status, data } });
  }
  return { data, headers: res.headers };
}

async function createPost(accessToken, authorUrn, commentary, options = {}) {
  const {
    visibility = 'PUBLIC',
    lifecycleState = 'PUBLISHED',
    article,
  } = options;

  const body = {
    author: authorUrn,
    lifecycleState,
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: commentary },
        shareMediaCategory: article ? 'ARTICLE' : 'NONE',
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility,
    },
  };

  if (article) {
    body.specificContent['com.linkedin.ugc.ShareContent'].media = [
      {
        status: 'READY',
        originalUrl: article.url,
        title: article.title,
      },
    ];
  }

  const { data, headers } = await _request(UGC_POSTS_URL, {
    method: 'POST',
    headers: {
      ..._headers(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawId = headers.get('x-restli-id') || data?.id || '';
  const id = rawId.replace(/^urn:li:share:/, '');
  return { id, urn: `urn:li:ugcPost:${id}` };
}

async function uploadImage(accessToken, authorUrn, imageBuffer, mimeType = 'image/png') {
  const { data: uploadData } = await _request(REGISTER_UPLOAD_URL, {
    method: 'POST',
    headers: _headers(accessToken),
    body: JSON.stringify({
      registerUploadRequest: {
        owner: authorUrn,
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
        supportedUploadMechanism: ['SYNCHRONOUS_UPLOAD'],
      },
    }),
  });

  const { uploadMechanism, asset } = uploadData.value;
  const uploadUrl = uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: imageBuffer,
  });

  if (!res.ok) {
    throw Object.assign(new Error(`Image upload failed with status code ${res.status}`), { response: { status: res.status } });
  }

  return asset;
}

async function createPostWithImage(accessToken, authorUrn, commentary, imageBuffer, mimeType, options = {}) {
  const asset = await uploadImage(accessToken, authorUrn, imageBuffer, mimeType);

  const visibility = options.visibility || 'PUBLIC';

  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: commentary },
        shareMediaCategory: 'IMAGE',
        media: [
          {
            status: 'READY',
            media: asset,
          },
        ],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': visibility,
    },
  };

  const { data, headers } = await _request(UGC_POSTS_URL, {
    method: 'POST',
    headers: {
      ..._headers(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawId = headers.get('x-restli-id') || data?.id || '';
  const id = rawId.replace(/^urn:li:share:/, '');
  return { id, urn: `urn:li:ugcPost:${id}` };
}

async function deletePost(accessToken, postIdOrUrn) {
  const shareUrn = postIdOrUrn.includes('urn:li:share:')
    ? postIdOrUrn
    : `urn:li:share:${postIdOrUrn}`;

  const url = `${API_BASE}/rest/posts/${encodeURIComponent(shareUrn)}`;

  await _request(url, {
    method: 'DELETE',
    headers: {
      ..._headers(accessToken),
      'LinkedIn-Version': '202606',
      'X-RestLi-Method': 'DELETE',
    },
  });

  return { deleted: true, urn: shareUrn };
}

module.exports = {
  createPost,
  uploadImage,
  createPostWithImage,
  deletePost,
};
