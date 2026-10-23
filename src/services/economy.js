import request, { getFullUrl } from '../lib/request';

export const getResellers = ({ assetId, cursor, limit = 10 }) => {
  const safeLimit = [10, 25, 50, 100].includes(Number(limit)) ? Number(limit) : 10;
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

export const getResellableCopies = ({ assetId, userId }) => {
  if (!assetId || !userId) return Promise.resolve({ data: [] });
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
  userAssetId,
  price,
  expectedCurrency = 1,
}) => {
  // Try classic economy v1 product purchase first
  if (productId) {
    const res = await request('POST', getFullUrl('economy', `/v1/purchases/products/${productId}`), {
      assetId,
      expectedPrice: price || 0,
      expectedSellerId: sellerId,
      userAssetId,
      expectedCurrency: expectedCurrency || 1,
    });
    if (res?.data && (res.data.purchased || res.data.reason !== 'InvalidProduct')) {
      return res.data;
    }
  }

  // Fallback for modern Collectible / UGC items on marketplace-sales API
  if (assetId) {
    try {
      const detailsRes = await request(
        'GET',
        getFullUrl('economy', `/v2/assets/${assetId}/details`)
      );
      const collectibleItemId = detailsRes?.data?.CollectibleItemId;
      const collectibleProductId = detailsRes?.data?.CollectibleProductId;
      if (collectibleItemId) {
        const idempotencyKey =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const mRes = await request(
          'POST',
          getFullUrl('apis', `/marketplace-sales/v1/item/${collectibleItemId}/purchase-item`),
          {
            collectibleItemId,
            expectedCurrency: 1,
            expectedPrice: price || 0,
            expectedPurchaserId: undefined,
            expectedPurchaserType: 'User',
            expectedSellerId: sellerId,
            expectedSellerType: 'User',
            idempotencyKey,
            collectibleProductId,
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

export const getResaleData = ({ assetId }) => {
  const fallback = {
    assetStock: null,
    sales: 0,
    numberRemaining: null,
    recentAveragePrice: 0,
    originalPrice: null,
    priceDataPoints: [],
    volumeDataPoints: [],
  };
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
