import request, { getFullUrl } from '../lib/request';

export const getMyTrades = ({ tradeType = 'inbound', cursor }) => {
  let url = `/v1/trades/${encodeURIComponent(tradeType)}?limit=25&sortOrder=Desc`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
  return request('GET', getFullUrl('trades', url))
    .then((d) =>
      Array.isArray(d?.data?.data)
        ? d.data
        : { data: [], nextPageCursor: null, previousPageCursor: null }
    )
    .catch(() => ({ data: [], nextPageCursor: null, previousPageCursor: null }));
};

export const getTradeDetails = ({ tradeId }) => {
  return request('GET', getFullUrl('trades', `/v1/trades/${tradeId}`)).then((d) => d.data);
};

export const acceptTrade = ({ tradeId }) => {
  return request('POST', getFullUrl('trades', `/v1/trades/${tradeId}/accept`), {}).then((d) => d.data);
};

export const declineTrade = ({ tradeId }) => {
  return request('POST', getFullUrl('trades', `/v1/trades/${tradeId}/decline`), {}).then((d) => d.data);
};

export const getInboundTradeCount = () => {
  return request('GET', getFullUrl('trades', '/v1/trades/inbound/count'))
    .then((d) => d.data?.count || 0)
    .catch(() => 0);
};

export const createTrade = ({
  offerRobux,
  requestRobux,
  offerUserAssets,
  requestUserAssets,
  offerUserId,
  requestUserId,
}) => {
  return request('POST', getFullUrl('trades', '/v1/trades/send'), {
    offers: [
      {
        robux: offerRobux || 0,
        userAssetIds: offerUserAssets || [],
        userId: Number(offerUserId),
      },
      {
        robux: requestRobux || 0,
        userAssetIds: requestUserAssets || [],
        userId: Number(requestUserId),
      },
    ],
  });
};

export const counterTrade = ({
  tradeId,
  offerRobux,
  requestRobux,
  offerUserAssets,
  requestUserAssets,
  offerUserId,
  requestUserId,
}) => {
  return request('POST', getFullUrl('trades', `/v1/trades/${tradeId}/counter`), {
    offers: [
      {
        robux: offerRobux || 0,
        userAssetIds: offerUserAssets || [],
        userId: Number(offerUserId),
      },
      {
        robux: requestRobux || 0,
        userAssetIds: requestUserAssets || [],
        userId: Number(requestUserId),
      },
    ],
  });
};
