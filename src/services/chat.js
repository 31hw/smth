import request, { getFullUrl } from '../lib/request';

export const getChatSettings = () => {
  return request('GET', getFullUrl('chat', '/v2/chat-settings'))
    .then((d) => d.data || { chatEnabled: false, isActiveChatUser: false })
    .catch(() => ({ chatEnabled: false, isActiveChatUser: false }));
};

export const getUserConversations = async ({ pageNumber = 1, pageSize = 30 }) => {
  return request(
    'GET',
    getFullUrl(
      'chat',
      `/v2/get-user-conversations?pageNumber=${encodeURIComponent(
        String(pageNumber)
      )}&pageSize=${encodeURIComponent(String(pageSize))}`
    )
  )
    .then((d) => (Array.isArray(d?.data) ? d.data : []))
    .catch(() => []);
};

export const markAsRead = async ({ conversationId, endMessageId }) => {
  return request('POST', getFullUrl('chat', '/v2/mark-as-read'), {
    conversationId,
    endMessageId,
  }).catch(() => ({}));
};

export const startOneToOneConversation = async ({ userId }) => {
  return request('POST', getFullUrl('chat', '/v2/start-one-to-one-conversation'), {
    participantUserId: userId,
  }).then((d) => d.data);
};

export const updateTypingStatus = async ({ conversationId, isTyping }) => {
  return request('POST', getFullUrl('chat', '/v2/update-user-typing-status'), {
    isTyping,
    conversationId,
  }).catch(() => ({}));
};

export const sendMessage = async ({ conversationId, message }) => {
  return request('POST', getFullUrl('chat', '/v2/send-message'), {
    conversationId,
    message,
  }).then((d) => d.data);
};

export const multiGetLatestMessages = async ({ conversationIds }) => {
  if (!Array.isArray(conversationIds) || conversationIds.length === 0) return [];
  const ids = encodeURIComponent(conversationIds.join(','));
  return request('GET', getFullUrl('chat', `/v2/multi-get-latest-messages?conversationIds=${ids}`))
    .then((d) => (Array.isArray(d?.data) ? d.data : []))
    .catch(() => []);
};

export const getMessages = async ({ conversationId, pageSize = 50, startId = '' }) => {
  return request(
    'GET',
    getFullUrl(
      'chat',
      `/v2/get-messages?conversationId=${encodeURIComponent(
        String(conversationId)
      )}&pageSize=${encodeURIComponent(String(pageSize))}&exclusiveStartMessageId=${encodeURIComponent(
        String(startId || '')
      )}`
    )
  )
    .then((d) => (Array.isArray(d?.data) ? d.data : []))
    .catch(() => []);
};
