import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createUseStyles } from 'react-jss';
import { sendMessage, toggleReadStatus } from '../../../services/privateMessages';
import AuthenticationStore from '../../../stores/authentication';
import MyMessagesStore from '../../../stores/myMessages';
import useButtonStyles from '../../../styles/buttonStyles';
import ActionButton from '../../actionButton';
import PlayerImage from '../../playerImage';
import Link from '../../link';
import { sanitizeRichHtml, stripHtmlToText } from '../../../lib/sanitizeHtml';

const useStyles = createUseStyles({
  username: {
    fontWeight: 700,
    marginBottom: 0,
  },
  created: {
    marginBottom: 0,
    color: 'var(--text-color-secondary)',
    fontWeight: 500,
  },
  subject: {
    fontWeight: 500,
    marginTop: 10,
    color: 'var(--text-color-primary)',
  },
  body: {
    lineHeight: '1.6em',
    wordBreak: 'break-word',
    color: 'var(--text-color-primary)',
    '& a': {
      color: 'var(--primary-color)',
      textDecoration: 'underline',
    },
    '& p': {
      marginBottom: '0.75rem',
    },
  },
  backButtonWrapper: {
    width: '80px',
    float: 'left',
  },
  replyButtonWrapper: {
    width: '110px',
    float: 'left',
    marginLeft: '10px',
  },
  replyText: {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--input-bg)',
    color: 'var(--text-color-primary)',
    border: '1px solid var(--text-color-quinary)',
  },
  replyWrapper: {
    width: '170px',
    float: 'right',
    marginTop: 8,
  },
});

const LargeMessage = (props) => {
  const s = useStyles();
  const buttonStyles = useButtonStyles();
  const store = MyMessagesStore.useContainer();
  const [reply, setReply] = useState(false);
  const replyInputRef = useRef(null);
  const showReplyButton = !props.isSystemMessage && Number(props.fromUserId) !== 1;
  const auth = AuthenticationStore.useContainer();
  const [feedback, setFeedback] = useState(null);

  const sanitizedBodyHtml = useMemo(
    () => sanitizeRichHtml(props.body, { convertNewlines: true }),
    [props.body]
  );
  const cleanSubject = useMemo(() => stripHtmlToText(props.subject), [props.subject]);

  useEffect(() => {
    if (props.id && props.read !== true && props.fromUserId !== auth.userId) {
      toggleReadStatus({
        messageIds: [props.id],
        isRead: true,
      });
      if (Array.isArray(store.messages)) {
        store.setMessages(
          store.messages.map((m) => (m.id === props.id ? { ...m, isRead: true } : m))
        );
      }
    }
  }, [props.id]);

  useEffect(() => {
    setFeedback(null);
  }, [props.id]);

  return (
    <div className="row pt-2 pb-3">
      <div className="col-12 clearfix">
        <div className={s.backButtonWrapper}>
          <ActionButton
            label="Back"
            className={buttonStyles.cancelButton}
            onClick={() => {
              store.setHighlightedMessage(null);
            }}
          />
        </div>
        {showReplyButton && (
          <div className={s.replyButtonWrapper}>
            <ActionButton
              label="Reply"
              className={buttonStyles.continueButton}
              onClick={() => {
                setReply(!reply);
              }}
            />
          </div>
        )}
      </div>
      <div className="col-12">
        <h2 className={s.subject}>{cleanSubject}</h2>
        {feedback ? <p className="text-danger">{feedback}</p> : null}
      </div>
      <div className="col-2 col-md-1 pe-0">
        <PlayerImage id={props.fromUserId} />
      </div>
      <div className="col-10 col-md-11">
        <p className={s.username}>
          <Link href={`/users/${props.fromUserId}/profile`}>
            <a className="normal">{props.fromUserName}</a>
          </Link>
        </p>
        <p className={s.created}>
          {props.created ? dayjs(props.created).format('MMM DD, YYYY | h:mm A') : ''}
        </p>
      </div>
      <div className="col-12">
        <div
          className={`${s.body} mt-3`}
          dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
        />
      </div>
      {reply && (
        <div className="col-12 mt-3">
          <textarea
            ref={replyInputRef}
            maxLength={1000}
            className={s.replyText}
            rows={8}
            placeholder="Reply here..."
          />
          <div className={s.replyWrapper}>
            <ActionButton
              label="Send Reply"
              className={buttonStyles.continueButton}
              onClick={() => {
                setFeedback(null);
                sendMessage({
                  userId: props.fromUserId,
                  subject: 'RE: ' + cleanSubject,
                  body: replyInputRef.current.value,
                  includePreviousMessage: true,
                  replyMessageId: props.id,
                })
                  .then((res) => {
                    if (res?.success) {
                      store.setHighlightedMessage(null);
                    } else {
                      setFeedback(res?.shortMessage || res?.message || 'Unknown error. Try again.');
                    }
                  })
                  .catch((e) => {
                    setFeedback(e?.message || 'Failed to send reply.');
                  });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LargeMessage;
