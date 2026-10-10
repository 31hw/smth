import request, { getFullUrl, getUrlWithProxy } from '../lib/request';

const iconsUrl = () => getFullUrl('admin', '/web/icons');

export const getWebIcons = async () => {
  const response = await request('GET', iconsUrl());
  return response.data;
};

export const replaceWebIcon = async ({ path, file }) => {
  const url = `${iconsUrl()}?path=${encodeURIComponent(path)}`;
  const response = await fetch(getUrlWithProxy(url), {
    method: 'PUT',
    credentials: 'same-origin',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The server returned an invalid response while replacing the icon.');
  }
  if (!response.ok) {
    throw new Error(data?.errors?.[0]?.message || `Icon replacement failed (${response.status}).`);
  }
  return data;
};
