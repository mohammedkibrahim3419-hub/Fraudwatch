const REPORTS_KEY = 'fw_reports';

async function checkAddress(address) {
  try {
    const result = await chrome.storage.local.get(REPORTS_KEY);
    const reports = result[REPORTS_KEY] || [];
    const matches = reports.filter(r => r.addr.toLowerCase() === address.toLowerCase());
    return {
      flagged: matches.length > 0,
      reports: matches,
      score: Math.min(100, matches.length * 15 + matches.reduce((s,r) => s + (r.votes||0), 0) * 3)
    };
  } catch(e) {
    return { flagged: false, reports: [], score: 0 };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CHECK_ADDRESS') {
    checkAddress(msg.address).then(sendResponse);
    return true;
  }
  if (msg.type === 'SYNC_REPORTS') {
    chrome.storage.local.set({ [REPORTS_KEY]: msg.reports });
    sendResponse({ ok: true });
  }
});
