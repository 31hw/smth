export const ALL_PERMISSIONS = Object.freeze([
  'site:admin',
  'users:read',
  'users:manage',
  'users:ban',
  'groups:manage',
  'assets:moderate',
  'places:moderate',
  'economy:manage',
  'messages:moderate',
  'sessions:revoke',
  'audit:read',
  'system:read',
  'system:manage',
]);

/**
 * User 1 is the local instance owner. The privilege is derived from the
 * database identity on every request; it is never accepted from client data.
 */
export function permissionsForUser(user) {
  if (!user) return [];
  if (Number(user.id) === 1) return ['*', ...ALL_PERMISSIONS];
  return Array.isArray(user.permissions) ? [...user.permissions] : [];
}

export function hasPermission(user, permission) {
  if (!user) return false;
  if (Number(user.id) === 1) return true;
  const permissions = permissionsForUser(user);
  return permissions.includes('*') || permissions.includes(permission);
}
