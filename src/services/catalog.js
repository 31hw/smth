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

const GENRE_ID_TO_NAME = {
  1: 'TownAndCity',
  2: 'Medieval',
  3: 'SciFi',
  4: 'Fighting',
  5: 'Horror',
  6: 'Naval',
  7: 'Adventure',
  8: 'Sports',
  9: 'Comedy',
  10: 'Western',
  11: 'Military',
  13: 'Building',
  14: 'FPS',
  15: 'RPG',
};

const GEAR_SUBTYPE_KEYWORDS = {
  melee: 'sword',
  ranged: 'blaster',
  explosive: 'bomb',
  powerup: 'potion',
  navigation: 'coil',
  musical: 'guitar',
  social: 'bloxxy',
  building: 'trowel',
  transport: 'skateboard',
};

function resolveCatalogSearchMapping(rawCategory, rawSubCategory) {
  const catStr = String(rawCategory || 'Featured').toLowerCase().trim();
  const subStr = String(rawSubCategory || '').toLowerCase().trim();

  // Featured -> Recent official items by Roblox (creatorTargetId=1, sortType=3)
  if (catStr === '0' || catStr === 'featured') {
    if (subStr === 'hats' || subStr === 'accessories' || subStr === 'headaccessories') {
      return { apiCat: 'Accessories', apiSub: 'HeadAccessories', isFeatured: true, autoUnavailableFallback: true };
    }
    if (subStr === 'gear' || subStr === 'gears') {
      return { apiCat: 'Accessories', apiSub: 'Gear', isFeatured: true, autoUnavailableFallback: true };
    }
    if (subStr === 'face' || subStr === 'faces') {
      return { apiCat: 'BodyParts', apiSub: 'Faces', isFeatured: true, autoUnavailableFallback: true };
    }
    if (subStr === 'packages' || subStr === 'bundles') {
      return { apiCat: 'BodyParts', apiSub: 'Bundles', isFeatured: true, autoUnavailableFallback: true };
    }
    return { apiCat: 'All', apiSub: '', isFeatured: true, autoUnavailableFallback: true };
  }

  // Emotes / Avatar Animations
  if (catStr === 'emotes' || catStr === 'avataranimations' || catStr === 'animations' || subStr === 'emotes' || subStr === 'emoteanimations') {
    if (subStr === 'bundleanimations' || subStr === 'animations') {
      return { apiCat: 'AvatarAnimations', apiSub: 'BundleAnimations', isFeatured: false };
    }
    if (subStr === 'allanimations') {
      return { apiCat: 'AvatarAnimations', apiSub: '', isFeatured: false };
    }
    return { apiCat: 'AvatarAnimations', apiSub: 'EmoteAnimations', isFeatured: false };
  }

  // Collectibles
  if (catStr === '2' || catStr === 'collectibles' || catStr === 'collectible') {
    if (subStr === 'face' || subStr === 'faces') {
      return { apiCat: 'Collectibles', apiSub: 'Faces', isFeatured: false };
    }
    if (subStr === 'hats' || subStr === 'accessories' || subStr === 'headaccessories') {
      return { apiCat: 'Collectibles', apiSub: 'HeadAccessories', isFeatured: false };
    }
    if (subStr === 'gear' || subStr === 'gears') {
      return { apiCat: 'Collectibles', apiSub: 'Gear', isFeatured: false };
    }
    return { apiCat: 'Collectibles', apiSub: '', isFeatured: false };
  }

  // Body Parts (All Body Parts, Heads, Dynamic Heads, Faces, Packages/Bundles)
  if (catStr === '4' || catStr === 'bodyparts') {
    if (subStr === 'head' || subStr === 'heads') {
      return { apiCat: 'BodyParts', apiSub: 'Heads', isFeatured: false, autoUnavailableFallback: true, altSub: 'DynamicHeads' };
    }
    if (subStr === 'dynamicheads') {
      return { apiCat: 'BodyParts', apiSub: 'DynamicHeads', isFeatured: false };
    }
    if (subStr === 'face' || subStr === 'faces') {
      return { apiCat: 'BodyParts', apiSub: 'Faces', isFeatured: false, autoUnavailableFallback: true };
    }
    if (subStr === 'package' || subStr === 'packages' || subStr === 'bundle' || subStr === 'bundles') {
      return { apiCat: 'BodyParts', apiSub: 'Bundles', isFeatured: false, altCat: 'Characters' };
    }
    return { apiCat: 'BodyParts', apiSub: '', isFeatured: false };
  }

  // Gear + all 9 classic Gear subtypes
  if (catStr === '5' || catStr === 'gear' || catStr === 'gears') {
    const impliedKeyword = GEAR_SUBTYPE_KEYWORDS[subStr] || '';
    return {
      apiCat: 'Accessories',
      apiSub: 'Gear',
      impliedKeyword,
      isFeatured: false,
      autoUnavailableFallback: true,
    };
  }

  // Clothing & Accessories
  if (catStr === '3' || catStr === 'clothing' || catStr === 'null') {
    if (subStr === 'hats' || subStr === 'hat' || subStr === 'headaccessories') {
      return { apiCat: 'Accessories', apiSub: 'HeadAccessories', isFeatured: false };
    }
    if (subStr === 'hair' || subStr === 'hairaccessories') {
      return { apiCat: 'Accessories', apiSub: 'HairAccessories', isFeatured: false };
    }
    if (subStr === 'accessories' || subStr === 'allaccessories') {
      return { apiCat: 'Accessories', apiSub: '', isFeatured: false };
    }
    if (subStr === 'faceaccessories') {
      return { apiCat: 'Accessories', apiSub: 'FaceAccessories', isFeatured: false };
    }
    if (subStr === 'neck' || subStr === 'neckaccessories') {
      return { apiCat: 'Accessories', apiSub: 'NeckAccessories', isFeatured: false };
    }
    if (subStr === 'shoulder' || subStr === 'shoulders' || subStr === 'shoulderaccessories') {
      return { apiCat: 'Accessories', apiSub: 'ShoulderAccessories', isFeatured: false };
    }
    if (subStr === 'front' || subStr === 'frontaccessories') {
      return { apiCat: 'Accessories', apiSub: 'FrontAccessories', isFeatured: false };
    }
    if (subStr === 'back' || subStr === 'backaccessories') {
      return { apiCat: 'Accessories', apiSub: 'BackAccessories', isFeatured: false };
    }
    if (subStr === 'waist' || subStr === 'waistaccessories') {
      return { apiCat: 'Accessories', apiSub: 'WaistAccessories', isFeatured: false };
    }
    if (subStr === 'shirt' || subStr === 'shirts' || subStr === 'classicshirts') {
      return { apiCat: 'Clothing', apiSub: 'ClassicShirts', isFeatured: false };
    }
    if (subStr === 'tshirt' || subStr === 'tshirts' || subStr === 't-shirts' || subStr === 'teeshirt' || subStr === 'teeshirts' || subStr === 'classictshirts') {
      return { apiCat: 'Clothing', apiSub: 'ClassicTShirts', isFeatured: false };
    }
    if (subStr === 'pant' || subStr === 'pants' || subStr === 'classicpants') {
      return { apiCat: 'Clothing', apiSub: 'ClassicPants', isFeatured: false };
    }
    if (subStr === 'package' || subStr === 'packages' || subStr === 'bundle' || subStr === 'bundles') {
      return { apiCat: 'BodyParts', apiSub: 'Bundles', isFeatured: false, altCat: 'Characters' };
    }
    return { apiCat: 'Clothing', apiSub: '', isFeatured: false };
  }

  if (catStr === '11' || catStr === 'accessories') {
    return { apiCat: 'Accessories', apiSub: subStr && subStr !== 'all' ? rawSubCategory : '', isFeatured: false };
  }

  return { apiCat: 'All', apiSub: '', isFeatured: false };
}

export const searchCatalog = async ({
  category,
  subCategory = null,
  query = null,
  limit = 28,
  cursor = null,
  sort = 0,
  genres = null,
  minPrice = null,
  maxPrice = null,
  freeOnly = false,
  creatorType = null,
  creatorId = null,
  creatorName = null,
  includeNotForSale = null,
}) => {
  const safeLimit = normalizeCatalogLimit(limit);
  const mapped = resolveCatalogSearchMapping(category, subCategory);

  let effectiveCreatorType = creatorType;
  let effectiveCreatorId = creatorId;
  let effectiveCreatorName = creatorName;
  let effectiveSort = Number(sort) || 0;

  // Featured = Recent items by Roblox (unless user explicitly filtered by another creator)
  if (mapped.isFeatured && !effectiveCreatorId && !effectiveCreatorName) {
    effectiveCreatorType = 'User';
    effectiveCreatorId = 1;
    if (effectiveSort === 0) {
      effectiveSort = 3; // Recently Updated
    }
  }

  const effectiveKeyword = query && String(query).trim()
    ? String(query).trim()
    : mapped.impliedKeyword || '';

  const genreNames = Array.isArray(genres)
    ? genres.map((g) => GENRE_ID_TO_NAME[Number(g)] || (typeof g === 'string' ? g : null)).filter(Boolean)
    : [];

  const buildQueryString = ({ catOverride, subOverride, forceUnavailable = false, dropKeyword = false } = {}) => {
    const useCat = catOverride || mapped.apiCat;
    const useSub = typeof subOverride === 'string' ? subOverride : mapped.apiSub;
    let qs = `category=${encodeURIComponent(useCat)}&limit=${safeLimit}`;
    if (useSub) {
      qs += `&subcategory=${encodeURIComponent(useSub)}`;
    }
    if (effectiveSort > 0 && effectiveSort <= 5) {
      qs += `&sortType=${encodeURIComponent(effectiveSort)}`;
    }
    if (cursor) {
      qs += `&cursor=${encodeURIComponent(cursor)}`;
    }
    const kw = dropKeyword ? '' : effectiveKeyword;
    if (kw) {
      qs += `&keyword=${encodeURIComponent(kw)}`;
    }
    if (effectiveCreatorType && effectiveCreatorId) {
      qs += `&creatorTargetId=${encodeURIComponent(effectiveCreatorId)}&creatorType=${encodeURIComponent(effectiveCreatorType)}`;
    } else if (effectiveCreatorName) {
      qs += `&creatorName=${encodeURIComponent(effectiveCreatorName)}`;
    }
    if (freeOnly) {
      qs += `&minPrice=0&maxPrice=0`;
    } else {
      if (minPrice !== null && minPrice !== '' && Number.isFinite(Number(minPrice)) && Number(minPrice) >= 0) {
        qs += `&minPrice=${encodeURIComponent(Math.floor(Number(minPrice)))}`;
      }
      if (maxPrice !== null && maxPrice !== '' && Number.isFinite(Number(maxPrice)) && Number(maxPrice) >= 0) {
        qs += `&maxPrice=${encodeURIComponent(Math.floor(Number(maxPrice)))}`;
      }
    }
    for (const gName of genreNames) {
      qs += `&genres=${encodeURIComponent(gName)}`;
    }
    if (includeNotForSale === true || forceUnavailable) {
      qs += `&includeNotForSale=true`;
    }
    return qs;
  };

  const runSingleSearch = async (qs) => {
    // Prefer /v2/search/items/details (single GET with full item details, avoids POST /v1/catalog/items/details 429s)
    try {
      const v2Res = await request('GET', getFullUrl('catalog', `/v2/search/items/details?${qs}`));
      if (Array.isArray(v2Res?.data?.data)) {
        const hasFullDetails = v2Res.data.data.some((it) => typeof it.name === 'string' && it.name.length > 0);
        if (hasFullDetails) {
          const normalized = v2Res.data.data.map((raw) =>
            normalizeMergedCatalogItem({
              id: raw.id,
              requestedType: raw.itemType === 'Bundle' ? 'Bundle' : 'Asset',
              catItem: {
                ...raw,
                itemStatuses: raw.itemStatuses || raw.itemStatus || [],
              },
            })
          );
          return {
            ...v2Res.data,
            data: normalized,
            _normalized: true,
          };
        }
        return v2Res.data;
      }
    } catch (_) {
      // Fallback to /v1/search/items below
    }

    const v1Res = await request('GET', getFullUrl('catalog', `/v1/search/items?${qs}`));
    return v1Res.data;
  };

  let data;
  try {
    data = await runSingleSearch(buildQueryString());
  } catch (err) {
    try {
      if (mapped.altCat || mapped.altSub) {
        data = await runSingleSearch(
          buildQueryString({ catOverride: mapped.altCat, subOverride: mapped.altSub })
        );
      } else {
        throw err;
      }
    } catch (_) {
      // Final safety net: plain "All" search without creator/sort/genre filters so the
      // catalog is never empty just because one filter combination is rejected upstream.
      const fallbackQs = `category=All&limit=${safeLimit}${
        cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
      }${effectiveKeyword ? `&keyword=${encodeURIComponent(effectiveKeyword)}` : ''}`;
      data = await runSingleSearch(fallbackQs);
    }
  }

  // Smart fallbacks for classic Roblox categories where modern Roblox moved items off primary sale
  if ((!Array.isArray(data?.data) || data.data.length === 0) && mapped.autoUnavailableFallback && includeNotForSale !== true) {
    try {
      const retryData = await runSingleSearch(buildQueryString({ forceUnavailable: true }));
      if (Array.isArray(retryData?.data) && retryData.data.length > 0) {
        data = retryData;
      }
    } catch (_) {
      // ignore fallback error
    }
  }

  if ((!Array.isArray(data?.data) || data.data.length === 0) && (mapped.altCat || mapped.altSub)) {
    try {
      const altData = await runSingleSearch(
        buildQueryString({ catOverride: mapped.altCat, subOverride: mapped.altSub, forceUnavailable: true })
      );
      if (Array.isArray(altData?.data) && altData.data.length > 0) {
        data = altData;
      }
    } catch (_) {
      // ignore alt error
    }
  }

  if ((!Array.isArray(data?.data) || data.data.length === 0) && mapped.impliedKeyword && !query) {
    try {
      const broadGear = await runSingleSearch(buildQueryString({ dropKeyword: true, forceUnavailable: true }));
      if (Array.isArray(broadGear?.data) && broadGear.data.length > 0) {
        data = broadGear;
      }
    } catch (_) {
      // ignore broad gear fallback error
    }
  }

  return data;
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
