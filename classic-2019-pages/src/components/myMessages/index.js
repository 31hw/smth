import React, { useState } from 'react';
import Head from 'next/head';
import { createUseStyles } from 'react-jss';
import MyMessagesStore from '../../stores/myMessages';
import AdBanner from '../ad/adBanner';
import OldVerticalTabs from '../oldVerticalTabs';
import LargeMessage from './components/largeMessage';
import MessageRow from './components/messageRow';

const useStyles = createUseStyles({
  messagesContainer: {
    background: 'var(--white-color)',
    padding: '8px 12px',
    overflow: 'hidden',
    minHeight: '75vh',
    border: '1px solid var(--border-subtle)',
  },
});

const MyMessages = () => {
  const s = useStyles();
  const store = MyMessagesStore.useContainer();
  const [tab, setTab] = useState('Inbox');
  const notifCount = Array.isArray(store.notifications?.collection)
    ? store.notifications.collection.length
    : 0;

  return (
    <div className="container">
      <Head>
        <title>Messages - ROBLOX</title>
      </Head>
      <AdBanner />
      <div className={s.messagesContainer}>
        <div className="row mt-2">
          <div className="col-12">
            {store.highlightedMessage ? (
              <LargeMessage {...store.highlightedMessage} />
            ) : (
              <OldVerticalTabs
                onChange={(v) => {
                  setTab(v.name);
                }}
                default={tab}
                options={[
                  {
                    name: 'Inbox',
                    element: <MessageRow tab="inbox" />,
                  },
                  {
                    name: 'Sent',
                    element: <MessageRow tab="sent" />,
                  },
                  {
                    name: 'Notifications',
                    element: <MessageRow tab="notifications" />,
                    count: notifCount > 0 ? notifCount : undefined,
                  },
                  {
                    name: 'Archive',
                    element: <MessageRow tab="archive" />,
                  },
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyMessages;
