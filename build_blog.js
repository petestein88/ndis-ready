/* Blog generator for NDIS Ready.
   Produces /blog.html (index) + /blog/<slug>.html for 8 posts.
   Reuses exact brand head/nav/footer from tools-suite.html. */

const fs = require('fs');
const path = require('path');

const OUT_DIR = __dirname;
const BLOG_DIR = path.join(OUT_DIR, 'blog');
if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });

/* ---------- shared brand fragments ---------- */
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300..700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />`;

const ROOT_VARS = `:root {
      --rose: #f4c5c5; --rose-deep: #e8a0a0; --lavender: #d8d0f0; --lavender-deep: #b8acdf;
      --sage: #c5ddd0; --sage-deep: #9ec4b0; --peach: #f7dfc8; --peach-deep: #efcba8;
      --cream: #faf8f4; --white: #ffffff; --ink: #2a2535; --ink-mid: #5a5370; --ink-soft: #9990b0;
      --green: #2f8a5a; --font-brand: 'Nunito', system-ui, sans-serif;
      --font-display: 'DM Serif Display', Georgia, serif;
      --font-body: 'DM Sans', system-ui, sans-serif;
      --radius: 18px; --radius-sm: 10px; --radius-pill: 999px;
    }`;

// nav — prefix controls relative pathing (root pages use "/", which works everywhere)
function nav() {
  return `<nav>
    <a href="/" class="nav-logo">
      <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="navSG" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0%" stop-color="#c4b5f4"/><stop offset="100%" stop-color="#b8acdf"/>
          </linearGradient>
          <filter id="navTex">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" result="noise"/>
            <feColorMatrix type="saturate" values="0" in="noise" result="gn"/>
            <feBlend in="SourceGraphic" in2="gn" mode="multiply" result="bl"/>
            <feComposite in="bl" in2="SourceGraphic" operator="in"/>
          </filter>
        </defs>
        <path d="M50 4 L90 18 L90 52 Q90 78 50 96 Q10 78 10 52 L10 18 Z" fill="url(#navSG)" filter="url(#navTex)"/>
        <path d="M50 4 L90 18 L90 52 Q90 78 50 96 Q10 78 10 52 L10 18 Z" fill="none" stroke="#9a88cc" stroke-width="3"/>
        <path d="M50 65 Q32 52 32 42 Q32 34 40 34 Q45 34 50 40 Q55 34 60 34 Q68 34 68 42 Q68 52 50 65 Z" fill="#e8a0a0" filter="url(#navTex)"/>
      </svg>
      NDIS Ready
    </a>
    <div class="nav-right">
      <a class="plain" href="/blog.html">Blog</a>
      <a class="plain" href="/tools.html">AI writer</a>
      <a class="plain" href="/health-check.html">Health check</a>
      <a class="plain" href="/audit-readiness.html">Audit check</a>
      <a class="nav-cta" href="/#pricing">View pricing &rarr;</a>
    </div>
  </nav>`;
}

function footer() {
  return `<footer>
    <div><a href="/">Home</a> · <a href="/blog.html">Blog</a> · <a href="/#pricing">Pricing</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms-of-service.html">Terms</a></div>
    <div style="margin-top:0.6rem;">© 2026 NDIS Ready · hello@ndis-ready.com.au</div>
  </footer>`;
}

/* ---------- shared CSS ---------- */
const BASE_CSS = `${ROOT_VARS}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: var(--font-body); background: var(--cream); color: var(--ink); line-height: 1.6; }
    a { color: inherit; }
    nav { display: flex; align-items: center; justify-content: space-between; padding: 1.1rem 2rem; max-width: 1200px; margin: 0 auto; }
    .nav-logo { font-family: var(--font-brand); font-size: 1.35rem; font-weight: 800; letter-spacing: -0.01em; color: var(--lavender-deep); text-decoration: none; display: flex; align-items: center; gap: 0.6rem; }
    nav .nav-right { display: flex; align-items: center; gap: 1.25rem; }
    nav .nav-right a.plain { font-size: 0.875rem; font-weight: 600; color: var(--ink-mid); text-decoration: none; }
    nav a.nav-cta { background: var(--ink); color: var(--white); font-size: 0.875rem; font-weight: 600; padding: 0.6rem 1.4rem; border-radius: var(--radius-pill); text-decoration: none; }
    nav a.nav-cta:hover { background: #3d3650; }
    @media (max-width: 820px) { nav .nav-right a.plain { display: none; } }
    footer { border-top: 1px solid #ece7df; padding: 2rem; text-align: center; color: var(--ink-soft); font-size: 0.85rem; margin-top: 3rem; }
    footer a { color: var(--ink-mid); text-decoration: none; margin: 0 0.5rem; }`;

/* ---------- post data ---------- */
// category -> accent var for the little pill/tag
const CAT_COLOR = {
  'Getting registered': 'lavender',
  'Audits': 'sage',
  'Money': 'peach',
  'Day to day': 'rose',
  'Staff': 'lavender',
};

const posts = [
  {
    slug: 'ndis-sil-registration-checklist',
    cat: 'Getting registered',
    title: 'The NDIS SIL registration checklist for 2026',
    dek: 'Every document you actually need to register as a Supported Independent Living provider — in plain English, with nothing missing.',
    read: '6 min read',
    date: 'June 2026',
    body: `
<p>If you've decided to register as a Supported Independent Living (SIL) provider, the first wall you hit is paperwork. The NDIS Commission doesn't hand you a tidy list — they point you at the <strong>NDIS Practice Standards</strong> and expect you to translate dozens of pages of "outcomes" into actual documents. Most new providers have no idea where to start, and the ones who guess usually guess wrong.</p>

<p>Here's the honest version of what you need.</p>

<h2>The core policies every SIL provider needs</h2>
<p>These aren't optional. An auditor will ask for each one by name:</p>
<ul>
  <li><strong>Incident management policy</strong> — how you record, report and respond when something goes wrong.</li>
  <li><strong>Complaints management policy</strong> — how a participant or family raises a concern, and what you do about it.</li>
  <li><strong>Risk management framework</strong> — how you spot and reduce risks to participants and staff.</li>
  <li><strong>Privacy and dignity policy</strong> — how you handle personal information and respect each person's choices.</li>
  <li><strong>Safeguarding and abuse/neglect prevention</strong> — your most-scrutinised area in SIL.</li>
  <li><strong>Medication management</strong> — if you support anyone with medication, this is non-negotiable.</li>
  <li><strong>Emergency and disaster management</strong> — including fire, evacuation and continuity of supports.</li>
</ul>

<h2>The registers and forms behind the policies</h2>
<p>Policies say what you'll do. Registers and forms prove you actually did it. You'll need an incident register, a complaints register, a risk register, a conflict-of-interest register, consent forms, service agreements, and progress note templates — among others. This is where most DIY providers fall short: they write a policy but have nothing to show it ever happened.</p>

<h2>The HR and worker documents</h2>
<p>The Commission also checks how you screen, induct and supervise staff: worker screening records, position descriptions, a code of conduct, induction checklists and supervision records. The day you hire your first support worker, these need to exist.</p>

<h2>How many documents is that, really?</h2>
<p>For a typical small SIL provider, it lands at <strong>around 65 core documents</strong> — and that's before you personalise a single one to your business. Writing them from scratch is weeks of work, and a generic template you found online won't carry your organisation's name, your ABN, or anything specific to how you operate.</p>

<div class="callout">
  <p><strong>Not sure which ones apply to you?</strong> Our free 2-minute quiz builds a personalised checklist based on the supports you offer — so you see exactly what <em>your</em> business needs, not a generic list.</p>
  <a class="cta-btn" href="/quiz.html">Take the free quiz &rarr;</a>
</div>

<p>You can absolutely assemble all of this yourself. But if you'd rather get the full pack — all 65 core documents, written to the Practice Standards and personalised to your organisation — that's exactly what we built NDIS Ready to do.</p>
`,
    cta: {
      title: 'See exactly which documents you need',
      text: 'The free quiz takes two minutes and gives you a personalised checklist plus three sample documents to download immediately.',
      btn: 'Start the free quiz',
      href: '/quiz.html',
    },
  },
  {
    slug: 'ndis-practice-standards-plain-english',
    cat: 'Audits',
    title: 'NDIS Practice Standards, explained in plain English',
    dek: 'The Practice Standards sound like legal jargon. Here is what they actually mean for a small provider — and what you have to show.',
    read: '5 min read',
    date: 'June 2026',
    body: `
<p>Open the NDIS Practice Standards and you'll find phrases like "each participant accesses supports that respect their culture, diversity, values and beliefs." True, important — and almost useless when you're trying to work out what to actually <em>do</em>. Let's translate.</p>

<h2>What the Practice Standards really are</h2>
<p>They're the benchmark your auditor measures you against. They're grouped into <strong>quality areas</strong>, and each one has "outcomes" you're expected to meet. You don't get marked on intentions — you get marked on evidence.</p>

<h2>The core module, in everyday language</h2>
<ul>
  <li><strong>Rights and responsibilities</strong> — Do you treat people with dignity, protect their privacy, and let them make their own choices? Show it with your privacy policy, consent forms and a clear code of conduct.</li>
  <li><strong>Governance and operational management</strong> — Is the business actually run properly? Show it with risk management, a continuity plan, defined roles and record-keeping.</li>
  <li><strong>Provision of supports</strong> — Are supports planned, delivered and reviewed with the participant? Show it with service agreements, support plans and progress notes.</li>
  <li><strong>Support provision environment</strong> — Is the place safe, clean and suitable? Show it with safety checks, incident records and emergency procedures.</li>
</ul>

<h2>The phrase that trips everyone up: "evidence"</h2>
<p>Auditors don't want to hear that you "always" do something. They want to <em>see</em> it — a signed agreement, a dated incident report, a completed induction checklist. A policy that says the right thing but has no records behind it is a fail waiting to happen.</p>

<div class="callout">
  <p><strong>Want to know where you stand right now?</strong> Our free Audit Readiness Self-Assessment scores you against each quality area and shows your biggest gaps — ranked, and mapped to the exact document that closes each one.</p>
  <a class="cta-btn" href="/audit-readiness.html">Check my readiness &rarr;</a>
</div>

<p>The Practice Standards aren't out to get you. They're a checklist of "can you prove it?" Once you see them that way, getting ready stops feeling like guesswork.</p>
`,
    cta: {
      title: 'Score yourself against the Practice Standards',
      text: 'The free self-assessment covers seven quality areas and shows your biggest gaps in under five minutes.',
      btn: 'Run the free assessment',
      href: '/audit-readiness.html',
    },
  },
  {
    slug: 'why-templates-dont-pass-audits',
    cat: 'Audits',
    title: 'Why templates alone won\u2019t pass your audit',
    dek: 'A folder full of policies feels like progress. But auditors check for evidence, not paperwork — here is the difference that matters.',
    read: '5 min read',
    date: 'June 2026',
    body: `
<p>You bought the template pack. You've got a binder with a policy for everything. So you're ready for your audit, right? Not quite — and this is the single most expensive misunderstanding in NDIS compliance.</p>

<h2>What a template actually is</h2>
<p>A template is a <em>promise</em>. Your incident management policy promises that when something goes wrong, you'll record it, report it and act on it. That promise is necessary — but on its own, it proves nothing.</p>

<h2>What an auditor is actually looking for</h2>
<p>Auditors check whether your promise is real. They'll ask: "Show me an incident you handled." "Show me a complaint and what you did." "Show me a participant's support plan and the progress notes against it." If your binder is full of pristine, blank templates, that's a red flag — it suggests the policy lives on paper and nowhere else.</p>

<blockquote>Evidence beats paperwork. Every time.</blockquote>

<h2>The three things that turn paperwork into evidence</h2>
<ul>
  <li><strong>Personalisation</strong> — A policy with your organisation's name, ABN and real processes beats a generic one with placeholder text still in it.</li>
  <li><strong>Records</strong> — Filled-in registers and forms that show the policy in action: dated, specific, real.</li>
  <li><strong>Consistency</strong> — Your day-to-day practice has to match what the document says. Auditors interview your staff to check.</li>
</ul>

<div class="callout">
  <p><strong>Worried your practice won't match your paperwork?</strong> Our free Mock Audit Interview Simulator asks the questions a real auditor asks on the day — so you find the gaps between what you wrote and what you actually do, before they do.</p>
  <a class="cta-btn" href="/mock-audit.html">Try the mock audit &rarr;</a>
</div>

<p>This is exactly why NDIS Ready personalises every document to your business and pairs it with tools that turn your work into the proof an auditor wants to see. Templates are the starting line — not the finish.</p>
`,
    cta: {
      title: 'Find the gap between paperwork and practice',
      text: 'The free mock audit puts you in the interview chair and shows where your real-world answers diverge from your documents.',
      btn: 'Start the mock audit',
      href: '/mock-audit.html',
    },
  },
  {
    slug: 'what-an-ndis-auditor-asks',
    cat: 'Audits',
    title: 'What an NDIS auditor actually asks you',
    dek: 'The audit is an interview, not a document review. Here are the questions that come up — and how to answer them with confidence.',
    read: '6 min read',
    date: 'June 2026',
    body: `
<p>Most first-time providers picture an audit as someone flipping through a folder. It's not. A big part of certification is the auditor <strong>talking to you and your staff</strong> — and that conversation is where unprepared providers come undone.</p>

<h2>The questions you should expect</h2>
<p>None of these are trick questions. But each one is checking that your practice is real, not just written down.</p>
<ul>
  <li><strong>"Walk me through what happens when there's an incident."</strong> They want a clear chain: notice it, make the person safe, record it, report it, review it.</li>
  <li><strong>"How would a participant make a complaint?"</strong> They want to hear that it's easy, safe, and that you act on it — and that participants actually know how.</li>
  <li><strong>"How do you protect a participant from abuse or neglect?"</strong> The most serious area in SIL. They want concrete safeguards, not good intentions.</li>
  <li><strong>"How do you make sure staff are suitable?"</strong> Worker screening, references, induction, supervision.</li>
  <li><strong>"How does a participant have a say in their supports?"</strong> Choice and control — shown through service agreements and reviews.</li>
  <li><strong>"What happens in an emergency?"</strong> A plan that staff actually know, not a document nobody has read.</li>
</ul>

<h2>The trap: confident words, missing evidence</h2>
<p>You can answer every question perfectly and still get a "needs improvement" if you can't <em>show</em> it. The strongest answers sound like: "Here's our policy, here's the register where we record it, and here's a real example from last month."</p>

<div class="callout">
  <p><strong>Practice before the real thing.</strong> Our free Mock Audit Interview Simulator runs you through twelve of the questions a real auditor asks — and shows you exactly where your answers need backup.</p>
  <a class="cta-btn" href="/mock-audit.html">Practise the interview &rarr;</a>
</div>

<p>Walk in having rehearsed these answers — with the documents and records to back them — and the audit stops being scary. It becomes a conversation you're ready for.</p>
`,
    cta: {
      title: 'Rehearse the audit interview',
      text: 'The free simulator asks the real questions and pinpoints where your answers need evidence behind them.',
      btn: 'Start the mock audit',
      href: '/mock-audit.html',
    },
  },
  {
    slug: 'is-your-ndis-business-making-money',
    cat: 'Money',
    title: 'Is your NDIS business actually making money?',
    dek: 'The hidden cost per support hour catches out almost every new provider. Here is how to check before it hurts.',
    read: '6 min read',
    date: 'June 2026',
    body: `
<p>The NDIS price guide says you can charge, say, around $70 an hour for standard weekday support. That sounds healthy — until you work out what an hour of support actually <em>costs</em> you to deliver. For a lot of new providers, the gap is uncomfortably thin, and some are quietly losing money on every shift.</p>

<h2>The cost you can see</h2>
<p>The obvious one is the worker's wage. Under the SCHADS award, a support worker's base rate is only the start — you also have to budget for penalty rates on evenings and weekends, casual loading, and overtime.</p>

<h2>The costs you forget</h2>
<p>This is where margins disappear:</p>
<ul>
  <li><strong>Superannuation</strong> — currently 12% on top of wages.</li>
  <li><strong>Leave</strong> — annual leave, sick leave and leave loading for permanent staff.</li>
  <li><strong>Workers' compensation insurance</strong> — a percentage of payroll.</li>
  <li><strong>Non-billable time</strong> — travel, training, supervision, admin. Nobody pays you for these, but you pay your worker.</li>
  <li><strong>Overheads</strong> — software, insurance, your own time running the business.</li>
</ul>

<p>Add those up and your "true cost per support hour" can be far higher than the wage alone — sometimes high enough that a weekend shift at penalty rates costs more than the NDIS will pay for it.</p>

<h2>Why this matters before you grow</h2>
<p>Scaling a service that loses money per hour just means losing money faster. The time to check the maths is <em>before</em> you take on more participants or hire more staff.</p>

<div class="callout">
  <p><strong>Run your numbers in under a minute.</strong> Our free Business Health Check calculates your true cost per support hour and your real margin against NDIS price limits — no signup, no backend, just the maths.</p>
  <a class="cta-btn" href="/health-check.html">Check my viability &rarr;</a>
</div>

<p>Knowing your real margin changes how you price, roster and grow. It's the difference between a business and an expensive hobby.</p>
`,
    cta: {
      title: 'Find your true cost per support hour',
      text: 'The free Business Health Check models wages, penalties, super and overheads against NDIS price limits in under a minute.',
      btn: 'Run the health check',
      href: '/health-check.html',
    },
  },
  {
    slug: 'how-to-write-a-progress-note',
    cat: 'Day to day',
    title: 'How to write a progress note that protects you',
    dek: 'Vague notes are an audit risk. Here is how to write a progress note that is objective, factual and stands up to scrutiny.',
    read: '5 min read',
    date: 'June 2026',
    body: `
<p>Progress notes feel like the most boring part of the job — a quick line at the end of a shift. But when an auditor or, worse, an investigator goes looking, your notes are the record of what actually happened. Good notes protect you and the participant. Sloppy ones do the opposite.</p>

<h2>The golden rule: objective, not opinion</h2>
<p>Write what you observed, not what you assumed. "Was aggressive" is an opinion. "Raised his voice and pushed his chair back from the table" is an observation. The first invites argument; the second is a fact nobody can dispute.</p>

<h2>What a strong note includes</h2>
<ul>
  <li><strong>Who, when, where</strong> — participant, date, time, location.</li>
  <li><strong>What you did</strong> — the support actually delivered against the plan.</li>
  <li><strong>What you observed</strong> — facts, in plain language, including the person's own words where relevant.</li>
  <li><strong>What you did about it</strong> — any action taken, follow-up or report made.</li>
</ul>

<h2>Words to avoid</h2>
<p>Steer clear of vague, judgmental or diagnostic language: "good day", "difficult", "manipulative", "non-compliant". They tell the reader nothing useful and can read as disrespectful. Stick to specifics.</p>

<blockquote>If it isn't written down, it didn't happen. If it's written badly, it can be used against you.</blockquote>

<div class="callout">
  <p><strong>Short on time at the end of a shift?</strong> Our AI Note &amp; Incident Writer takes your rough notes and returns a clean, objective, audit-ready progress note in seconds — in the factual language auditors expect. It's real AI, and you always review before use. Free to try.</p>
  <a class="cta-btn" href="/tools.html">Try the AI writer &rarr;</a>
</div>

<p>Good notes are a habit, and habits get easier with the right tools. Get them right and you've turned a chore into your best protection.</p>
`,
    cta: {
      title: 'Turn rough notes into audit-ready records',
      text: 'Paste your shift notes and the AI writer returns a clean, objective progress note in seconds. Free to try.',
      btn: 'Open the AI writer',
      href: '/tools.html',
    },
  },
  {
    slug: 'unregistered-sil-providers-2026-deadline',
    cat: 'Getting registered',
    title: 'What unregistered SIL providers must do now',
    dek: 'The rules around registration are tightening. If you deliver SIL without registration, here is what to get sorted — and fast.',
    read: '5 min read',
    date: 'June 2026',
    body: `
<p>For years, plenty of SIL supports were delivered by unregistered providers paid through plan-managed or self-managed participants. That world is changing. Government reviews have made clear that higher-risk supports like Supported Independent Living are heading toward <strong>mandatory registration</strong> — and the direction of travel is one way.</p>

<h2>Why this is coming</h2>
<p>SIL is high-stakes: vulnerable people, often in their own homes, frequently overnight. The reviews into NDIS safeguarding concluded that this kind of support needs the oversight that registration brings. Whether or not a specific date applies to you, the safe assumption for any serious SIL operator is: get registration-ready now.</p>

<h2>What "getting ready" actually means</h2>
<ul>
  <li><strong>Your document foundation</strong> — the full set of policies, procedures, registers and forms the Practice Standards require. This is the part that takes the longest, so start here.</li>
  <li><strong>Your evidence trail</strong> — start keeping real records now: incidents, complaints, supervision, consent. Auditors want history, not a folder created the week before.</li>
  <li><strong>Your worker screening</strong> — make sure everyone delivering supports has valid NDIS Worker Screening checks.</li>
  <li><strong>Your audit booking</strong> — certification audits take time to arrange. Leaving it late means scrambling.</li>
</ul>

<h2>The cost of waiting</h2>
<p>Providers who wait until registration is forced on them face a crunch: every approved auditor booked out, documents rushed, and the risk of losing participants who can only stay with a registered provider. Early movers get to do it calmly.</p>

<div class="callout">
  <p><strong>Start with clarity.</strong> Our free quiz tells you exactly which documents your SIL service needs and gives you three samples to download right away — so you can see the standard before you commit to anything.</p>
  <a class="cta-btn" href="/quiz.html">Take the free quiz &rarr;</a>
</div>

<p>Registration is no longer a "maybe later" for serious SIL providers. The ones who prepare now will glide through it. The ones who wait will pay for it.</p>
`,
    cta: {
      title: 'Get registration-ready before the rush',
      text: 'The free quiz maps out exactly which documents your SIL service needs and gives you three to download today.',
      btn: 'Start the free quiz',
      href: '/quiz.html',
    },
  },
  {
    slug: 'hiring-your-first-support-worker',
    cat: 'Staff',
    title: 'Hiring your first support worker: the paperwork',
    dek: 'SCHADS, contracts, rosters and screening. Here is what you legally need in place before your first worker starts a shift.',
    read: '6 min read',
    date: 'June 2026',
    body: `
<p>Going from "just me" to your first employee is a big step — and one that comes with real legal obligations. Get the paperwork right and you protect yourself, your worker and your participants. Get it wrong and you're exposed to underpayment claims, unfair dismissal risk and audit problems.</p>

<h2>Start with the right award: SCHADS</h2>
<p>Most disability support workers are covered by the <strong>Social, Community, Home Care and Disability Services (SCHADS) Award</strong>. It sets minimum pay rates, penalty rates for evenings and weekends, casual loading, overtime, broken-shift rules and minimum engagement periods. Paying "a fair hourly rate" you made up yourself is how providers accidentally underpay — and the penalties are steep.</p>

<h2>The documents you need before day one</h2>
<ul>
  <li><strong>An employment contract</strong> — permanent or casual, written to SCHADS, with the right classification and rate.</li>
  <li><strong>A position description</strong> — so the role and expectations are clear.</li>
  <li><strong>A code of conduct</strong> — aligned to the NDIS Code of Conduct.</li>
  <li><strong>Worker screening records</strong> — a valid NDIS Worker Screening Check, plus any other required checks.</li>
  <li><strong>An induction checklist</strong> — proof they were trained in your policies before they started.</li>
  <li><strong>A roster and timesheet system</strong> — that correctly applies SCHADS penalties and records hours.</li>
</ul>

<h2>Why this matters for your audit too</h2>
<p>Your staff documents aren't just an HR formality — auditors check them. "How do you make sure your workers are suitable and supported?" is a standard audit question, and your contracts, screening records and induction checklists are the answer.</p>

<div class="callout">
  <p><strong>Don't build these from scratch.</strong> Our HR &amp; Workforce Pack includes SCHADS-aware employment contracts, position descriptions, rosters, timesheets and induction checklists — personalised to your business. It comes bundled in our complete toolkit alongside your full document pack and every compliance tool.</p>
  <a class="cta-btn" href="/#pricing">See the complete toolkit &rarr;</a>
</div>

<p>Hiring well starts with the boring stuff done right. Get the paperwork sorted first and your first hire becomes an asset, not a liability.</p>
`,
    cta: {
      title: 'Hire your first worker the right way',
      text: 'The HR & Workforce Pack gives you SCHADS-aware contracts, rosters and induction checklists, bundled with the complete toolkit.',
      btn: 'See the complete toolkit',
      href: '/#pricing',
    },
  },
];

/* ---------- per-post CSS (article styling) ---------- */
const ARTICLE_CSS = `
    .article-wrap { max-width: 720px; margin: 0 auto; padding: 1.5rem 1.5rem 2rem; }
    .crumb { font-size: 0.82rem; color: var(--ink-soft); margin: 0.5rem 0 1.5rem; }
    .crumb a { color: var(--ink-mid); text-decoration: none; }
    .crumb a:hover { text-decoration: underline; }
    .post-cat { display: inline-block; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.28rem 0.7rem; border-radius: 999px; margin-bottom: 1rem; }
    .article-head h1 { font-family: var(--font-display); font-size: clamp(1.9rem, 4.5vw, 2.8rem); line-height: 1.14; margin-bottom: 0.8rem; }
    .article-head .dek { font-size: 1.1rem; color: var(--ink-mid); margin-bottom: 1rem; }
    .meta { font-size: 0.82rem; color: var(--ink-soft); border-bottom: 1px solid #ece7df; padding-bottom: 1.4rem; margin-bottom: 1.8rem; }
    .article-body { font-size: 1.05rem; color: var(--ink); }
    .article-body h2 { font-family: var(--font-display); font-size: 1.5rem; line-height: 1.2; margin: 1.9rem 0 0.7rem; }
    .article-body p { margin-bottom: 1.1rem; }
    .article-body ul { margin: 0 0 1.2rem 1.2rem; }
    .article-body li { margin-bottom: 0.55rem; }
    .article-body strong { color: var(--ink); }
    .article-body em { font-style: italic; }
    .article-body blockquote { font-family: var(--font-display); font-size: 1.35rem; line-height: 1.3; color: var(--lavender-deep); border-left: 3px solid var(--lavender-deep); padding: 0.3rem 0 0.3rem 1.2rem; margin: 1.6rem 0; font-style: italic; }
    .callout { background: #f3eefe; border: 1px solid var(--lavender); border-radius: var(--radius); padding: 1.4rem 1.5rem; margin: 1.8rem 0; }
    .callout p { font-size: 0.98rem; color: var(--ink-mid); margin-bottom: 1rem; }
    .callout p strong { color: var(--ink); }
    .callout .cta-btn { display: inline-block; background: var(--ink); color: #fff; font-weight: 700; font-size: 0.92rem; padding: 0.7rem 1.4rem; border-radius: var(--radius-pill); text-decoration: none; }
    .callout .cta-btn:hover { background: #3d3650; }
    .end-cta { background: var(--ink); color: #fff; border-radius: var(--radius); padding: 2rem 2.2rem; margin: 2.5rem 0 1rem; text-align: center; }
    .end-cta h3 { font-family: var(--font-display); font-size: 1.6rem; color: #fff; margin-bottom: 0.6rem; }
    .end-cta p { font-size: 0.98rem; opacity: 0.85; margin-bottom: 1.3rem; max-width: 480px; margin-left: auto; margin-right: auto; }
    .end-cta a { display: inline-block; background: #fff; color: var(--ink); font-weight: 700; padding: 0.8rem 1.8rem; border-radius: var(--radius-pill); text-decoration: none; }
    .more-link { text-align: center; margin-top: 1.5rem; }
    .more-link a { color: var(--ink-mid); font-weight: 600; text-decoration: none; font-size: 0.92rem; }
    .more-link a:hover { text-decoration: underline; }`;

function catPillStyle(cat) {
  const c = CAT_COLOR[cat] || 'lavender';
  // light bg + readable deep text
  const map = {
    lavender: 'background:#f3eefe;color:#5b4b86;',
    sage: 'background:#eef7f1;color:#275f41;',
    peach: 'background:#fdf4e3;color:#7a5616;',
    rose: 'background:#fdeef0;color:#9a4b54;',
  };
  return map[c] || map.lavender;
}

/* ---------- render a single post ---------- */
function renderPost(p) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${p.title} — NDIS Ready</title>
  <meta name="description" content="${p.dek.replace(/"/g, '&quot;')}" />
  <link rel="canonical" href="https://ndis-ready.com.au/blog/${p.slug}.html" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="NDIS Ready" />
  <meta property="og:url" content="https://ndis-ready.com.au/blog/${p.slug}.html" />
  <meta property="og:title" content="${p.title.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${p.dek.replace(/"/g, '&quot;')}" />
  <meta property="og:image" content="https://ndis-ready.com.au/og/${p.slug}.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${p.title.replace(/"/g, '&quot;')} — NDIS Ready" />
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${p.title.replace(/"/g, '&quot;')}" />
  <meta name="twitter:description" content="${p.dek.replace(/"/g, '&quot;')}" />
  <meta name="twitter:image" content="https://ndis-ready.com.au/og/${p.slug}.png" />
  ${FONTS}
  <style>
${BASE_CSS}
${ARTICLE_CSS}
  </style>
</head>
<body>
  ${nav()}

  <article class="article-wrap">
    <div class="crumb"><a href="/">Home</a> · <a href="/blog.html">Blog</a></div>
    <div class="article-head">
      <span class="post-cat" style="${catPillStyle(p.cat)}">${p.cat}</span>
      <h1>${p.title}</h1>
      <p class="dek">${p.dek}</p>
      <div class="meta">${p.date} · ${p.read}</div>
    </div>
    <div class="article-body">
${p.body.trim()}

      <div class="end-cta">
        <h3>${p.cta.title}</h3>
        <p>${p.cta.text}</p>
        <a href="${p.cta.href}">${p.cta.btn} &rarr;</a>
      </div>
      <div class="more-link"><a href="/blog.html">&larr; More from the NDIS Ready blog</a></div>
    </div>
  </article>

  ${footer()}
</body>
</html>
`;
}

/* ---------- render index ---------- */
const INDEX_CSS = `
    .wrap { max-width: 1080px; margin: 0 auto; padding: 1.5rem 1.5rem 4rem; }
    .page-head { text-align: center; max-width: 680px; margin: 1rem auto 2.5rem; }
    .eyebrow { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--lavender-deep); margin-bottom: 0.7rem; }
    .page-head h1 { font-family: var(--font-display); font-size: clamp(2.1rem, 4.5vw, 3.2rem); line-height: 1.12; margin-bottom: 0.9rem; }
    .page-head h1 em { font-style: italic; color: var(--lavender-deep); }
    .page-head p { color: var(--ink-mid); font-size: 1.05rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.1rem; }
    .card { background: var(--white); border: 1px solid #ece7df; border-radius: var(--radius); padding: 1.6rem; box-shadow: 0 6px 24px rgba(42,37,53,0.05); display: flex; flex-direction: column; transition: transform 0.15s, box-shadow 0.15s; text-decoration: none; color: inherit; }
    .card:hover { transform: translateY(-3px); box-shadow: 0 14px 34px rgba(42,37,53,0.1); }
    .card .post-cat { display: inline-block; align-self: flex-start; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 0.24rem 0.62rem; border-radius: 999px; margin-bottom: 0.9rem; }
    .card h2 { font-family: var(--font-display); font-size: 1.32rem; line-height: 1.22; margin-bottom: 0.55rem; }
    .card p { font-size: 0.92rem; color: var(--ink-mid); flex: 1; margin-bottom: 1rem; }
    .card .row { display: flex; align-items: center; justify-content: space-between; }
    .card .read { font-size: 0.78rem; color: var(--ink-soft); }
    .card .go { font-weight: 700; font-size: 0.9rem; color: var(--ink); display: inline-flex; align-items: center; gap: 0.35rem; }
    .card:hover .go { gap: 0.6rem; }
    .start-cta { text-align: center; margin-top: 2.8rem; }
    .start-cta a { display: inline-block; background: var(--ink); color: #fff; font-weight: 700; padding: 0.9rem 2rem; border-radius: var(--radius-pill); text-decoration: none; }`;

function renderIndex() {
  const cards = posts.map(p => `      <a class="card" href="/blog/${p.slug}.html">
        <span class="post-cat" style="${catPillStyle(p.cat)}">${p.cat}</span>
        <h2>${p.title}</h2>
        <p>${p.dek}</p>
        <div class="row">
          <span class="read">${p.read}</span>
          <span class="go">Read &rarr;</span>
        </div>
      </a>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The NDIS Ready Blog — plain-English compliance help for small providers</title>
  <meta name="description" content="Plain-English guides on NDIS registration, audits, money and staffing — written for small providers who'd rather get on with the work." />
  <link rel="canonical" href="https://ndis-ready.com.au/blog.html" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="NDIS Ready" />
  <meta property="og:url" content="https://ndis-ready.com.au/blog.html" />
  <meta property="og:title" content="The NDIS Ready Blog — NDIS compliance in plain English" />
  <meta property="og:description" content="Plain-English guides on NDIS registration, audits, money and staffing — written for the people actually doing the work." />
  <meta property="og:image" content="https://ndis-ready.com.au/og/blog.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="The NDIS Ready Blog — NDIS compliance in plain English" />
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="The NDIS Ready Blog — NDIS compliance in plain English" />
  <meta name="twitter:description" content="Plain-English guides on NDIS registration, audits, money and staffing." />
  <meta name="twitter:image" content="https://ndis-ready.com.au/og/blog.png" />
  ${FONTS}
  <style>
${BASE_CSS}
${INDEX_CSS}
  </style>
</head>
<body>
  ${nav()}

  <div class="wrap">
    <div class="page-head">
      <div class="eyebrow">The NDIS Ready Blog</div>
      <h1>NDIS compliance, in <em>plain English</em></h1>
      <p>No jargon, no fluff. Practical guides on getting registered, passing your audit, running the numbers and hiring your team — written for the people actually doing the work.</p>
    </div>

    <div class="grid">
${cards}
    </div>

    <div class="start-cta">
      <a href="/quiz.html">See which documents your business needs &rarr;</a>
    </div>
  </div>

  ${footer()}
</body>
</html>
`;
}

/* ---------- write files ---------- */
fs.writeFileSync(path.join(OUT_DIR, 'blog.html'), renderIndex());
posts.forEach(p => {
  fs.writeFileSync(path.join(BLOG_DIR, `${p.slug}.html`), renderPost(p));
});

console.log('Wrote blog.html + ' + posts.length + ' posts:');
posts.forEach(p => console.log('  /blog/' + p.slug + '.html'));
