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
  it('creates a text post', async () => {
    global.fetch.mockResolvedValue(
      mockFetchResponse({}, { headers: { 'x-restli-id': '456' } })
    );

    const result = await post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'Hello!');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/rest/posts',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test_access_token',
          'LinkedIn-Version': '202606',
        }),
        body: expect.stringContaining('"commentary":"Hello!"'),
      })
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.author).toBe(AUTHOR_URN);
    expect(body.commentary).toBe('Hello!');
    expect(body.visibility).toBe('PUBLIC');
    expect(body.lifecycleState).toBe('PUBLISHED');
    expect(body.content).toBeUndefined();

    expect(result).toEqual({ id: '456', urn: 'urn:li:share:456' });
  });

  it('extracts numeric ID from full URN response', async () => {
    global.fetch.mockResolvedValue(
      mockFetchResponse({ id: 'urn:li:share:999' }, { headers: {} })
    );

    const result = await post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'Test');
    expect(result).toEqual({ id: '999', urn: 'urn:li:share:999' });
  });

  it('includes article content', async () => {
    global.fetch.mockResolvedValue(
      mockFetchResponse({}, { headers: { 'x-restli-id': '789' } })
    );

    await post.createPost(ACCESS_TOKEN, AUTHOR_URN, 'Check this', {
      article: { url: 'https://example.com', title: 'Example' },
    });

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.content).toEqual({ article: { source: 'https://example.com', title: 'Example' } });
  });

  it('uploads image and creates post with media', async () => {
    global.fetch
      .mockResolvedValueOnce(
        mockFetchResponse({
          value: {
            uploadUrl: 'https://upload.linkedin.com/upload',
            image: 'urn:li:image:img123',
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

    expect(result).toEqual({ id: 'post999', urn: 'urn:li:share:post999' });
    expect(global.fetch).toHaveBeenCalledTimes(3);

    const createBody = JSON.parse(global.fetch.mock.calls[2][1].body);
    expect(createBody.content).toEqual({ media: { id: 'urn:li:image:img123' } });
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
