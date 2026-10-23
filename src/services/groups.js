import request, { getFullUrl } from '../lib/request';

function normalizeGroupLimit(limit) {
  const valid = [10, 25, 50, 100];
  const n = Number(limit) || 10;
  if (valid.includes(n)) return n;
  return valid.reduce((prev, curr) => (Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev), 10);
}

export const getUserGroups = ({ userId }) => {
  if (!userId) return Promise.resolve([]);
  return request('GET', getFullUrl('groups', `/v1/users/${userId}/groups/roles`))
    .then((d) => d.data?.data || [])
    .catch(() => []);
};

export const getPermissionsForRoleset = ({ groupId, rolesetId }) => {
  return request('GET', getFullUrl('groups', `/v1/groups/${groupId}/roles/${rolesetId}/permissions`))
    .then((d) => d?.data || { permissions: {} })
    .catch(() => ({ permissions: {} }));
};

export const joinGroup = ({ groupId }) => {
  return request('POST', getFullUrl('groups', `/v1/groups/${groupId}/users`), {});
};

export const leaveGroup = ({ groupId, userId }) => {
  return request('DELETE', getFullUrl('groups', `/v1/groups/${groupId}/users/${userId}`));
};

export const setStatus = ({ groupId, message }) => {
  return request('PATCH', getFullUrl('groups', `/v1/groups/${groupId}/status`), {
    message,
  });
};

export const createGroup = ({ name, description, iconElement }) => {
  const f = new FormData();
  f.append('name', name);
  f.append('description', description);
  if (iconElement?.files?.[0]) {
    f.append('icon', iconElement.files[0]);
  }
  return request('POST', getFullUrl('groups', `/v1/groups/create`), f).then((d) => d.data);
};

export const getRoles = ({ groupId }) => {
  return request('GET', getFullUrl('groups', `/v1/groups/${groupId}/roles`))
    .then((d) => d.data?.roles || [])
    .catch(() => []);
};

export const getMembers = ({ groupId, cursor, limit = 10, sortOrder = 'Asc' }) => {
  const safeLimit = normalizeGroupLimit(limit);
  let url = `/v1/groups/${groupId}/users?limit=${safeLimit}&sortOrder=${encodeURIComponent(sortOrder || 'Asc')}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
  return request('GET', getFullUrl('groups', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getRolesetMembers = ({ groupId, roleSetId, cursor, limit = 10, sortOrder = 'Asc' }) => {
  const safeLimit = normalizeGroupLimit(limit);
  let url = `/v1/groups/${groupId}/roles/${roleSetId}/users?limit=${safeLimit}&sortOrder=${encodeURIComponent(
    sortOrder || 'Asc'
  )}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
  return request('GET', getFullUrl('groups', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getWall = ({ groupId, cursor, sort = 'Desc', limit = 10 }) => {
  const safeLimit = normalizeGroupLimit(limit);
  let url = `/v2/groups/${groupId}/wall/posts?sortOrder=${encodeURIComponent(sort || 'Desc')}&limit=${safeLimit}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
  return request('GET', getFullUrl('groups', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const postToWall = ({ groupId, content }) => {
  return request('POST', getFullUrl('groups', `/v1/groups/${groupId}/wall/posts`), {
    body: content,
  });
};

export const deletePost = ({ groupId, postId }) => {
  return request('DELETE', getFullUrl('groups', `/v1/groups/${groupId}/wall/posts/${postId}`));
};

export const getInfo = ({ groupId }) => {
  return request('GET', getFullUrl('groups', `/v1/groups/${groupId}`)).then((d) => d.data);
};

export const claimGroupOwnership = ({ groupId }) => {
  return request('POST', getFullUrl('groups', `/v1/groups/${groupId}/claim-ownership`), {});
};

export const setGroupAsPrimary = ({ groupId }) => {
  return request('POST', getFullUrl('groups', `/v1/user/groups/primary`), { groupId });
};

export const removePrimaryGroup = () => {
  return request('DELETE', getFullUrl('groups', `/v1/user/groups/primary`));
};

export const getPrimaryGroup = ({ userId }) => {
  return request('GET', getFullUrl('groups', `/v1/users/${userId}/groups/primary/role`))
    .then((d) => (d.data && d.data.group ? d.data : null))
    .catch(() => null);
};

export const setUserRole = ({ groupId, userId, roleId }) => {
  return request('PATCH', getFullUrl('groups', `/v1/groups/${groupId}/users/${userId}`), {
    roleId,
  });
};

export const setGroupIcon = ({ groupId, icon }) => {
  const f = new FormData();
  f.append('file', icon);
  return request('PATCH', getFullUrl('groups', `/v1/groups/icon?groupId=${groupId}`), f).then(
    (d) => d.data
  );
};

export const setGroupDescription = ({ groupId, description }) => {
  return request('PATCH', getFullUrl('groups', `/v1/groups/${groupId}/description`), {
    description,
  });
};

export const setGroupName = ({ groupId, name }) => {
  return request('PATCH', getFullUrl('groups', `/v1/groups/${groupId}/name`), {
    name,
  });
};

export const getGroupSettings = ({ groupId }) => {
  return request('GET', getFullUrl('groups', `/v1/groups/${groupId}/settings`))
    .then((d) => d?.data || {})
    .catch(() => ({}));
};

export const setGroupSettings = ({
  groupId,
  isApprovalRequired,
  areEnemiesAllowed,
  areGroupFundsVisible,
  areGroupGamesVisible,
}) => {
  return request('PATCH', getFullUrl('groups', `/v1/groups/${groupId}/settings`), {
    isApprovalRequired,
    areEnemiesAllowed,
    areGroupFundsVisible,
    areGroupGamesVisible,
  });
};

export const changeGroupOwner = async ({ groupId, userId }) => {
  return request('POST', getFullUrl('groups', `/v1/groups/${groupId}/change-owner`), {
    userId,
  });
};

export const createRole = async ({ groupId, name, description, rank }) => {
  return request('POST', getFullUrl('groups', `/v1/groups/${groupId}/rolesets/create`), {
    name,
    description,
    rank,
  });
};

export const editRole = async ({ groupId, roleId, name, description, rank }) => {
  return request('PATCH', getFullUrl('groups', `/v1/groups/${groupId}/rolesets/${roleId}`), {
    name,
    description,
    rank,
  });
};

export const deleteRole = async ({ groupId, roleId }) => {
  return request('DELETE', getFullUrl('groups', `/v1/groups/${groupId}/rolesets/${roleId}`));
};

export const setRolePermissions = async (groupId, roleId, permissions) => {
  return request('PATCH', getFullUrl('groups', `/v1/groups/${groupId}/roles/${roleId}/permissions`), {
    permissions,
  });
};

export const oneTimePayout = async ({ groupId, userId, amount }) => {
  return request('POST', getFullUrl('groups', `/v1/groups/${groupId}/payouts`), {
    PayoutType: 'FixedAmount',
    Recipients: [
      {
        recipientId: userId,
        recipientType: 'User',
        amount,
      },
    ],
  });
};

export const getGroupInfo = ({ groupId }) => {
  return request('GET', getFullUrl('groups', `/v1/groups/${groupId}`)).then((d) => d.data);
};

export const getGroupAuditLog = ({ groupId, cursor, userId, action }) => {
  let url = `/v1/groups/${groupId}/audit-log?sortOrder=Desc&limit=100`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
  if (action) url += `&actionType=${encodeURIComponent(action)}`;
  if (userId) url += `&userId=${encodeURIComponent(userId)}`;
  return request('GET', getFullUrl('groups', url))
    .then((d) => (Array.isArray(d?.data?.data) ? d.data : { data: [] }))
    .catch(() => ({ data: [] }));
};

export const searchGroups = async ({ keyword, limit = 10, offset }) => {
  const safeLimit = normalizeGroupLimit(limit);
  let url = `/v1/groups/search?keyword=${encodeURIComponent(keyword || '')}&limit=${safeLimit}`;
  if (typeof offset === 'string' && offset.length > 0 && offset !== '0') {
    url += `&cursor=${encodeURIComponent(offset)}`;
  }
  return request('GET', getFullUrl('groups', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};
