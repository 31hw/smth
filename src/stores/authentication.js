import { useEffect, useState } from 'react';
import { createContainer } from 'unstated-next';
import { getRobux } from '../services/economy';
import { getFriendRequestCount } from '../services/friends';
import { getUnreadMessageCount } from '../services/privateMessages';
import { getInboundTradeCount } from '../services/trades';
import { getMyInfo } from '../services/users';

function readInitialSSRUser() {
  if (typeof window === 'undefined') return null;
  const u = window.__RBX_INITIAL_USER__;
  if (u && Number(u.id) > 0 && u.name) {
    return {
      id: Number(u.id),
      name: String(u.name),
      displayName: String(u.displayName || u.name),
    };
  }
  return null;
}

const AuthenticationStore = createContainer(() => {
  const initialUser = readInitialSSRUser();
  const [userId, setUserId] = useState(initialUser ? initialUser.id : null);
  const [username, setUsername] = useState(initialUser ? initialUser.name : null);
  const [displayName, setDisplayName] = useState(initialUser ? initialUser.displayName : null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialUser));
  const [isPending, setIsPending] = useState(!initialUser);
  const [robux, setRobux] = useState(null);
  const [tix, setTix] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const [notificationCount, setNotificationCount] = useState({
    messages: 0,
    trades: 0,
    friendRequests: 0,
  });

  useEffect(() => {
    let closed = false;
    const pendingGuard = setTimeout(() => {
      if (!closed) setIsPending(false);
    }, 4000);

    getMyInfo()
      .then((result) => {
        if (closed) return;
        if (!result || typeof result !== 'object' || !result.id) {
          throw new Error('Unauthenticated');
        }
        setUserId(result.id);
        setIsStaff(Boolean(result.isStaff));
        setUsername(result.name);
        setDisplayName(result.displayName || result.name);
        setIsAuthenticated(true);
        setIsPending(false);
      })
      .catch(() => {
        if (!closed) {
          setUserId(null);
          setUsername(null);
          setDisplayName(null);
          setIsStaff(false);
          setIsAuthenticated(false);
          setIsPending(false);
        }
      })
      .finally(() => {
        clearTimeout(pendingGuard);
      });

    return () => {
      closed = true;
      clearTimeout(pendingGuard);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    getRobux({ userId })
      .then((data) => {
        setRobux(data?.robux ?? 0);
        setTix(data?.tickets ?? 0);
      })
      .catch(() => {
        setRobux(0);
      });

    Promise.all([
      getInboundTradeCount().catch(() => 0),
      getUnreadMessageCount().catch(() => 0),
      getFriendRequestCount().catch(() => 0),
    ]).then(([inboundTradeCount, messageCount, friendRequestCount]) => {
      setNotificationCount({
        messages: messageCount || 0,
        friendRequests: friendRequestCount || 0,
        trades: inboundTradeCount || 0,
      });
    });
  }, [userId]);

  return {
    userId,
    username,
    displayName,
    isAuthenticated,
    isPending,
    robux,
    tix,
    notificationCount,
    isStaff,
  };
});

export default AuthenticationStore;
