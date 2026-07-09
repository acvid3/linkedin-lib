const post = require('../src/post');

function mockFetchResponse(data, { ok = true, status = 200, headers = {} } = {}) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    headers: { get: (key) => headers[key] || null },
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
});

const ACCESS_TOKEN = 'test_access_token';
const AUTHOR_URN = 'urn:li:person:abc123';

describe('createPost', () => {
  it('creates a text post and returns id and urn', async () => {
    global.fetch.mockResolvedValue(
      mockFetchResponse({}, { headers: { 'x-restli-id': '456' } })
    );

    const result = await post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'Hello!');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/v2/ugcPosts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test_access_token',
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('"shareCommentary":{"text":"Hello!"}'),
      })
    );
    expect(result).toEqual({ id: '456', urn: 'urn:li:ugcPost:456' });
  });

  it('extracts numeric ID from full URN response', async () => {
    global.fetch.mockResolvedValue(
      mockFetchResponse({ id: 'urn:li:share:999' }, { headers: {} })
    );

    const result = await post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'Test');

    expect(result).toEqual({ id: '999', urn: 'urn:li:ugcPost:999' });
  });

  it('includes article content when provided', async () => {
    global.fetch.mockResolvedValue(
      mockFetchResponse({}, { headers: { 'x-restli-id': '789' } })
    );

    await post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'Check this', {
      article: { url: 'https://example.com', title: 'Example' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"shareMediaCategory":"ARTICLE"'),
      })
    );
  });

  it('throws on API error', async () => {
    global.fetch.mockResolvedValue(mockFetchResponse({ message: 'Bad request' }, { ok: false, status: 400 }));

    await expect(post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'test')).rejects.toThrow('Request failed with status code 400');
  });
});

describe('uploadImage', () => {
  it('registers upload, uploads image, returns asset URN', async () => {
    global.fetch
      .mockResolvedValueOnce(
        mockFetchResponse({
          value: {
            uploadMechanism: {
              'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                uploadUrl: 'https://upload.linkedin.com/upload',
              },
            },
            asset: 'urn:li:digitalmediaAsset:img123',
          },
        })
      )
      .mockResolvedValueOnce(mockFetchResponse(null));

    const buffer = Buffer.from('fake-image-data');
    const result = await post.uploadImage(ACCESS_TOKEN, AUTHOR_URN, buffer, 'image/jpeg');

    expect(global.fetch).toHaveBeenNthCalledWith(1,
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"owner":"urn:li:person:abc123"'),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(2,
      'https://upload.linkedin.com/upload',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: buffer,
      })
    );
    expect(result).toBe('urn:li:digitalmediaAsset:img123');
  });
});

describe('createPostWithImage', () => {
  it('uploads image then creates post with media', async () => {
    global.fetch
      .mockResolvedValueOnce(
        mockFetchResponse({
          value: {
            uploadMechanism: {
              'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                uploadUrl: 'https://upload.linkedin.com/upload',
              },
            },
            asset: 'urn:li:digitalmediaAsset:img123',
          },
        })
      )
      .mockResolvedValueOnce(mockFetchResponse(null))
      .mockResolvedValueOnce(
        mockFetchResponse({}, { headers: { 'x-restli-id': 'post999' } })
      );

    const buffer = Buffer.from('img');
    const result = await post.createPostWithImage(ACCESS_TOKEN, AUTHOR_URN, 'With image', buffer, 'image/png');

    expect(result).toEqual({ id: 'post999', urn: 'urn:li:ugcPost:post999' });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('extracts numeric ID from share URN in createPostWithImage', async () => {
    global.fetch
      .mockResolvedValueOnce(
        mockFetchResponse({
          value: {
            uploadMechanism: {
              'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                uploadUrl: 'https://upload.linkedin.com/upload',
              },
            },
            asset: 'urn:li:digitalmediaAsset:img123',
          },
        })
      )
      .mockResolvedValueOnce(mockFetchResponse(null))
      .mockResolvedValueOnce(
        mockFetchResponse({ id: 'urn:li:share:555' }, { headers: {} })
      );

    const result = await post.createPostWithImage(ACCESS_TOKEN, AUTHOR_URN, 'test', Buffer.from('x'), 'image/png');
    expect(result).toEqual({ id: '555', urn: 'urn:li:ugcPost:555' });
  });
});

describe('deletePost', () => {
  it('deletes post by numeric id', async () => {
    global.fetch.mockResolvedValue(mockFetchResponse(null, { status: 204 }));

    const result = await post.deletePost(ACCESS_TOKEN, '123');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/posts/urn%3Ali%3Ashare%3A123',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer test_access_token',
          'LinkedIn-Version': '202606',
          'X-RestLi-Method': 'DELETE',
        }),
      })
    );
    expect(result).toEqual({ deleted: true, urn: 'urn:li:share:123' });
  });

  it('deletes post by full share URN', async () => {
    global.fetch.mockResolvedValue(mockFetchResponse(null, { status: 204 }));

    const result = await post.deletePost(ACCESS_TOKEN, 'urn:li:share:456');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/posts/urn%3Ali%3Ashare%3A456',
      expect.anything()
    );
    expect(result).toEqual({ deleted: true, urn: 'urn:li:share:456' });
  });
});
