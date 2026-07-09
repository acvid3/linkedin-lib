const auth = require('../src/auth');

const OLD_ENV = process.env;

function mockFetchResponse(data, { ok = true, status = 200 } = {}) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  process.env = { ...OLD_ENV };
  process.env.LINKEDIN_CLIENT_ID = 'test_client_id';
  process.env.LINKEDIN_CLIENT_SECRET = 'test_client_secret';
  global.fetch = jest.fn();
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe('getAuthorizationUrl', () => {
  it('builds correct authorization URL', () => {
    const url = auth.getAuthorizationUrl('https://example.com/callback', 'openid profile', 'abc123');
    expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization');
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=test_client_id');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
    expect(url).toContain('scope=openid+profile');
    expect(url).toContain('state=abc123');
  });

  it('uses default scope when not provided', () => {
    const url = auth.getAuthorizationUrl('https://example.com/callback');
    expect(url).toContain('openid+profile+email+w_member_social');
  });

  it('throws when LINKEDIN_CLIENT_ID is missing', () => {
    process.env.LINKEDIN_CLIENT_ID = '';
    expect(() => auth.getAuthorizationUrl('https://example.com/callback')).toThrow('LINKEDIN_CLIENT_ID');
  });
});

describe('getAccessToken', () => {
  it('exchanges code for access token', async () => {
    const fakeToken = { access_token: 'atoken', expires_in: 5184000 };
    global.fetch.mockResolvedValue(mockFetchResponse(fakeToken));

    const result = await auth.getAccessToken('authcode', 'https://example.com/callback');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.linkedin.com/oauth/v2/accessToken',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: expect.stringContaining('grant_type=authorization_code'),
      })
    );
    expect(result).toEqual(fakeToken);
  });

  it('throws on API error', async () => {
    global.fetch.mockResolvedValue(mockFetchResponse({ error: 'invalid_grant' }, { ok: false, status: 400 }));

    await expect(auth.getAccessToken('bad_code', 'uri')).rejects.toThrow('invalid_grant');
  });

  it('throws when credentials are missing', async () => {
    process.env.LINKEDIN_CLIENT_ID = '';
    await expect(auth.getAccessToken('code', 'uri')).rejects.toThrow('LINKEDIN_CLIENT_ID');
  });
});

describe('refreshAccessToken', () => {
  it('refreshes token', async () => {
    const fakeToken = { access_token: 'new_token', refresh_token: 'new_refresh' };
    global.fetch.mockResolvedValue(mockFetchResponse(fakeToken));

    const result = await auth.refreshAccessToken('old_refresh');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.linkedin.com/oauth/v2/accessToken',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('grant_type=refresh_token'),
      })
    );
    expect(result).toEqual(fakeToken);
  });
});

describe('getUserInfo', () => {
  it('fetches user info', async () => {
    const fakeUser = { sub: '123', name: 'Test User' };
    global.fetch.mockResolvedValue(mockFetchResponse(fakeUser));

    const result = await auth.getUserInfo('atoken');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.linkedin.com/v2/userinfo',
      expect.objectContaining({
        headers: { Authorization: 'Bearer atoken' },
      })
    );
    expect(result).toEqual(fakeUser);
  });
});
