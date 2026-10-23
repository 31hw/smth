import request, { getFullUrl } from '../lib/request';

export const getAnnouncements = () => {
  return request('GET', getFullUrl('privatemessages', '/v1/announcements'))
    .then((d) => {
      const col = Array.isArray(d?.data?.collection) ? d.data.collection : [];
      return {
        collection: col,
        totalCollectionSize: Number(d?.data?.totalCollectionSize ?? col.length),
      };
    })
    .catch(() => ({ collection: [], totalCollectionSize: 0 }));
};

export const getMessages = ({ tab = 'inbox', offset = 0, limit = 20 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const pageNumber = Math.max(0, Math.floor((Number(offset) || 0) / safeLimit));
  const rawTab = String(tab || 'inbox').toLowerCase();
  const cleanTab =
    rawTab === 'sent' ? 'Sent' : rawTab === 'archive' ? 'Archive' : 'Inbox';
  return request(
    'GET',
    getFullUrl(
      'privatemessages',
      `/v1/messages?messageTab=${encodeURIComponent(cleanTab)}&pageNumber=${pageNumber}&pageSize=${safeLimit}`
    )
  )
    .then((d) => {
      const col = Array.isArray(d?.data?.collection) ? d.data.collection : [];
      return {
        collection: col,
        totalCollectionSize: Number(d?.data?.totalCollectionSize ?? col.length),
        totalPages: Number(d?.data?.totalPages ?? (col.length > 0 ? 1 : 0)),
        pageNumber: Number(d?.data?.pageNumber ?? pageNumber),
      };
    })
    .catch(() => ({
      collection: [],
      totalCollectionSize: 0,
      totalPages: 0,
      pageNumber,
    }));
};

export const toggleReadStatus = ({ messageIds, isRead }) => {
  const subUrl = isRead ? '/v1/messages/mark-read' : '/v1/messages/mark-unread';
  return request('POST', getFullUrl('privatemessages', subUrl), {
    messageIds,
  }).catch(() => ({}));
};

export const toggleArchiveStatus = ({ messageIds, isArchived }) => {
  const subUrl = isArchived ? '/v1/messages/archive' : '/v1/messages/unarchive';
  return request('POST', getFullUrl('privatemessages', subUrl), {
    messageIds,
  }).catch(() => ({}));
};

export const sendMessage = async ({
  userId,
  subject,
  body,
  replyMessageId,
  includePreviousMessage,
}) => {
  const res = await request('POST', getFullUrl('privatemessages', '/v1/messages/send'), {
    recipientId: parseInt(userId, 10),
    subject,
    body,
    replyMessageId,
    includePreviousMessage: Boolean(includePreviousMessage),
  });
  return res.data;
};

export const getUnreadMessageCount = () => {
  return request('GET', getFullUrl('privatemessages', '/v1/messages/unread/count'))
    .then((d) => Number(d?.data?.count ?? 0))
    .catch(() => 0);
};

export const canMessage = ({ userId }) => {
  return request('GET', getFullUrl('privatemessages', `/v1/messages/${userId}/can-message`))
    .then((d) => Boolean(d?.data?.canMessage))
    .catch(() => false);
};
