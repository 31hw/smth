import request, { getBaseUrl, getFullUrl } from '../lib/request';

export const getMyInfo = () => {
  return request('GET', getFullUrl('users', '/v1/users/authenticated')).then((d) => d.data);
};

export const getUserInfo = ({ userId }) => {
  return request('GET', getFullUrl('users', `/v1/users/${userId}`)).then((d) => d.data);
};

export const getUserStatus = ({ userId }) => {
  return request('GET', getFullUrl('users', `/v1/users/${userId}/status`))
    .then((d) => d.data || { status: '' })
    .catch(() => ({ status: '' }));
};

export const updateStatus = async ({ newStatus, userId }) => {
  try {
    const res = await request('PATCH', getFullUrl('users', `/v1/users/${userId}/status`), {
      status: newStatus,
    });
    return res.data;
  } catch (_) {
    // Modern Roblox retired status in favor of profile description; return local status gracefully
    return { status: newStatus };
  }
};

export const getPreviousUsernames = async ({ userId }) => {
  let cursor = '';
  const names = [];
  let guard = 0;
  try {
    do {
      const results = await request(
        'GET',
        getFullUrl(
          'users',
          `/v1/users/${userId}/username-history?limit=100&sortOrder=Desc&cursor=${encodeURIComponent(
            cursor || ''
          )}`
        )
      );
      (results?.data?.data || []).forEach((v) => names.push(v.name));
      cursor = results?.data?.nextPageCursor || null;
      guard++;
    } while (cursor !== null && guard < 5);
  } catch (_) {
    // ignore username history errors
  }
  return names;
};

export const searchUsers = async ({ keyword, limit = 12, offset = 0 }) => {
  const cleanKeyword = String(keyword || '').trim();
  if (!cleanKeyword) {
    return {
      Keyword: '',
      StartIndex: 0,
      MaxRows: limit,
      TotalResults: 0,
      UserSearchResults: [],
    };
  }
  const validLimits = [10, 25, 50, 100];
  const safeLimit = validLimits.find((l) => l >= Number(limit)) || 25;

  try {
    const res = await request(
      'GET',
      getFullUrl(
        'users',
        `/v1/users/search?keyword=${encodeURIComponent(cleanKeyword)}&limit=${safeLimit}`
      )
    );
    const list = res?.data?.data || [];
    return {
      Keyword: cleanKeyword,
      StartIndex: offset || 0,
      MaxRows: safeLimit,
      TotalResults: list.length,
      UserSearchResults: list.map((u) => ({
        UserId: u.id,
        Name: u.name,
        DisplayName: u.displayName || u.name,
        Blurb: '',
        PreviousUserNamesCsv: Array.isArray(u.previousUsernames)
          ? u.previousUsernames.join(', ')
          : '',
        IsOnline: false,
        UserProfilePageUrl: `/users/${u.id}/profile`,
      })),
    };
  } catch (_) {
    // Fallback to omni-search if users/search is rate-limited
    try {
      const omni = await request(
        'GET',
        getFullUrl(
          'apis',
          `/search-api/omni-search?searchQuery=${encodeURIComponent(
            cleanKeyword
          )}&pageToken=&sessionId=classic-user-search&pageType=Players`
        )
      );
      const groups = omni?.data?.searchResults || [];
      const users = [];
      for (const g of groups) {
        for (const c of g.contents || []) {
          if (c.contentType === 'User' || c.username) {
            users.push({
              UserId: c.contentId,
              Name: c.username,
              DisplayName: c.displayName || c.username,
              Blurb: '',
              PreviousUserNamesCsv: (c.previousUsernames || []).join(', '),
              IsOnline: false,
              UserProfilePageUrl: `/users/${c.contentId}/profile`,
            });
          }
        }
      }
      return {
        Keyword: cleanKeyword,
        StartIndex: offset || 0,
        MaxRows: limit,
        TotalResults: users.length,
        UserSearchResults: users,
      };
    } catch (__) {
      return {
        Keyword: cleanKeyword,
        StartIndex: 0,
        MaxRows: limit,
        TotalResults: 0,
        UserSearchResults: [],
      };
    }
  }
};

export const getMembershipType = async ({ userId }) => {
  if (!userId) return 0;
  return request(
    'GET',
    getFullUrl('premiumfeatures', `/v1/users/${userId}/validate-membership`)
  )
    .then((d) => {
      if (d?.data === true) return 4;
      if (d?.data === false) return 0;
      return Number(d?.data) || 0;
    })
    .catch(() => 0);
};

export const getUserIdByUsername = async (username) => {
  const result = await request('POST', getFullUrl('users', '/v1/usernames/users'), {
    usernames: [username],
    excludeBannedUsers: false,
  });
  if (!result?.data?.data?.length) {
    throw new Error('Invalid username');
  }
  return result.data.data[0].id;
};
