const API_BASE = 'https://api.linkedin.com';
const POSTS_URL = `${API_BASE}/rest/posts`;
const REGISTER_IMAGE_URL = `${API_BASE}/rest/images?action=initializeUpload`;

function _headers(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202606',
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

async function _uploadImage(accessToken, authorUrn, imageBuffer, mimeType) {
  const { data: uploadData } = await _request(REGISTER_IMAGE_URL, {
    method: 'POST',
    headers: _headers(accessToken),
    body: JSON.stringify({
      initializeUploadRequest: { owner: authorUrn },
    }),
  });

  const { uploadUrl, image } = uploadData.value;

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: imageBuffer,
  });

  if (!res.ok) {
    throw Object.assign(new Error(`Image upload failed with status code ${res.status}`), { response: { status: res.status } });
  }

  return image;
}

async function createPost(accessToken, authorUrn, commentary, options = {}) {
  const {
    visibility = 'PUBLIC',
    lifecycleState = 'PUBLISHED',
    isReshareDisabledByAuthor = false,
    article,
    image,
    images,
  } = options;

  const body = {
    author: authorUrn,
    commentary,
    visibility,
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState,
    isReshareDisabledByAuthor,
  };

  if (article) {
    body.content = {
      article: { source: article.url, title: article.title },
    };
  }

  if (images && images.length > 1) {
    const assets = await Promise.all(images.map((img) =>
      _uploadImage(accessToken, authorUrn, img.buffer, img.mimeType || 'image/png')
    ));
    body.content = {
      multiImage: {
        images: assets.map((id) => ({ id })),
      },
    };
  } else {
    const img = image || (images && images[0]);
    if (img) {
      const asset = await _uploadImage(accessToken, authorUrn, img.buffer, img.mimeType || 'image/png');
      body.content = {
        media: { id: asset },
      };
    }
  }

  const { data, headers } = await _request(POSTS_URL, {
    method: 'POST',
    headers: {
      ..._headers(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawId = headers.get('x-restli-id') || data?.id || '';
  const id = rawId.replace(/^urn:li:(share|ugcPost):/, '');
  return { id, urn: `urn:li:share:${id}` };
}

async function deletePost(accessToken, postIdOrUrn) {
  const shareUrn = postIdOrUrn.includes('urn:li:share:')
    ? postIdOrUrn
    : `urn:li:share:${postIdOrUrn}`;

  const url = `${API_BASE}/rest/posts/${encodeURIComponent(shareUrn)}`;

  await _request(url, {
    method: 'DELETE',
    headers: _headers(accessToken),
  });

  return { deleted: true, urn: shareUrn };
}

module.exports = {
  createPost,
  deletePost,
};
