const fs = require('fs');
const dir = __dirname;

// ── Shared styles for marketing left panel + popup wrapper ──
const sharedCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 1280px; height: 800px; font-family: Inter, sans-serif; background: #0a0a0f; color: white; overflow: hidden; position: relative; }
  .glow { position: absolute; top: -100px; right: -50px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%); }
  .content { position: relative; z-index: 1; display: flex; align-items: center; height: 100%; padding: 56px 64px; gap: 56px; }
  .left { flex: 1; }
  .feature-num { font-size: 13px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 16px; }
  h1 { font-size: 46px; font-weight: 900; line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 18px; }
  .grad { background: linear-gradient(135deg, #7c3aed, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .sub { font-size: 18px; color: #9ca3af; line-height: 1.6; margin-bottom: 32px; max-width: 440px; }
  .bullets { display: flex; flex-direction: column; gap: 14px; }
  .bullet { display: flex; align-items: center; gap: 12px; font-size: 15px; color: #d1d5db; }
  .bullet-dot { width: 28px; height: 28px; border-radius: 8px; background: rgba(124,58,237,0.12); display: flex; align-items: center; justify-content: center; color: #a855f7; font-size: 13px; flex-shrink: 0; }
  .right { width: 440px; flex-shrink: 0; display: flex; justify-content: center; }
  .logo-bottom { position: absolute; bottom: 28px; left: 64px; display: flex; align-items: center; gap: 8px; z-index: 2; }
  .logo-bottom svg { width: 20px; height: 20px; }
  .logo-bottom span { font-size: 18px; font-weight: 700; background: linear-gradient(135deg, #7c3aed, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
`;

// ── Popup replica CSS (matches real extension/popup.html exactly) ──
const popupCSS = `
  .popup { width: 420px; background: #0f0f13; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1); font-size: 13px; }
  .p-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .p-logo { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 18px; letter-spacing: -0.5px; background: linear-gradient(135deg, #7c3aed, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .p-logo svg { width: 20px; height: 20px; -webkit-text-fill-color: initial; }
  .p-right { display: flex; align-items: center; gap: 8px; }
  .p-email { font-size: 10px; color: #52525b; }
  .p-logout { font-size: 10px; color: #52525b; }
  .detected { margin: 12px 16px; padding: 14px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
  .detected-row { display: flex; align-items: center; gap: 8px; }
  .detected-handle { font-size: 14px; color: #fff; font-weight: 700; }
  .platform-badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; color: #fff; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
  .platform-badge.tiktok { background: linear-gradient(135deg, #ff0050, #00f2ea); }
  .platform-badge.instagram { background: linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
  .competitor-tag { font-size: 9px; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: transparent; color: #2dd4bf; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid rgba(45,212,191,0.4); }
  .detected-caption { font-size: 12px; color: #9ca3af; line-height: 1.5; margin: 8px 0; }
  .stats-row { display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap; align-items: center; font-size: 13px; }
  .sn { font-weight: 700; color: #fff; }
  .sn.eng { color: #fbbf24; }
  .sl { font-size: 10px; color: #52525b; margin-left: 2px; }
  .hashtag-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .hashtag { font-size: 10px; color: #a78bfa; background: rgba(124,58,237,0.1); padding: 2px 6px; border-radius: 4px; }
  .actions { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 8px; }
  .btn { width: 100%; border-radius: 10px; font-size: 14px; font-weight: 700; font-family: Inter, sans-serif; border: none; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .save-row { display: flex; gap: 0; }
  .save-main-btn { flex: 1; border-radius: 10px 0 0 10px !important; }
  .btn-primary { height: 48px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; box-shadow: 0 4px 20px rgba(124,58,237,0.4); }
  .tag-dropdown-btn { padding: 0 12px; background: linear-gradient(135deg, #6d28d9, #9333ea); color: #fff; border: none; border-left: 1px solid rgba(255,255,255,0.2); border-radius: 0 10px 10px 0; font-size: 12px; display: flex; align-items: center; }
  .selected-tags-row { display: flex; flex-wrap: wrap; gap: 4px; padding: 2px 0; }
  .tag-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: rgba(124,58,237,0.15); color: #a78bfa; border: 1px solid rgba(124,58,237,0.25); }
  .btn-secondary-alt { height: 44px; background: linear-gradient(135deg, #4c1d95, #6d28d9); color: #fff; }
  .btn-secondary { height: 46px; background: #5b21b6; color: #fff; }
  .btn-outline { height: 44px; background: transparent; color: #a855f7; border: 1.5px solid rgba(168,85,247,0.5); }
  .btn-ghost { height: 44px; background: rgba(255,255,255,0.05); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.08); }

  /* Profile view */
  .profile-header { margin: 12px 16px 8px; padding: 10px 14px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; display: flex; align-items: center; gap: 8px; }
  .sort-box { margin: 8px 16px; padding: 12px 14px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
  .sort-controls { display: flex; align-items: center; gap: 8px; }
  .sort-label { font-size: 11px; color: #52525b; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; font-weight: 600; }
  .sort-controls select { width: auto; padding: 7px 12px; font-size: 12px; background: #16162a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fafafa; font-family: Inter, sans-serif; }
  .sort-controls .btn { width: auto; padding: 9px 20px; font-size: 13px; margin-left: auto; height: auto; }
  .sort-status { font-size: 11px; color: #52525b; font-style: italic; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; margin-top: 8px; }
  .sorted-list { max-height: 460px; overflow-y: auto; padding: 4px 16px 10px; }
  .sorted-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; margin-bottom: 8px; }
  .sorted-rank { font-size: 22px; font-weight: 700; background: linear-gradient(135deg, #7c3aed, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; min-width: 32px; text-align: center; }
  .sorted-thumb { width: 56px; height: 56px; border-radius: 8px; background: #27272a; flex-shrink: 0; }
  .sorted-metrics { flex: 1; min-width: 0; }
  .sorted-metric-row { display: flex; gap: 12px; font-size: 12px; color: #71717a; }
  .sorted-metric-row .val { font-weight: 700; color: #fff; }
  .sorted-metric-row .primary { background: linear-gradient(135deg, #7c3aed, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700; }
  .sorted-url { font-size: 10px; color: #3f3f46; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
  .sorted-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .sorted-actions button { padding: 5px 12px; font-size: 10px; font-weight: 600; border-radius: 6px; border: none; white-space: nowrap; }
  .btn-open { background: rgba(255,255,255,0.05); color: #71717a; border: 1px solid rgba(255,255,255,0.1); }
  .btn-goto { background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; }
  .sort-export { padding: 4px 16px 12px; }

  /* Bookmarks view */
  .bookmark-header { margin: 12px 16px 8px; padding: 10px 14px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; display: flex; align-items: center; gap: 8px; }
  .bookmark-title { font-size: 14px; font-weight: 700; color: #fff; }
  .bookmark-controls { display: flex; align-items: center; gap: 8px; padding: 6px 16px 4px; }
  .btn-bookmark-action { background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.3); color: #a78bfa; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; }
  .bookmark-count { font-size: 11px; color: #52525b; }
  .bookmark-limit-select { margin-left: auto; font-size: 11px; background: #18181b; color: #a1a1aa; border: 1px solid #3f3f46; border-radius: 6px; padding: 2px 6px; }
  .bookmark-list { max-height: 320px; overflow-y: auto; padding: 4px 16px; }
  .bookmark-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; margin-bottom: 2px; }
  .bookmark-item input[type="checkbox"] { width: 16px; height: 16px; flex-shrink: 0; accent-color: #7c3aed; }
  .bookmark-thumb { width: 40px; height: 40px; border-radius: 6px; background: rgba(255,255,255,0.06); flex-shrink: 0; }
  .bookmark-label { flex: 1; min-width: 0; font-size: 11px; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bookmark-views { font-size: 10px; font-weight: 700; color: #71717a; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; flex-shrink: 0; }
  .bookmark-footer { padding: 10px 16px 14px; border-top: 1px solid rgba(255,255,255,0.06); }
  .bookmark-hint { font-size: 10px; color: #3f3f46; text-align: center; font-style: italic; margin-top: 6px; }

  /* Analysis result */
  .analysis-result { margin: 8px 16px 12px; padding: 12px 14px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; }
  .analysis-title { font-size: 12px; font-weight: 600; color: #4ade80; margin-bottom: 8px; }
  .analysis-text { font-size: 11px; color: #71717a; line-height: 1.6; }
  .analysis-bullet { margin-bottom: 4px; }
  .analysis-bullet strong { color: #e4e4e7; }

  /* Create inspo panel */
  .create-inspo-panel { background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
  .create-inspo-input { width: 100%; padding: 8px 12px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fafafa; font-size: 12px; font-family: Inter, sans-serif; }
  .create-inspo-actions { display: flex; align-items: center; justify-content: space-between; }
  .btn-text { background: none; border: none; color: #a78bfa; font-size: 11px; font-weight: 600; }
  .ci-save-row { display: flex; gap: 0; }
  .ci-save-row .save-main-btn { padding: 6px 16px; font-size: 12px; font-weight: 600; border-radius: 8px 0 0 8px !important; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; border: none; }
  .ci-save-row .tag-dropdown-btn { padding: 6px 10px; font-size: 11px; border-radius: 0 8px 8px 0; }

  /* Ideas result */
  .ideas-result { padding: 12px 18px 16px; }
  .ideas-result h3 { font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #4ade80; }
  .idea-item { padding: 10px 12px; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; margin-bottom: 8px; }
  .idea-text { font-size: 12px; line-height: 1.5; }
  .idea-hook { font-size: 11px; color: #71717a; margin-top: 4px; font-style: italic; }
  .btn-link { background: none; border: none; color: #a78bfa; font-size: 12px; text-align: center; width: 100%; display: block; padding: 4px 0; text-decoration: underline; }
  .success-msg { font-size: 11px; color: #4ade80; text-align: center; padding: 2px 0; }
`;

const logoSvg = `<svg viewBox="0 0 64 64"><defs><linearGradient id="ls" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#ls)"/></svg>`;

const popupHeader = `<div class="p-header"><span class="p-logo">${logoSvg}Orianna</span><div class="p-right"><span class="p-email">you@email.com</span><span class="p-logout">Sign out</span></div></div>`;

const bottomLogo = `<div class="logo-bottom"><svg viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#c084fc"/><stop offset="100%" stop-color="#7c3aed"/></linearGradient></defs><path d="M32,4 C36,24 40,28 60,32 C40,36 36,40 32,60 C28,40 24,36 4,32 C24,28 28,24 32,4 Z" fill="url(#g)"/></svg><span>Orianna</span></div>`;

function wrap(extraCSS, leftHTML, popupHTML) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>${sharedCSS}${popupCSS}${extraCSS || ''}</style>
</head>
<body>
  <div class="glow"></div>
  <div class="content">
    <div class="left">${leftHTML}</div>
    <div class="right">
      <div class="popup">${popupHeader}${popupHTML}</div>
    </div>
  </div>
  ${bottomLogo}
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════
// SS1: Save as Inspiration (main video view)
// ══════════════════════════════════════════════════════════════════
const ss1 = wrap('', `
  <div class="feature-num">Feature 01</div>
  <h1>Save any video<br>as <span class="grad">inspiration</span></h1>
  <p class="sub">One click captures any TikTok or Instagram video with full metrics, engagement rate, hashtags, and audio info.</p>
  <div class="bullets">
    <div class="bullet"><div class="bullet-dot">\u2713</div> Full metrics captured automatically</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Tag and organize your saved inspo videos</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Engagement rate calculated instantly</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Works on TikTok &amp; Instagram</div>
  </div>
`, `
  <div class="detected">
    <div class="detected-row">
      <span class="platform-badge tiktok">TikTok</span>
      <span class="detected-handle">@fitnesscreator</span>
      <span class="competitor-tag">Tracked</span>
    </div>
    <div class="detected-caption">\u201C5 mistakes that are killing your gains and you don\u2019t even know it\u201D</div>
    <div class="stats-row">
      <div>\uD83D\uDC41 <span class="sn">2.4M</span><span class="sl"> views</span></div>
      <div>\u2764\uFE0F <span class="sn">340K</span><span class="sl"> likes</span></div>
      <div>\uD83D\uDCAC <span class="sn">8.2K</span><span class="sl"> comments</span></div>
      <div>\uD83D\uDCE4 <span class="sn">12.1K</span><span class="sl"> shares</span></div>
      <div>\u26A1 <span class="sn eng">14.2%</span><span class="sl"> eng</span></div>
    </div>
    <div class="hashtag-row">
      <span class="hashtag">#fitness</span>
      <span class="hashtag">#gym</span>
      <span class="hashtag">#gains</span>
      <span class="hashtag">#workout</span>
    </div>
  </div>
  <div class="actions">
    <div class="save-row">
      <button class="btn btn-primary save-main-btn">\uD83D\uDCBE Save as Inspiration</button>
      <button class="tag-dropdown-btn">\uD83C\uDFF7\uFE0F \u25BE</button>
    </div>
    <div class="selected-tags-row">
      <span class="tag-pill">fitness <span style="opacity:0.7">\u00D7</span></span>
      <span class="tag-pill">hooks <span style="opacity:0.7">\u00D7</span></span>
    </div>
    <button class="btn btn-secondary-alt">\u2728 Create from Inspo</button>
    <button class="btn btn-secondary">\uD83C\uDFAC Generate Video Idea</button>
    <button class="btn btn-outline">\uD83D\uDCA1 Why Did It Do Well?</button>
  </div>
`);

// ══════════════════════════════════════════════════════════════════
// SS2: Create from Inspo (expanded panel)
// ══════════════════════════════════════════════════════════════════
const ss2 = wrap('', `
  <div class="feature-num">Feature 02</div>
  <h1>Turn any post into<br><span class="grad">your own ideas</span></h1>
  <p class="sub">Write your own video ideas inspired by what you see, or let AI generate ideas for you. Save directly to your Ideas Board.</p>
  <div class="bullets">
    <div class="bullet"><div class="bullet-dot">\u2713</div> Write ideas linked to source post</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> AI generates ideas for your niche</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Tag and organize everything</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Save directly to your Ideas Board</div>
  </div>
`, `
  <div class="detected">
    <div class="detected-row">
      <span class="platform-badge instagram">Instagram</span>
      <span class="detected-handle">@foodiechef</span>
    </div>
    <div class="detected-caption">\u201CThe one ingredient that changed my cooking forever\u201D</div>
    <div class="stats-row">
      <div>\uD83D\uDC41 <span class="sn">1.8M</span><span class="sl"> views</span></div>
      <div>\u2764\uFE0F <span class="sn">245K</span><span class="sl"> likes</span></div>
      <div>\uD83D\uDCAC <span class="sn">3.1K</span><span class="sl"> comments</span></div>
      <div>\u26A1 <span class="sn eng">13.8%</span><span class="sl"> eng</span></div>
    </div>
  </div>
  <div class="actions">
    <div class="save-row">
      <button class="btn btn-primary save-main-btn">\uD83D\uDCBE Save as Inspiration</button>
      <button class="tag-dropdown-btn">\uD83C\uDFF7\uFE0F \u25BE</button>
    </div>
    <button class="btn btn-secondary-alt">\u2728 Create from Inspo</button>
    <div class="create-inspo-panel">
      <input class="create-inspo-input" value="5 cooking mistakes ruining your meal prep" />
      <input class="create-inspo-input" value="POV: you finally found a recipe that takes 10 min" />
      <div class="selected-tags-row">
        <span class="tag-pill">cooking <span style="opacity:0.7">\u00D7</span></span>
        <span class="tag-pill">listicle <span style="opacity:0.7">\u00D7</span></span>
      </div>
      <div class="create-inspo-actions">
        <span class="btn-text">+ Add another</span>
        <div class="ci-save-row">
          <button class="save-main-btn">Save</button>
          <button class="tag-dropdown-btn">\uD83C\uDFF7\uFE0F \u25BE</button>
        </div>
      </div>
    </div>
    <button class="btn btn-secondary">\uD83C\uDFAC Generate Video Idea</button>
    <button class="btn btn-outline">\uD83D\uDCA1 Why Did It Do Well?</button>
  </div>
`);

// ══════════════════════════════════════════════════════════════════
// SS3: Why Did It Do Well? (analysis result)
// ══════════════════════════════════════════════════════════════════
const ss3 = wrap('', `
  <div class="feature-num">Feature 03</div>
  <h1>Understand why<br>posts go <span class="grad">viral</span></h1>
  <p class="sub">Hit \u201CWhy Did It Do Well?\u201D on any post and Orianna\u2019s AI breaks down exactly what made it work.</p>
  <div class="bullets">
    <div class="bullet"><div class="bullet-dot">\u2713</div> AI-powered performance analysis</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Hook, format &amp; timing breakdown</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Engagement driver insights</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Learn what to replicate</div>
  </div>
`, `
  <div class="detected">
    <div class="detected-row">
      <span class="platform-badge tiktok">TikTok</span>
      <span class="detected-handle">@fitnesscreator</span>
      <span class="competitor-tag">Tracked</span>
    </div>
    <div class="detected-caption">\u201C5 mistakes that are killing your gains\u201D</div>
    <div class="stats-row">
      <div>\uD83D\uDC41 <span class="sn">2.4M</span><span class="sl"> views</span></div>
      <div>\u2764\uFE0F <span class="sn">340K</span><span class="sl"> likes</span></div>
      <div>\u26A1 <span class="sn eng">14.2%</span><span class="sl"> eng</span></div>
    </div>
  </div>
  <div class="analysis-result">
    <div class="analysis-title">Why it performed well</div>
    <div class="analysis-text">
      <div class="analysis-bullet"><strong>Hook:</strong> The \u201CX mistakes\u201D format creates instant curiosity. Viewers worry they\u2019re making these mistakes, so they watch to check.</div>
      <div class="analysis-bullet"><strong>Format:</strong> Numbered listicle keeps viewers watching for each point. Short cuts maintain pacing\u2014each mistake under 8 seconds.</div>
      <div class="analysis-bullet"><strong>Timing:</strong> Posted at peak fitness hours (6\u20138 AM). \u201CGym mistakes\u201D trends well in Jan/March.</div>
      <div class="analysis-bullet"><strong>Engagement:</strong> Controversial takes drive 8.2K comments\u2014strong debate boosts algorithmic reach.</div>
    </div>
  </div>
  <div class="actions">
    <button class="btn btn-outline">\uD83D\uDCA1 Why Did It Do Well?</button>
  </div>
`);

// ══════════════════════════════════════════════════════════════════
// SS4: Bulk Import (bookmarks view)
// ══════════════════════════════════════════════════════════════════
const ss4 = wrap('', `
  <div class="feature-num">Feature 04</div>
  <h1>Import all your<br><span class="grad">bookmarks</span><br>at once</h1>
  <p class="sub">Already saved posts on TikTok or Instagram? Orianna detects your bookmarks page and lets you import everything in one click.</p>
  <div class="bullets">
    <div class="bullet"><div class="bullet-dot">\u2713</div> Auto-detects bookmarks page</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Select all or pick specific posts</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Full metrics imported per post</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Limit to top 5, 10, 20, or all</div>
  </div>
`, `
  <div class="bookmark-header">
    <span class="platform-badge tiktok">TikTok</span>
    <span class="bookmark-title">Favorites</span>
  </div>
  <div class="bookmark-controls">
    <button class="btn-bookmark-action">Select all</button>
    <button class="btn-bookmark-action">Deselect all</button>
    <span class="bookmark-count">12 of 48 selected</span>
    <select class="bookmark-limit-select"><option>15</option></select>
  </div>
  <div class="bookmark-list">
    <label class="bookmark-item"><input type="checkbox" checked /><div class="bookmark-thumb"></div><span class="bookmark-label">@fitnesscreator \u2022 5 mistakes killing your gains</span><span class="bookmark-views">2.4M</span></label>
    <label class="bookmark-item"><input type="checkbox" checked /><div class="bookmark-thumb"></div><span class="bookmark-label">@gymking \u2022 POV: gym crush asks for your number</span><span class="bookmark-views">3.8M</span></label>
    <label class="bookmark-item"><input type="checkbox" checked /><div class="bookmark-thumb"></div><span class="bookmark-label">@mealprep101 \u2022 What I eat in a day to stay lean</span><span class="bookmark-views">1.2M</span></label>
    <label class="bookmark-item"><input type="checkbox" checked /><div class="bookmark-thumb"></div><span class="bookmark-label">@fitnesscreator \u2022 How I built my physique in 6 months</span><span class="bookmark-views">945K</span></label>
    <label class="bookmark-item"><input type="checkbox" checked /><div class="bookmark-thumb"></div><span class="bookmark-label">@yogawith_me \u2022 Morning stretch routine for beginners</span><span class="bookmark-views">670K</span></label>
    <label class="bookmark-item"><input type="checkbox" checked /><div class="bookmark-thumb"></div><span class="bookmark-label">@proteinchef \u2022 High protein meals under $5</span><span class="bookmark-views">1.9M</span></label>
    <label class="bookmark-item"><input type="checkbox" checked /><div class="bookmark-thumb"></div><span class="bookmark-label">@runnerlife \u2022 Couch to 5K in 30 days</span><span class="bookmark-views">890K</span></label>
  </div>
  <div class="bookmark-footer">
    <button class="btn btn-primary">Import 12 as Inspo</button>
    <div class="bookmark-hint">Scroll the page to load more, then reopen extension</div>
  </div>
`);

// ══════════════════════════════════════════════════════════════════
// SS5: Competitor Tracking (profile view with sorted posts)
// ══════════════════════════════════════════════════════════════════
const ss5 = wrap('', `
  <div class="feature-num">Feature 05</div>
  <h1>Track your<br><span class="grad">competitors</span></h1>
  <p class="sub">Visit any creator\u2019s profile and Orianna ranks their top posts by views, likes, or comments. Export as CSV.</p>
  <div class="bullets">
    <div class="bullet"><div class="bullet-dot">\u2713</div> Sort by views, likes, or comments</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Track as competitor in one click</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Open any video from the list</div>
    <div class="bullet"><div class="bullet-dot">\u2713</div> Export top posts as CSV</div>
  </div>
`, `
  <div class="profile-header">
    <span class="platform-badge tiktok">TikTok</span>
    <span class="detected-handle">@fitnesscreator</span>
    <span class="competitor-tag">Tracked</span>
    <span style="font-size:10px;color:#3f3f46;margin-left:auto">24 tracked</span>
  </div>
  <div class="sort-box">
    <div class="sort-controls">
      <span class="sort-label">Sort by</span>
      <select><option>Views</option></select>
      <span class="sort-label">Top</span>
      <select><option>25</option></select>
      <button class="btn btn-primary">Sort</button>
    </div>
    <div class="sort-status">Showing top 4 of 87 by views</div>
  </div>
  <div class="sorted-list">
    <div class="sorted-item">
      <span class="sorted-rank">1</span>
      <div class="sorted-thumb"></div>
      <div class="sorted-metrics">
        <div class="sorted-metric-row"><span class="primary">\uD83D\uDC41 4.2M</span><span class="val">\u2764\uFE0F 520K</span><span class="val">\uD83D\uDCAC 9.1K</span></div>
        <div class="sorted-url">/video/7234567890123</div>
      </div>
      <div class="sorted-actions"><button class="btn-open">Open</button><button class="btn-goto">Go to</button></div>
    </div>
    <div class="sorted-item">
      <span class="sorted-rank">2</span>
      <div class="sorted-thumb"></div>
      <div class="sorted-metrics">
        <div class="sorted-metric-row"><span class="primary">\uD83D\uDC41 3.8M</span><span class="val">\u2764\uFE0F 480K</span><span class="val">\uD83D\uDCAC 7.3K</span></div>
        <div class="sorted-url">/video/7234567890456</div>
      </div>
      <div class="sorted-actions"><button class="btn-open">Open</button><button class="btn-goto">Go to</button></div>
    </div>
    <div class="sorted-item">
      <span class="sorted-rank">3</span>
      <div class="sorted-thumb"></div>
      <div class="sorted-metrics">
        <div class="sorted-metric-row"><span class="primary">\uD83D\uDC41 3.1M</span><span class="val">\u2764\uFE0F 390K</span><span class="val">\uD83D\uDCAC 5.8K</span></div>
        <div class="sorted-url">/video/7234567890789</div>
      </div>
      <div class="sorted-actions"><button class="btn-open">Open</button><button class="btn-goto">Go to</button></div>
    </div>
    <div class="sorted-item">
      <span class="sorted-rank">4</span>
      <div class="sorted-thumb"></div>
      <div class="sorted-metrics">
        <div class="sorted-metric-row"><span class="primary">\uD83D\uDC41 2.7M</span><span class="val">\u2764\uFE0F 310K</span><span class="val">\uD83D\uDCAC 4.2K</span></div>
        <div class="sorted-url">/video/7234567891012</div>
      </div>
      <div class="sorted-actions"><button class="btn-open">Open</button><button class="btn-goto">Go to</button></div>
    </div>
  </div>
  <div class="sort-export">
    <button class="btn btn-outline" style="font-size:11px">Export CSV</button>
  </div>
`);

// Write all files
fs.writeFileSync(`${dir}/ss1-save-inspo-1280x800.html`, ss1);
fs.writeFileSync(`${dir}/ss2-ai-ideas-1280x800.html`, ss2);
fs.writeFileSync(`${dir}/ss3-analyze-1280x800.html`, ss3);
fs.writeFileSync(`${dir}/ss4-bulk-import-1280x800.html`, ss4);
fs.writeFileSync(`${dir}/ss5-competitors-1280x800.html`, ss5);

console.log('All 5 screenshots written successfully');
