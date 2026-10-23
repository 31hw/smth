import { chunk } from 'lodash';
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

export const getItemUrl = ({ assetId, name, itemType = 'Asset', assetType = null }) => {
  const encoded = itemNameToEncodedName(name);
  if (itemType === 'Bundle') {
    return `/bundles/${assetId}/${encoded}`;
  }
  if (itemType === 'GamePass' || Number(assetType) === 34) {
    return `/game-pass/${assetId}/${encoded}`;
  }
  return `/catalog/${assetId}/${encoded}`;
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
  if (
    subCatParam &&
    String(subCatParam) !== '0' &&
    String(subCatParam).toLowerCase() !== 'all' &&
    String(subCatParam).toLowerCase() !== 'items'
  ) {
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

const _economyDetailsCache = new Map();

export const getProductInfoLegacy = async (assetId) => {
  const key = Number(assetId);
  if (_economyDetailsCache.has(key)) {
    return _economyDetailsCache.get(key);
  }
  const p = request('GET', getFullUrl('economy', `/v2/assets/${encodeURIComponent(key)}/details`))
    .then((res) => res?.data || null)
    .catch((err) => {
      _economyDetailsCache.delete(key);
      throw err;
    });
  _economyDetailsCache.set(key, p);
  return p;
};

export const getGamePassProductInfo = async (passId) => {
  const res = await request(
    'GET',
    getFullUrl('apis', `/game-passes/v1/game-passes/${encodeURIComponent(passId)}/product-info`)
  );
  return res?.data || null;
};

export const getBundleDetails = async (bundleId) => {
  const res = await request(
    'GET',
    getFullUrl('catalog', `/v1/bundles/${encodeURIComponent(bundleId)}/details`)
  );
  return res?.data || null;
};

export const getMarketplaceItemsDetails = async (collectibleItemIds) => {
  const clean = [...new Set((collectibleItemIds || []).filter((x) => typeof x === 'string' && x.length > 0))];
  if (!clean.length) return [];
  const batches = chunk(clean, 30);
  const out = [];
  for (const itemIds of batches) {
    try {
      const res = await request(
        'POST',
        getFullUrl('apis', '/marketplace-items/v1/items/details'),
        { itemIds }
      );
      if (Array.isArray(res?.data)) {
        out.push(...res.data);
      } else if (Array.isArray(res?.data?.data)) {
        out.push(...res.data.data);
      }
    } catch (_) {
      // ignore optional collectible batch error
    }
  }
  return out;
};

export const getFavoriteCount = async ({ id, itemType = 'Asset' }) => {
  if (!id) return null;
  const kind = itemType === 'Bundle' ? 'bundles' : 'assets';
  try {
    const res = await request('GET', getFullUrl('catalog', `/v1/favorites/${kind}/${encodeURIComponent(id)}/count`));
    return typeof res?.data === 'number' ? res.data : null;
  } catch (_) {
    return null;
  }
};

function normalizeRestrictions(rawRestrictions, ecoInfo, mpInfo) {
  const set = new Set(Array.isArray(rawRestrictions) ? rawRestrictions : []);
  const totalQty =
    mpInfo?.totalQuantity ??
    ecoInfo?.TotalQuantity ??
    ecoInfo?.CollectiblesItemDetails?.TotalQuantity ??
    0;
  const isCollectibleLimited =
    set.has('Limited') ||
    set.has('LimitedUnique') ||
    set.has('Collectible') ||
    Boolean(ecoInfo?.IsLimited) ||
    Boolean(ecoInfo?.IsLimitedUnique) ||
    Boolean(ecoInfo?.CollectiblesItemDetails?.IsLimited) ||
    Boolean(mpInfo?.hasResellers);

  if (ecoInfo?.IsLimitedUnique || (isCollectibleLimited && totalQty > 0)) {
    set.add('LimitedUnique');
  } else if (isCollectibleLimited || ecoInfo?.IsLimited) {
    set.add('Limited');
  }
  return [...set];
}

function normalizeMergedCatalogItem({
  id,
  requestedType = 'Asset',
  catItem = null,
  ecoInfo = null,
  bundleInfo = null,
  mpInfo = null,
  favCount = null,
  resaleSales = null,
}) {
  // Bundle normalization
  if (requestedType === 'Bundle' || bundleInfo || catItem?.itemType === 'Bundle') {
    const bProduct = bundleInfo?.product || {};
    const collectDetails = bundleInfo?.collectibleItemDetail || {};
    const collectibleItemId =
      catItem?.collectibleItemId ||
      collectDetails?.collectibleItemId ||
      mpInfo?.collectibleItemId ||
      null;
    const collectibleProductId =
      mpInfo?.collectibleProductId ||
      collectDetails?.collectibleProductId ||
      catItem?.collectibleProductId ||
      null;
    const restrictions = normalizeRestrictions(catItem?.itemRestrictions, null, mpInfo);
    const isFree =
      Boolean(bProduct.isFree) ||
      catItem?.priceStatus === 'Free' ||
      bProduct.priceInRobux === 0 ||
      mpInfo?.price === 0;
    const rawPrice = isFree
      ? 0
      : typeof mpInfo?.price === 'number'
      ? mpInfo.price
      : typeof bProduct.priceInRobux === 'number'
      ? bProduct.priceInRobux
      : typeof catItem?.price === 'number'
      ? catItem.price
      : null;
    const lowestPrice =
      mpInfo?.lowestResalePrice ??
      mpInfo?.lowestPrice ??
      catItem?.lowestResalePrice ??
      catItem?.lowestPrice ??
      collectDetails?.lowestResalePrice ??
      undefined;
    const totalQuantity = mpInfo?.totalQuantity ?? catItem?.totalQuantity ?? collectDetails?.totalQuantity ?? 0;
    const unitsAvailable =
      mpInfo?.unitsAvailableForConsumption ??
      catItem?.unitsAvailableForConsumption ??
      collectDetails?.unitsAvailable ??
      0;
    const isLim = restrictions.includes('Limited') || restrictions.includes('LimitedUnique');
    const primaryOpen =
      isFree ||
      ((typeof bProduct.isForSale === 'boolean'
        ? bProduct.isForSale
        : typeof mpInfo?.isForSale === 'boolean'
        ? mpInfo.isForSale
        : catItem?.priceStatus !== 'Off Sale' && typeof rawPrice === 'number') &&
        (!isLim || totalQuantity === 0 || unitsAvailable > 0));
    const creator = bundleInfo?.creator || {};
    const saleCount =
      typeof mpInfo?.saleCount === 'number'
        ? mpInfo.saleCount
        : typeof catItem?.saleCount === 'number'
        ? catItem.saleCount
        : typeof resaleSales === 'number'
        ? resaleSales
        : null;

    return {
      id: Number(bundleInfo?.id || catItem?.id || id),
      itemType: 'Bundle',
      bundleType: bundleInfo?.bundleType || catItem?.bundleType || 1,
      assetType: 32, // Package / Bundle display type
      name: bundleInfo?.name || catItem?.name || 'Bundle',
      description: bundleInfo?.description ?? catItem?.description ?? '',
      productId: bProduct.id || catItem?.productId || null,
      genres: Array.isArray(catItem?.genres) && catItem.genres.length ? catItem.genres : ['All'],
      itemStatuses: Array.isArray(catItem?.itemStatuses) ? catItem.itemStatuses : [],
      itemRestrictions: restrictions,
      creatorHasVerifiedBadge: Boolean(creator.hasVerifiedBadge ?? catItem?.creatorHasVerifiedBadge),
      creatorType: creator.type || catItem?.creatorType || 'User',
      creatorTargetId: creator.id || catItem?.creatorTargetId || 1,
      creatorName: creator.name || catItem?.creatorName || 'ROBLOX',
      price: rawPrice,
      priceTickets: null,
      lowestPrice,
      priceStatus: primaryOpen ? (isFree ? 'Free' : undefined) : 'Off Sale',
      unitsAvailableForConsumption: unitsAvailable,
      totalQuantity,
      saleCount: saleCount ?? 0,
      Sales: saleCount ?? 0,
      hasSaleCount: typeof saleCount === 'number',
      favoriteCount: favCount ?? catItem?.favoriteCount ?? 0,
      offsaleDeadline: catItem?.offsaleDeadline || collectDetails?.saleLocation?.offsaleDeadline || null,
      collectibleItemId,
      collectibleProductId,
      lowestAvailableResaleProductId: mpInfo?.lowestAvailableResaleProductId || null,
      lowestAvailableResaleItemInstanceId: mpInfo?.lowestAvailableResaleItemInstanceId || null,
      hasResellers: Boolean(mpInfo?.hasResellers ?? catItem?.hasResellers ?? (typeof lowestPrice === 'number')),
      isForSale: Boolean(primaryOpen),
      createdAt: catItem?.createdAt || null,
      updatedAt: catItem?.updatedAt || null,
      Created: catItem?.createdAt || null,
      Updated: catItem?.updatedAt || null,
      bundleItems: Array.isArray(bundleInfo?.items) ? bundleInfo.items : [],
    };
  }

  // Asset / GamePass normalization
  const restrictions = normalizeRestrictions(catItem?.itemRestrictions, ecoInfo, mpInfo);
  const isLim = restrictions.includes('Limited') || restrictions.includes('LimitedUnique');

  const collectibleItemId =
    catItem?.collectibleItemId ||
    ecoInfo?.CollectibleItemId ||
    mpInfo?.collectibleItemId ||
    null;
  const collectibleProductId =
    mpInfo?.collectibleProductId ||
    ecoInfo?.CollectibleProductId ||
    catItem?.collectibleProductId ||
    null;

  const totalQuantity =
    mpInfo?.totalQuantity ??
    catItem?.totalQuantity ??
    ecoInfo?.TotalQuantity ??
    ecoInfo?.CollectiblesItemDetails?.TotalQuantity ??
    0;
  const unitsAvailable =
    typeof ecoInfo?.Remaining === 'number'
      ? ecoInfo.Remaining
      : mpInfo?.unitsAvailableForConsumption ??
        catItem?.unitsAvailableForConsumption ??
        0;

  const isFree =
    catItem?.priceStatus === 'Free' ||
    Boolean(ecoInfo?.IsPublicDomain) ||
    (ecoInfo?.IsForSale === true && (ecoInfo?.PriceInRobux === 0 || ecoInfo?.PriceInRobux === null)) ||
    (mpInfo?.isForSale === true && mpInfo?.price === 0) ||
    (catItem?.price === 0 && catItem?.priceStatus !== 'Off Sale');

  const rawPrimaryPrice = isFree
    ? 0
    : typeof mpInfo?.price === 'number' && (mpInfo?.isForSale || !isLim)
    ? mpInfo.price
    : typeof ecoInfo?.PriceInRobux === 'number'
    ? ecoInfo.PriceInRobux
    : typeof catItem?.price === 'number'
    ? catItem.price
    : null;

  const lowestPrice =
    mpInfo?.lowestResalePrice ??
    mpInfo?.lowestPrice ??
    catItem?.lowestResalePrice ??
    catItem?.lowestPrice ??
    ecoInfo?.LowestSellerPrice ??
    ecoInfo?.CollectiblesItemDetails?.CollectibleLowestResalePrice ??
    undefined;

  let isForSale = false;
  if (isFree) {
    isForSale = true;
  } else if (typeof ecoInfo?.IsForSale === 'boolean') {
    isForSale = ecoInfo.IsForSale && (!isLim || totalQuantity === 0 || unitsAvailable > 0);
  } else if (typeof mpInfo?.isForSale === 'boolean') {
    isForSale = mpInfo.isForSale && (!isLim || totalQuantity === 0 || unitsAvailable > 0);
  } else if (typeof catItem?.isForSale === 'boolean') {
    isForSale = catItem.isForSale;
  } else {
    // Live catalog/items/details returns unitsAvailableForConsumption: 0 for ALL regular non-limited items!
    const stockOk = !isLim || totalQuantity === 0 || unitsAvailable > 0;
    const soldOutToResaleOnly =
      isLim &&
      typeof lowestPrice === 'number' &&
      (totalQuantity > 0 ? unitsAvailable === 0 : typeof catItem?.price !== 'number');
    isForSale =
      catItem?.priceStatus !== 'Off Sale' &&
      typeof rawPrimaryPrice === 'number' &&
      stockOk &&
      !soldOutToResaleOnly;
  }

  const assetType = Number(
    ecoInfo?.AssetTypeId ??
      catItem?.assetType ??
      mpInfo?.assetType ??
      (requestedType === 'GamePass' ? 34 : 8)
  );
  const itemType = requestedType === 'GamePass' || assetType === 34 ? 'GamePass' : 'Asset';

  const saleCount =
    typeof ecoInfo?.Sales === 'number'
      ? ecoInfo.Sales
      : typeof catItem?.saleCount === 'number'
      ? catItem.saleCount
      : typeof resaleSales === 'number'
      ? resaleSales
      : null;

  const createdAt = ecoInfo?.Created || catItem?.createdAt || null;
  const updatedAt = ecoInfo?.Updated || catItem?.updatedAt || createdAt || null;

  const creatorType =
    ecoInfo?.Creator?.CreatorType ||
    catItem?.creatorType ||
    mpInfo?.creatorType ||
    'User';
  const creatorTargetId =
    ecoInfo?.Creator?.CreatorTargetId ||
    ecoInfo?.Creator?.Id ||
    catItem?.creatorTargetId ||
    mpInfo?.creatorId ||
    1;
  const creatorName =
    ecoInfo?.Creator?.Name ||
    catItem?.creatorName ||
    mpInfo?.creatorName ||
    'ROBLOX';

  return {
    id: Number(catItem?.id || ecoInfo?.AssetId || ecoInfo?.TargetId || id),
    itemType: itemType === 'GamePass' ? 'Asset' : 'Asset',
    isGamePass: itemType === 'GamePass' || assetType === 34,
    iconImageAssetId: ecoInfo?.IconImageAssetId || null,
    assetType,
    name: catItem?.name || ecoInfo?.Name || mpInfo?.name || 'Unnamed Item',
    description: ecoInfo?.Description ?? catItem?.description ?? mpInfo?.description ?? '',
    productId: ecoInfo?.ProductId || catItem?.productId || null,
    genres: Array.isArray(catItem?.genres) && catItem.genres.length ? catItem.genres : ['All'],
    itemStatuses:
      Array.isArray(catItem?.itemStatuses) && catItem.itemStatuses.length
        ? catItem.itemStatuses
        : ecoInfo?.IsNew
        ? ['New']
        : [],
    itemRestrictions: restrictions,
    creatorHasVerifiedBadge: Boolean(
      catItem?.creatorHasVerifiedBadge ?? ecoInfo?.Creator?.HasVerifiedBadge ?? mpInfo?.creatorHasVerifiedBadge
    ),
    creatorType,
    creatorTargetId,
    creatorName,
    price: rawPrimaryPrice,
    priceTickets: typeof catItem?.priceTickets === 'number' ? catItem.priceTickets : null,
    lowestPrice,
    priceStatus: isForSale ? (isFree ? 'Free' : undefined) : 'Off Sale',
    unitsAvailableForConsumption: unitsAvailable,
    totalQuantity,
    saleCount: saleCount ?? 0,
    Sales: saleCount ?? 0,
    hasSaleCount: typeof saleCount === 'number',
    favoriteCount: favCount ?? catItem?.favoriteCount ?? 0,
    offsaleDeadline: ecoInfo?.OffsaleDeadline || catItem?.offsaleDeadline || null,
    collectibleItemId,
    collectibleProductId,
    lowestAvailableResaleProductId:
      mpInfo?.lowestAvailableResaleProductId ||
      ecoInfo?.CollectiblesItemDetails?.CollectibleLowestAvailableResaleProductId ||
      null,
    lowestAvailableResaleItemInstanceId:
      mpInfo?.lowestAvailableResaleItemInstanceId ||
      ecoInfo?.CollectiblesItemDetails?.CollectibleLowestAvailableResaleItemInstanceId ||
      null,
    hasResellers: Boolean(mpInfo?.hasResellers ?? catItem?.hasResellers ?? (typeof lowestPrice === 'number')),
    isForSale: Boolean(isForSale),
    createdAt,
    updatedAt,
    Created: createdAt,
    Updated: updatedAt,
  };
}

export const enrichCatalogCardItem = async (item) => {
  if (!item || !item.id || item.itemType === 'Bundle') return item;
  if (item.hasSaleCount && item.createdAt) return item;
  try {
    const ecoInfo = await getProductInfoLegacy(item.id);
    if (!ecoInfo) return item;
    return normalizeMergedCatalogItem({
      id: item.id,
      requestedType: item.assetType === 34 ? 'GamePass' : 'Asset',
      catItem: item,
      ecoInfo,
    });
  } catch (_) {
    return item;
  }
};

export const getItemDetails = async (itemsOrIds) => {
  const normalizedInputs = [];
  const seen = new Set();
  for (const raw of itemsOrIds || []) {
    const obj =
      raw && typeof raw === 'object'
        ? { id: Number(raw.id || raw.assetId), itemType: raw.itemType || 'Asset' }
        : { id: Number(raw), itemType: 'Asset' };
    if (!obj.id || obj.id <= 0) continue;
    const key = `${obj.itemType}:${obj.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalizedInputs.push(obj);
  }
  if (normalizedInputs.length === 0) return { data: { data: [] } };

  const isDetailView = normalizedInputs.length <= 5;
  const catLookupItems = normalizedInputs.filter((x) => x.itemType === 'Asset' || x.itemType === 'Bundle');

  const catMap = new Map();
  if (catLookupItems.length > 0) {
    for (const batch of chunk(catLookupItems, 60)) {
      try {
        const res = await request('POST', getFullUrl('catalog', '/v1/catalog/items/details'), {
          items: batch.map((x) => ({
            itemType: x.itemType === 'Bundle' ? 'Bundle' : 'Asset',
            id: x.id,
          })),
        });
        for (const entry of res?.data?.data || []) {
          const entryType = entry.itemType === 'Bundle' ? 'Bundle' : 'Asset';
          catMap.set(`${entryType}:${entry.id}`, entry);
        }
      } catch (err) {
        console.warn('[catalog] catalog/items/details error:', err?.message);
      }
    }
  }

  // Batch-enrich any collectibleItemIds across the entire result set in ONE call
  const collectibleIds = [];
  for (const entry of catMap.values()) {
    if (entry.collectibleItemId) collectibleIds.push(entry.collectibleItemId);
  }
  const mpList = collectibleIds.length > 0 ? await getMarketplaceItemsDetails(collectibleIds) : [];
  const mpByCollectibleId = new Map();
  const mpByTargetId = new Map();
  for (const m of mpList) {
    if (m.collectibleItemId) mpByCollectibleId.set(m.collectibleItemId, m);
    if (m.itemTargetId) mpByTargetId.set(Number(m.itemTargetId), m);
  }

  // For grid views (> 5 items), normalize quickly and fetch bundle details only if needed
  if (!isDetailView) {
    const out = await Promise.all(
      normalizedInputs.map(async (inp) => {
        const key = `${inp.itemType === 'Bundle' ? 'Bundle' : 'Asset'}:${inp.id}`;
        const catItem = catMap.get(key) || null;
        if (!catItem && inp.itemType === 'Bundle') {
          const bInfo = await getBundleDetails(inp.id).catch(() => null);
          return bInfo
            ? normalizeMergedCatalogItem({ id: inp.id, requestedType: 'Bundle', bundleInfo: bInfo })
            : null;
        }
        if (!catItem) return null;
        const mpInfo =
          (catItem.collectibleItemId && mpByCollectibleId.get(catItem.collectibleItemId)) ||
          mpByTargetId.get(inp.id) ||
          null;
        return normalizeMergedCatalogItem({
          id: inp.id,
          requestedType: inp.itemType,
          catItem,
          mpInfo,
        });
      })
    );
    return { data: { data: out.filter(Boolean) } };
  }

  // For single-item / detail views (<= 5 items): call ALL relevant live Roblox endpoints in parallel!
  const detailedOut = await Promise.all(
    normalizedInputs.map(async (inp) => {
      const isBundle = inp.itemType === 'Bundle';
      const isGamePass = inp.itemType === 'GamePass';
      const catKey = `${isBundle ? 'Bundle' : 'Asset'}:${inp.id}`;
      let catItem = catMap.get(catKey) || null;

      if (isBundle) {
        const [bundleInfo, favCount] = await Promise.all([
          getBundleDetails(inp.id).catch(() => null),
          catItem?.favoriteCount != null
            ? Promise.resolve(catItem.favoriteCount)
            : getFavoriteCount({ id: inp.id, itemType: 'Bundle' }),
        ]);
        if (!bundleInfo && !catItem) return null;
        const cId =
          catItem?.collectibleItemId || bundleInfo?.collectibleItemDetail?.collectibleItemId || null;
        let mpInfo = (cId && mpByCollectibleId.get(cId)) || mpByTargetId.get(inp.id) || null;
        if (!mpInfo && cId) {
          const extraMp = await getMarketplaceItemsDetails([cId]);
          mpInfo = extraMp?.[0] || null;
        }
        return normalizeMergedCatalogItem({
          id: inp.id,
          requestedType: 'Bundle',
          catItem,
          bundleInfo,
          mpInfo,
          favCount,
        });
      }

      // Asset or GamePass
      let [ecoInfo, favCount] = await Promise.all([
        isGamePass
          ? getGamePassProductInfo(inp.id).catch(() => null)
          : getProductInfoLegacy(inp.id).catch(() => null),
        catItem?.favoriteCount != null
          ? Promise.resolve(catItem.favoriteCount)
          : getFavoriteCount({ id: inp.id, itemType: 'Asset' }),
      ]);

      // Fallback to GamePass product-info when modern GamePass ID is opened via /catalog/:id
      if ((!ecoInfo && !catItem) || Number(ecoInfo?.AssetTypeId || catItem?.assetType) === 34) {
        if (!ecoInfo || typeof ecoInfo.PriceInRobux === 'undefined') {
          const gpInfo = await getGamePassProductInfo(inp.id).catch(() => null);
          if (gpInfo) ecoInfo = gpInfo;
        }
      }

      if (!catItem && !ecoInfo) return null;

      const cId = catItem?.collectibleItemId || ecoInfo?.CollectibleItemId || null;
      let mpInfo = (cId && mpByCollectibleId.get(cId)) || mpByTargetId.get(inp.id) || null;
      if (!mpInfo && cId) {
        const extraMp = await getMarketplaceItemsDetails([cId]);
        mpInfo = extraMp?.[0] || null;
      }

      // For Limiteds/Collectibles where Sales is omitted or 0 in economy/v2, pull sales from resale-data
      let resaleSales = null;
      const restrictions = normalizeRestrictions(catItem?.itemRestrictions, ecoInfo, mpInfo);
      const isLim = restrictions.includes('Limited') || restrictions.includes('LimitedUnique');
      if (isLim && !(typeof ecoInfo?.Sales === 'number' && ecoInfo.Sales > 0)) {
        try {
          const resaleRes = cId
            ? await request('GET', getFullUrl('apis', `/marketplace-sales/v1/item/${cId}/resale-data`)).catch(
                () => request('GET', getFullUrl('economy', `/v1/assets/${inp.id}/resale-data`))
              )
            : await request('GET', getFullUrl('economy', `/v1/assets/${inp.id}/resale-data`));
          if (typeof resaleRes?.data?.sales === 'number') {
            resaleSales = resaleRes.data.sales;
          }
        } catch (_) {
          // ignore optional resale-data sales fallback
        }
      }

      return normalizeMergedCatalogItem({
        id: inp.id,
        requestedType: isGamePass ? 'GamePass' : 'Asset',
        catItem,
        ecoInfo,
        mpInfo,
        favCount,
        resaleSales,
      });
    })
  );

  return {
    data: {
      data: detailedOut.filter(Boolean),
    },
  };
};

export const getItemDetailsNew = async (itemsOrIds) => {
  const res = await getItemDetails(itemsOrIds);
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
    const searchItems = (search?.data || [])
      .filter((x) => x.id !== Number(assetId))
      .slice(0, limit);
    const details = await getItemDetailsNew(searchItems);
    return {
      data: details.map((d) => {
        const effectivePrice = d.isForSale ? d.price : d.lowestPrice ?? null;
        const noPriceText = d.isForSale ? 'Free' : 'Off Sale';
        return {
          item: {
            assetId: d.id,
            itemType: d.itemType,
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
            isForSale: Boolean(d.isForSale || typeof d.lowestPrice === 'number'),
            isFree: effectivePrice === 0 && d.isForSale,
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

export const getIsFavorited = async ({ assetId, userId, itemType = 'Asset' }) => {
  if (!userId || !assetId) return null;
  const kind = itemType === 'Bundle' ? 'bundles' : 'assets';
  return request(
    'GET',
    getFullUrl('catalog', `/v1/favorites/users/${userId}/${kind}/${assetId}/favorite`)
  )
    .then((d) => d.data)
    .catch(() => null);
};

export const createFavorite = async ({ assetId, userId, itemType = 'Asset' }) => {
  const kind = itemType === 'Bundle' ? 'bundles' : 'assets';
  return request(
    'POST',
    getFullUrl('catalog', `/v1/favorites/users/${userId}/${kind}/${assetId}/favorite`),
    {}
  );
};

export const deleteFavorite = async ({ assetId, userId, itemType = 'Asset' }) => {
  const kind = itemType === 'Bundle' ? 'bundles' : 'assets';
  return request(
    'DELETE',
    getFullUrl('catalog', `/v1/favorites/users/${userId}/${kind}/${assetId}/favorite`)
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
