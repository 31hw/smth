import request, { getBaseUrl, getFullUrl } from '../lib/request';
import { getItemDetailsNew } from './catalog';

function normalizeInventoryLimit(limit) {
  const valid = [10, 25, 50, 100];
  const n = Number(limit) || 25;
  if (valid.includes(n)) return n;
  return valid.reduce((prev, curr) => (Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev), 25);
}

export const getOwnedCopies = async ({ assetId, userId }) => {
  if (!userId || !assetId) return [];
  try {
    const res = await request(
      'GET',
      getFullUrl('inventory', `/v1/users/${userId}/items/Asset/${assetId}`)
    );
    return (res?.data?.data || []).map((v) => ({
      userAssetId: v.instanceId || v.userAssetId,
      seller: null,
      price: null,
      serialNumber: v.serialNumber || null,
    }));
  } catch (_) {
    return [];
  }
};

export const userOwnsItem = async ({ userId, assetId }) => {
  if (!userId || !assetId) return false;
  try {
    const res = await request(
      'GET',
      getFullUrl('inventory', `/v1/users/${userId}/items/0/${assetId}/is-owned`)
    );
    return Boolean(res?.data);
  } catch (_) {
    return false;
  }
};

export const deleteAssetFromInventory = async ({ assetId }) => {
  return request('DELETE', getFullUrl('inventory', `/v2/inventory/asset/${assetId}`));
};

export const getFavorites = async ({ userId, assetTypeId, limit = 25, cursor = '' }) => {
  const safeLimit = normalizeInventoryLimit(limit);

  // Places (assetTypeId === 9): use games.roblox.com/v2/users/{userId}/favorite/games
  if (Number(assetTypeId) === 9) {
    try {
      const res = await request(
        'GET',
        getFullUrl(
          'games',
          `/v2/users/${userId}/favorite/games?accessFilter=2&limit=${safeLimit}&cursor=${encodeURIComponent(
            cursor || ''
          )}&sortOrder=Desc`
        )
      );
      const games = res?.data?.data || [];
      return {
        Data: {
          Page: 1,
          ItemsPerPage: safeLimit,
          TotalItems: games.length,
          nextPageCursor: res?.data?.nextPageCursor || null,
          previousPageCursor: res?.data?.previousPageCursor || null,
          Items: games
            .filter((g) => g.rootPlace?.id)
            .map((g) => ({
              Item: {
                AssetId: g.rootPlace.id,
                UniverseId: g.id,
                Name: g.name,
                AssetType: 9,
              },
              Creator: {
                Id: g.creator?.id || 1,
                Name: g.creator?.name || 'ROBLOX',
                Type: g.creator?.type || 'User',
              },
              Product: {
                SerialNumber: null,
              },
              AssetRestrictionIcon: {
                CssTag: null,
              },
            })),
        },
      };
    } catch (_) {
      return {
        Data: {
          Page: 1,
          ItemsPerPage: safeLimit,
          TotalItems: 0,
          nextPageCursor: null,
          previousPageCursor: null,
          Items: [],
        },
      };
    }
  }

  // Other asset types: catalog.roblox.com/v1/favorites/users/{userId}/favorites/{assetTypeId}/assets
  try {
    const res = await request(
      'GET',
      getFullUrl(
        'catalog',
        `/v1/favorites/users/${userId}/favorites/${assetTypeId}/assets?limit=${safeLimit}&cursor=${encodeURIComponent(
          cursor || ''
        )}`
      )
    );
    const items = res?.data?.data || [];
    return {
      Data: {
        Page: 1,
        ItemsPerPage: safeLimit,
        TotalItems: items.length,
        nextPageCursor: res?.data?.nextPageCursor || null,
        previousPageCursor: res?.data?.previousPageCursor || null,
        Items: items.map((item) => ({
          Item: {
            AssetId: item.id || item.assetId,
            Name: item.name || 'Item',
            AssetType: Number(assetTypeId),
          },
          Creator: {
            Id: item.creator?.id || item.creatorTargetId || 1,
            Name: item.creator?.name || item.creatorName || 'ROBLOX',
            Type: item.creator?.type || item.creatorType || 'User',
          },
          Product: {
            SerialNumber: null,
          },
          AssetRestrictionIcon: {
            CssTag: null,
          },
        })),
      },
    };
  } catch (_) {
    return {
      Data: {
        Page: 1,
        ItemsPerPage: safeLimit,
        TotalItems: 0,
        nextPageCursor: null,
        previousPageCursor: null,
        Items: [],
      },
    };
  }
};

export const getInventory = async ({ userId, assetTypeId, limit = 25, cursor = '' }) => {
  if (!userId) {
    return {
      Data: {
        Page: 1,
        ItemsPerPage: 25,
        TotalItems: 0,
        nextPageCursor: null,
        previousPageCursor: null,
        Items: [],
      },
    };
  }
  const safeLimit = normalizeInventoryLimit(limit);
  try {
    const res = await request(
      'GET',
      getFullUrl(
        'inventory',
        `/v2/users/${userId}/inventory/${assetTypeId}?limit=${safeLimit}&cursor=${encodeURIComponent(
          cursor || ''
        )}&sortOrder=Desc`
      )
    );
    const rawItems = res?.data?.data || [];

    // Enrich creator & restriction badges where possible via catalog batch details
    const assetIds = [...new Set(rawItems.map((x) => x.assetId).filter(Boolean))];
    const detailsMap = {};
    if (assetIds.length > 0) {
      try {
        const details = await getItemDetailsNew(assetIds);
        for (const d of details) {
          detailsMap[d.id] = d;
        }
      } catch (_) {
        // ignore enrichment errors
      }
    }

    const Items = rawItems.map((item) => {
      const det = detailsMap[item.assetId];
      const restrictions = det?.itemRestrictions || [];
      const isLimitedUnique =
        restrictions.includes('LimitedUnique') || restrictions.includes('Collectible');
      const isLimited = !isLimitedUnique && restrictions.includes('Limited');

      return {
        Item: {
          AssetId: item.assetId,
          Name: item.assetName || item.name || det?.name || 'Item',
          AssetType: Number(assetTypeId),
        },
        Creator: {
          Id: det?.creatorTargetId || item.owner?.userId || 1,
          Name: det?.creatorName || item.owner?.username || 'ROBLOX',
          Type: det?.creatorType || 'User',
        },
        Product: {
          SerialNumber: item.serialNumber || null,
        },
        AssetRestrictionIcon: {
          CssTag: isLimitedUnique ? 'limited-unique' : isLimited ? 'limited' : null,
        },
      };
    });

    return {
      Data: {
        Page: 1,
        ItemsPerPage: safeLimit,
        TotalItems: null,
        nextPageCursor: res?.data?.nextPageCursor || null,
        previousPageCursor: res?.data?.previousPageCursor || null,
        Items,
      },
    };
  } catch (err) {
    console.warn('[inventory] getInventory fallback:', err?.message);
    return {
      Data: {
        Page: 1,
        ItemsPerPage: safeLimit,
        TotalItems: 0,
        nextPageCursor: null,
        previousPageCursor: null,
        Items: [],
      },
    };
  }
};

export const getCollections = async ({ userId }) => {
  if (!userId || Number(userId) === 1) return [];
  try {
    const res = await request(
      'GET',
      `${getBaseUrl()}/users/profile/robloxcollections-json?userId=${userId}`
    );
    if (Array.isArray(res?.data?.CollectionsItems) && res.data.CollectionsItems.length > 0) {
      return res.data.CollectionsItems;
    }
  } catch (_) {
    // robloxcollections-json is retired; synthesize from collectibles + currently-wearing!
  }

  try {
    const [collectiblesRes, wearingRes] = await Promise.all([
      request(
        'GET',
        getFullUrl('inventory', `/v1/users/${userId}/assets/collectibles?limit=10&sortOrder=Desc`)
      ).catch(() => null),
      request('GET', getFullUrl('avatar', `/v1/users/${userId}/currently-wearing`)).catch(() => null),
    ]);

    const collectibleItems = collectiblesRes?.data?.data || [];
    const wearingIds = wearingRes?.data?.assetIds || [];
    const candidateIds = [
      ...new Set([
        ...collectibleItems.map((c) => c.assetId),
        ...wearingIds,
      ]),
    ].slice(0, 6);

    if (candidateIds.length === 0) return [];
    const details = await getItemDetailsNew(candidateIds);
    return details.slice(0, 6).map((d) => {
      const restrictions = d.itemRestrictions || [];
      const isLU = restrictions.includes('LimitedUnique') || restrictions.includes('Collectible');
      const isLim = !isLU && restrictions.includes('Limited');
      return {
        Id: d.id,
        Name: d.name,
        AssetSeoUrl: `/catalog/${d.id}/--`,
        AssetRestrictionIcon: {
          CssTag: isLU ? 'limited-unique' : isLim ? 'limited' : null,
        },
      };
    });
  } catch (_) {
    return [];
  }
};

export const getCollectibleInventory = ({ userId, cursor, limit = 50, assetType = 'null' }) => {
  return request(
    'GET',
    getFullUrl(
      'inventory',
      `/v1/users/${userId}/assets/collectibles?cursor=${encodeURIComponent(
        cursor || ''
      )}&limit=${normalizeInventoryLimit(limit)}${
        assetType && assetType !== 'null' ? `&assetType=${assetType}` : ''
      }&sortOrder=Asc`
    )
  )
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getCollectibleOwners = ({ assetId, limit = 50, sort = 'Asc', cursor = '' }) => {
  return request(
    'GET',
    getFullUrl(
      'inventory',
      `/v2/assets/${assetId}/owners?sortOrder=${sort}&limit=${normalizeInventoryLimit(
        limit
      )}&cursor=${encodeURIComponent(cursor || '')}`
    )
  )
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};
