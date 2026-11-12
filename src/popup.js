const toggle = document.getElementById('toggle');

chrome.storage.local.get({ skinEnabled: false }).then(({ skinEnabled }) => {
  toggle.checked = skinEnabled;
});

toggle.addEventListener('change', async () => {
  const skinEnabled = toggle.checked;
  // 擋 SPA 的規則和 content script 的開關必須同步，否則會出現空白頁或兩套介面疊在一起
  await chrome.declarativeNetRequest.updateEnabledRulesets(
    skinEnabled ? { enableRulesetIds: ['block_spa'] } : { disableRulesetIds: ['block_spa'] }
  );
  await chrome.storage.local.set({ skinEnabled });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.startsWith('https://workplus.synology.inc/')) {
    chrome.tabs.reload(tab.id);
  }
});
