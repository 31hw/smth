import request, { getFullUrl } from '../lib/request';

export const login = ({ username, password }) => {
  const ctype = String(username || '').includes('@') ? 'Email' : 'Username';
  return request('POST', getFullUrl('auth', '/v2/login'), {
    ctype,
    cvalue: username,
    password,
  });
};

export const getSignupMetadata = () => {
  return request('GET', getFullUrl('auth', '/v2/signup-metadata')).then((result) => result.data);
};

export const signup = ({ username, password, signupToken, website }) => {
  return request('POST', getFullUrl('auth', '/v2/signup'), {
    username,
    password,
    signupToken,
    website: website || '',
  });
};

export const logout = () => {
  return request('POST', getFullUrl('auth', '/v2/logout'), {});
};

export const changePassword = ({ existingPassword, newPassword }) => {
  return request('POST', getFullUrl('auth', `/v2/user/passwords/change`), {
    currentPassword: existingPassword,
    newPassword,
  });
};

export const validateUsername = ({ username, context = 'UsernameChange' }) => {
  return request(
    'GET',
    getFullUrl(
      'auth',
      `/v1/usernames/validate?username=${encodeURIComponent(username)}&context=${encodeURIComponent(
        context
      )}`
    )
  ).then((d) => d.data);
};

export const changeUsername = ({ username, password }) => {
  return request('POST', getFullUrl('auth', `/v1/username`), {
    username,
    password,
  });
};

export const logoutFromAllOtherSessions = () => {
  return request('POST', getFullUrl('auth', '/v2/logoutfromallsessionsandreauthenticate'), {});
};
