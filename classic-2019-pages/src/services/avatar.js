import request, { getFullUrl } from '../lib/request';
import { getItemDetailsNew } from './catalog';
import { getInventory } from './inventory';

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

const RECENT_TYPE_MAP = {
  all: 'All',
  clothing: 'Clothing',
  bodyparts: 'BodyParts',
  avataranimations: 'AvatarAnimations',
  accessories: 'Accessories',
  outfits: 'Outfits',
  gear: 'Gear',
};

const RECENT_ASSET_TYPE_BUCKETS = {
  all: [8, 41, 42, 46, 11, 12, 2, 18],
  accessories: [8, 41, 42, 43, 44, 45, 46, 47],
  clothing: [11, 12, 2, 8, 41, 64, 65, 66, 67, 68, 69],
  bodyparts: [18, 17, 79, 27, 28, 29, 30, 31],
  avataranimations: [61, 51, 55, 53, 52, 50, 48, 54],
  gear: [19],
};

function matchesRecentBucket(assetTypeId, listKey) {
  const id = Number(assetTypeId);
  if (!listKey || listKey === 'all') return true;
  if (listKey === 'accessories') return [8, 41, 42, 43, 44, 45, 46, 47].includes(id);
  if (listKey === 'clothing') {
    return [2, 11, 12, 8, 41, 42, 43, 44, 45, 46, 47, 64, 65, 66, 67, 68, 69, 70, 71, 72].includes(id);
  }
  if (listKey === 'bodyparts') return [17, 18, 27, 28, 29, 30, 31, 32, 79].includes(id);
  if (listKey === 'avataranimations') return [48, 50, 51, 52, 53, 54, 55, 61].includes(id);
  if (listKey === 'gear') return id === 19;
  return true;
}

let _avatarInvCache = { ts: 0, promise: null };

export async function fetchUnifiedAvatarInventory() {
  const now = Date.now();
  if (_avatarInvCache.promise && now - _avatarInvCache.ts < 15000) {
    return _avatarInvCache.promise;
  }
  _avatarInvCache.ts = now;
  _avatarInvCache.promise = request(
    'GET',
    getFullUrl('avatar', '/v1/avatar-inventory?sortOption=1&pageLimit=100')
  )
    .then((res) => (Array.isArray(res?.data?.avatarInventoryItems) ? res.data.avatarInventoryItems : []))
    .catch(() => []);
  return _avatarInvCache.promise;
}

async function resolveCurrentUserId(explicitUserId) {
  if (explicitUserId && Number(explicitUserId) > 0) return Number(explicitUserId);
  if (typeof window !== 'undefined' && window.__RBX_INITIAL_USER__?.id) {
    return Number(window.__RBX_INITIAL_USER__.id);
  }
  try {
    const res = await request('GET', getFullUrl('users', '/v1/users/authenticated'));
    if (res?.data?.id) return Number(res.data.id);
  } catch (_) {}
  return null;
}

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

function normalizeRecentEntry(raw) {
  if (!raw) return null;
  if (raw.type && String(raw.type).toLowerCase() === 'outfit') {
    return null;
  }
  const id = Number(raw.id || raw.assetId || raw.itemId);
  if (!id || id <= 0) return null;
  const typeId = Number(
    raw.assetType?.id ?? raw.assetType ?? raw.itemCategory?.itemSubType ?? 8
  );
  return {
    id,
    name: raw.name || raw.itemName || 'Item',
    type: 'Asset',
    assetType: {
      id: Number.isFinite(typeId) && typeId > 0 ? typeId : 8,
      name: raw.assetType?.name || 'Asset',
    },
  };
}

export const getRecentItems = async (listType = 'all', userId = null) => {
  const key = String(listType || 'all').toLowerCase();
  const pascalType = RECENT_TYPE_MAP[key] || 'All';

  // 1. Try official /v1/recent-items/{PascalType}/list (and lowercase fallback for mocks)
  for (const candidatePath of [`/v1/recent-items/${pascalType}/list`, `/v1/recent-items/${key}/list`]) {
    try {
      const req = await request('GET', getFullUrl('avatar', candidatePath));
      if (Array.isArray(req?.data?.data) && req.data.data.length > 0) {
        const normalized = req.data.data.map(normalizeRecentEntry).filter(Boolean);
        if (normalized.length > 0) {
          return { data: normalized, total: normalized.length };
        }
      }
    } catch (_) {
      // continue to unified avatar-inventory fallback
    }
    if (pascalType === key) break;
  }

  // 2. Try modern unified /v1/avatar-inventory
  const unified = await fetchUnifiedAvatarInventory();
  if (unified.length > 0) {
    const filtered = unified
      .filter((it) => {
        const iType = it.itemCategory?.itemType;
        const isAsset = iType === 1 || iType === 'Asset' || !iType;
        if (!isAsset) return false;
        return matchesRecentBucket(it.itemCategory?.itemSubType, key);
      })
      .map(normalizeRecentEntry)
      .filter(Boolean);
    if (filtered.length > 0) {
      return { data: filtered, total: filtered.length };
    }
  }

  // 3. Fallback: combine currently worn avatar assets + owned inventory across bucket types
  const uid = await resolveCurrentUserId(userId);
  const combined = [];
  const seen = new Set();
  const pushUnique = (entry) => {
    if (!entry || !entry.id || seen.has(entry.id)) return;
    seen.add(entry.id);
    combined.push(entry);
  };

  try {
    const myAv = await getMyAvatar();
    for (const a of myAv?.assets || []) {
      const norm = normalizeRecentEntry(a);
      if (norm && matchesRecentBucket(norm.assetType.id, key)) {
        pushUnique(norm);
      }
    }
  } catch (_) {}

  if (uid) {
    const bucketTypes = (RECENT_ASSET_TYPE_BUCKETS[key] || RECENT_ASSET_TYPE_BUCKETS.all).slice(0, 6);
    const invBatches = await Promise.all(
      bucketTypes.map((tId) =>
        getInventory({ userId: uid, assetTypeId: tId, limit: 10, enrich: false }).catch(() => null)
      )
    );
    for (const batch of invBatches) {
      for (const row of batch?.Data?.Items || []) {
        pushUnique({
          id: Number(row.Item.AssetId),
          name: row.Item.Name || 'Item',
          type: 'Asset',
          assetType: { id: Number(row.Item.AssetType), name: 'Asset' },
        });
      }
    }
  }

  return { data: combined, total: combined.length };
};

export const getAvatarAssetsByType = async ({ userId, assetTypeId, cursor = null, limit = 25 }) => {
  const uid = await resolveCurrentUserId(userId);
  const numericType = Number(assetTypeId);

  // Packages (32) -> include owned Bundles from catalog/v1/users/{uid}/bundles as well as legacy Package assets
  if (numericType === 32 && uid) {
    const [bundlesRes, invRes] = await Promise.all([
      request(
        'GET',
        getFullUrl(
          'catalog',
          `/v1/users/${uid}/bundles?limit=25${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}&sortOrder=Desc`
        )
      ).catch(() => null),
      !cursor ? getInventory({ userId: uid, assetTypeId: 32, limit }).catch(() => null) : Promise.resolve(null),
    ]);

    const items = [];
    for (const b of bundlesRes?.data?.data || []) {
      const outfitEntry = Array.isArray(b.items)
        ? b.items.find((x) => x.type === 'UserOutfit')
        : null;
      const assetEntries = Array.isArray(b.items)
        ? b.items.filter((x) => x.type === 'Asset').map((x) => Number(x.id)).filter(Boolean)
        : [];
      items.push({
        Item: {
          AssetId: Number(b.id),
          Name: b.name || 'Package',
          AssetType: 32,
          IsBundle: true,
          BundleOutfitId: outfitEntry ? Number(outfitEntry.id) : null,
          BundleAssetIds: assetEntries,
        },
      });
    }
    for (const legacy of invRes?.Data?.Items || []) {
      items.push(legacy);
    }
    return {
      Items: items,
      ItemsPerPage: 25,
      nextPageCursor: bundlesRes?.data?.nextPageCursor || null,
      previousPageCursor: bundlesRes?.data?.previousPageCursor || null,
    };
  }

  let invData = {
    Items: [],
    ItemsPerPage: limit,
    nextPageCursor: null,
    previousPageCursor: null,
  };

  if (uid) {
    const invRes = await getInventory({
      userId: uid,
      assetTypeId: numericType,
      cursor,
      limit,
      enrich: false,
    });
    if (invRes?.Data) {
      invData = invRes.Data;
    }
  }

  // Fallback for private inventories or starter items on page 1
  if (!cursor && (!invData.Items || invData.Items.length === 0)) {
    const fallbackItems = [];
    const seen = new Set();
    const unified = await fetchUnifiedAvatarInventory();
    for (const it of unified) {
      const iType = it.itemCategory?.itemType;
      const isAsset = iType === 1 || iType === 'Asset' || !iType;
      if (isAsset && Number(it.itemCategory?.itemSubType) === numericType) {
        const aId = Number(it.itemId);
        if (aId && !seen.has(aId)) {
          seen.add(aId);
          fallbackItems.push({
            Item: {
              AssetId: aId,
              Name: it.itemName || 'Item',
              AssetType: numericType,
            },
          });
        }
      }
    }
    try {
      const myAv = await getMyAvatar();
      for (const a of myAv?.assets || []) {
        if (Number(a.assetType?.id ?? a.assetType) === numericType && !seen.has(Number(a.id))) {
          seen.add(Number(a.id));
          fallbackItems.push({
            Item: {
              AssetId: Number(a.id),
              Name: a.name || 'Item',
              AssetType: numericType,
            },
          });
        }
      }
    } catch (_) {}

    if (fallbackItems.length > 0) {
      invData = {
        ...invData,
        Items: fallbackItems,
      };
    }
  }

  return invData;
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

export const setWearingAssets = async ({ assetIds, assets = null }) => {
  const cleanIds = [...new Set((assetIds || []).map(Number).filter((n) => n > 0))];
  if (Array.isArray(assets) && assets.length > 0) {
    try {
      return await request('POST', getFullUrl('avatar', '/v2/avatar/set-wearing-assets'), {
        assets: assets.map((a) => ({
          id: Number(a.assetId || a.id),
          assetType: { id: Number(a.assetType?.id ?? a.assetType ?? 8) },
        })),
      });
    } catch (_) {
      // Fallback to v1 below
    }
  }
  return request('POST', getFullUrl('avatar', '/v1/avatar/set-wearing-assets'), {
    assetIds: cleanIds,
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

export const getOutfits = async ({ userId, limit = 50 }) => {
  const uid = await resolveCurrentUserId(userId);
  if (!uid) return { filteredCount: 0, data: [], total: 0 };
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 50);
  return request(
    'GET',
    getFullUrl('avatar', `/v1/users/${uid}/outfits?itemsPerPage=${safeLimit}&page=1`)
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
