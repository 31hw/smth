import React from 'react';
import Theme2016 from '../../components/theme2016';
import UserFriends from '../../components/userFriends';
import UserFriendsStore from '../../components/userFriends/stores/userFriendsStore';
import AuthenticationStore from '../../stores/authentication';

const MyFriendsShortcutPage = () => {
  const auth = AuthenticationStore.useContainer();
  if (auth.isPending) return null;
  if (!auth.userId) {
    return (
      <div className="container mt-4">
        <div className="section-content">Please log in to view your Friends list.</div>
      </div>
    );
  }
  return (
    <Theme2016>
      <UserFriendsStore.Provider>
        <UserFriends userId={auth.userId} />
      </UserFriendsStore.Provider>
    </Theme2016>
  );
};

export default MyFriendsShortcutPage;
