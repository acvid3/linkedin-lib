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
        }),
        body: expect.stringContaining('"shareCommentary":{"text":"Hello!"}'),
      })
    );
    expect(result).toEqual({ id: '456', urn: 'urn:li:ugcPost:456' });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('NONE');
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

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('ARTICLE');
    expect(body.specificContent['com.linkedin.ugc.ShareContent'].media).toEqual([
      { status: 'READY', originalUrl: 'https://example.com', title: 'Example' },
    ]);
  });

  it('uploads image and creates post with image', async () => {
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

    const result = await post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'With image', {
      image: { buffer: Buffer.from('img'), mimeType: 'image/png' },
    });

    expect(result).toEqual({ id: 'post999', urn: 'urn:li:ugcPost:post999' });
    expect(global.fetch).toHaveBeenCalledTimes(3);

    const createCall = global.fetch.mock.calls[2];
    const createBody = JSON.parse(createCall[1].body);
    expect(createBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('IMAGE');
    expect(createBody.specificContent['com.linkedin.ugc.ShareContent'].media).toEqual([
      { status: 'READY', media: 'urn:li:digitalmediaAsset:img123' },
    ]);
  });

  it('uploads multiple images and creates carousel post', async () => {
    global.fetch
      .mockResolvedValueOnce(mockFetchResponse({ value: { uploadMechanism: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: 'https://upload.li/1' } }, asset: 'urn:li:digitalmediaAsset:a1' } }))
      .mockResolvedValueOnce(mockFetchResponse(null))
      .mockResolvedValueOnce(mockFetchResponse({ value: { uploadMechanism: { 'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': { uploadUrl: 'https://upload.li/2' } }, asset: 'urn:li:digitalmediaAsset:a2' } }))
      .mockResolvedValueOnce(mockFetchResponse(null))
      .mockResolvedValueOnce(mockFetchResponse({}, { headers: { 'x-restli-id': 'carousel' } }));

    const imgs = [
      { buffer: Buffer.from('img1'), mimeType: 'image/png' },
      { buffer: Buffer.from('img2'), mimeType: 'image/jpeg' },
    ];

    const result = await post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'Carousel', { images: imgs });

    expect(result).toEqual({ id: 'carousel', urn: 'urn:li:ugcPost:carousel' });
    expect(global.fetch).toHaveBeenCalledTimes(5);

    const body = JSON.parse(global.fetch.mock.calls[4][1].body);
    expect(body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('MULTI_IMAGE');
    expect(body.specificContent['com.linkedin.ugc.ShareContent'].media).toEqual([
      { status: 'READY', media: 'urn:li:digitalmediaAsset:a1' },
      { status: 'READY', media: 'urn:li:digitalmediaAsset:a2' },
    ]);
  });

  it('throws on API error', async () => {
    global.fetch.mockResolvedValue(mockFetchResponse({ message: 'Bad request' }, { ok: false, status: 400 }));

    await expect(post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'test')).rejects.toThrow('Request failed with status code 400');
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
