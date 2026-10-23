import { chunk } from 'lodash';
import request, { getBaseUrl, getFullUrl } from '../lib/request';
import { itemNameToEncodedName } from './catalog';

const SESSION_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

let _exploreSortsCache = null;
const _serverCursorsByPlace = {};

export const isLibraryItem = ({ assetTypeId }) => {
  switch (assetTypeId) {
    case 62:
    case 40:
    case 38:
    case 24:
    case 21:
    case 13:
    case 10:
    case 5:
    case 4:
    case 3:
    case 1:
      return true;
    default:
      return false;
  }
};

export const getGameUrl = ({ placeId, name }) => {
  return `/games/${placeId}/${itemNameToEncodedName(name)}`;
};

export const getLibraryItemUrl = ({ assetId, name }) => {
  return `/library/${assetId}/${itemNameToEncodedName(name)}`;
};

export const getGamePassCreationUrl = () => {
  return 'https://create.roblox.com/';
};

export const getUserGames = ({ userId, cursor }) => {
  return request(
    'GET',
    getFullUrl('games', `/v2/users/${userId}/games?accessFilter=2&limit=25&cursor=${encodeURIComponent(cursor || '')}`)
  ).then((d) => d.data);
};

export const getGroupGames = ({ groupId, cursor }) => {
  return request(
    'GET',
    getFullUrl('games', `/v2/groups/${groupId}/games?accessFilter=2&limit=25&cursor=${encodeURIComponent(cursor || '')}`)
  ).then((d) => d.data);
};

export const multiGetUniverseDetails = async ({ universeIds }) => {
  const cleanIds = [...new Set((universeIds || []).map(Number).filter((n) => n > 0))];
  if (!cleanIds.length) return [];
  const batches = chunk(cleanIds, 50);
  const out = [];
  for (const b of batches) {
    try {
      const res = await request(
        'GET',
        getFullUrl('games', `/v1/games?universeIds=${encodeURIComponent(b.join(','))}`)
      );
      if (Array.isArray(res?.data?.data)) {
        out.push(...res.data.data);
      }
    } catch (e) {
      console.warn('[games] multiGetUniverseDetails batch error', e);
    }
  }
  return out;
};

export const multiGetGameVotes = async ({ universeIds }) => {
  const cleanIds = [...new Set((universeIds || []).map(Number).filter((n) => n > 0))];
  if (!cleanIds.length) return [];
  const batches = chunk(cleanIds, 50);
  const out = [];
  for (const b of batches) {
    try {
      const res = await request(
        'GET',
        getFullUrl('games', `/v1/games/votes?universeIds=${encodeURIComponent(b.join(','))}`)
      );
      if (Array.isArray(res?.data?.data)) {
        out.push(...res.data.data);
      }
    } catch (_) {
      // ignore vote lookup failure
    }
  }
  return out;
};

async function enrichRawGames(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];
  const universeIds = rawItems
    .map((g) => Number(g.universeId || g.id))
    .filter((n) => n > 0);

  const [uniDetails, votes] = await Promise.all([
    multiGetUniverseDetails({ universeIds }),
    multiGetGameVotes({ universeIds }),
  ]);

  const uniMap = {};
  for (const u of uniDetails) uniMap[u.id] = u;
  const voteMap = {};
  for (const v of votes) voteMap[v.id] = v;

  const normalized = [];
  for (const raw of rawItems) {
    const uid = Number(raw.universeId || raw.id);
    const u = uniMap[uid] || {};
    const v = voteMap[uid] || {};
    const placeId = Number(raw.rootPlaceId || raw.placeId || u.rootPlaceId || 0);
    if (!placeId || !uid) continue;

    normalized.push({
      universeId: uid,
      placeId,
      name: raw.name || u.name || 'Untitled Game',
      gameDescription: u.description || raw.description || '',
      creatorId: u.creator?.id || raw.creatorId || 1,
      creatorName: u.creator?.name || raw.creatorName || 'Roblox',
      creatorType: u.creator?.type || raw.creatorType || 'User',
      creatorHasVerifiedBadge: Boolean(u.creator?.hasVerifiedBadge || raw.creatorHasVerifiedBadge),
      playerCount: typeof raw.playerCount === 'number' ? raw.playerCount : u.playing || 0,
      totalUpVotes: typeof raw.totalUpVotes === 'number' ? raw.totalUpVotes : v.upVotes || 0,
      totalDownVotes: typeof raw.totalDownVotes === 'number' ? raw.totalDownVotes : v.downVotes || 0,
      price: u.price ?? raw.price ?? 0,
      year: null,
    });
  }
  return normalized;
}

export const getGameSorts = async ({ gameSortsContext } = {}) => {
  try {
    const res = await request(
      'GET',
      getFullUrl('apis', `/explore-api/v1/get-sorts?sessionId=${encodeURIComponent(SESSION_ID)}`)
    );
    const rawSorts = res?.data?.sorts || [];
    const gameSorts = rawSorts.filter(
      (s) => s.contentType === 'Games' || Array.isArray(s.games)
    );
    if (gameSorts.length > 0) {
      const cache = {};
      const sorts = gameSorts.slice(0, 8).map((s) => {
        const token = s.sortId || s.id || s.sortDisplayName;
        cache[token] = s.games || [];
        return {
          token,
          name: token,
          displayName: s.sortDisplayName || s.title || token,
        };
      });
      _exploreSortsCache = cache;
      return { sorts };
    }
  } catch (err) {
    console.warn('[games] explore-api get-sorts fallback:', err?.message);
  }

  // Fallback to legacy games/sorts if available
  try {
    const legacy = await request(
      'GET',
      getFullUrl('games', `/v1/games/sorts?gameSortsContext=${encodeURIComponent(gameSortsContext || '')}`)
    );
    if (legacy?.data?.sorts?.length) return legacy.data;
  } catch (_) {
    // ignore
  }

  return {
    sorts: [
      { token: 'top-playing-now', name: 'top-playing-now', displayName: 'Popular' },
      { token: 'top-trending', name: 'top-trending', displayName: 'Top Trending' },
      { token: 'up-and-coming', name: 'up-and-coming', displayName: 'Up-and-Coming' },
    ],
  };
};

export const getGameList = async ({ sortToken = '', limit = 24, genre = 0, keyword = '' } = {}) => {
  // 1. Keyword search via Roblox Omni-Search
  if (keyword && String(keyword).trim().length > 0) {
    try {
      const searchRes = await request(
        'GET',
        getFullUrl(
          'apis',
          `/search-api/omni-search?searchQuery=${encodeURIComponent(
            keyword.trim()
          )}&pageToken=&sessionId=${encodeURIComponent(SESSION_ID)}&pageType=all`
        )
      );
      const groups = searchRes?.data?.searchResults || [];
      const rawGames = [];
      for (const grp of groups) {
        if (Array.isArray(grp.contents)) {
          for (const item of grp.contents) {
            if (item.contentType === 'Game' || item.universeId) {
              rawGames.push(item);
            }
          }
        }
      }
      const games = await enrichRawGames(rawGames.slice(0, limit));
      return { games };
    } catch (err) {
      console.warn('[games] omni-search fallback:', err?.message);
    }
  }

  // 2. Home page "Favorited" row
  if (sortToken === 'Favorited') {
    try {
      const me = await request('GET', getFullUrl('users', '/v1/users/authenticated'));
      const uid = me?.data?.id;
      if (uid) {
        const favRes = await request(
          'GET',
          getFullUrl('games', `/v2/users/${uid}/favorite/games?accessFilter=2&limit=${limit || 6}&sortOrder=Desc`)
        );
        const favList = (favRes?.data?.data || []).map((g) => ({
          universeId: g.id,
          rootPlaceId: g.rootPlace?.id,
          name: g.name,
          description: g.description,
          creatorId: g.creator?.id,
          creatorName: g.creator?.name,
          creatorType: g.creator?.type,
        }));
        const games = await enrichRawGames(favList.slice(0, limit || 6));
        return { games };
      }
    } catch (_) {
      return { games: [] };
    }
    return { games: [] };
  }

  // 3. Home page "recent" / Continue row via discovery-api omni-recommendation
  if (sortToken === 'recent') {
    try {
      const recRes = await request('POST', getFullUrl('apis', '/discovery-api/omni-recommendation'), {
        pageType: 'Home',
        sessionId: SESSION_ID,
        supportedTreatmentTypes: ['SortlessGrid'],
      });
      const sorts = recRes?.data?.sorts || [];
      const contentMetadata = recRes?.data?.contentMetadata?.Game || {};
      const continueSort =
        sorts.find((s) => /continue|recent/i.test(s.topic || '')) ||
        sorts.find((s) => Array.isArray(s.recommendationList) && s.recommendationList.length > 0);
      if (continueSort && Array.isArray(continueSort.recommendationList)) {
        const raw = continueSort.recommendationList
          .slice(0, limit || 6)
          .map((r) => {
            const meta = contentMetadata[String(r.contentId)] || {};
            return {
              universeId: r.contentId,
              rootPlaceId: meta.rootPlaceId,
              name: meta.name,
              playerCount: meta.playerCount,
              totalUpVotes: meta.totalUpVotes,
              totalDownVotes: meta.totalDownVotes,
            };
          });
        const games = await enrichRawGames(raw);
        if (games.length > 0) return { games };
      }
    } catch (_) {
      // fall through to explore sort
    }
  }

  // 4. Explore sort content (cached from get-sorts or fetched from get-sort-content)
  if (_exploreSortsCache && sortToken && Array.isArray(_exploreSortsCache[sortToken]) && _exploreSortsCache[sortToken].length > 0) {
    const cachedRaw = _exploreSortsCache[sortToken].slice(0, limit || 40);
    const games = await enrichRawGames(cachedRaw);
    return { games };
  }

  if (sortToken) {
    try {
      const sortRes = await request(
        'GET',
        getFullUrl(
          'apis',
          `/explore-api/v1/get-sort-content?sessionId=${encodeURIComponent(
            SESSION_ID
          )}&sortId=${encodeURIComponent(sortToken)}`
        )
      );
      const rawGames = sortRes?.data?.games || [];
      if (rawGames.length > 0) {
        const games = await enrichRawGames(rawGames.slice(0, limit || 40));
        return { games };
      }
    } catch (_) {
      // fall through
    }
  }

  // 5. Fallback: populate from explore get-sorts first sort
  try {
    const sortsData = await getGameSorts({});
    const firstToken = sortsData?.sorts?.[0]?.token;
    if (firstToken && _exploreSortsCache?.[firstToken]) {
      const games = await enrichRawGames(_exploreSortsCache[firstToken].slice(0, limit || 24));
      return { games };
    }
  } catch (_) {
    // ignore
  }

  // 6. Legacy fallback
  try {
    const legacy = await request(
      'GET',
      getFullUrl(
        'games',
        `/v1/games/list?sortToken=${encodeURIComponent(sortToken)}&maxRows=${limit}&genre=${genre}&keyword=${encodeURIComponent(
          keyword || ''
        )}`
      )
    );
    if (legacy?.data?.games) return legacy.data;
  } catch (_) {
    // ignore
  }

  return { games: [] };
};

export const getRecommendedGames = async ({ placeId, limit = 6 }) => {
  try {
    const places = await multiGetPlaceDetails({ placeIds: [placeId] });
    const universeId = places?.[0]?.universeId;
    if (universeId) {
      const res = await request(
        'GET',
        getFullUrl('games', `/v1/games/recommendations/game/${universeId}?maxRows=${limit}`)
      );
      if (res?.data?.games) {
        const enriched = await enrichRawGames(res.data.games.slice(0, limit));
        return { games: enriched };
      }
    }
  } catch (_) {
    // fallback to popular games
  }
  return getGameList({ sortToken: '', limit });
};

export const getGameMedia = ({ universeId }) => {
  return request('GET', getFullUrl('games', `/v2/games/${universeId}/media`))
    .then((d) => d.data.data || [])
    .catch(() => []);
};

function triggerProtocolUri(uri) {
  const aTag = document.createElement('a');
  aTag.setAttribute('href', uri);
  aTag.style.display = 'none';
  document.body.appendChild(aTag);
  aTag.click();
  setTimeout(() => {
    aTag.remove();
  }, 1000);
}

export const launchGame = async ({ placeId }) => {
  try {
    const ticketRes = await request('POST', getFullUrl('auth', '/v1/authentication-ticket'), {});
    const ticket =
      ticketRes?.headers?.['rbx-authentication-ticket'] ||
      ticketRes?.headers?.['RBX-Authentication-Ticket'];
    if (ticket) {
      const launcherUrl = `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&browserTrackerId=0&placeId=${encodeURIComponent(
        placeId
      )}&isPlayTogetherGame=false`;
      const uri = `roblox-player:1+launchmode:play+gameinfo:${ticket}+launchtime:${Date.now()}+placelauncherurl:${encodeURIComponent(
        launcherUrl
      )}+browsertrackerid:0+robloxLocale:en_us+gameLocale:en_us+channel:`;
      triggerProtocolUri(uri);
      return;
    }
  } catch (_) {
    // fallback to modern roblox:// URI scheme
  }
  triggerProtocolUri(`roblox://experiences/start?placeId=${encodeURIComponent(placeId)}`);
};

export const launchGameFromJobId = async ({ placeId, jobId }) => {
  try {
    const ticketRes = await request('POST', getFullUrl('auth', '/v1/authentication-ticket'), {});
    const ticket =
      ticketRes?.headers?.['rbx-authentication-ticket'] ||
      ticketRes?.headers?.['RBX-Authentication-Ticket'];
    if (ticket && jobId) {
      const launcherUrl = `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGameJob&browserTrackerId=0&placeId=${encodeURIComponent(
        placeId
      )}&gameId=${encodeURIComponent(jobId)}&isPlayTogetherGame=false`;
      const uri = `roblox-player:1+launchmode:play+gameinfo:${ticket}+launchtime:${Date.now()}+placelauncherurl:${encodeURIComponent(
        launcherUrl
      )}+browsertrackerid:0+robloxLocale:en_us+gameLocale:en_us+channel:`;
      triggerProtocolUri(uri);
      return;
    }
  } catch (_) {
    // fallback
  }
  triggerProtocolUri(
    `roblox://experiences/start?placeId=${encodeURIComponent(placeId)}${
      jobId ? `&gameInstanceId=${encodeURIComponent(jobId)}` : ''
    }`
  );
};

export const multiGetPlaceDetails = async ({ placeIds }) => {
  const cleanIds = [...new Set((placeIds || []).map(Number).filter((n) => n > 0))];
  if (!cleanIds.length) return [];

  try {
    const res = await request(
      'GET',
      getFullUrl('games', `/v1/games/multiget-place-details?placeIds=${encodeURIComponent(cleanIds.join(','))}`)
    );
    if (Array.isArray(res?.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (_) {
    // Unauthenticated users receive 401 on multiget-place-details; fall back to public universe lookup!
  }

  const fallbackResults = [];
  for (const pid of cleanIds) {
    try {
      const uniLookup = await request('GET', getFullUrl('apis', `/universes/v1/places/${pid}/universe`));
      const universeId = uniLookup?.data?.universeId;
      if (universeId) {
        const uniArr = await multiGetUniverseDetails({ universeIds: [universeId] });
        const u = uniArr?.[0];
        if (u) {
          fallbackResults.push({
            placeId: pid,
            name: u.name,
            description: u.description || '',
            sourceName: u.name,
            sourceDescription: u.description || '',
            url: `https://www.roblox.com/games/${pid}/--`,
            builder: u.creator?.name || 'Roblox',
            builderId: u.creator?.id || 1,
            hasVerifiedBadge: Boolean(u.creator?.hasVerifiedBadge),
            isPlayable: true,
            reasonProhibited: 'None',
            universeId: u.id,
            universeRootPlaceId: u.rootPlaceId || pid,
            price: u.price || 0,
            imageToken: '',
          });
        }
      }
    } catch (_) {
      // ignore individual lookup error
    }
  }
  return fallbackResults;
};

export const getServers = async ({ placeId, offset = 0 }) => {
  if (offset === 0) {
    delete _serverCursorsByPlace[placeId];
  }
  const cursor = offset > 0 ? _serverCursorsByPlace[placeId] || '' : '';
  try {
    const res = await request(
      'GET',
      getFullUrl(
        'games',
        `/v1/games/${placeId}/servers/Public?sortOrder=Desc&excludeFullGames=false&limit=10${
          cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
        }`
      )
    );
    const servers = res?.data?.data || [];
    _serverCursorsByPlace[placeId] = res?.data?.nextPageCursor || null;

    // Resolve playerTokens to avatar headshots via batch thumbnails endpoint
    const tokenRequests = [];
    servers.forEach((srv, sIdx) => {
      (srv.playerTokens || []).slice(0, 6).forEach((tok, pIdx) => {
        tokenRequests.push({
          requestId: `${sIdx}:${pIdx}`,
          token: tok,
          type: 'AvatarHeadShot',
          size: '150x150',
          format: 'Png',
          isCircular: false,
        });
      });
    });

    const thumbMap = {};
    if (tokenRequests.length > 0) {
      try {
        for (const batch of chunk(tokenRequests, 100)) {
          const tRes = await request('POST', getFullUrl('thumbnails', '/v1/batch'), batch);
          for (const item of tRes?.data?.data || []) {
            if (item.requestId && item.imageUrl) {
              thumbMap[item.requestId] = item.imageUrl;
            }
          }
        }
      } catch (_) {
        // ignore batch avatar token failure
      }
    }

    const Collection = servers.map((srv, sIdx) => {
      const tokens = srv.playerTokens || [];
      const CurrentPlayers = tokens.slice(0, 6).map((_, pIdx) => ({
        Id: 0,
        Username: 'Player',
        Thumbnail: {
          Url: thumbMap[`${sIdx}:${pIdx}`] || '/img/placeholder.png',
          IsFinal: true,
        },
      }));
      // Pad count display if playing > tokens.length
      return {
        Guid: srv.id,
        jobId: srv.id,
        placeId: Number(placeId),
        Capacity: srv.maxPlayers || 0,
        Ping: Math.round(srv.ping || 0),
        Fps: Math.round(srv.fps || 60),
        PlayersCapacity: `${srv.playing || CurrentPlayers.length} of ${srv.maxPlayers || 0}`,
        playingCount: srv.playing || CurrentPlayers.length,
        CurrentPlayers,
      };
    });

    return {
      PlaceId: Number(placeId),
      Collection,
      TotalCollectionSize: Collection.length,
      nextPageCursor: _serverCursorsByPlace[placeId],
    };
  } catch (err) {
    console.warn('[games] getServers error', err);
    return { PlaceId: Number(placeId), Collection: [], TotalCollectionSize: 0 };
  }
};

export const voteOnGame = ({ universeId, isUpvote }) => {
  return request('PATCH', getFullUrl('games', `/v1/games/${universeId}/user-votes`), {
    vote: isUpvote,
  }).then((d) => d.data?.data || d.data);
};

export const shutdownPlaceServers = ({ placeId }) => {
  return request('POST', getFullUrl('develop', `/v2/places/${placeId}/shutdown-all-servers`), {}).catch(() => ({}));
};

export const shutdownSpecificServer = () => {
  return Promise.resolve({});
};

export const getGamePassUniverse = async ({ assetId }) => {
  try {
    const res = await request('GET', getFullUrl('apis', `/game-passes/v1/game-passes/${assetId}/product-info`));
    return res?.data?.universeId || null;
  } catch (_) {
    try {
      const res2 = await request('GET', getFullUrl('games', `/v1/games/game-passes/${assetId}`));
      return res2?.data?.universeId || null;
    } catch (__) {
      return null;
    }
  }
};

export const getUniversePlaces = async ({ universeId }) => {
  try {
    const res = await request('GET', getFullUrl('develop', `/v1/universes/${universeId}/places?limit=25&sortOrder=Asc`));
    const list = res?.data?.data || [];
    return {
      RootPlace: list[0]?.id || 0,
      Places: list.map((p) => ({ PlaceId: p.id, Name: p.name })),
    };
  } catch (_) {
    return { RootPlace: 0, Places: [] };
  }
};

export const getGamePassRootPlace = async ({ assetId }) => {
  const universeId = await getGamePassUniverse({ assetId });
  if (!universeId) return null;
  const uniArr = await multiGetUniverseDetails({ universeIds: [universeId] });
  const uni = uniArr?.[0];
  if (uni?.rootPlaceId) {
    return { id: uni.rootPlaceId, name: uni.name };
  }
  return null;
};

export const getUniverseGamePasses = async ({ universeId }) => {
  try {
    const res = await request(
      'GET',
      getFullUrl('apis', `/game-passes/v1/universes/${universeId}/game-passes?passView=Full&pageSize=50`)
    );
    const passes = res?.data?.gamePasses || res?.data?.data || [];
    if (Array.isArray(passes)) {
      return passes.map((p) => ({
        id: p.id,
        name: p.name || p.displayName,
        displayName: p.displayName || p.name,
        productId: p.productId || p.id,
        price: p.price ?? p.marketPlaceFees?.price ?? null,
        sellerName: p.sellerName || '',
        sellerId: p.sellerId || null,
        isOwned: Boolean(p.isOwned),
      }));
    }
  } catch (_) {
    // fallback to legacy games endpoint
  }
  try {
    const legacy = await request(
      'GET',
      getFullUrl('games', `/v1/games/${universeId}/game-passes?limit=50&sortOrder=Asc`)
    );
    return legacy?.data?.data || [];
  } catch (_) {
    return [];
  }
};

export const getUserCreatedPlaceCount = ({ userId }) => {
  return getUserGames({ userId, cursor: '' })
    .then((d) => (Array.isArray(d?.data) ? d.data.length : 0))
    .catch(() => 0);
};

export const getGameTemplates = async () => [];
