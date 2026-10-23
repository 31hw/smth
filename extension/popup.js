(function () {
  const extEnabledEl = document.getElementById('extEnabled');

  chrome.storage.local.get(['rbx_ext_enabled_v1'], (items) => {
    const val = items ? items.rbx_ext_enabled_v1 : true;
    extEnabledEl.checked = val !== false && val !== 'false';
  });

  extEnabledEl.addEventListener('change', () => {
    const enabled = extEnabledEl.checked;
    chrome.storage.local.set({ rbx_ext_enabled_v1: enabled }, () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs && tabs[0];
        if (tab && tab.id && tab.url && tab.url.includes('roblox.com')) {
          chrome.tabs.reload(tab.id);
        }
      });
    });
  });
})();
