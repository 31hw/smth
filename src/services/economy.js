import request, { getFullUrl } from '../lib/request';

function makeIdempotencyKey() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCurrentUserIdFallback() {
  if (typeof document !== 'undefined') {
    const uid = Number(document.documentElement?.dataset?.rbxUserId || 0);
    if (uid > 0) return uid;
  }
  return undefined;
}

export const getResellers = async ({ assetId, collectibleItemId = null, cursor = '', limit = 10 }) => {
  const safeLimit = [10, 25, 50, 100].includes(Number(limit)) ? Number(limit) : 10;

  // Modern Collectible / Limited 2.0 resellers endpoint
  if (collectibleItemId) {
    try {
      const mUrl = getFullUrl(
        'apis',
        `/marketplace-sales/v1/item/${encodeURIComponent(
          collectibleItemId
        )}/resellers?limit=${safeLimit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
      );
      const mRes = await request('GET', mUrl);
      const rows = mRes?.data?.data;
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          data: {
            nextPageCursor: mRes?.data?.nextPageCursor || null,
            previousPageCursor: mRes?.data?.previousPageCursor || null,
            data: rows.map((r) => ({
              userAssetId: r.collectibleItemInstanceId || r.userAssetId,
              collectibleItemInstanceId: r.collectibleItemInstanceId || null,
              collectibleProductId: r.collectibleProductId || null,
              price: r.price,
              serialNumber: r.serialNumber ?? null,
              seller: {
                id: r.seller?.sellerId ?? r.seller?.id,
                type: r.seller?.sellerType ?? r.seller?.type ?? 'User',
                name: r.seller?.name || 'ROBLOX',
                hasVerifiedBadge: Boolean(r.seller?.hasVerifiedBadge),
              },
            })),
          },
        };
      }
    } catch (_) {
      // fall through to classic economy v1 resellers
    }
  }

  const url = getFullUrl(
    'economy',
    `/v1/assets/${assetId}/resellers?limit=${safeLimit}&cursor=${encodeURIComponent(cursor || '')}`
  );
  return request('GET', url)
    .then((d) =>
      Array.isArray(d?.data?.data) ? d : { data: { data: [], nextPageCursor: null } }
    )
    .catch(() => ({ data: { data: [], nextPageCursor: null } }));
};

export const getRobux = ({ userId }) => {
  if (!userId) return Promise.resolve({ robux: 0, tickets: 0 });
  return request('GET', getFullUrl('economy', `/v1/users/${userId}/currency`))
    .then((d) => ({ robux: d?.data?.robux ?? 0, tickets: d?.data?.tickets ?? 0 }))
    .catch(() => ({ robux: 0, tickets: 0 }));
};

export const getRobuxGroup = ({ groupId }) => {
  return request('GET', getFullUrl('economy', `/v1/groups/${groupId}/currency`))
    .then((d) => ({ robux: d?.data?.robux ?? 0 }))
    .catch(() => ({ robux: 0 }));
};

export const getResellableCopies = async ({ assetId, userId, collectibleItemId = null }) => {
  if (!assetId || !userId) return { data: [] };

  if (collectibleItemId) {
    try {
      const mRes = await request(
        'GET',
        getFullUrl(
          'apis',
          `/marketplace-sales/v1/item/${encodeURIComponent(
            collectibleItemId
          )}/resellable-instances?ownerType=User&ownerId=${encodeURIComponent(userId)}&limit=100`
        )
      );
      const instances = mRes?.data?.itemInstances || mRes?.data?.data;
      if (Array.isArray(instances) && instances.length > 0) {
        return {
          data: instances.map((inst) => ({
            userAssetId: inst.collectibleItemInstanceId || inst.userAssetId,
            collectibleItemInstanceId: inst.collectibleItemInstanceId || null,
            collectibleProductId: inst.collectibleProductId || null,
            price: inst.saleState === 'OnSale' ? inst.price : null,
            serialNumber: inst.serialNumber ?? null,
          })),
        };
      }
    } catch (_) {
      // fall through to classic economy v1 resellable-copies
    }
  }

  return request(
    'GET',
    getFullUrl('economy', `/v1/assets/${assetId}/users/${userId}/resellable-copies`)
  )
    .then((d) => (Array.isArray(d?.data?.data) ? d.data : { data: [] }))
    .catch(() => ({ data: [] }));
};

export const purchaseItem = async ({
  productId,
  assetId,
  sellerId,
  sellerType = 'User',
  purchaserId,
  userAssetId,
  price,
  expectedCurrency = 1,
  collectibleItemId = null,
  collectibleProductId = null,
  collectibleItemInstanceId = null,
  isGamePass = false,
}) => {
  const effectivePurchaserId = purchaserId || getCurrentUserIdFallback();

  // 1. Modern Collectible / UGC / Bundle / Limited 2.0 direct & resale purchase
  if (collectibleItemId) {
    try {
      let cProductId = collectibleProductId;
      const cInstanceId =
        collectibleItemInstanceId ||
        (typeof userAssetId === 'string' && userAssetId.includes('-') ? userAssetId : null);

      if (!cProductId) {
        const mpRes = await request(
          'POST',
          getFullUrl('apis', '/marketplace-items/v1/items/details'),
          { itemIds: [collectibleItemId] }
        ).catch(() => null);
        const mpEntry = Array.isArray(mpRes?.data) ? mpRes.data[0] : mpRes?.data?.data?.[0];
        if (mpEntry) {
          cProductId = cInstanceId
            ? mpEntry.lowestAvailableResaleProductId || mpEntry.collectibleProductId
            : mpEntry.collectibleProductId;
        }
      }

      if (cProductId) {
        const endpoint = cInstanceId
          ? `/marketplace-sales/v1/item/${encodeURIComponent(collectibleItemId)}/purchase-resale`
          : `/marketplace-sales/v1/item/${encodeURIComponent(collectibleItemId)}/purchase-item`;
        const payload = {
          collectibleItemId,
          collectibleProductId: cProductId,
          expectedCurrency: 1,
          expectedPrice: price || 0,
          expectedPurchaserId: effectivePurchaserId ? String(effectivePurchaserId) : undefined,
          expectedPurchaserType: 'User',
          expectedSellerId: sellerId ? Number(sellerId) : undefined,
          expectedSellerType: sellerType || 'User',
          idempotencyKey: makeIdempotencyKey(),
        };
        if (cInstanceId) {
          payload.collectibleItemInstanceId = cInstanceId;
        }
        const mRes = await request('POST', getFullUrl('apis', endpoint), payload);
        if (mRes?.data && (mRes.data.purchased || mRes.data.purchaseResult)) {
          return {
            purchased: Boolean(mRes.data.purchased),
            reason: mRes.data.purchaseResult || mRes.data.errorMessage || '',
            errorMsg: mRes.data.errorMessage || '',
          };
        }
      }
    } catch (_) {
      // fall through to classic economy v1 / game-pass purchase
    }
  }

  // 2. Classic economy v1 product purchase
  if (productId) {
    try {
      const res = await request(
        'POST',
        getFullUrl('economy', `/v1/purchases/products/${productId}`),
        {
          assetId,
          expectedPrice: price || 0,
          expectedSellerId: sellerId,
          userAssetId: typeof userAssetId === 'number' ? userAssetId : undefined,
          expectedCurrency: expectedCurrency || 1,
        }
      );
      if (res?.data && (res.data.purchased || res.data.reason !== 'InvalidProduct')) {
        return res.data;
      }
    } catch (_) {
      // fall through to fallbacks
    }
  }

  // 3. Modern Game Pass purchase fallback
  if (isGamePass && assetId) {
    try {
      const gpRes = await request(
        'POST',
        getFullUrl('apis', `/game-passes/v1/game-passes/${encodeURIComponent(assetId)}/purchase`),
        {
          expectedCurrency: 1,
          expectedPrice: price || 0,
          expectedSellerId: sellerId,
        }
      );
      if (gpRes?.data) {
        return {
          purchased: Boolean(gpRes.data.purchased),
          reason: gpRes.data.reason || '',
          errorMsg: gpRes.data.errorMessage || '',
        };
      }
    } catch (_) {
      // ignore gamepass fallback error
    }
  }

  // 4. Lookup CollectibleItemId via economy v2 if caller didn't have it cached
  if (assetId && !collectibleItemId) {
    try {
      const detailsRes = await request(
        'GET',
        getFullUrl('economy', `/v2/assets/${assetId}/details`)
      );
      const fetchedCollectibleId = detailsRes?.data?.CollectibleItemId;
      const fetchedCollectibleProductId = detailsRes?.data?.CollectibleProductId;
      const fetchedSellerType = detailsRes?.data?.Creator?.CreatorType || sellerType || 'User';
      if (fetchedCollectibleId && fetchedCollectibleProductId) {
        const mRes = await request(
          'POST',
          getFullUrl('apis', `/marketplace-sales/v1/item/${fetchedCollectibleId}/purchase-item`),
          {
            collectibleItemId: fetchedCollectibleId,
            collectibleProductId: fetchedCollectibleProductId,
            expectedCurrency: 1,
            expectedPrice: price || 0,
            expectedPurchaserId: effectivePurchaserId ? String(effectivePurchaserId) : undefined,
            expectedPurchaserType: 'User',
            expectedSellerId: sellerId,
            expectedSellerType: fetchedSellerType,
            idempotencyKey: makeIdempotencyKey(),
          }
        );
        return {
          purchased: Boolean(mRes?.data?.purchased),
          reason: mRes?.data?.purchaseResult || mRes?.data?.errorMessage || '',
          errorMsg: mRes?.data?.errorMessage || '',
        };
      }
    } catch (_) {
      // ignore fallback error
    }
  }

  return {
    purchased: false,
    reason: 'PurchaseFailed',
    errorMsg: 'Unable to complete purchase.',
  };
};

export const setResellableAssetPrice = ({ assetId, userAssetId, price }) => {
  if (!Number.isSafeInteger(price) || price < 0 || Number.isNaN(price)) {
    throw new Error(`Invalid Price "${price}"`);
  }
  return request(
    'PATCH',
    getFullUrl('economy', `/v1/assets/${assetId}/resellable-copies/${userAssetId}`),
    { price }
  ).then((d) => d.data);
};

export const takeResellableAssetOffSale = ({ assetId, userAssetId }) => {
  return setResellableAssetPrice({
    assetId,
    userAssetId,
    price: 0,
  });
};

export const getResaleData = async ({ assetId, collectibleItemId = null }) => {
  const fallback = {
    assetStock: null,
    sales: 0,
    numberRemaining: null,
    recentAveragePrice: 0,
    originalPrice: null,
    priceDataPoints: [],
    volumeDataPoints: [],
  };

  if (collectibleItemId) {
    try {
      const mRes = await request(
        'GET',
        getFullUrl('apis', `/marketplace-sales/v1/item/${encodeURIComponent(collectibleItemId)}/resale-data`)
      );
      if (mRes?.data) {
        return {
          ...fallback,
          ...mRes.data,
          priceDataPoints: Array.isArray(mRes.data.priceDataPoints) ? mRes.data.priceDataPoints : [],
          volumeDataPoints: Array.isArray(mRes.data.volumeDataPoints) ? mRes.data.volumeDataPoints : [],
        };
      }
    } catch (_) {
      // fall through to classic economy v1 resale-data
    }
  }

  return request('GET', getFullUrl('economy', `/v1/assets/${assetId}/resale-data`))
    .then((d) => ({
      ...fallback,
      ...(d?.data || {}),
      priceDataPoints: Array.isArray(d?.data?.priceDataPoints) ? d.data.priceDataPoints : [],
      volumeDataPoints: Array.isArray(d?.data?.volumeDataPoints) ? d.data.volumeDataPoints : [],
    }))
    .catch(() => fallback);
};

export const getTransactions = ({ userId, cursor, type }) => {
  return request(
    'GET',
    getFullUrl(
      'economy',
      `/v2/users/${userId}/transactions?cursor=${encodeURIComponent(
        cursor || ''
      )}&limit=100&transactionType=${encodeURIComponent(type)}`
    )
  )
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getGroupTransactions = ({ groupId, cursor, type }) => {
  return request(
    'GET',
    getFullUrl(
      'economy',
      `/v2/groups/${groupId}/transactions?cursor=${encodeURIComponent(
        cursor || ''
      )}&limit=100&transactionType=${encodeURIComponent(type)}`
    )
  )
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getTransactionSummary = ({ userId, timePeriod }) => {
  return request(
    'GET',
    getFullUrl(
      'economy',
      `/v2/users/${userId}/transaction-totals?timeFrame=${timePeriod}&transactionType=summary`
    )
  )
    .then((d) => d?.data || {})
    .catch(() => ({}));
};

export const getGroupTransactionSummary = ({ groupId, timePeriod }) => {
  return request(
    'GET',
    getFullUrl(
      'economy',
      `/v2/groups/${groupId}/transaction-totals?timeFrame=${timePeriod}&transactionType=summary`
    )
  )
    .then((d) => d?.data || {})
    .catch(() => ({}));
};

const fNum = (num) => {
  if (!num) return '';
  return num.toLocaleString();
};

export const formatSummaryResponse = (resp = {}, type = 'User') => {
  const isUser = type === 1 || type === 'User';
  return [
    isUser && ['Builders Club Stipend', fNum(resp.premiumStipendsTotal)],
    isUser && ['Builders Club Stipend Bonus', ''],
    ['Sale of Goods', fNum(resp.salesTotal)],
    isUser && ['Currency Purchase', fNum(resp.currencyPurchasesTotal)],
    isUser && ['Trade System Trades', fNum(resp.tradeSystemEarningsTotal)],
    ['Promoted Page Conversion Revenue', ''],
    ['Game Page Conversion Revenue', ''],
    ['Pending Sales', fNum(resp.pendingRobuxTotal)],
    isUser && ['Group Payouts', fNum(resp.groupPayoutsTotal)],
  ].filter(Boolean);
};

export const getMarketActivity = () =>
  Promise.resolve({
    average: { robuxToTickets: 20000, ticketsToRobux: 20000 },
    high: { robuxToTickets: 20000, ticketsToRobux: 20000 },
    low: { robuxToTickets: 20000, ticketsToRobux: 20000 },
    positions: { tickets: [], robux: [] },
  });
export const createCurrencyExchangeOrder = () => Promise.resolve({});
export const countOpenPositions = () => Promise.resolve(0);
export const getOpenPositions = () => Promise.resolve({ data: [] });
export const closePosition = () => Promise.resolve({});
