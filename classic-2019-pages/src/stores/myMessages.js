import { useEffect, useState } from 'react';
import { createContainer } from 'unstated-next';
import { getAnnouncements, getMessages } from '../services/privateMessages';

const MyMessagesStore = createContainer(() => {
  const limit = 20;
  const [notifications, setNotifications] = useState(null);
  const [messages, setMessages] = useState(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [highlightedMessage, setHighlightedMessage] = useState(null);
  const [tab, setTab] = useState('inbox');
  const [checked, setChecked] = useState([]);

  useEffect(() => {
    getAnnouncements().then((res) => {
      setNotifications(res || { collection: [], totalCollectionSize: 0 });
    });
  }, []);

  const getMessagesForTab = (activeTab, activeOffset = offset) => {
    setMessages(null);
    setTotal(0);
    getMessages({
      tab: activeTab,
      offset: activeOffset,
      limit,
    }).then((res) => {
      const col = Array.isArray(res?.collection) ? res.collection : [];
      setMessages(col);
      const computedTotal =
        typeof res?.totalCollectionSize === 'number' && res.totalCollectionSize > 0
          ? res.totalCollectionSize
          : (res?.totalPages || 0) * limit;
      setTotal(computedTotal);
    });
  };

  useEffect(() => {
    setChecked([]);
    if (tab === 'notifications') {
      const list = Array.isArray(notifications?.collection) ? notifications.collection : [];
      setMessages(list);
      setTotal(list.length);
    } else if (tab === 'inbox' || tab === 'sent' || tab === 'archive') {
      getMessagesForTab(tab, offset);
    } else {
      setMessages([]);
      setTotal(0);
    }
  }, [tab, offset, notifications]);

  return {
    limit,
    offset,
    setOffset,
    total,
    setTotal,
    messages,
    setMessages,
    notifications,
    setNotifications,
    highlightedMessage,
    setHighlightedMessage,
    checked,
    setChecked,
    tab,
    setTab,
    getMessagesForTab,
  };
});

export default MyMessagesStore;
