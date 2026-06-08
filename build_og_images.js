/* Generates branded 1200x630 Open Graph social cards for NDIS Ready.
   Renders each card as HTML via Playwright -> PNG into /og/.
   Run: node build_og_images.js  (server on :8099 not required; uses setContent) */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OG_DIR = path.join(__dirname, 'og');
if (!fs.existsSync(OG_DIR)) fs.mkdirSync(OG_DIR, { recursive: true });

const SHIELD = `<svg width="92" height="92" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c4b5f4"/><stop offset="100%" stop-color="#b8acdf"/>
    </linearGradient>
  </defs>
  <path d="M50 4 L90 18 L90 52 Q90 78 50 96 Q10 78 10 52 L10 18 Z" fill="url(#sg)"/>
  <path d="M50 4 L90 18 L90 52 Q90 78 50 96 Q10 78 10 52 L10 18 Z" fill="none" stroke="#9a88cc" stroke-width="3"/>
  <path d="M50 65 Q32 52 32 42 Q32 34 40 34 Q45 34 50 40 Q55 34 60 34 Q68 34 68 42 Q68 52 50 65 Z" fill="#e8a0a0"/>
</svg>`;

// category -> pill colors (match site)
const CAT_PILL = {
  'Getting registered': 'background:#f3eefe;color:#5b4b86;',
  'Audits': 'background:#eef7f1;color:#275f41;',
  'Money': 'background:#fdf4e3;color:#7a5616;',
  'Day to day': 'background:#fdeef0;color:#9a4b54;',
  'Staff': 'background:#f3eefe;color:#5b4b86;',
};

// cards: {file, kind:'post'|'home', cat, title, sub}
const cards = [
  { file: 'home.png', kind: 'home', eyebrow: 'NDIS Ready', title: 'Get \u2014 and stay \u2014 audit-ready', sub: 'Personalised compliance documents + live tools for NDIS providers' },
  { file: 'blog.png', kind: 'home', eyebrow: 'The NDIS Ready Blog', title: 'NDIS compliance, in plain English', sub: 'Practical guides for the people actually doing the work' },
  { file: 'ndis-sil-registration-checklist.png', kind: 'post', cat: 'Getting registered', title: 'The NDIS SIL registration checklist for 2026', sub: 'Every document you actually need \u2014 nothing missing.' },
  { file: 'ndis-ready-toolkit-explained.png', kind: 'post', cat: 'Day to day', title: 'The NDIS Ready toolkit, explained', sub: 'What every free tool does, and when to reach for it.' },
  { file: 'ndis-practice-standards-plain-english.png', kind: 'post', cat: 'Audits', title: 'NDIS Practice Standards, explained in plain English', sub: 'What the jargon actually means for a small provider.' },
  { file: 'why-templates-dont-pass-audits.png', kind: 'post', cat: 'Audits', title: 'Why templates alone won\u2019t pass your audit', sub: 'Auditors check for evidence, not paperwork.' },
  { file: 'what-an-ndis-auditor-asks.png', kind: 'post', cat: 'Audits', title: 'What an NDIS auditor actually asks you', sub: 'The audit is an interview \u2014 here are the questions.' },
  { file: 'is-your-ndis-business-making-money.png', kind: 'post', cat: 'Money', title: 'Is your NDIS business actually making money?', sub: 'The hidden cost per support hour, explained.' },
  { file: 'how-to-write-a-progress-note.png', kind: 'post', cat: 'Day to day', title: 'How to write a progress note that protects you', sub: 'Objective, factual, and audit-proof.' },
  { file: 'unregistered-sil-providers-2026-deadline.png', kind: 'post', cat: 'Getting registered', title: 'What unregistered SIL providers must do now', sub: 'Registration is tightening \u2014 get ready early.' },
  { file: 'hiring-your-first-support-worker.png', kind: 'post', cat: 'Staff', title: 'Hiring your first support worker: the paperwork', sub: 'SCHADS, contracts, rosters and screening.' },
];

function cardHTML(c) {
  const isHome = c.kind === 'home';
  const pill = isHome
    ? ''
    : `<div style="display:inline-block;font-family:'DM Sans',sans-serif;font-size:22px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;padding:9px 20px;border-radius:999px;${CAT_PILL[c.cat] || CAT_PILL['Audits']}">${c.cat}</div>`;
  const eyebrow = isHome
    ? `<div style="font-family:'DM Sans',sans-serif;font-size:22px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#b8acdf;">${c.eyebrow}</div>`
    : '';

  // accent ribbon down the left
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;600;700;800&family=Nunito:wght@800&display=swap" rel="stylesheet"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{width:1200px;height:630px;overflow:hidden;font-family:'DM Sans',sans-serif;}
    .card{position:relative;width:1200px;height:630px;background:#faf8f4;display:flex;flex-direction:column;justify-content:space-between;padding:70px 80px;}
    .ribbon{position:absolute;top:0;left:0;width:18px;height:100%;background:linear-gradient(180deg,#d8d0f0,#c5ddd0 50%,#f4c5c5);}
    .topbar{display:flex;align-items:center;gap:20px;}
    .brand{font-family:'Nunito',sans-serif;font-size:40px;font-weight:800;color:#b8acdf;letter-spacing:-0.01em;}
    .mid{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:26px;padding-right:30px;}
    h1{font-family:'DM Serif Display',Georgia,serif;color:#2a2535;line-height:1.08;}
    .sub{font-family:'DM Sans',sans-serif;font-size:30px;color:#5a5370;line-height:1.35;max-width:980px;}
    .foot{display:flex;align-items:center;justify-content:space-between;}
    .url{font-family:'DM Sans',sans-serif;font-size:26px;font-weight:700;color:#2a2535;}
    .tagline{font-family:'DM Sans',sans-serif;font-size:24px;color:#9990b0;}
  </style></head>
  <body>
    <div class="card">
      <div class="ribbon"></div>
      <div class="topbar">${SHIELD}<span class="brand">NDIS Ready</span></div>
      <div class="mid">
        ${eyebrow}${pill}
        <h1 style="font-size:${isHome ? '78px' : '64px'};">${c.title}</h1>
        <div class="sub">${c.sub}</div>
      </div>
      <div class="foot">
        <span class="url">ndis-ready.com.au</span>
        <span class="tagline">${isHome ? 'Compliance, sorted.' : 'Free quiz \u00b7 Personalised documents \u00b7 Live tools'}</span>
      </div>
    </div>
  </body></html>`;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const c of cards) {
    await page.setContent(cardHTML(c), { waitUntil: 'networkidle' });
    // give webfonts a beat
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OG_DIR, c.file), clip: { x: 0, y: 0, width: 1200, height: 630 } });
    console.log('wrote og/' + c.file);
  }
  await browser.close();
})();
