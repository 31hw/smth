import { useEffect } from 'react';
import { createUseStyles } from 'react-jss';
import { toggleArchiveStatus, toggleReadStatus } from '../../../services/privateMessages';
import MyMessagesStore from '../../../stores/myMessages';
import useButtonStyles from '../../../styles/buttonStyles';
import ActionButton from '../../actionButton';
import MessageEntry from './messageEntry';
import MessagePagination from './messagePagination';

const useStyles = createUseStyles({
  row: {
    border: '1px solid var(--text-color-quinary)',
    minHeight: 120,
  },
  emptyState: {
    padding: '28px 16px',
    textAlign: 'center',
    color: 'var(--text-color-secondary)',
    margin: 0,
  },
  buttonWrapper: {
    marginTop: '3px',
    float: 'left',
  },
  button: {
    fontSize: '15px',
  },
  buttonMarkUnread: {
    width: '165px',
  },
  buttonArchive: {
    width: '105px',
  },
  buttonMarkRead: {
    width: '130px',
  },
});

const MessageRow = (props) => {
  const s = useStyles();
  const buttonStyles = useButtonStyles();
  const store = MyMessagesStore.useContainer();

  useEffect(() => {
    if (store.tab !== props.tab) {
      store.setOffset(0);
      store.setTotal(0);
      store.setTab(props.tab);
    }
  }, [props.tab, store.tab]);

  const archiveOrUnarchive = props.tab === 'archive' ? 'Unarchive' : 'Archive';
  const showButtons = store.tab !== 'sent' && store.tab !== 'notifications';
  const reverseSender = store.tab === 'sent';

  const toggleReadStatusClick = (readStatus) => (e) => {
    e.preventDefault();
    if (!store.checked.length) return;
    toggleReadStatus({
      messageIds: store.checked.map((v) => v.id),
      isRead: readStatus,
    }).then(() => {
      const checkedIds = new Set(store.checked.map((x) => x.id));
      const newMessages = (store.messages || []).map((v) =>
        checkedIds.has(v.id) ? { ...v, isRead: readStatus } : v
      );
      store.setMessages(newMessages);
      store.setChecked([]);
    });
  };

  if (store.messages === null) {
    return (
      <div className="row">
        <div className={`col-12 mt-2 ${s.row}`}>
          <p className={s.emptyState}>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="row">
      <div className="col-12 col-lg-7 mt-2">
        {showButtons && (
          <>
            <div className={s.buttonWrapper}>
              <input
                type="checkbox"
                className="mt-2 me-2"
                checked={
                  Boolean(store.messages.length > 0 && store.checked.length === store.messages.length)
                }
                onChange={(e) => {
                  const isChecked = e.currentTarget.checked;
                  if (!isChecked) {
                    store.setChecked([]);
                    return;
                  }
                  store.setChecked(
                    store.messages.map((v) => ({
                      id: v.id,
                      read: v.isRead,
                      archived: store.tab === 'archive',
                    }))
                  );
                }}
              />
            </div>
            <div className={`${s.buttonWrapper} ms-1 ${s.buttonArchive}`}>
              <ActionButton
                disabled={store.checked.length === 0}
                label={archiveOrUnarchive}
                className={`${buttonStyles.continueButton} ${s.button}`}
                onClick={() => {
                  toggleArchiveStatus({
                    messageIds: store.checked.map((v) => v.id),
                    isArchived: archiveOrUnarchive === 'Archive',
                  }).then(() => {
                    store.getMessagesForTab(store.tab, store.offset);
                    store.setChecked([]);
                  });
                }}
              />
            </div>
            <div className={`${s.buttonWrapper} ms-1 ${s.buttonMarkRead}`}>
              <ActionButton
                disabled={store.checked.length === 0}
                label="Mark as Read"
                className={`${buttonStyles.continueButton} ${s.button}`}
                onClick={toggleReadStatusClick(true)}
              />
            </div>
            <div className={`${s.buttonWrapper} ms-1 ${s.buttonMarkUnread}`}>
              <ActionButton
                disabled={store.checked.length === 0}
                label="Mark as Unread"
                className={`${buttonStyles.continueButton} ${s.button}`}
                onClick={toggleReadStatusClick(false)}
              />
            </div>
          </>
        )}
      </div>
      <div className="col-12 col-lg-5">
        <MessagePagination />
      </div>
      <div className={`col-12 mt-1 ${s.row}`}>
        {store.messages.length === 0 ? (
          <p className={s.emptyState}>You have no messages in this folder.</p>
        ) : (
          store.messages.map((v) => {
            const userData = reverseSender
              ? v.recipient
              : v.sender || { id: 1, name: 'Roblox' };
            if (!userData) return null;

            return (
              <MessageEntry
                key={v.id}
                fromUserId={userData.id || 1}
                fromUserName={userData.displayName && userData.displayName !== userData.name ? `${userData.displayName} (@${userData.name})` : userData.name || 'Roblox'}
                body={v.body || ''}
                subject={v.subject || '(No Subject)'}
                created={v.updated || v.created}
                read={reverseSender || store.tab === 'notifications' ? true : Boolean(v.isRead)}
                archived={store.tab === 'archive'}
                isSystemMessage={Boolean(v.isSystemMessage) || Number(userData.id) === 1}
                id={v.id}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

export default MessageRow;
