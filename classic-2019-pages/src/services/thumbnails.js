import { chunk } from 'lodash';
import request, { getBaseUrl, getFullUrl } from '../lib/request';

const toCsv = (arrOrStr) => {
  if (typeof arrOrStr === 'string') return arrOrStr;
  if (!Array.isArray(arrOrStr)) return '';
  return encodeURIComponent(arrOrStr.filter((x) => x !== null && x !== undefined && x !== '').join(','));
};

export const getRbxCdnUrl = (hashOrUrl) => {
  if (!hashOrUrl || typeof hashOrUrl !== 'string') return '';
  if (hashOrUrl.startsWith('http://') || hashOrUrl.startsWith('https://')) return hashOrUrl;
  const clean = hashOrUrl.replace(/^\/+/, '');
  let i = 31;
  for (let t = 0; t < clean.length; t++) {
    i ^= clean.charCodeAt(t);
  }
  return `https://t${i % 8}.rbxcdn.com/${clean}`;
};

const addBaseUrl = (arrayOfThumbs) => {
  if (!Array.isArray(arrayOfThumbs)) return [];
  return arrayOfThumbs.map((v) => {
    if (typeof v.imageUrl === 'string' && v.imageUrl.length > 0 && !v.imageUrl.startsWith('http')) {
      v.imageUrl = getBaseUrl() + v.imageUrl;
    }
    return v;
  });
};

function normalizeSize(size, validSizes, fallback) {
  if (validSizes.includes(size)) return size;
  return fallback;
}

const VALID_AVATAR_SIZES = [
  '30x30', '48x48', '60x60', '75x75', '100x100', '110x110',
  '140x140', '150x150', '180x180', '250x250', '352x352', '420x420', '720x720',
];
const VALID_HEADSHOT_SIZES = [
  '48x48', '50x50', '60x60', '75x75', '100x100', '110x110',
  '150x150', '180x180', '352x352', '420x420', '720x720',
];
const VALID_OUTFIT_SIZES = ['150x150', '420x420'];
const VALID_GAME_ICON_SIZES = ['50x50', '128x128', '150x150', '256x256', '420x420', '512x512'];
const VALID_ASSET_SIZES = ['30x30', '42x42', '50x50', '60x62', '75x75', '110x110', '140x140', '150x150', '420x420', '768x432'];

export const multiGetUserThumbnails = ({ userIds, size = '420x420', format = 'Png' }) => {
  const cleanIds = [...new Set((userIds || []).filter(Boolean))];
  if (!cleanIds.length) return Promise.resolve([]);
  const safeSize = normalizeSize(size, VALID_AVATAR_SIZES, '420x420');
  return request(
    'GET',
    getFullUrl('thumbnails', `/v1/users/avatar?userIds=${toCsv(cleanIds)}&size=${safeSize}&format=Png&isCircular=false`)
  )
    .then((d) => addBaseUrl(d?.data?.data || []))
    .catch(() => []);
};

export const multiGetUserHeadshots2 = ({ userIds, size = '420x420', format = 'Png' }) => {
  const cleanIds = [...new Set((userIds || []).filter(Boolean))];
  if (!cleanIds.length) return Promise.resolve([]);
  const safeSize = normalizeSize(size, VALID_HEADSHOT_SIZES, '420x420');
  return request(
    'GET',
    getFullUrl('thumbnails', `/v1/users/avatar-headshot?userIds=${toCsv(cleanIds)}&size=${safeSize}&format=Png&isCircular=false`)
  )
    .then((d) => addBaseUrl(d?.data?.data || []))
    .catch(() => []);
};

export const multiGetUserThumbnails3D = async ({ userIds }) => {
  const cleanIds = [...new Set((userIds || []).filter(Boolean))];
  if (!cleanIds.length) return [];
  const results = await Promise.all(
    cleanIds.map(async (uid) => {
      try {
        const res = await request(
          'GET',
          getFullUrl('thumbnails', `/v1/users/avatar-3d?userId=${encodeURIComponent(uid)}`)
        );
        const d = res?.data || {};
        return {
          targetId: Number(uid),
          state: d.state || 'Pending',
          imageUrl: d.imageUrl ? getRbxCdnUrl(d.imageUrl) : null,
        };
      } catch (_) {
        return {
          targetId: Number(uid),
          state: 'Error',
          imageUrl: null,
        };
      }
    })
  );
  return results;
};

let _multiGetHeadshotsMeta = {
  cache: {},
  pending: [],
  onFinish: [],
  timer: 0,
};

export const multiGetUserHeadshots = ({ userIds, size = '420x420', format = 'Png' }) => {
  const safeSize = normalizeSize(size, VALID_HEADSHOT_SIZES, '150x150');
  let cleanIds = [...new Set((userIds || []).filter(Boolean))];
  const results = [];
  const toRemove = [];
  for (const id of cleanIds) {
    const key = `${id} ${safeSize}`;
    const exists = _multiGetHeadshotsMeta.cache[key];
    if (exists) {
      results.push({
        imageUrl: exists,
        state: 'Completed',
        targetId: typeof id === 'string' ? parseInt(id, 10) : id,
      });
      toRemove.push(id);
    }
  }
  cleanIds = cleanIds.filter((v) => !toRemove.includes(v));
  if (cleanIds.length === 0) {
    return Promise.resolve(results);
  }
  if (_multiGetHeadshotsMeta.pending.length !== 0) {
    clearTimeout(_multiGetHeadshotsMeta.timer);
  }
  cleanIds.forEach((v) => {
    _multiGetHeadshotsMeta.pending.push(v);
  });
  _multiGetHeadshotsMeta.timer = setTimeout(() => {
    const pending = [...new Set(_multiGetHeadshotsMeta.pending)];
    const onFinish = _multiGetHeadshotsMeta.onFinish;
    _multiGetHeadshotsMeta.onFinish = [];
    _multiGetHeadshotsMeta.pending = [];
    _multiGetHeadshotsMeta.timer = 0;

    Promise.all(
      chunk(pending, 100).map((batch) =>
        request(
          'GET',
          getFullUrl(
            'thumbnails',
            `/v1/users/avatar-headshot?userIds=${toCsv(batch)}&size=${safeSize}&format=Png&isCircular=false`
          )
        )
          .then((d) => addBaseUrl(d?.data?.data || []))
          .catch(() => [])
      )
    ).then((batches) => {
      const finalResults = batches.flat();
      for (const item of finalResults) {
        if (typeof item.imageUrl === 'string') {
          _multiGetHeadshotsMeta.cache[`${item.targetId} ${safeSize}`] = item.imageUrl;
        }
      }
      onFinish.forEach((cb) => cb([...results, ...finalResults]));
    });
  }, 50);

  return new Promise((res) => {
    _multiGetHeadshotsMeta.onFinish.push((data) => {
      res(data);
    });
  });
};

export const multiGetOutfitThumbnails = ({ userOutfitIds, size = '150x150' }) => {
  const cleanIds = [...new Set((userOutfitIds || []).filter(Boolean))];
  if (!cleanIds.length) return Promise.resolve([]);
  const safeSize = normalizeSize(size, VALID_OUTFIT_SIZES, '150x150');
  return Promise.all(
    chunk(cleanIds, 50).map((batch) =>
      request(
        'GET',
        getFullUrl(
          'thumbnails',
          `/v1/users/outfits?userOutfitIds=${toCsv(batch)}&size=${safeSize}&format=Png&isCircular=false`
        )
      )
        .then((d) => addBaseUrl(d?.data?.data || []))
        .catch(() => [])
    )
  ).then((b) => b.flat());
};

export const multiGetGroupIcons = ({ groupIds }) => {
  const cleanIds = [...new Set((groupIds || []).filter(Boolean))];
  if (!cleanIds.length) return Promise.resolve([]);
  return Promise.all(
    chunk(cleanIds, 100).map((batch) =>
      request(
        'GET',
        getFullUrl('thumbnails', `/v1/groups/icons?groupIds=${toCsv(batch)}&format=Png&size=420x420&isCircular=false`)
      )
        .then((d) => addBaseUrl(d?.data?.data || []))
        .catch(() => [])
    )
  ).then((b) => b.flat());
};

export const multiGetAssetThumbnails = ({ assetIds, size = '420x420' }) => {
  const cleanIds = [...new Set((assetIds || []).filter(Boolean))];
  if (!cleanIds.length) return Promise.resolve([]);
  const safeSize = normalizeSize(size, VALID_ASSET_SIZES, '420x420');
  return Promise.all(
    chunk(cleanIds, 100).map((batch) =>
      request(
        'GET',
        getFullUrl('thumbnails', `/v1/assets?assetIds=${toCsv(batch)}&format=Png&size=${safeSize}&isCircular=false`)
      )
        .then((d) => addBaseUrl(d?.data?.data || []))
        .catch(() => [])
    )
  ).then((b) => b.flat());
};

export const multiGetBundleThumbnails = ({ bundleIds, size = '420x420' }) => {
  const cleanIds = [...new Set((bundleIds || []).filter(Boolean))];
  if (!cleanIds.length) return Promise.resolve([]);
  const safeSize = normalizeSize(size, ['150x150', '420x420'], '420x420');
  return Promise.all(
    chunk(cleanIds, 100).map((batch) =>
      request(
        'GET',
        getFullUrl(
          'thumbnails',
          `/v1/bundles/thumbnails?bundleIds=${toCsv(batch)}&format=Png&size=${safeSize}&isCircular=false`
        )
      )
        .then((d) => addBaseUrl(d?.data?.data || []))
        .catch(() => [])
    )
  ).then((b) => b.flat());
};

export const multiGetGamePassIcons = ({ gamePassIds }) => {
  const cleanIds = [...new Set((gamePassIds || []).filter(Boolean))];
  if (!cleanIds.length) return Promise.resolve([]);
  return Promise.all(
    chunk(cleanIds, 100).map((batch) =>
      request(
        'GET',
        getFullUrl(
          'thumbnails',
          `/v1/game-passes?gamePassIds=${toCsv(batch)}&format=Png&size=150x150&isCircular=false`
        )
      )
        .then((d) => addBaseUrl(d?.data?.data || []))
        .catch(() => [])
    )
  ).then((b) => b.flat());
};

export const multiGetUniverseIcons2 = ({ universeIds }) => {
  return multiGetUniverseIcons({ universeIds, size: '420x420' });
};

export const multiGetUniverseIcons = ({ universeIds, size = '150x150' }) => {
  const cleanIds = [...new Set((universeIds || []).filter(Boolean))];
  if (!cleanIds.length) return Promise.resolve([]);
  const safeSize = normalizeSize(size, VALID_GAME_ICON_SIZES, '150x150');
  return Promise.all(
    chunk(cleanIds, 100).map((batch) =>
      request(
        'GET',
        getFullUrl('thumbnails', `/v1/games/icons?size=${safeSize}&format=Png&universeIds=${toCsv(batch)}&isCircular=false`)
      )
        .then((d) => addBaseUrl(d?.data?.data || []))
        .catch(() => [])
    )
  ).then((b) => b.flat());
};

export const getAssetThumbnail = (assetId) => {
  return request('GET', getFullUrl('thumbnails', `/v1/assets?assetIds=${assetId}&format=Png&size=420x420&isCircular=false`));
};

export const getUniverseIcon = ({ universeId, size = '150x150' }) => {
  const safeSize = normalizeSize(size, VALID_GAME_ICON_SIZES, '150x150');
  return request(
    'GET',
    getFullUrl('thumbnails', `/v1/games/icons?size=${safeSize}&format=Png&universeIds=${universeId}&isCircular=false`)
  );
};
