import { useEffect } from 'react';
import { useRouter } from 'next/router';
import AuthenticationStore from '../stores/authentication';

const UserPage = () => {
  const router = useRouter();
  const auth = AuthenticationStore.useContainer();
  const userId = router.query.ID || router.query.id || auth.userId;

  useEffect(() => {
    if (userId) {
      router.replace(`/users/${userId}/profile`);
    }
  }, [userId]);

  return null;
};

export default UserPage;
