import request, { getBaseUrl, getFullUrl } from '../lib/request';

export const itemNameToEncodedName = (str) => {
  if (typeof str !== 'string') {
    str = '';
  }
  const seoName =
    str
      .replace(/'/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/^(COM\d|LPT\d|AUX|PRT|NUL|CON|BIN)$/i, '') || 'unnamed';
  return seoName;
};

export const getItemUrl = ({ assetId, name }) => {
  return `/catalog/${assetId}/${itemNameToEncodedName(name)}`;
};

function normalizeCatalogLimit(limit) {
  const valid = [10, 28, 30, 60, 120];
  const n = Number(limit) || 28;
  if (valid.includes(n)) return n;
  return valid.reduce((prev, curr) => (Math.abs(curr - n) < Math.abs(prev - n) ? curr : prev), 28);
}

export const searchCatalog = async ({
  category,
  subCategory = null,
  query = null,
  limit = 28,
  cursor = null,
  sort = 0,
  creatorType = null,
  creatorId = null,
  creatorName = null,
  includeNotForSale = null,
}) => {
  const safeLimit = normalizeCatalogLimit(limit);
  let catParam = category || 'Featured';
  let subCatParam = subCategory || '';

  // Map classic numeric/string categories to live catalog.roblox.com/v1/search/items parameters
  const catStr = String(catParam).toLowerCase().trim();
  if (catStr === '0' || catStr === 'featured') {
    catParam = 'Featured';
  } else if (catStr === '1' || catStr === 'all') {
    catParam = 'All';
  } else if (catStr === '2' || catStr === 'collectibles' || catStr === 'collectible') {
    catParam = 'Collectibles';
  } else if (catStr === '3' || catStr === 'clothing') {
    catParam = 'Clothing';
  } else if (catStr === '4' || catStr === 'bodyparts') {
    catParam = 'BodyParts';
  } else if (catStr === '5' || catStr === 'gear' || catStr === 'gears') {
    catParam = 'Accessories';
    if (!subCatParam) subCatParam = 'Gear';
  } else if (catStr === '11' || catStr === 'accessories') {
    catParam = 'Accessories';
  }

  let url = `/v1/search/items?category=${encodeURIComponent(catParam)}&limit=${safeLimit}`;
  if (sort && Number(sort) > 0) {
    url += `&sortType=${encodeURIComponent(sort)}`;
  }
  if (cursor) {
    url += `&cursor=${encodeURIComponent(cursor)}`;
  }
  if (query) {
    url += `&keyword=${encodeURIComponent(query)}`;
  }
  if (subCatParam && String(subCatParam) !== '0' && String(subCatParam).toLowerCase() !== 'all' && String(subCatParam).toLowerCase() !== 'items') {
    url += `&subcategory=${encodeURIComponent(subCatParam)}`;
  }
  if (creatorType && creatorId) {
    url += `&creatorTargetId=${encodeURIComponent(creatorId)}&creatorType=${encodeURIComponent(creatorType)}`;
  } else if (creatorName) {
    url += `&creatorName=${encodeURIComponent(creatorName)}`;
  }
  if (includeNotForSale === true) {
    url += `&includeNotForSale=true`;
  }

  const res = await request('GET', getFullUrl('catalog', url));
  return res.data;
};

export const getProductInfoLegacy = async (assetId) => {
  const res = await request('GET', getFullUrl('economy', `/v2/assets/${encodeURIComponent(assetId)}/details`));
  return res.data;
};

function mapEconomyDetailsToCatalogItem(info) {
  const restrictions = [];
  if (info.IsLimited) restrictions.push('Limited');
  if (info.IsLimitedUnique) restrictions.push('LimitedUnique');
  return {
    id: info.AssetId || info.TargetId,
    itemType: 'Asset',
    assetType: info.AssetTypeId,
    name: info.Name || 'Unnamed Item',
    description: info.Description || '',
    productId: info.ProductId,
    genres: ['All'],
    itemStatuses: info.IsNew ? ['New'] : [],
    itemRestrictions: restrictions,
    creatorHasVerifiedBadge: Boolean(info.Creator?.HasVerifiedBadge),
    creatorType: info.Creator?.CreatorType || 'User',
    creatorTargetId: info.Creator?.CreatorTargetId || info.Creator?.Id || 1,
    creatorName: info.Creator?.Name || 'ROBLOX',
    price: info.PriceInRobux,
    lowestPrice: info.LowestSellerPrice ?? undefined,
    priceStatus: info.IsForSale ? undefined : 'Off Sale',
    unitsAvailableForConsumption: info.Remaining || 0,
    saleCount: info.Sales || 0,
    favoriteCount: 0,
    offsaleDeadline: info.OffsaleDeadline || null,
    collectibleItemId: info.CollectibleItemId || null,
    totalQuantity: info.TotalQuantity || 0,
    isForSale: Boolean(info.IsForSale),
    createdAt: info.Created,
    updatedAt: info.Updated,
  };
}

export const getItemDetails = async (assetIdArray) => {
  const cleanIds = [...new Set((assetIdArray || []).map(Number).filter((n) => n > 0))];
  if (cleanIds.length === 0) return { data: { data: [] } };

  try {
    const res = await request('POST', getFullUrl('catalog', '/v1/catalog/items/details'), {
      items: cleanIds.map((id) => ({
        itemType: 'Asset',
        id,
      })),
    });
    const list = res?.data?.data || [];
    for (const item of list) {
      if (!Array.isArray(item.genres)) item.genres = ['All'];
      if (!Array.isArray(item.itemRestrictions)) item.itemRestrictions = [];
      if (typeof item.isForSale === 'undefined') {
        item.isForSale =
          item.priceStatus !== 'Off Sale' &&
          item.unitsAvailableForConsumption !== 0 &&
          (typeof item.price === 'number' || typeof item.lowestPrice === 'number');
      }
      if (typeof item.price === 'undefined' && typeof item.lowestPrice === 'number') {
        item.price = item.lowestPrice;
      }
    }
    if (list.length > 0) {
      return { data: { data: list } };
    }
  } catch (err) {
    console.warn('[catalog] batch details fallback to economy v2:', err?.message);
  }

  // Fallback per-asset via economy.roblox.com/v2/assets/{id}/details (works for library models, decals, audio, places, etc.)
  const fallbackItems = await Promise.all(
    cleanIds.slice(0, 30).map((id) =>
      getProductInfoLegacy(id)
        .then(mapEconomyDetailsToCatalogItem)
        .catch(() => null)
    )
  );
  return {
    data: {
      data: fallbackItems.filter(Boolean),
    },
  };
};

export const getItemDetailsNew = async (assetIdArray) => {
  const res = await getItemDetails(assetIdArray);
  return res?.data?.data || [];
};

export const getRecommendations = async ({ assetId, assetTypeId, limit = 7 }) => {
  try {
    const res = await request(
      'GET',
      getFullUrl('catalog', `/v1/recommendations/asset/${assetTypeId}?contextAssetId=${assetId}&numItems=${limit}`)
    );
    if (res?.data?.data?.length) {
      return {
        data: res.data.data.map((entry) => ({
          ...entry,
          item: entry.item || {
            assetId: entry.id,
            name: entry.name || 'Item',
            price: entry.price ?? null,
            NoPriceText: 'Off Sale',
          },
          creator: entry.creator || {
            creatorId: entry.creatorTargetId || 1,
            creatorType: entry.creatorType || 'User',
            name: entry.creatorName || 'ROBLOX',
          },
          product: entry.product || {
            priceInRobux: entry.item?.price ?? entry.price ?? null,
            priceInTickets: null,
            isForSale: Boolean(entry.item?.price != null || entry.isForSale),
            isFree: (entry.item?.price ?? entry.price) === 0,
            noPriceText: entry.item?.NoPriceText || 'Off Sale',
          },
        })),
      };
    }
  } catch (_) {
    // fallback to catalog search in same category
  }
  try {
    const search = await searchCatalog({ category: 'Accessories', limit: 10 });
    const ids = (search?.data || [])
      .map((x) => x.id)
      .filter((id) => id !== Number(assetId))
      .slice(0, limit);
    const details = await getItemDetailsNew(ids);
    return {
      data: details.map((d) => {
        const effectivePrice = d.price ?? d.lowestPrice ?? null;
        const noPriceText = d.isForSale ? 'Free' : 'Off Sale';
        return {
          item: {
            assetId: d.id,
            name: d.name,
            price: effectivePrice,
            NoPriceText: noPriceText,
          },
          creator: {
            creatorId: d.creatorTargetId,
            creatorType: d.creatorType,
            name: d.creatorName,
          },
          product: {
            priceInRobux: effectivePrice,
            priceInTickets: null,
            isForSale: Boolean(d.isForSale),
            isFree: effectivePrice === 0,
            noPriceText,
          },
        };
      }),
    };
  } catch (_) {
    return { data: [] };
  }
};

export const getComments = async ({ assetId, offset = 0 }) => {
  try {
    const res = await request(
      'GET',
      `${getBaseUrl()}/comments/get-json?assetId=${assetId}&startIndex=${offset}&thumbnailWidth=100&thumbnailHeight=100&thumbnailFormat=PNG`
    );
    if (res?.data && Array.isArray(res.data.Comments)) return res.data;
  } catch (_) {
    // Comments were retired on modern Roblox
  }
  return {
    IsUserModerator: false,
    Comments: [],
    MaxRows: 10,
    AreCommentsDisabled: true,
  };
};

export const createComment = async ({ assetId, comment }) => {
  const result = await request('POST', `${getBaseUrl()}/comments/post`, {
    text: comment,
    assetId,
  });
  if (typeof result?.data?.ErrorCode === 'string') {
    throw new Error(result.data.ErrorCode);
  }
  return result.data;
};

export const addOrRemoveFromCollections = ({ assetId, addToProfile }) => {
  return request('POST', `${getBaseUrl()}/asset/toggle-profile`, {
    assetId,
    addToProfile,
  }).catch(() => ({}));
};

export const getIsFavorited = async ({ assetId, userId }) => {
  if (!userId || !assetId) return null;
  return request(
    'GET',
    getFullUrl('catalog', `/v1/favorites/users/${userId}/assets/${assetId}/favorite`)
  )
    .then((d) => d.data)
    .catch(() => null);
};

export const createFavorite = async ({ assetId, userId }) => {
  return request(
    'POST',
    getFullUrl('catalog', `/v1/favorites/users/${userId}/assets/${assetId}/favorite`),
    {}
  );
};

export const deleteFavorite = async ({ assetId, userId }) => {
  return request(
    'DELETE',
    getFullUrl('catalog', `/v1/favorites/users/${userId}/assets/${assetId}/favorite`)
  );
};

export const getAudioURL = async ({ audioId }) => {
  try {
    const res = await request('GET', getFullUrl('assetdelivery', `/v2/assetId/${audioId}`));
    const loc = res?.data?.locations?.[0]?.location;
    if (loc) return loc;
  } catch (_) {
    // fallback
  }
  return `https://assetdelivery.roblox.com/v1/asset/?id=${encodeURIComponent(audioId)}`;
};

export const getAudio = async ({ audioId }) => {
  return getAudioURL({ audioId });
};

export const getModerationStatus = () => Promise.resolve('ReviewApproved');
