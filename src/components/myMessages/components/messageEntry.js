import { createUseStyles } from 'react-jss';
import MyMessagesStore from '../../../stores/myMessages';
import PlayerImage from '../../playerImage';
import { stripHtmlToText } from '../../../lib/sanitizeHtml';

const useStyles = createUseStyles({
  username: {
    fontWeight: 700,
    color: 'var(--text-color-secondary)',
    marginBottom: 0,
  },
  subject: {
    fontWeight: 700,
    color: 'var(--text-color-secondary)',
  },
  subjectUnread: {
    color: 'var(--text-color-primary)',
  },
  subjectBodyParagraph: {
    marginBottom: 0,
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  body: {
    color: 'var(--text-color-secondary)',
    fontWeight: 400,
  },
  messageRow: {
    cursor: 'pointer',
    '&:hover': {
      background: 'var(--surface-hover)',
    },
  },
  userImage: {
    maxWidth: '100%',
    display: 'inline-block',
    position: 'relative',
    marginTop: '-15px',
    paddingLeft: '15px',
  },
  markRead: {
    zIndex: 99,
    cursor: 'pointer',
  },
  markReadWrapper: {
    display: 'inline-block',
    width: '10px',
    position: 'relative',
    top: '20px',
    zIndex: 99,
  },
  userCheckAndImage: {
    display: 'inline-block',
    width: '65px',
  },
  subjectAndContent: {
    display: 'inline-block',
    width: 'calc(100% - 65px)',
    verticalAlign: 'super',
    paddingRight: '8px',
  },
});

const MessageEntry = (props) => {
  const s = useStyles();
  const store = MyMessagesStore.useContainer();
  const isChecked = store.checked.find((v) => v.id === props.id) !== undefined;
  const cleanSubject = stripHtmlToText(props.subject);
  const cleanPreview = stripHtmlToText(props.body);

  return (
    <div
      className={`pt-2 ${s.messageRow}`}
      onClick={(e) => {
        e.preventDefault();
        store.setHighlightedMessage(props);
      }}
    >
      <div className={s.userCheckAndImage}>
        <div className={s.markReadWrapper}>
          {store.tab !== 'sent' && store.tab !== 'notifications' && (
            <input
              type="checkbox"
              checked={isChecked}
              className={s.markRead}
              onChange={() => {}}
              onClick={(e) => {
                e.stopPropagation();
                if (isChecked) {
                  store.setChecked(store.checked.filter((v) => v.id !== props.id));
                } else {
                  store.setChecked([...store.checked, props]);
                }
              }}
            />
          )}
        </div>
        <div className={s.userImage}>
          <PlayerImage id={props.fromUserId} />
        </div>
      </div>
      <div className={s.subjectAndContent}>
        <p className={s.username}>{props.fromUserName}</p>
        <p className={s.subjectBodyParagraph}>
          <span className={`${s.subject} ${props.read ? '' : s.subjectUnread}`}>
            {cleanSubject}
          </span>
          {cleanPreview ? (
            <>
              {' '}
              - <span className={s.body}>{cleanPreview}</span>
            </>
          ) : null}
        </p>
      </div>
      <div>
        <div className="divider-top" />
      </div>
    </div>
  );
};

export default MessageEntry;
