const CONTRACT = "0xDEB883F3fcd6691105c8E68f6AE9354f9E4a7Bc1";
const RPC = "https://rpc.testnet.arc.network";

function encodeAddress(addr) {
  return addr.toLowerCase().replace('0x','').padStart(64,'0');
}

function encodeUint256(n) {
  return n.toString(16).padStart(64,'0');
}

async function rpcCall(data) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'eth_call',
      params: [{ to: CONTRACT, data }, 'latest'],
      id: 1
    })
  });
  return (await res.json()).result;
}

async function getReportCount(address) {
  const sig = '0x9e22a893'; // getReportCount(address)
  const result = await rpcCall(sig + encodeAddress(address));
  return parseInt(result, 16);
}

async function getRiskScore(address) {
  const sig = '0xdc08706d'; // getRiskScore(address)
  const result = await rpcCall(sig + encodeAddress(address));
  return parseInt(result, 16);
}

async function getReport(address, index) {
  const sig = '0x'; // placeholder, we'll fetch count and score only for now
  return null;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CHECK_ADDRESS') {
    Promise.all([
      getRiskScore(msg.address),
      getReportCount(msg.address)
    ]).then(([score, count]) => {
      sendResponse({ score, reports: Array(count).fill({ votes: 0 }) });
    }).catch(err => {
      console.error(err);
      sendResponse({ score: 0, reports: [] });
    });
    return true;
  }
});

async function sendTx(privateKey, data) {
  // For submit we need MetaMask — signal popup to open app
  return { ok: false, error: 'Use the web app to submit reports' };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SUBMIT_REPORT') {
    sendResponse({ ok: false, error: 'Open FraudWatch app to submit reports' });
    return true;
  }
});
