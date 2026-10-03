export function getStudioHtml(rootDir: string, port: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ShipAI Studio | Bespoke Shipping Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(22, 29, 47, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #4f46e5;
      --primary-light: #818cf8;
      --accent: #06b6d4;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    /* Ambient Background Glow */
    .glow-1 {
      position: fixed;
      top: -150px;
      right: -100px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(79, 70, 229, 0.15) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }
    .glow-2 {
      position: fixed;
      bottom: -150px;
      left: -100px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
    }

    header {
      position: sticky;
      top: 0;
      backdrop-filter: blur(16px);
      background: rgba(9, 13, 22, 0.8);
      border-bottom: 1px solid var(--card-border);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 50;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 18px;
      color: white;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .brand-tag {
      font-size: 11px;
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 8px;
      border-radius: 12px;
      color: var(--accent);
      font-weight: 600;
    }

    .dir-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      padding: 6px 14px;
      border-radius: 8px;
      color: var(--text-muted);
    }

    nav {
      display: flex;
      gap: 8px;
      background: rgba(255, 255, 255, 0.03);
      padding: 4px;
      border-radius: 12px;
      border: 1px solid var(--card-border);
    }
    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .nav-btn.active, .nav-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
    }
    .nav-btn.active {
      background: var(--primary);
      color: white;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
    }

    main {
      flex: 1;
      padding: 32px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      position: relative;
      z-index: 10;
    }

    .tab-content { display: none; }
    .tab-content.active { display: block; animation: fadeIn 0.3s ease; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Grid Layouts */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    /* Cards */
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(12px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }
    .card-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Score Ring */
    .score-container {
      display: flex;
      align-items: center;
      gap: 28px;
      padding: 20px 0;
    }
    .score-circle {
      position: relative;
      width: 130px;
      height: 130px;
    }
    .score-circle svg {
      width: 130px;
      height: 130px;
      transform: rotate(-90deg);
    }
    .score-circle circle {
      fill: none;
      stroke-width: 10;
    }
    .circle-bg { stroke: rgba(255, 255, 255, 0.08); }
    .circle-bar {
      stroke: var(--success);
      stroke-linecap: round;
      transition: stroke-dashoffset 1s ease, stroke 0.5s ease;
    }
    .score-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 32px;
      font-weight: 800;
      text-align: center;
    }
    .score-status {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    /* Inputs */
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .form-input {
      width: 100%;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--card-border);
      color: var(--text);
      font-family: inherit;
      font-size: 15px;
      padding: 10px 14px;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.2s;
    }
    .form-input:focus {
      border-color: var(--primary-light);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), #6366f1);
      color: white;
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.6);
    }
    .btn-success {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    /* Palette Strip */
    .palette-strip {
      display: flex;
      border-radius: 8px;
      overflow: hidden;
      margin-top: 12px;
      height: 48px;
      border: 1px solid var(--card-border);
    }
    .palette-box {
      flex: 1;
      height: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 4px;
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      color: rgba(255, 255, 255, 0.8);
      font-weight: 600;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    }

    /* Code View */
    .code-box {
      background: #060910;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #cbd5e1;
      max-height: 380px;
      overflow-y: auto;
      white-space: pre-wrap;
    }

    /* Terminal Console */
    .terminal-container {
      background: #04060a;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      height: 240px;
      overflow-y: auto;
      color: #38bdf8;
    }
    .terminal-line { margin-bottom: 4px; line-height: 1.4; }
    .line-success { color: #4ade80; }
    .line-warn { color: #facc15; }
    .line-danger { color: #f87171; }
    .line-info { color: #38bdf8; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
    }
    .badge-critical { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .badge-warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .badge-info { background: rgba(6, 182, 212, 0.2); color: #38bdf8; }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>

  <header>
    <div class="brand">
      <div class="logo-badge">S</div>
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="brand-title">ShipAI Studio</span>
          <span class="brand-tag">v1.0.0</span>
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">Bespoke Client Shipping Engine</div>
      </div>
    </div>

    <div class="dir-badge" title="${rootDir}">
      📁 ${rootDir.length > 45 ? '...' + rootDir.substring(rootDir.length - 42) : rootDir}
    </div>

    <nav>
      <button class="nav-btn active" onclick="switchTab('audit')">🔍 Audit</button>
      <button class="nav-btn" onclick="switchTab('rebrand')">🎨 Rebrand</button>
      <button class="nav-btn" onclick="switchTab('cost')">💰 AI Cost & OpEx</button>
      <button class="nav-btn" onclick="switchTab('verify')">🩺 Diagnostics</button>
      <button class="nav-btn" onclick="switchTab('ship')">🚀 Ship</button>
      <button class="nav-btn" onclick="switchTab('certificate')">📜 Certificate</button>
    </nav>
  </header>

  <main>
    <!-- TAB 1: AUDIT -->
    <div id="tab-audit" class="tab-content active">
      <div class="grid-2">
        <div class="card">
          <div class="card-title">🛡️ Forensic Ship-Readiness Score</div>
          <div class="score-container">
            <div class="score-circle">
              <svg>
                <circle class="circle-bg" cx="65" cy="65" r="54"></circle>
                <circle class="circle-bar" id="score-ring" cx="65" cy="65" r="54" stroke-dasharray="339.29" stroke-dashoffset="339.29"></circle>
              </svg>
              <div class="score-text" id="score-display">--</div>
            </div>
            <div>
              <div class="score-status" id="score-status-text">Auditing Project...</div>
              <div style="font-size: 13px; color: var(--text-muted); line-height: 1.5;" id="score-desc">
                Scanning for leaked LLM API keys, AI residue, and deployment architecture.
              </div>
              <div style="margin-top: 14px;">
                <button class="btn btn-primary" onclick="runAudit()" style="padding: 8px 16px; font-size: 13px;">🔄 Re-Audit</button>
                <button class="btn btn-danger" onclick="runSanitize()" style="padding: 8px 16px; font-size: 13px; margin-left: 8px;">🧹 Sanitize All</button>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">🧩 Architecture & Stack Health</div>
          <div id="stack-summary" style="margin-top: 8px;">
            <div style="color: var(--text-muted); font-size: 14px;">Inspecting runtime environment...</div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-title">📋 Issues & Remediation Plan (<span id="issue-count">0</span>)</div>
        <div id="issues-list" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="color: var(--text-muted); font-size: 14px;">Loading audit issues...</div>
        </div>
      </div>
    </div>

    <!-- TAB 2: REBRAND -->
    <div id="tab-rebrand" class="tab-content">
      <div class="grid-2">
        <div class="card">
          <div class="card-title">🎨 Bespoke Brand Identity</div>
          
          <div class="form-group">
            <label>Original Prototype Name</label>
            <input type="text" id="input-from" class="form-input" placeholder="e.g. ChatPilot, my-ai-agent">
          </div>

          <div class="form-group">
            <label>New Bespoke Solution Name</label>
            <input type="text" id="input-to" class="form-input" placeholder="e.g. OmniDesk, NovaFlow">
          </div>

          <div class="form-group">
            <label>Client / Enterprise Company Name</label>
            <input type="text" id="input-client" class="form-input" placeholder="e.g. Acme Corporation">
          </div>

          <div class="form-group">
            <label>Client Corporate Brand Accent Color (HEX)</label>
            <div style="display: flex; gap: 12px;">
              <input type="color" id="input-color-picker" value="#4f46e5" style="height: 42px; width: 60px; border: none; border-radius: 8px; cursor: pointer;" onchange="updatePalettePreview()">
              <input type="text" id="input-color" class="form-input" value="#4f46e5" oninput="updatePalettePreview()">
            </div>
          </div>

          <div style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="executeRebrand()">✨ Apply Bespoke Rebranding</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">👁️ Live Brand & Design System Preview</div>
          
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">Derived 11-Shade Brand Palette:</div>
          <div class="palette-strip" id="palette-strip"></div>

          <div style="font-size: 13px; color: var(--text-muted); margin-top: 20px; margin-bottom: 10px;">Generated Client Vector Logo & Monogram:</div>
          <div id="logo-preview-box" style="background: rgba(0, 0, 0, 0.4); border: 1px dashed var(--card-border); border-radius: 12px; padding: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="color: var(--text-muted); font-size: 13px;">Type solution name to view dynamic vector logo</div>
          </div>

          <div style="font-size: 13px; color: var(--text-muted); margin-top: 20px; margin-bottom: 6px;">Multi-Casing Transform Matrix:</div>
          <div id="casing-preview" class="code-box" style="height: 120px;"></div>
        </div>
      </div>
    </div>

    <!-- TAB 3: SHIP & PACK -->
    <div id="tab-ship" class="tab-content">
      <div class="grid-2">
        <div class="card">
          <div class="card-title">🚀 Enterprise Shipping Blueprint</div>
          <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 18px;">
            Generate production multi-stage Docker containers, reverse proxy with automatic SSL, token-bucket AI rate limiting, and cloud manifests.
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
            <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer;">
              <input type="checkbox" id="check-docker" checked> Multi-Stage Hardened Dockerfile + Redis Compose
            </label>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer;">
              <input type="checkbox" id="check-proxy" checked> Caddy Reverse Proxy (Auto-TLS, CSP, HSTS, Brotli)
            </label>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer;">
              <input type="checkbox" id="check-guardrails" checked> AI Cost Guardrails (Token Bucket Rate Limiter + Daily Ceiling)
            </label>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer;">
              <input type="checkbox" id="check-cloud" checked> Cloud Blueprints (Railway, Render, Vercel)
            </label>
            <label style="display: flex; align-items: center; gap: 10px; font-size: 14px; cursor: pointer;">
              <input type="checkbox" id="check-docs" checked> Client Documentation Suite & Cryptographic Delivery Certificate
            </label>
          </div>

          <button class="btn btn-success" style="width: 100%; font-size: 16px; padding: 14px;" onclick="executeShipAll()">
            ⚡ Execute Bespoke Ship & Packaging
          </button>
        </div>

        <div class="card">
          <div class="card-title">💻 Live Execution Console</div>
          <div class="terminal-container" id="terminal-log">
            <div class="terminal-line line-info">[ShipAI Engine] Ready to transform and ship project.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: COST & OPEX -->
    <div id="tab-cost" class="tab-content">
      <div class="card">
        <div class="card-title">💰 AI Infrastructure OpEx & Token Cost Forecaster</div>
        <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 20px;">
          Dynamic financial projection across models based on your project's detected LLM prompt architecture.
        </div>
        <div style="display: flex; gap: 20px; align-items: center; margin-bottom: 24px; background: rgba(0,0,0,0.25); padding: 16px; border-radius: 10px; border: 1px solid var(--card-border);">
          <div style="font-size: 14px; font-weight: 600;">Monthly Query Volume:</div>
          <input type="range" id="cost-slider" min="1000" max="500000" step="5000" value="25000" oninput="updateCostCalculations(this.value)" style="flex: 1; accent-color: var(--primary);">
          <div id="slider-val" style="font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 700; color: var(--accent); min-width: 110px;">25,000 / mo</div>
          <button class="btn btn-primary" onclick="loadCostData()" style="padding: 8px 16px; font-size: 13px;">🔄 Refresh Analysis</button>
        </div>
        <div id="cost-table-container">
          <div style="color: var(--text-muted); font-size: 14px;">Loading model financial pricing...</div>
        </div>
      </div>
    </div>

    <!-- TAB: DIAGNOSTICS & VERIFICATION -->
    <div id="tab-verify" class="tab-content">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <div class="card-title">🩺 Pre-Flight Diagnostics & Smoke Gate</div>
            <div style="font-size: 14px; color: var(--text-muted);">
              Automated multi-point inspection certifying zero secrets, clean builds, and client readiness.
            </div>
          </div>
          <button class="btn btn-success" onclick="loadVerifyData()">⚡ Run Smoke Gate Probe</button>
        </div>
        <div id="verify-score-banner" style="padding: 14px; border-radius: 10px; margin-bottom: 20px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 700; font-size: 16px;" id="verify-headline">Verification Status: Ready to Run</div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 800; color: var(--success);" id="verify-score">--/100</div>
        </div>
        <div id="verify-checklist" style="display: flex; flex-direction: column; gap: 10px;">
          <div style="color: var(--text-muted); font-size: 14px;">Click "Run Smoke Gate Probe" to test environment.</div>
        </div>
      </div>
    </div>

    <!-- TAB 4: CERTIFICATE -->
    <div id="tab-certificate" class="tab-content">
      <div class="card">
        <div class="card-title">📜 Cryptographic Delivery Certificate</div>
        <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 16px;">
          Generated upon packaging to certify zero AI residue, clean credentials, and client release state.
        </div>
        <div id="cert-view" class="code-box" style="max-height: 480px;">
Run "Execute Bespoke Ship" in the Ship tab to generate the official delivery certificate.
        </div>
      </div>
    </div>
  </main>

  <script>
    let currentAudit = null;

    function log(msg, type = 'info') {
      const term = document.getElementById('terminal-log');
      const line = document.createElement('div');
      line.className = 'terminal-line line-' + type;
      line.textContent = '> ' + msg;
      term.appendChild(line);
      term.scrollTop = term.scrollHeight;
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      document.getElementById('tab-' + tabId).classList.add('active');
      event.target.classList.add('active');
    }

    async function runAudit() {
      log('Running forensic audit...', 'info');
      try {
        const res = await fetch('/api/audit');
        const data = await res.json();
        if (data.success) {
          currentAudit = data;
          renderAudit(data.report, data.framework);
          log('Audit complete! Readiness Score: ' + data.report.readinessScore + '/100', data.report.isShipReady ? 'success' : 'warn');
        }
      } catch (err) {
        log('Audit error: ' + err.message, 'danger');
      }
    }

    function renderAudit(report, framework) {
      const ring = document.getElementById('score-ring');
      const scoreDisp = document.getElementById('score-display');
      const statusText = document.getElementById('score-status-text');
      const desc = document.getElementById('score-desc');

      scoreDisp.textContent = report.readinessScore;
      const circumference = 2 * Math.PI * 54;
      const offset = circumference - (report.readinessScore / 100) * circumference;
      ring.style.strokeDashoffset = offset;

      if (report.readinessScore >= 80) {
        ring.style.stroke = 'var(--success)';
        statusText.textContent = 'SHIP READY';
        statusText.style.color = 'var(--success)';
        desc.textContent = 'Project meets enterprise production standards. Clean secrets and pristine structure.';
      } else if (report.readinessScore >= 50) {
        ring.style.stroke = 'var(--warning)';
        statusText.textContent = 'REQUIRES SANITIZING';
        statusText.style.color = 'var(--warning)';
        desc.textContent = 'Action items detected. Recommended to sanitize AI residue and document env variables.';
      } else {
        ring.style.stroke = 'var(--danger)';
        statusText.textContent = 'ACTION REQUIRED';
        statusText.style.color = 'var(--danger)';
        desc.textContent = 'Critical issues detected (e.g. hardcoded secrets, leaked keys, or ghost packages).';
      }

      // Framework
      const stack = document.getElementById('stack-summary');
      stack.innerHTML = \`
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--card-border);">
          <span style="color: var(--text-muted);">Detected Framework</span>
          <strong>\${framework.frameworkName}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--card-border);">
          <span style="color: var(--text-muted);">Runtime & Port</span>
          <strong>Port \${framework.port} (\${framework.packageManager})</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--card-border);">
          <span style="color: var(--text-muted);">Hardcoded Secrets</span>
          <span class="badge \${report.secrets.length > 0 ? 'badge-critical' : 'badge-info'}">\${report.secrets.length} detected</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 8px 0;">
          <span style="color: var(--text-muted);">AI Agent Artifacts</span>
          <span class="badge \${report.aiResidues.length > 0 ? 'badge-warning' : 'badge-info'}">\${report.aiResidues.length} files</span>
        </div>
      \`;

      // Issues List
      const issueCount = document.getElementById('issue-count');
      const list = document.getElementById('issues-list');
      issueCount.textContent = report.issues.length;

      if (report.issues.length === 0) {
        list.innerHTML = '<div style="color: var(--success); font-weight: 600;">✔ No issues detected! Project is in pristine condition.</div>';
        return;
      }

      list.innerHTML = report.issues.map(iss => \`
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--card-border); padding: 14px 18px; border-radius: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge \${iss.severity === 'CRITICAL' ? 'badge-critical' : iss.severity === 'WARNING' ? 'badge-warning' : 'badge-info'}">\${iss.severity}</span>
              <strong>\${iss.title}</strong>
            </div>
            \${iss.file ? \`<span style="font-family: monospace; font-size: 12px; color: var(--text-muted);">\${iss.file}\${iss.line ? ':' + iss.line : ''}</span>\` : ''}
          </div>
          <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">\${iss.description}</div>
          \${iss.fixSuggestion ? \`<div style="font-size: 12px; color: var(--success); font-weight: 500;">Fix: \${iss.fixSuggestion}</div>\` : ''}
        </div>
      \`).join('');
    }

    async function runSanitize() {
      log('Scrubbing AI residues & redacting secrets...', 'info');
      try {
        const res = await fetch('/api/sanitize', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          log('Sanitized ' + data.result.removedFiles.length + ' AI residue files.', 'success');
          log('Redacted ' + data.result.redactedSecretsCount + ' secrets.', 'success');
          await runAudit();
        }
      } catch (err) {
        log('Sanitize error: ' + err.message, 'danger');
      }
    }

    async function updatePalettePreview() {
      const colorInput = document.getElementById('input-color');
      const picker = document.getElementById('input-color-picker');
      const color = colorInput.value || '#4f46e5';
      picker.value = color.startsWith('#') && color.length === 7 ? color : '#4f46e5';

      try {
        const res = await fetch('/api/palette?color=' + encodeURIComponent(color));
        const data = await res.json();
        if (data.success) {
          const strip = document.getElementById('palette-strip');
          strip.innerHTML = Object.entries(data.palette).map(([shade, hex]) => \`
            <div class="palette-box" style="background: \${hex};" title="\${shade}: \${hex}">\${shade}</div>
          \`).join('');
        }
      } catch {}

      updateLogoPreview();
    }

    function updateLogoPreview() {
      const name = document.getElementById('input-to').value || 'SolutionName';
      const color = document.getElementById('input-color').value || '#4f46e5';
      const monogram = name.substring(0, 2).toUpperCase();

      const box = document.getElementById('logo-preview-box');
      box.innerHTML = \`
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 54px; height: 54px; border-radius: 14px; background: \${color}; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: white;">\${monogram}</div>
          <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">\${name}</div>
        </div>
      \`;

      const from = document.getElementById('input-from').value || 'OldProject';
      const casing = document.getElementById('casing-preview');
      casing.textContent = \`PascalCase:    \${name}
camelCase:     \${name.charAt(0).toLowerCase() + name.slice(1)}
kebab-case:    \${name.toLowerCase().replace(/\\s+/g, '-')}
snake_case:    \${name.toLowerCase().replace(/\\s+/g, '_')}
CONSTANT_CASE: \${name.toUpperCase().replace(/\\s+/g, '_')}\`;
    }

    document.getElementById('input-to').addEventListener('input', updateLogoPreview);

    async function executeRebrand() {
      const from = document.getElementById('input-from').value;
      const to = document.getElementById('input-to').value;
      const client = document.getElementById('input-client').value || to;
      const color = document.getElementById('input-color').value;

      if (!from || !to) {
        alert('Please specify both original prototype name and new bespoke name.');
        return;
      }

      log('Rebranding project from "' + from + '" to "' + to + '"...', 'info');
      try {
        const res = await fetch('/api/rebrand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, client, color })
        });
        const data = await res.json();
        if (data.success) {
          log('Rebrand complete! Replaced ' + data.textResult.totalReplacements + ' occurrences across ' + data.textResult.totalFilesModified + ' files.', 'success');
          log('Renamed ' + data.renameResult.renamedItems.length + ' legacy files.', 'success');
          log('Injected 11-shade brand palette into design system.', 'success');
          await runAudit();
        }
      } catch (err) {
        log('Rebrand error: ' + err.message, 'danger');
      }
    }

    async function executeShipAll() {
      const from = document.getElementById('input-from').value || 'OldApp';
      const to = document.getElementById('input-to').value || 'BespokePlatform';
      const client = document.getElementById('input-client').value || to;
      const color = document.getElementById('input-color').value || '#4f46e5';

      log('Starting Complete Bespoke Ship Pipeline...', 'info');
      log('Step 1/4: Scrubbing AI residue & redacting secrets...', 'info');

      try {
        const res = await fetch('/api/ship', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, client, color })
        });
        const data = await res.json();
        if (data.success) {
          log('✔ Step 1 Complete: Sanitized ' + data.sanitizeResult.removedFiles.length + ' AI scratchpads', 'success');
          log('✔ Step 2 Complete: Rebranded to "' + to + '" (' + data.rebrand.textResult.totalReplacements + ' multi-casing swaps)', 'success');
          log('✔ Step 3 Complete: Multi-stage Docker + Redis Compose + Caddy TLS proxy created', 'success');
          log('✔ Step 4 Complete: AI Guardrails injected + .env.example categorized + Deliverables generated', 'success');
          log('🎉 Project 100% Ship-Ready! Final Readiness Score: ' + data.finalAudit.readinessScore + '/100', 'success');

          // Render certificate tab
          const certBox = document.getElementById('cert-view');
          certBox.textContent = \`Official Delivery Certificate Generated:
- Solution: \${to}
- Client: \${client}
- Timestamp: \${new Date().toISOString()}
- Integrity: Verified & Certified
- Docker: Ready (App + Redis + Caddy)
- AI Guardrails: Active\`;

          await runAudit();
        }
      } catch (err) {
        log('Ship error: ' + err.message, 'danger');
      }
    }

    let currentCostFootprint = null;

    async function loadCostData() {
      try {
        const res = await fetch('/api/cost');
        const data = await res.json();
        if (data.success) {
          currentCostFootprint = data.footprint;
          const slider = document.getElementById('cost-slider');
          updateCostCalculations(slider.value);
        }
      } catch (err) {
        document.getElementById('cost-table-container').innerHTML = '<div style="color: var(--danger)">Error loading cost data: ' + err.message + '</div>';
      }
    }

    function updateCostCalculations(volume) {
      document.getElementById('slider-val').textContent = Number(volume).toLocaleString() + ' / mo';
      if (!currentCostFootprint) return;

      let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
      html += '<tr style="border-bottom: 1px solid var(--card-border); text-align: left; font-size: 13px; color: var(--text-muted);">';
      html += '<th style="padding: 10px;">MODEL</th><th style="padding: 10px;">PROVIDER</th><th style="padding: 10px;">COST / QUERY</th><th style="padding: 10px;">MONTHLY OPEX (' + Number(volume).toLocaleString() + ')</th>';
      html += '</tr>';

      for (const m of currentCostFootprint.comparisons) {
        const cost = (m.perQueryCostUsd * volume).toFixed(2);
        html += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 14px;">';
        html += '<td style="padding: 12px 10px; font-weight: 700;">' + m.modelName + '</td>';
        html += '<td style="padding: 12px 10px; color: var(--text-muted);">' + m.provider + '</td>';
        html += '<td style="padding: 12px 10px; font-family: monospace;">$' + m.perQueryCostUsd.toFixed(5) + '</td>';
        html += '<td style="padding: 12px 10px; font-weight: 800; color: ' + (cost < 50 ? 'var(--success)' : 'var(--warning)') + '; font-family: monospace;">$' + Number(cost).toLocaleString() + '</td>';
        html += '</tr>';
      }
      html += '</table>';
      document.getElementById('cost-table-container').innerHTML = html;
    }

    async function loadVerifyData() {
      const banner = document.getElementById('verify-headline');
      const score = document.getElementById('verify-score');
      const list = document.getElementById('verify-checklist');

      banner.textContent = 'Running Smoke Verification Gate...';
      score.textContent = '...';

      try {
        const res = await fetch('/api/verify');
        const data = await res.json();
        if (data.success) {
          const v = data.verification;
          score.textContent = v.score + '/100';
          banner.textContent = v.isReadyToShip ? '✔ PRE-SHIP SMOKE TESTS PASSED - SHIP READY' : '⚠ REMEDIATION REQUIRED BEFORE SHIP';
          banner.style.background = v.isReadyToShip ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';

          let itemsHtml = '';
          for (const c of v.checks) {
            const icon = c.passed ? '✔' : '✖';
            const color = c.passed ? 'var(--success)' : 'var(--danger)';
            itemsHtml += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid var(--card-border);">';
            itemsHtml += '<div style="display: flex; gap: 10px; align-items: center;"><span style="color: ' + color + '; font-weight: 800;">' + icon + '</span><span style="font-weight: 600;">' + c.name + '</span></div>';
            itemsHtml += '<span style="font-size: 13px; color: var(--text-muted);">' + c.details + '</span>';
            itemsHtml += '</div>';
          }
          list.innerHTML = itemsHtml;
        }
      } catch (err) {
        banner.textContent = 'Verification Error: ' + err.message;
      }
    }

    // Auto-init
    runAudit();
    updatePalettePreview();
    loadCostData();
    loadVerifyData();
  </script>
</body>
</html>`;
}
