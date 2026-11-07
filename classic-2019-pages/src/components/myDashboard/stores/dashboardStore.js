import { useEffect, useState } from "react";
import { createContainer } from "unstated-next";
import { multiGetPresence } from "../../../services/presence";
import dayjs from "dayjs";

const DashboardStore = createContainer(() => {
  const [friends, setFriends] = useState(null);
  const [friendStatus, setFriendStatus] = useState(null);

  useEffect(() => {
    if (!friends || friendStatus) {
      return
    }
    multiGetPresence({
      userIds: friends.map(v => v.id),
    }).then(d => {
      let obj = {}
      for (const user of d) {
        obj[user.userId] = user;
      }
      setFriendStatus(obj);
      const sortedFriends = [...friends].sort((a, b) => {
        const presenceA = obj[a.id];
        const presenceB = obj[b.id];
        const timeA = presenceA?.lastOnline ? dayjs(presenceA.lastOnline) : dayjs(0);
        const timeB = presenceB?.lastOnline ? dayjs(presenceB.lastOnline) : dayjs(0);
        return timeA.isAfter(timeB) ? -1 : timeA.isSame(timeB) ? 0 : 1;
      });
      setFriends(sortedFriends);
    }).catch(e => {
      console.error('[error] friends err', e);
    })
  }, [friends, friendStatus]);
  return {
    friends,
    setFriends,

    friendStatus,
    setFriendStatus,
  }
});

export default DashboardStore;