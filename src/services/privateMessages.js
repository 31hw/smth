import request, { getFullUrl } from '../lib/request';

export const sendMessage = ({ userId, subject, body, replyMessageId, includePreviousMessage }) => {
  return request('POST', getFullUrl('privatemessages', '/v1/messages/send'), {
    recipientid: Number(userId),
    body,
    subject,
    replyMessageId,
    includePreviousMessage,
  }).then((d) => d.data);
};

export const getAnnouncements = () => {
  return request('GET', getFullUrl('privatemessages', '/v1/announcements'))
    .then((d) =>
      Array.isArray(d?.data?.collection) ? d.data : { collection: [], totalCollectionSize: 0 }
    )
    .catch(() => ({ collection: [], totalCollectionSize: 0 }));
};

export const getMessages = ({ tab, offset = 0, limit = 20 }) => {
  const pageNumber = Math.floor(Number(offset || 0) / Number(limit || 20));
  return request(
    'GET',
    getFullUrl(
      'privatemessages',
      `/v1/messages?messageTab=${encodeURIComponent(tab || 'inbox')}&pageSize=${limit}&pageNumber=${pageNumber}`
    )
  )
    .then((d) =>
      Array.isArray(d?.data?.collection)
        ? d.data
        : { collection: [], totalCollectionSize: 0, totalPages: 0, pageNumber: 0 }
    )
    .catch(() => ({ collection: [], totalCollectionSize: 0, totalPages: 0, pageNumber: 0 }));
};

export const toggleReadStatus = ({ messageIds, isRead }) => {
  return request(
    'POST',
    getFullUrl('privatemessages', `/v1/messages/${isRead ? 'mark-read' : 'mark-unread'}`),
    { messageIds }
  );
};

export const toggleArchiveStatus = ({ messageIds, isArchived }) => {
  return request(
    'POST',
    getFullUrl('privatemessages', `/v1/messages/${isArchived ? 'archive' : 'unarchive'}`),
    { messageIds }
  );
};

export const getUnreadMessageCount = () => {
  return request('GET', getFullUrl('privatemessages', '/v1/messages/unread/count'))
    .then((d) => d.data?.count || 0)
    .catch(() => 0);
};
