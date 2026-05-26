// FraudWatch Content Script
// Watches for wallet addresses in input fields and warns if flagged

const ADDR_REGEX = /0x[a-fA-F0-9]{40}/g;
let warningShown = new Set();
let overlay = null;

function createOverlay(address, score, reports) {
  // Remove existing
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'fraudwatch-overlay';
  overlay.innerHTML = `
    <div id="fw-inner">
      <div id="fw-header">
        <span id="fw-icon">⚠</span>
        <span id="fw-title">FRAUDWATCH ALERT</span>
        <button id="fw-close">✕</button>
      </div>
      <div id="fw-body">
        <div id="fw-score-wrap">
          <div id="fw-score" style="color:${score>=70?'#ff3c5f':score>=40?'#ff8c00':'#00ff88'}">${score}</div>
          <div id="fw-score-label">/100 RISK SCORE</div>
        </div>
        <div id="fw-addr">${address.slice(0,8)}...${address.slice(-6)}</div>
        <div id="fw-verdict">${score>=70?'HIGH RISK — DO NOT SEND':'MODERATE RISK — PROCEED WITH CAUTION'}</div>
        ${reports.length ? `<div id="fw-reports-title">${reports.length} COMMUNITY REPORT${reports.length>1?'S':''}</div>` : ''}
        ${reports.map(r=>`<div class="fw-report">● [${r.cat}] ${r.ev ? r.ev.substring(0,60)+'...' : 'Suspicious activity reported'}</div>`).join('')}
        <div id="fw-actions">
          <button id="fw-block">🚫 Block Transaction</button>
          <button id="fw-ignore">Proceed Anyway</button>
        </div>
        <div id="fw-powered">⬡ FraudWatch · Arc Testnet Registry</div>
      </div>
    </div>
  `;

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    #fraudwatch-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.85);
      z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Space Mono', monospace, sans-serif;
      animation: fw-fade-in 0.2s ease;
    }
    @keyframes fw-fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    #fw-inner {
      background: #0d1117;
      border: 2px solid #ff3c5f;
      max-width: 420px; width: 90%;
      box-shadow: 0 0 40px rgba(255,60,95,0.4);
    }
    #fw-header {
      background: #ff3c5f;
      padding: 0.8rem 1rem;
      display: flex; align-items: center; gap: 0.5rem;
      color: #fff; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.1em;
    }
    #fw-icon { font-size: 1.2rem; }
    #fw-title { flex: 1; }
    #fw-close {
      background: transparent; border: none; color: #fff;
      font-size: 1rem; cursor: pointer; padding: 0 0.3rem;
    }
    #fw-body { padding: 1.2rem; }
    #fw-score-wrap { text-align: center; margin-bottom: 0.8rem; }
    #fw-score { font-size: 3rem; font-weight: 700; line-height: 1; }
    #fw-score-label { font-size: 0.65rem; color: #4a6080; letter-spacing: 0.15em; }
    #fw-addr { font-size: 0.8rem; color: #00e5ff; text-align: center; margin-bottom: 0.5rem; }
    #fw-verdict { text-align: center; font-size: 0.75rem; color: #ff3c5f; letter-spacing: 0.1em; margin-bottom: 1rem; font-weight: 700; }
    #fw-reports-title { font-size: 0.65rem; color: #4a6080; letter-spacing: 0.12em; margin-bottom: 0.4rem; }
    .fw-report { font-size: 0.7rem; color: #e2e8f0; margin-bottom: 0.3rem; padding: 0.3rem 0.5rem; background: #131920; border-left: 2px solid #ff3c5f; }
    #fw-actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    #fw-block { flex: 1; background: #ff3c5f; color: #fff; border: none; padding: 0.7rem; cursor: pointer; font-family: monospace; font-size: 0.75rem; font-weight: 700; }
    #fw-ignore { flex: 1; background: transparent; color: #4a6080; border: 1px solid #1e2a38; padding: 0.7rem; cursor: pointer; font-family: monospace; font-size: 0.75rem; }
    #fw-block:hover { background: #ff5577; }
    #fw-ignore:hover { border-color: #4a6080; color: #e2e8f0; }
    #fw-powered { text-align: center; font-size: 0.6rem; color: #1e2a38; margin-top: 0.8rem; letter-spacing: 0.1em; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  document.getElementById('fw-close').onclick = () => overlay.remove();
  document.getElementById('fw-ignore').onclick = () => overlay.remove();
  document.getElementById('fw-block').onclick = () => {
    overlay.remove();
    // Flash the input red
    const inputs = document.querySelectorAll('input');
    inputs.forEach(inp => {
      if (inp.value.toLowerCase() === address.toLowerCase()) {
        inp.style.border = '2px solid #ff3c5f';
        inp.style.background = 'rgba(255,60,95,0.1)';
        inp.value = '';
      }
    });
  };
}

function scanInputs() {
  const inputs = document.querySelectorAll('input[type="text"], input:not([type]), textarea');
  inputs.forEach(input => {
    input.addEventListener('blur', async () => {
      const val = input.value.trim();
      const match = val.match(/^0x[a-fA-F0-9]{40}$/);
      if (!match) return;
      const address = match[0];
      if (warningShown.has(address.toLowerCase())) return;

      const result = await chrome.runtime.sendMessage({
        type: 'CHECK_ADDRESS',
        address
      });

      if (result && result.flagged && result.score >= 30) {
        warningShown.add(address.toLowerCase());
        createOverlay(address, result.score, result.reports);
      }
    });
  });
}

// Run on page load
scanInputs();

// Re-run when DOM changes (for SPAs like MetaMask)
const observer = new MutationObserver(() => scanInputs());
observer.observe(document.body, { childList: true, subtree: true });

// Sync reports from FraudWatch site
if (window.location.hostname.includes('github.io')) {
  setTimeout(() => {
    try {
      const reports = JSON.parse(localStorage.getItem('fw_reports') || '[]');
      if (reports.length) {
        chrome.runtime.sendMessage({ type: 'SYNC_REPORTS', reports });
      }
    } catch(e) {}
  }, 2000);
}
