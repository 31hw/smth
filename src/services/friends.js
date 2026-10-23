import request, { getFullUrl } from '../lib/request';

function normalizeFriendLimit(limit) {
  const valid = [10, 18, 25, 50, 100];
  const n = Number(limit) || 18;
  if (valid.includes(n)) return n;
  return valid.reduce((prev, curr) => (Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev), 18);
}

export const getFriends = ({ userId }) => {
  if (!userId) return Promise.resolve([]);
  return request('GET', getFullUrl('friends', `/v1/users/${userId}/friends`))
    .then((d) => d.data?.data || [])
    .catch(() => []);
};

export const getFriendRequestCount = () => {
  return request('GET', getFullUrl('friends', `/v1/user/friend-requests/count`))
    .then((d) => d.data?.count ?? 0)
    .catch(() => 0);
};

export const getFollowersCount = ({ userId }) => {
  if (!userId) return Promise.resolve(0);
  return request('GET', getFullUrl('friends', `/v1/users/${userId}/followers/count`))
    .then((d) => d.data?.count ?? 0)
    .catch(() => 0);
};

export const getFollowers = ({ userId, cursor, limit = 18, sort = 'Asc' }) => {
  const safeLimit = normalizeFriendLimit(limit);
  let url = `/v1/users/${userId}/followers?sortOrder=${encodeURIComponent(sort || 'Asc')}&limit=${safeLimit}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
  return request('GET', getFullUrl('friends', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getFollowingsCount = ({ userId }) => {
  if (!userId) return Promise.resolve(0);
  return request('GET', getFullUrl('friends', `/v1/users/${userId}/followings/count`))
    .then((d) => d.data?.count ?? 0)
    .catch(() => 0);
};

export const getFollowings = ({ userId, cursor, limit = 18, sort = 'Asc' }) => {
  const safeLimit = normalizeFriendLimit(limit);
  let url = `/v1/users/${userId}/followings?sortOrder=${encodeURIComponent(sort || 'Asc')}&limit=${safeLimit}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
  return request('GET', getFullUrl('friends', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getFriendStatus = ({ authenticatedUserId, userId }) => {
  if (!authenticatedUserId || !userId) return Promise.resolve('NotFriends');
  return request(
    'GET',
    getFullUrl('friends', `/v1/users/${authenticatedUserId}/friends/statuses?userIds=${userId}`)
  )
    .then((d) => d.data?.data?.[0]?.status || 'NotFriends')
    .catch(() => 'NotFriends');
};

export const getFriendRequests = ({ cursor, limit = 18 }) => {
  const safeLimit = normalizeFriendLimit(limit);
  let url = `/v1/my/friends/requests?limit=${safeLimit}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
  return request('GET', getFullUrl('friends', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const unfriendUser = ({ userId }) => {
  return request('POST', getFullUrl('friends', `/v1/users/${userId}/unfriend`), {});
};

export const acceptFriendRequest = ({ userId }) => {
  return request('POST', getFullUrl('friends', `/v1/users/${userId}/accept-friend-request`), {});
};

export const declineFriendRequest = ({ userId }) => {
  return request('POST', getFullUrl('friends', `/v1/users/${userId}/decline-friend-request`), {});
};

export const sendFriendRequest = ({ userId }) => {
  return request('POST', getFullUrl('friends', `/v1/users/${userId}/request-friendship`), {
    friendshipOriginSourceType: 'UserProfile',
  });
};

export const followUser = ({ userId }) => {
  return request('POST', getFullUrl('friends', `/v1/users/${userId}/follow`), {});
};

export const unfollowUser = ({ userId }) => {
  return request('POST', getFullUrl('friends', `/v1/users/${userId}/unfollow`), {});
};

export const removeFollower = ({ userId }) => {
  return request('POST', getFullUrl('friends', `/v1/users/${userId}/remove-follower`), {});
};

export const getFollowingStatus = ({ userIds }) => {
  const clean = (userIds || []).map(Number).filter((n) => n > 0);
  if (!clean.length) return Promise.resolve([]);
  return request('POST', getFullUrl('friends', `/v1/user/following-exists`), {
    targetUserIds: clean,
  })
    .then((d) => d.data?.followings || [])
    .catch(() => []);
};

export const isAuthenticatedUserFollowingUserId = ({ userId }) => {
  if (!userId) return Promise.resolve(false);
  return getFollowingStatus({ userIds: [userId] })
    .then((result) => Boolean(result?.[0]?.isFollowing))
    .catch(() => false);
};
