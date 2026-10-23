import request, { getFullUrl } from '../lib/request';

export const getAlert = async () => {
  try {
    const res = await request('GET', getFullUrl('apis', '/alert/v2/get-alert'));
    const d = res?.data;
    if (d && (d.isVisible || d.IsVisible) && (d.text || d.Text)) {
      return {
        IsVisible: true,
        Text: d.text || d.Text,
        LinkUrl: d.linkUrl || d.LinkUrl || '',
      };
    }
  } catch (_) {
    // ignore alert lookup error
  }
  return {
    IsVisible: false,
    Text: '',
    LinkUrl: '',
  };
};
