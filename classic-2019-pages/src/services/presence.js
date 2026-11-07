import { chunk } from 'lodash';
import request, { getFullUrl } from '../lib/request';

export const multiGetPresence = async ({ userIds }) => {
  const cleanIds = [...new Set((userIds || []).map(Number).filter((n) => n > 0))];
  if (!cleanIds.length) return [];
  const results = [];
  for (const batch of chunk(cleanIds, 50)) {
    try {
      const res = await request('POST', getFullUrl('presence', '/v1/presence/users'), {
        userIds: batch,
      });
      if (Array.isArray(res?.data?.userPresences)) {
        results.push(...res.data.userPresences);
      }
    } catch (_) {
      // ignore presence error
    }
  }
  return results;
};
