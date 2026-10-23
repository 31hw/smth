import request, { getFullUrl } from '../lib/request';

function normalizeBadgeLimit(limit) {
  const valid = [10, 25, 50, 100];
  const n = Number(limit) || 25;
  if (valid.includes(n)) return n;
  return valid.reduce((prev, curr) => (Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev), 25);
}

export const getBadgeInfoByID = ({ badgeId }) => {
  return request('GET', getFullUrl('badges', `/v1/badges/${badgeId}`)).then((d) => d.data);
};

export const getBadgeInfoBasicByID = ({ badgeId }) => {
  return request('GET', getFullUrl('badges', `/v1/badges/${badgeId}`)).then((d) => d.data);
};

export const getUserBadges = ({ userId, cursor = null, limit = 25 }) => {
  const safeLimit = normalizeBadgeLimit(limit);
  let url = `/v1/users/${userId}/badges?limit=${safeLimit}&sortOrder=Desc`;
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`;
  }
  return request('GET', getFullUrl('badges', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getUniverseBadges = ({ universeId, cursor = null, limit = 25 }) => {
  const safeLimit = normalizeBadgeLimit(limit);
  let url = `/v1/universes/${universeId}/badges?limit=${safeLimit}&sortOrder=Asc`;
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`;
  }
  return request('GET', getFullUrl('badges', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getBadgeAwardedDates = ({ userId, badgeIds }) => {
  const cleanIds = [...new Set((badgeIds || []).map(Number).filter((n) => n > 0))];
  if (!cleanIds.length) return Promise.resolve({ data: [] });
  return request(
    'GET',
    getFullUrl('badges', `/v1/users/${userId}/badges/awarded-dates?badgeIds=${encodeURIComponent(cleanIds.join(','))}`)
  )
    .then((d) => (Array.isArray(d?.data?.data) ? d.data : { data: [] }))
    .catch(() => ({ data: [] }));
};

export const removeBadgeFromSelf = ({ badgeId }) => {
  return request('DELETE', getFullUrl('badges', `/v1/users/badges/${badgeId}`)).then((d) => d.data);
};

export const updateBadge = ({ badgeId, enabled }) => {
  return request('PATCH', getFullUrl('badges', `/v1/badges/${badgeId}`), {
    enabled,
  });
};
