import { chunk } from 'lodash';
import request, { getFullUrl } from '../lib/request';
import { sanitizeRichHtml, stripHtmlToText } from '../lib/sanitizeHtml';

const DEVFORUM_BASE = 'https://devforum.roblox.com';

const FALLBACK_DEVFORUM_CATEGORIES = [
  {
    id: 45,
    name: 'Updates',
    subCategories: [
      {
        id: 36,
        slug: 'announcements',
        name: 'Announcements',
        description: 'Official announcements, news, and platform updates from Roblox Staff.',
      },
      {
        id: 62,
        slug: 'release-notes',
        name: 'Release Notes',
        description: 'Weekly release notes and engine changes for Roblox Studio and Client.',
      },
      {
        id: 90,
        slug: 'community',
        name: 'Community',
        description: 'Community events, challenges, and creator spotlights.',
      },
    ],
  },
  {
    id: 54,
    name: 'Help and Feedback',
    subCategories: [
      {
        id: 55,
        slug: 'scripting-support',
        name: 'Scripting Support',
        description: 'Get help with Luau scripting, APIs, and technical game systems.',
      },
      {
        id: 56,
        slug: 'building-support',
        name: 'Building Support',
        description: 'Help and advice with 3D modeling, studio building, lighting, and terrain.',
      },
      {
        id: 57,
        slug: 'art-design-support',
        name: 'Art Design Support',
        description: 'UI/UX design, textures, clothing, animations, and sound design.',
      },
      {
        id: 82,
        slug: 'game-design-support',
        name: 'Game Design Support',
        description: 'Gameplay loops, monetization, balancing, and player retention.',
      },
      {
        id: 29,
        slug: 'creations-feedback',
        name: 'Creations Feedback',
        description: 'Share your Roblox games, models, and creations for community feedback.',
      },
    ],
  },
  {
    id: 70,
    name: 'Resources',
    subCategories: [
      {
        id: 71,
        slug: 'community-resources',
        name: 'Community Resources',
        description: 'Open-source modules, plugins, assets, and tools shared by creators.',
      },
      {
        id: 46,
        slug: 'community-tutorials',
        name: 'Community Tutorials',
        description: 'Step-by-step guides and tutorials written by the Roblox developer community.',
      },
    ],
  },
  {
    id: 1000,
    name: 'Platform Feedback',
    subCategories: [
      {
        id: 10,
        slug: 'bug-reports',
        name: 'Bug Reports',
        description: 'Engine, Studio, web, and mobile bug reports tracked by Roblox engineers.',
      },
      {
        id: 170,
        slug: 'feature-requests',
        name: 'Feature Requests',
        description: 'Propose new features and improvements for the Roblox Engine and platform.',
      },
    ],
  },
];

let _liveCategories = FALLBACK_DEVFORUM_CATEGORIES;
const _subStatsCache = new Map();
const _subMetaById = new Map();
const _catMetaBySubId = new Map();
const _usernameToRobloxId = new Map([
  ['roblox', 1],
  ['system', 1],
]);
const _topicJsonCache = new Map();

function indexCategories(cats) {
  for (const cat of cats || []) {
    for (const sub of cat.subCategories || []) {
      _subMetaById.set(Number(sub.id), sub);
      _catMetaBySubId.set(Number(sub.id), { id: cat.id, name: cat.name });
    }
  }
}

indexCategories(FALLBACK_DEVFORUM_CATEGORIES);

async function resolveUserIdsByUsernames(usernames) {
  const uniqueUnknown = [
    ...new Set(
      (usernames || [])
        .filter((u) => typeof u === 'string' && u.trim().length > 0)
        .map((u) => u.trim())
        .filter((u) => !_usernameToRobloxId.has(u.toLowerCase()))
    ),
  ];

  if (uniqueUnknown.length > 0) {
    for (const batch of chunk(uniqueUnknown, 50)) {
      try {
        const res = await request('POST', getFullUrl('users', '/v1/usernames/users'), {
          usernames: batch,
          excludeBannedUsers: false,
        });
        for (const row of res?.data?.data || []) {
          if (row.requestedUsername && row.id) {
            _usernameToRobloxId.set(row.requestedUsername.toLowerCase(), Number(row.id));
          }
          if (row.name && row.id) {
            _usernameToRobloxId.set(row.name.toLowerCase(), Number(row.id));
          }
        }
      } catch (_) {
        // Fallback to userId 1 if lookup fails
      }
    }
  }

  const out = {};
  for (const u of usernames || []) {
    if (!u) continue;
    out[u] = _usernameToRobloxId.get(String(u).toLowerCase()) || 1;
  }
  return out;
}

function mapDiscourseCategorySummary(rawSub) {
  const latestTopic = Array.isArray(rawSub.topics) && rawSub.topics.length > 0 ? rawSub.topics[0] : null;
  const stats = {
    threadCount: Number(rawSub.topic_count || rawSub.topics_all_time || 0),
    postCount: Number(rawSub.post_count || 0),
    lastPost: latestTopic
      ? {
          threadId: latestTopic.id,
          postId: latestTopic.id,
          title: latestTopic.title || '',
          createdAt: latestTopic.last_posted_at || latestTopic.created_at || new Date().toISOString(),
          username: latestTopic.last_poster_username || 'Roblox',
        }
      : null,
  };
  _subStatsCache.set(Number(rawSub.id), stats);
  return {
    id: Number(rawSub.id),
    slug: rawSub.slug || String(rawSub.id),
    name: rawSub.name || `Category ${rawSub.id}`,
    description: stripHtmlToText(rawSub.description_text || rawSub.description || ''),
    stats,
  };
}

let _categoriesFetchPromise = null;

export const fetchCategories = async () => {
  if (_categoriesFetchPromise) return _categoriesFetchPromise;
  _categoriesFetchPromise = request(
    'GET',
    `${DEVFORUM_BASE}/categories.json?include_subcategories=true`
  )
    .then((res) => {
      const rawCats = res?.data?.category_list?.categories;
      if (!Array.isArray(rawCats) || rawCats.length === 0) {
        return _liveCategories;
      }
      const mapped = [];
      for (const c of rawCats) {
        if (c.read_restricted) continue;
        // Subcategories are also returned in the flat list; they're handled via subcategory_list
        if (c.parent_category_id) continue;
        const subs = Array.isArray(c.subcategory_list) && c.subcategory_list.length > 0
          ? c.subcategory_list.filter((s) => !s.read_restricted).map(mapDiscourseCategorySummary)
          : [mapDiscourseCategorySummary(c)];
        if (subs.length === 0) continue;
        mapped.push({
          id: Number(c.id),
          name: c.name || 'Forum',
          subCategories: subs,
        });
      }
      if (mapped.length > 0) {
        _liveCategories = mapped;
        indexCategories(mapped);
      }
      return _liveCategories;
    })
    .catch(() => _liveCategories)
    .finally(() => {
      setTimeout(() => {
        _categoriesFetchPromise = null;
      }, 30000);
    });

  return _categoriesFetchPromise;
};

export const getCategories = () => _liveCategories;

export const getSubcategoryById = (subCategoryId) => {
  const id = Number(subCategoryId);
  return (
    _subMetaById.get(id) || {
      id: id || 36,
      slug: String(id || 36),
      name: `Category #${id || 36}`,
      description: 'Roblox Developer Forum',
    }
  );
};

export const getCategoryBySubCategoryId = (subCategoryId) => {
  const id = Number(subCategoryId);
  return (
    _catMetaBySubId.get(id) || {
      id: 45,
      name: 'Developer Forum',
    }
  );
};

export const getSubCategoryInfo = async ({ subCategoryId }) => {
  const id = Number(subCategoryId);
  if (_subStatsCache.has(id)) {
    return _subStatsCache.get(id);
  }
  await fetchCategories();
  if (_subStatsCache.has(id)) {
    return _subStatsCache.get(id);
  }
  try {
    const res = await request('GET', `${DEVFORUM_BASE}/c/${encodeURIComponent(id)}.json`);
    const topics = res?.data?.topic_list?.topics || [];
    const users = res?.data?.users || [];
    const userByDiscourseId = new Map(users.map((u) => [u.id, u.username]));
    const first = topics[0] || null;
    const lastPosterId =
      first?.posters?.find((p) => String(p.description || '').includes('Most Recent'))?.user_id ||
      first?.posters?.[0]?.user_id;
    const stats = {
      threadCount: topics.length,
      postCount: topics.reduce((acc, t) => acc + Number(t.posts_count || 1), 0),
      lastPost: first
        ? {
            threadId: first.id,
            postId: first.id,
            createdAt: first.last_posted_at || first.created_at,
            username:
              first.last_poster_username ||
              userByDiscourseId.get(lastPosterId) ||
              'Roblox',
          }
        : null,
    };
    _subStatsCache.set(id, stats);
    return stats;
  } catch (_) {
    return { threadCount: 0, postCount: 0, lastPost: null };
  }
};

export const getPostsInSubcategory = async ({ subCategoryId, limit = 15, cursor = '0' }) => {
  const id = Number(subCategoryId) || 36;
  const safeLimit = Math.max(Number(limit) || 15, 1);
  const offset = Math.max(Number(cursor) || 0, 0);
  // Discourse /c/{id}.json returns ~30 topics per page (0-indexed)
  const discoursePage = Math.floor(offset / 30);
  const sliceStart = offset % 30;

  try {
    await fetchCategories();
    const res = await request(
      'GET',
      `${DEVFORUM_BASE}/c/${encodeURIComponent(id)}.json?page=${discoursePage}`
    );
    const allTopics = res?.data?.topic_list?.topics || [];
    const sliced = allTopics.slice(sliceStart, sliceStart + safeLimit);
    const users = res?.data?.users || [];
    const discourseUserMap = new Map(users.map((u) => [u.id, u.username]));

    const usernamesToResolve = [];
    for (const t of sliced) {
      const opId = t.posters?.[0]?.user_id;
      const opName = discourseUserMap.get(opId) || t.last_poster_username || 'Roblox';
      const lastPosterId =
        t.posters?.find((p) => String(p.description || '').includes('Most Recent'))?.user_id ||
        t.posters?.[t.posters.length - 1]?.user_id;
      const lastName = t.last_poster_username || discourseUserMap.get(lastPosterId) || opName;
      usernamesToResolve.push(opName, lastName);
    }

    const rbxIdMap = await resolveUserIdsByUsernames(usernamesToResolve);

    const data = sliced.map((t) => {
      const opId = t.posters?.[0]?.user_id;
      const opName = discourseUserMap.get(opId) || t.last_poster_username || 'Roblox';
      const lastPosterId =
        t.posters?.find((p) => String(p.description || '').includes('Most Recent'))?.user_id ||
        t.posters?.[t.posters.length - 1]?.user_id;
      const lastName = t.last_poster_username || discourseUserMap.get(lastPosterId) || opName;
      return {
        isRead: Boolean(t.pinned),
        replyCount: Math.max(0, Number(t.posts_count || 1) - 1),
        views: Number(t.views || 0),
        post: {
          threadId: t.id,
          postId: t.id,
          title: t.title || t.fancy_title || 'Untitled Topic',
          username: opName,
          userId: rbxIdMap[opName] || 1,
          createdAt: t.created_at,
        },
        lastPost: {
          threadId: t.id,
          postId: t.id,
          username: lastName,
          userId: rbxIdMap[lastName] || 1,
          createdAt: t.last_posted_at || t.bumped_at || t.created_at,
        },
      };
    });

    const hasMoreInPage = sliceStart + safeLimit < allTopics.length;
    const hasMorePages = Boolean(res?.data?.topic_list?.more_topics_url);
    return {
      data,
      hasMore: hasMoreInPage || hasMorePages,
    };
  } catch (_) {
    return { data: [], hasMore: false };
  }
};

async function fetchDiscourseTopic(threadId) {
  const id = Number(threadId);
  const cached = _topicJsonCache.get(id);
  if (cached && Date.now() - cached.ts < 15000) {
    return cached.promise;
  }
  const promise = request('GET', `${DEVFORUM_BASE}/t/${encodeURIComponent(id)}.json`)
    .then((r) => r?.data || null)
    .catch((err) => {
      _topicJsonCache.delete(id);
      throw err;
    });
  _topicJsonCache.set(id, { ts: Date.now(), promise });
  return promise;
}

export const getThreadInfoById = async ({ threadId }) => {
  try {
    await fetchCategories();
    const t = await fetchDiscourseTopic(threadId);
    if (!t) return null;
    const subId = Number(t.category_id) || 36;
    if (!_subMetaById.has(subId)) {
      _subMetaById.set(subId, {
        id: subId,
        slug: String(subId),
        name: `Category #${subId}`,
        description: 'Roblox Developer Forum',
      });
      _catMetaBySubId.set(subId, { id: 45, name: 'Developer Forum' });
    }
    const suggested = Array.isArray(t.suggested_topics) ? t.suggested_topics : [];
    return {
      threadId: Number(t.id),
      title: stripHtmlToText(t.title || t.fancy_title || 'Topic'),
      subCategoryId: subId,
      postsCount: Number(t.posts_count || 1),
      views: Number(t.views || 0),
      devForumUrl: `${DEVFORUM_BASE}/t/${t.slug || 'topic'}/${t.id}`,
      previousThreadId: suggested[0]?.id || null,
      nextThreadId: suggested[1]?.id || null,
    };
  } catch (_) {
    return {
      threadId: Number(threadId),
      title: 'Topic Unavailable',
      subCategoryId: 36,
      postsCount: 0,
      views: 0,
      devForumUrl: `${DEVFORUM_BASE}/t/${encodeURIComponent(threadId)}`,
      previousThreadId: null,
      nextThreadId: null,
    };
  }
};

export const getRepliesToThread = async ({ threadId, limit = 15, cursor = '0' }) => {
  const id = Number(threadId);
  const safeLimit = Math.max(Number(limit) || 15, 1);
  const offset = Math.max(Number(cursor) || 0, 0);

  try {
    const t = await fetchDiscourseTopic(id);
    if (!t) return { data: [], hasMore: false };

    const streamIds = Array.isArray(t.post_stream?.stream) ? t.post_stream.stream : [];
    const initialPosts = Array.isArray(t.post_stream?.posts) ? t.post_stream.posts : [];
    const postById = new Map(initialPosts.map((p) => [p.id, p]));

    const targetIds =
      streamIds.length > 0
        ? streamIds.slice(offset, offset + safeLimit)
        : initialPosts.slice(offset, offset + safeLimit).map((p) => p.id);

    const missingIds = targetIds.filter((pid) => !postById.has(pid));
    if (missingIds.length > 0) {
      const qs = missingIds.map((pid) => `post_ids[]=${encodeURIComponent(pid)}`).join('&');
      try {
        const extraRes = await request(
          'GET',
          `${DEVFORUM_BASE}/t/${encodeURIComponent(id)}/posts.json?${qs}`
        );
        for (const p of extraRes?.data?.post_stream?.posts || []) {
          postById.set(p.id, p);
        }
      } catch (_) {}
    }

    const rawPosts = targetIds.map((pid) => postById.get(pid)).filter(Boolean);
    const rbxIdMap = await resolveUserIdsByUsernames(rawPosts.map((p) => p.username));

    const data = rawPosts.map((p) => ({
      createdAt: p.created_at,
      postCount: Number(p.reads || p.post_number || 1),
      canDelete: false,
      post: {
        postId: p.id,
        threadId: id,
        userId: rbxIdMap[p.username] || 1,
        username: p.username || 'Roblox',
        createdAt: p.created_at,
        post: stripHtmlToText(p.cooked || ''),
        postHtml: sanitizeRichHtml(p.cooked || ''),
      },
    }));

    return {
      data,
      hasMore: streamIds.length > offset + safeLimit,
    };
  } catch (_) {
    return { data: [], hasMore: false };
  }
};

export const getPostById = async ({ postId }) => {
  const id = Number(postId);
  const info = await getThreadInfoById({ threadId: id });
  const replies = await getRepliesToThread({ threadId: id, limit: 1, cursor: '0' });
  const first = replies.data[0]?.post;
  return {
    postId: id,
    threadId: id,
    subCategoryId: info?.subCategoryId || 36,
    title: info?.title || 'Topic',
    userId: first?.userId || 1,
    username: first?.username || 'Roblox',
    createdAt: first?.createdAt || new Date().toISOString(),
    post: first?.post || '',
    devForumUrl: info?.devForumUrl || `${DEVFORUM_BASE}/t/${id}`,
  };
};

export const markAsRead = () => Promise.resolve();

export const deletePost = () => Promise.resolve();

export const createThread = async ({ subCategoryId }) => {
  const sub = getSubcategoryById(subCategoryId);
  const url = `${DEVFORUM_BASE}/c/${encodeURIComponent(sub.slug || sub.id)}/${encodeURIComponent(sub.id)}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  throw new Error('Opened Roblox Developer Forum in a new tab to create your topic.');
};

export const replyToPost = async ({ postId }) => {
  const url = `${DEVFORUM_BASE}/t/${encodeURIComponent(postId)}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  throw new Error('Opened Roblox Developer Forum in a new tab to post your reply.');
};

export const getPostsByUser = async ({ userId, username = null, offset = 0, limit = 15 }) => {
  let resolvedName = username;
  if (!resolvedName && userId) {
    try {
      const uRes = await request('GET', getFullUrl('users', `/v1/users/${encodeURIComponent(userId)}`));
      resolvedName = uRes?.data?.name || null;
    } catch (_) {}
  }
  if (!resolvedName) {
    return { data: [] };
  }

  try {
    const res = await request(
      'GET',
      `${DEVFORUM_BASE}/user_actions.json?offset=${encodeURIComponent(
        offset
      )}&username=${encodeURIComponent(resolvedName)}&filter=4,5`
    );
    const actions = Array.isArray(res?.data?.user_actions) ? res.data.user_actions : [];
    return {
      data: actions.slice(0, limit).map((a) => ({
        threadId: a.topic_id,
        postId: a.post_id || a.topic_id,
        title: stripHtmlToText(a.title || ''),
        post: stripHtmlToText(a.excerpt || ''),
        createdAt: a.created_at,
      })),
    };
  } catch (_) {
    return { data: [] };
  }
};
