import request, { getFullUrl } from '../lib/request';

export const getUserRobloxBadges = ({ userId }) => {
  return request('GET', getFullUrl('accountinformation', `/v1/users/${userId}/roblox-badges`))
    .then((d) => d.data || [])
    .catch(() => []);
};

export const setUserDescription = ({ newDescription }) => {
  return request('POST', getFullUrl('accountinformation', '/v1/description'), {
    description: newDescription,
  });
};

export const getUserConnections = ({ userId, returnUrls = false }) => {
  return request(
    'GET',
    getFullUrl('accountinformation', `/v1/users/${userId}/promotion-channels?alwaysReturnUrls=${returnUrls}`)
  )
    .then((d) => d.data || {})
    .catch(() => ({}));
};

export const setUserConnections = ({ connections }) => {
  return request('POST', getFullUrl('accountinformation', '/v1/promotion-channels'), connections);
};
