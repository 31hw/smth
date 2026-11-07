import request, { getFullUrl } from '../lib/request';

export const redeemPromocode = (promoCode) => {
  const cleanCode = String(promoCode || '').trim();
  return request('POST', getFullUrl('billing', '/v1/promocodes/redeem'), {
    code: cleanCode,
    promoCode: cleanCode,
  }).then((d) => d.data);
};
