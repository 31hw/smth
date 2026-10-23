import request, { getFullUrl } from '../lib/request';
import { getItemDetailsNew } from './catalog';

const DEFAULT_AVATAR_RULES = {
  playerAvatarTypes: ['R6', 'R15'],
  scales: {
    height: { min: 0.9, max: 1.05, increment: 0.01 },
    width: { min: 0.7, max: 1.0, increment: 0.01 },
    head: { min: 0.95, max: 1.0, increment: 0.01 },
    depth: { min: 0.0, max: 0.0, increment: 0.0 },
    proportion: { min: 0.0, max: 1.0, increment: 0.01 },
    bodyType: { min: 0.0, max: 1.0, increment: 0.01 },
  },
  wearableAssetTypes: [],
  bodyColorsPalette: [
    { brickColorId: 24, hexColor: '#F5CD30', name: 'Bright yellow' },
    { brickColorId: 23, hexColor: '#0D69AC', name: 'Bright blue' },
    { brickColorId: 119, hexColor: '#A4BD47', name: 'Br. yellowish green' },
    { brickColorId: 1, hexColor: '#F2F3F3', name: 'White' },
    { brickColorId: 26, hexColor: '#1B2A35', name: 'Black' },
  ],
  basicBodyColorsPalette: [],
  defaultClothingAssetLists: {},
};

const DEFAULT_AVATAR_STATE = {
  scales: { height: 1, width: 1, head: 1, depth: 1, proportion: 0, bodyType: 0 },
  playerAvatarType: 'R6',
  bodyColors: {
    headColorId: 24,
    torsoColorId: 23,
    rightArmColorId: 24,
    leftArmColorId: 24,
    rightLegColorId: 119,
    leftLegColorId: 119,
  },
  assets: [],
  defaultShirtApplied: false,
  defaultPantsApplied: false,
  emotes: [],
};

export const getRules = () => {
  return request('GET', getFullUrl('avatar', '/v1/avatar-rules'))
    .then((d) =>
      d?.data && Array.isArray(d.data.bodyColorsPalette)
        ? { ...DEFAULT_AVATAR_RULES, ...d.data }
        : DEFAULT_AVATAR_RULES
    )
    .catch(() => DEFAULT_AVATAR_RULES);
};

export const getAvatar = ({ userId }) => {
  return request('GET', getFullUrl('avatar', `/v1/users/${userId}/avatar`))
    .then((d) =>
      d?.data && Array.isArray(d.data.assets)
        ? { ...DEFAULT_AVATAR_STATE, ...d.data }
        : DEFAULT_AVATAR_STATE
    )
    .catch(() => DEFAULT_AVATAR_STATE);
};

export const getMyAvatar = () => {
  return request('GET', getFullUrl('avatar', '/v1/avatar'))
    .then((d) =>
      d?.data && Array.isArray(d.data.assets)
        ? { ...DEFAULT_AVATAR_STATE, ...d.data }
        : DEFAULT_AVATAR_STATE
    )
    .catch(() => DEFAULT_AVATAR_STATE);
};

export const getItemRestrictions = async (assetIds) => {
  const cleanIds = [...new Set((assetIds || []).map(Number).filter((n) => n > 0))];
  if (!cleanIds.length) return [];
  try {
    const details = await getItemDetailsNew(cleanIds);
    const map = {};
    for (const d of details) {
      const r = d.itemRestrictions || [];
      const isLimitedUnique = r.includes('LimitedUnique') || r.includes('Collectible');
      const isLimited = !isLimitedUnique && r.includes('Limited');
      map[d.id] = {
        assetId: d.id,
        isLimited,
        isLimitedUnique,
        exists: true,
      };
    }
    return cleanIds.map(
      (id) =>
        map[id] || {
          assetId: id,
          isLimited: false,
          isLimitedUnique: false,
          exists: true,
        }
    );
  } catch (_) {
    return cleanIds.map((id) => ({
      assetId: id,
      isLimited: false,
      isLimitedUnique: false,
      exists: true,
    }));
  }
};

export const getRecentItems = async (listType) => {
  try {
    const req = await request('GET', getFullUrl('avatar', `/v1/recent-items/${listType}/list`));
    return Array.isArray(req?.data?.data) ? req.data : { data: [], total: 0 };
  } catch (_) {
    return { data: [], total: 0 };
  }
};

export const RECENT_ITEMS = Object.freeze({
  ALL: 'all',
  CLOTHING: 'clothing',
  BODY_PARTS: 'bodyparts',
  ANIMATIONS: 'avataranimations',
  ACCESSORIES: 'accessories',
  OUTFITS: 'outfits',
  GEAR: 'gear',
});

export const redrawMyAvatar = () => {
  return request('POST', getFullUrl('avatar', '/v1/avatar/redraw-thumbnail'), {}).then((d) => d.data);
};

export const setWearingAssets = ({ assetIds }) => {
  return request('POST', getFullUrl('avatar', '/v1/avatar/set-wearing-assets'), {
    assetIds,
  });
};

export const setColors = (bodyColors) => {
  return request('POST', getFullUrl('avatar', '/v1/avatar/set-body-colors'), bodyColors);
};

export const setRigType = (rigType) => {
  const normalized = rigType === 'R15' || rigType === 2 || rigType === 3 ? 'R15' : 'R6';
  return request('POST', getFullUrl('avatar', '/v1/avatar/set-player-avatar-type'), {
    playerAvatarType: normalized,
  });
};

export const setScales = (scales) => {
  return request('POST', getFullUrl('avatar', '/v1/avatar/set-scales'), scales);
};

export const getOutfits = ({ userId, limit = 50 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);
  return request(
    'GET',
    getFullUrl('avatar', `/v1/users/${userId}/outfits?itemsPerPage=${safeLimit}&page=1&isEditable=true`)
  )
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? {
            filteredCount: d.data.filteredCount ?? 0,
            data: d.data.data,
            total: d.data.total ?? d.data.data.length,
          }
        : { filteredCount: 0, data: [], total: 0 }
    )
    .catch(() => ({ filteredCount: 0, data: [], total: 0 }));
};

export const createOutfit = async ({ name }) => {
  const current = await getMyAvatar();
  return request('POST', getFullUrl('avatar', '/v1/outfits/create'), {
    name,
    bodyColors: current.bodyColors,
    assetIds: (current.assets || []).map((a) => a.id),
    scale: current.scales,
    playerAvatarType: current.playerAvatarType,
  });
};

export const wearOutfit = ({ outfitId }) => {
  return request('POST', getFullUrl('avatar', `/v1/outfits/${outfitId}/wear`), {});
};

export const deleteOutfit = ({ outfitId }) => {
  return request('POST', getFullUrl('avatar', `/v1/outfits/${outfitId}/delete`), {});
};

export const renameOutfit = async ({ outfitId, name }) => {
  const detailsRes = await request('GET', getFullUrl('avatar', `/v1/outfits/${outfitId}/details`));
  const details = detailsRes?.data || {};
  return request('PATCH', getFullUrl('avatar', `/v1/outfits/${outfitId}`), {
    name,
    bodyColors: details.bodyColors,
    assetIds: (details.assets || []).map((a) => a.id),
    scale: details.scale,
    playerAvatarType: details.playerAvatarType,
  });
};

export const updateOutfit = async ({ outfitId, bodyColors }) => {
  const [detailsRes, current] = await Promise.all([
    request('GET', getFullUrl('avatar', `/v1/outfits/${outfitId}/details`)).catch(() => ({ data: {} })),
    getMyAvatar(),
  ]);
  return request('PATCH', getFullUrl('avatar', `/v1/outfits/${outfitId}`), {
    name: detailsRes?.data?.name || 'Outfit',
    bodyColors: bodyColors || current.bodyColors,
    assetIds: (current.assets || []).map((a) => a.id),
    scale: current.scales,
    playerAvatarType: current.playerAvatarType,
  });
};
