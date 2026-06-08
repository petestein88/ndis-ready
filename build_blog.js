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
      <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="flex-shrink:0;">
        <defs><linearGradient id="navLogo_blog" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0%" stop-color="#cabdf6"/><stop offset="100%" stop-color="#a18fd6"/></linearGradient></defs>
        <path d="M50 5 L88 19 L88 51 Q88 77 50 95 Q12 77 12 51 L12 19 Z" fill="url(#navLogo_blog)"/>
        <path d="M50 5 L88 19 L88 51 Q88 77 50 95 Q12 77 12 51 L12 19 Z" fill="none" stroke="#8a76c2" stroke-width="3.5"/>
        <path d="M50 65 Q31 51 31 41 Q31 33 39.5 33 Q45 33 50 39.5 Q55 33 60.5 33 Q69 33 69 41 Q69 51 50 65 Z" fill="#ffffff" opacity="0.95"/>
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
    @media(min-width:641px){ nav { padding-right: 13rem; } }
    @media(max-width:640px){ nav { padding-right: 4.5rem; } }
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
    slug: 'ndis-ready-toolkit-explained',
    cat: 'Day to day',
    title: 'The NDIS Ready toolkit, explained: what every tool does and when to use it',
    dek: 'We built five free tools to take you from “am I even viable?” to “I’d pass an audit tomorrow.” Here is exactly what each one does, when to reach for it, and how they work together.',
    read: '9 min read',
    date: 'June 2026',
    body: `
<p>When you run a small NDIS provider business, the hardest part isn't the support work — it's everything around it. Are the numbers even going to stack up? Which documents do you actually need? Would your team survive an auditor's questions? Most providers answer these questions far too late, usually the week before an audit, when there's no time left to fix anything.</p>

<p>So we built a set of free tools to answer those questions <em>early</em> — while you can still do something about the answers. This post walks through every tool in the NDIS Ready toolkit: what it does, when to use it, and how they fit together. You can open the whole suite any time on the <a href="/tools-suite.html">tools page</a>.</p>

<h2>The short version</h2>
<p>There are five pieces. Four are free tools you can use right now, and one is the document pack that sits underneath everything. Here's the map:</p>
<ul>
  <li><strong>Business Health Check</strong> — confirms your service is financially viable before you commit.</li>
  <li><strong>Audit Readiness Self-Assessment</strong> — scores you against the Practice Standards and shows your document gaps.</li>
  <li><strong>Mock Audit Interview Simulator</strong> — tests whether your day-to-day practice would hold up when an auditor questions your team.</li>
  <li><strong>AI Note &amp; Incident Writer</strong> — turns rough shift notes into clean, audit-ready records, every day.</li>
  <li><strong>Your personalised document pack</strong> — the 65+ policies, registers and forms that close the gaps the tools find.</li>
</ul>
<p>Read on for when to reach for each one.</p>

<h2>1. Business Health Check — start here</h2>
<p>Before you spend a dollar or write a single policy, the first question to answer is brutally simple: <strong>does this business actually make money?</strong> A surprising number of providers discover — months in — that their cost per support hour quietly exceeds the NDIS price limit they're billing against. By then they've already hired staff and signed participants.</p>
<p>The Business Health Check fixes that. You plug in your real numbers — wages, on-costs, overheads, the supports you deliver — and in under a minute it shows your true cost per support hour and your actual margin against the relevant NDIS price limits. No spreadsheets, no accountant required for a first read.</p>
<p><strong>When to use it:</strong> right at the very start, before you register or take on participants — and again any time your costs change (a pay rise, a new award level, rising overheads). If the numbers don't work, that's the most valuable thing you can learn on day one rather than month six. It's free to run, and the full report comes with the document pack. You can read more about the thinking behind it in our piece on <a href="/blog/is-your-ndis-business-making-money.html">whether your NDIS business is actually making money</a>.</p>

<h2>2. Audit Readiness Self-Assessment — find your gaps</h2>
<p>Once you know the business is viable, the next question is: <strong>what's missing?</strong> The NDIS Practice Standards span seven quality areas, and most new providers genuinely don't know which documents they're short on — they just have a vague, anxious sense that they're not ready.</p>
<p>The Audit Readiness Self-Assessment turns that anxiety into a ranked list. You score yourself against the Practice Standards across all seven quality areas, and it shows your biggest gaps ordered by priority — with each gap mapped to the exact document that closes it. Instead of “I should probably sort out my compliance,” you get “I'm missing an incident register, a safeguarding policy and a medication management procedure, in that order.”</p>
<p><strong>When to use it:</strong> after the Health Check, before you book an audit, and then every few months as a check-up. It's the fastest way to see how far you are from audit-ready and exactly what to build next. The score is free; the full mapped report comes with the pack. If the Practice Standards still feel like jargon, our <a href="/blog/ndis-practice-standards-plain-english.html">plain-English guide to the Practice Standards</a> breaks them down.</p>

<h2>3. Mock Audit Interview Simulator — test your practice, not your binder</h2>
<p>Here's the trap that catches well-prepared providers: they assume an audit is about documents. It isn't. <strong>Auditors interview your team.</strong> They sit down with your support workers and ask what they'd actually do — and if the answers don't match your beautiful policies, that gap is exactly what gets written up.</p>
<p>The Mock Audit Interview Simulator rehearses that conversation. It asks the kind of questions a real auditor asks on the day — “What do you do if a participant has a fall?”, “How would you raise a complaint?”, “Where's the incident register?” — and shows you where your day-to-day practice diverges from your paperwork, before the real auditor finds it.</p>
<p><strong>When to use it:</strong> in the weeks before an audit, and as a training exercise for new staff. It's the single best way to surface the “we wrote the policy but nobody actually does it that way” problem while you still have time to fix it. To understand what's coming, read <a href="/blog/what-an-ndis-auditor-asks.html">what an NDIS auditor actually asks you</a>.</p>

<h2>4. AI Note &amp; Incident Writer — for every single day after</h2>
<p>The first three tools are about getting <em>ready</em>. This one is about <em>staying</em> ready. Progress notes and incident reports are where compliance is won or lost in the long run — an auditor can pull any note from any shift, and rushed, vague or subjective notes are a constant source of non-conformities.</p>
<p>The AI Note &amp; Incident Writer takes the rough notes your workers jot down at the end of a shift and returns a clean, objective NDIS progress note or incident report in seconds — in the plain, factual language auditors expect. This is real AI, used transparently and assistively: it drafts, but you always review and approve before anything is used. It doesn't invent facts; it tidies up what your worker recorded.</p>
<p><strong>When to use it:</strong> every day, on every shift, by every worker. It's the tool that keeps your evidence trail clean without adding hours of admin. It's free to try, and unlimited with the document pack. Our guide on <a href="/blog/how-to-write-a-progress-note.html">writing a progress note that protects you</a> explains exactly what “good” looks like.</p>

<blockquote>Tools test your readiness. Documents prove it. You need both.</blockquote>

<h2>5. Your personalised document pack — the foundation</h2>
<p>The four tools above will tell you, with uncomfortable precision, exactly what you're missing. The document pack is what fills those gaps. It's 65+ policies, procedures, registers and forms — every document the NDIS Commission expects, written to the Practice Standards and <strong>personalised to your organisation</strong>, not generic templates with a blank where your name should go. They arrive as submission-ready Word files that are yours to keep and edit.</p>
<p>This is the piece that turns “I know what I'm missing” into “I have it.” And it's worth being honest about why generic templates aren't enough on their own — we wrote a whole piece on <a href="/blog/why-templates-dont-pass-audits.html">why templates alone won't pass your audit</a>.</p>

<h2>How the toolkit works together</h2>
<p>Used in order, the pieces form a simple path from “should I even do this?” to “I'd pass an audit tomorrow”:</p>
<ul>
  <li><strong>Step 1 — Check the numbers.</strong> Run the Business Health Check to confirm your service is financially viable. No point building compliance for a business that loses money on every hour.</li>
  <li><strong>Step 2 — Find your gaps.</strong> Run the Audit Readiness Self-Assessment to see which documents you're missing, then the Mock Audit Interview to see where your day-to-day practice wouldn't hold up.</li>
  <li><strong>Step 3 — Close them.</strong> Your personalised document pack gives you every policy, register and form you need — and the AI Writer keeps your notes audit-ready from then on.</li>
</ul>
<p>Each tool is useful on its own, but together they cover the full lifecycle: viability, readiness, practice, and the daily evidence trail.</p>

<div class="callout">
  <p><strong>Want to see the whole suite in one place?</strong> The tools page lays out every tool with a one-line summary and a direct link to open each one. Most are free to try right now — no account, no card.</p>
  <a class="cta-btn" href="/tools-suite.html">Explore the full toolkit &rarr;</a>
</div>

<h2>Which tool should you open first?</h2>
<p>It depends on where you are:</p>
<ul>
  <li><strong>Thinking about starting a provider business?</strong> Open the Business Health Check first. Confirm it's viable before anything else.</li>
  <li><strong>Already running, getting ready to register or re-audit?</strong> Start with the Audit Readiness Self-Assessment, then the Mock Audit Interview.</li>
  <li><strong>Already registered and just want to stay clean?</strong> Put the AI Note &amp; Incident Writer in front of every worker, every shift.</li>
  <li><strong>Not sure what applies to you at all?</strong> Take the free 2-minute quiz — it builds a personalised checklist based on the supports you offer.</li>
</ul>
<p>Whatever stage you're at, the point is the same: find out where you stand <em>before</em> it costs you. The tools are free, they take minutes, and they're built specifically for small providers who'd rather get on with the work than wrestle with compliance jargon.</p>
`,
    cta: {
      title: 'Open the full toolkit',
      text: 'Every tool in one place — the Business Health Check, Audit Readiness, Mock Audit and AI Writer. Most are free to try right now.',
      btn: 'Explore the tools',
      href: '/tools-suite.html',
    },
  },
  {
    slug: 'ndis-sil-registration-checklist',
    cat: 'Getting registered',
    title: 'The NDIS SIL registration checklist for 2026',
    dek: 'Every document you actually need to register as a Supported Independent Living provider — in plain English, with nothing missing.',
    read: '10 min read',
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

<h2>What "good" looks like for each document type</h2>
<p>It's not enough to have the document — it needs to be fit for purpose. Here's what auditors expect to see in each category:</p>
<ul>
  <li><strong>Incident management policy</strong> — A clear step-by-step process (notice, record, report, review), defined timeframes for reporting to the NDIS Commission, and a template your staff can fill in at the time of the incident. Blank policies with no accompanying register are a red flag.</li>
  <li><strong>Complaints policy</strong> — The Easy Read version for participants, a log where every complaint is entered, and evidence that you followed up. Auditors will ask: "Show me a complaint you received. What did you do?"</li>
  <li><strong>Risk management</strong> — A living risk register (not a set-and-forget document) with ratings, controls and review dates. Each participant should also have an individual risk assessment tied to their support plan.</li>
  <li><strong>Safeguarding policy</strong> — For SIL, this is your most-scrutinised area. Auditors look for clear definitions of abuse, neglect and exploitation; mandatory reporting obligations; and evidence that all staff have been trained on it.</li>
  <li><strong>Medication management</strong> — A medication administration record (MAR) for each participant who takes medication, signed by the support worker on duty. Verbal instructions don't cut it.</li>
  <li><strong>Emergency plan</strong> — An evacuation diagram, a list of contacts, and a record showing your team completed a drill or walkthrough. The plan needs to be site-specific, not generic.</li>
</ul>

<h2>The registers and forms behind the policies</h2>
<p>Policies say what you'll do. Registers and forms prove you actually did it. You'll need an incident register, a complaints register, a risk register, a conflict-of-interest register, consent forms, service agreements, and progress note templates — among others. This is where most DIY providers fall short: they write a policy but have nothing to show it ever happened.</p>

<h2>The HR and worker documents</h2>
<p>The Commission also checks how you screen, induct and supervise staff: worker screening records, position descriptions, a code of conduct, induction checklists and supervision records. The day you hire your first support worker, these need to exist.</p>

<h2>Priority order: what to build first</h2>
<p>If you're starting from nothing, tackle the documents in this order — it mirrors roughly how an auditor works through the quality areas:</p>
<ul>
  <li><strong>Step 1 — Rights and governance foundation</strong> — Privacy policy, consent forms, code of conduct, and your conflict-of-interest register. These underpin everything else.</li>
  <li><strong>Step 2 — Safety and safeguarding</strong> — Incident policy and register, safeguarding policy, complaints policy and register. Auditors spend significant time here for SIL.</li>
  <li><strong>Step 3 — Participant-facing documents</strong> — Service agreements and support plans. Every participant in your service needs both, signed and dated.</li>
  <li><strong>Step 4 — Operational management</strong> — Risk register, emergency plan, medication management policy and medication administration records.</li>
  <li><strong>Step 5 — Workforce documents</strong> — Employment contracts, position descriptions, screening records, induction checklists and supervision records.</li>
  <li><strong>Step 6 — Continuous improvement</strong> — Your quality improvement register and evidence that you review your policies at least annually.</li>
</ul>

<blockquote>The document you're missing is never the one you'd guess. Build the full set from the start.</blockquote>

<h2>A realistic timeline</h2>
<p>Most small providers who build their document library from scratch — writing and personalising each document themselves — take several months before they feel ready to book an audit. The writing isn't the only time cost: you also need to embed the processes, train your team, and start building a real evidence trail. Auditors want to see that your system has actually been running, not set up last week.</p>
<p>Providers who use a ready-made, pre-written document pack can cut the writing phase dramatically — but still need the embedding and evidence-building time. Whatever path you choose, starting earlier is almost always better than waiting.</p>

<h2>How many documents is that, really?</h2>
<p>For a typical small SIL provider, it lands at <strong>around 65 core documents</strong> — and that's before you personalise a single one to your business. Writing them from scratch is weeks of work, and a generic template you found online won't carry your organisation's name, your ABN, or anything specific to how you operate.</p>

<div class="callout">
  <p><strong>Not sure which ones apply to you?</strong> Our free 2-minute quiz builds a personalised checklist based on the supports you offer — so you see exactly what <em>your</em> business needs, not a generic list.</p>
  <a class="cta-btn" href="/quiz.html">Take the free quiz &rarr;</a>
</div>

<h2>Common mistakes to avoid</h2>
<ul>
  <li><strong>Downloading a generic template and submitting it unchanged</strong> — Placeholder text, wrong organisation names, and policies that don't match your actual practice are audit red flags. Every document must be personalised.</li>
  <li><strong>Writing policies without the matching registers</strong> — A beautiful incident management policy means nothing without an incident register that shows real entries. Both pieces must exist.</li>
  <li><strong>Leaving NDIS Worker Screening too late</strong> — Screening checks take time to process. Apply well before you need your workers on the floor.</li>
  <li><strong>Using the same support plan for every participant</strong> — Each person's plan must reflect their individual goals, preferences and risks. A photocopy with the name changed is not a personalised plan.</li>
  <li><strong>Forgetting to review documents annually</strong> — Outdated policies can count against you. Your quality improvement process should include scheduled reviews with dates recorded.</li>
</ul>

<h2>Participant-facing documents you might overlook</h2>
<p>Most checklists focus on policies and registers. But there's a whole category of participant-facing documents that are just as important — and easier to forget. These include:</p>
<ul>
  <li><strong>An Easy Read complaints brochure</strong> — The standard complaints policy isn't accessible to every participant. An Easy Read version (simple language, pictures or icons) demonstrates that you've actually made complaints accessible, not just written a policy about it.</li>
  <li><strong>A participant handbook</strong> — A plain-English guide to your service: who you are, how you work, what participants can expect, and how they can raise concerns. Auditors look for this as evidence that participants genuinely know their rights.</li>
  <li><strong>Exit and transition plans</strong> — If a participant leaves your service, they should have a plan for what happens next. This is especially important in SIL, where housing and support are interlinked.</li>
  <li><strong>Feedback forms</strong> — A mechanism for participants to provide feedback (positive or negative) beyond the formal complaints process. Simple surveys, regular check-ins recorded, or a suggestion box. The form itself is less important than the habit of asking.</li>
</ul>

<h2>The certification audit process, step by step</h2>
<p>Understanding how the audit actually works helps you prepare more calmly. Here is the typical sequence for a SIL certification audit:</p>
<ul>
  <li><strong>Application to the NDIS Commission</strong> — You apply through the Commission's portal and select your registration groups (in this case, SIL). The Commission will confirm the scope of your registration and refer you to the audit process.</li>
  <li><strong>Choosing an approved quality auditor</strong> — You select an auditor from the Commission's list of approved quality auditors. You arrange and pay for the audit yourself. Shop around — prices and availability vary.</li>
  <li><strong>Document review (desktop audit)</strong> — The auditor reviews your policies and documents before visiting. Gaps identified here can often be addressed before the on-site visit.</li>
  <li><strong>On-site audit</strong> — The auditor visits your service, interviews you and your staff, and may speak with participants (with consent). This is where the "does it actually work?" question gets answered.</li>
  <li><strong>Audit report</strong> — The auditor produces a report with findings: which outcomes are met, and which have non-conformities. Major non-conformities need to be resolved before registration is granted.</li>
  <li><strong>Commission decision</strong> — Once any non-conformities are addressed and the auditor confirms this, the Commission makes the registration decision.</li>
</ul>

<h2>What to do in the first week after registration</h2>
<p>Getting your registration certificate is a milestone worth celebrating. But the week after is also when smart providers lock in the habits that will keep them registered. Here's what to do immediately:</p>
<ul>
  <li><strong>Update your marketing and service agreement templates</strong> — You can now describe yourself as a registered NDIS provider. Update your website, your intake forms, and any promotional material accordingly.</li>
  <li><strong>Notify your current participants</strong> — Share the good news. For plan-managed and self-managed participants, it may open up new options. For participants seeking an agency-managed arrangement, it means you can now support them.</li>
  <li><strong>Set a calendar reminder for your mid-term review</strong> — Mark the approximate date of your mid-term review in your calendar now. You don't want to be caught off-guard.</li>
  <li><strong>Review any non-conformities from your audit</strong> — If you had minor non-conformities that were noted but didn't block registration, address them now. Don't let them sit.</li>
  <li><strong>Keep using your registers and systems</strong> — The single biggest mistake after registration is relaxing and letting the evidence trail lapse. Your next audit is already counting down.</li>
</ul>

<h2>Keeping your registration once you have it</h2>
<p>Registration isn't a one-time achievement — it needs to be maintained. Registered providers are subject to mid-term reviews and renewal audits on a regular cycle. You also have ongoing obligations: reporting notifiable incidents to the Commission, renewing worker screening checks before they expire, and keeping your documents current. The organisations that find this easiest are the ones who treat compliance as part of how they run the business every day, not as something that only matters when an audit is coming.</p>

<p>The providers who thrive long-term are the ones who build their compliance habits into the business from day one — not the ones who scramble every three years when the renewal audit looms. Start as you mean to go on, and registration stops being a burden and becomes a badge of confidence in the quality of your service.</p>

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
    read: '10 min read',
    date: 'June 2026',
    body: `
<p>Open the NDIS Practice Standards and you'll find phrases like "each participant accesses supports that respect their culture, diversity, values and beliefs." True, important — and almost useless when you're trying to work out what to actually <em>do</em>. Let's translate.</p>

<h2>What the Practice Standards really are</h2>
<p>They're the benchmark your auditor measures you against. They're grouped into <strong>quality areas</strong>, and each one has "outcomes" you're expected to meet. You don't get marked on intentions — you get marked on evidence.</p>

<h2>Verification vs certification: which audit do you need?</h2>
<p>Before you do anything else, it helps to know which type of audit applies to you. There are two pathways:</p>
<ul>
  <li><strong>Verification</strong> — A lighter-touch, mostly document-based review. Generally applies to lower-risk supports where you're not working intensively or intimately with participants. A desk review rather than a site visit.</li>
  <li><strong>Certification</strong> — A more thorough process that includes on-site visits, staff interviews and participant interviews. Required for higher-risk supports including SIL. This is the one that most small SIL providers are heading toward.</li>
</ul>
<p>If you're delivering SIL, it's almost certainly certification. That means the auditor will visit your service, talk to your staff and — with consent — talk to participants. A folder of clean documents is necessary but not sufficient.</p>

<h2>The core module, in everyday language</h2>
<ul>
  <li><strong>Rights and responsibilities</strong> — Do you treat people with dignity, protect their privacy, and let them make their own choices? Show it with your privacy policy, consent forms and a clear code of conduct.</li>
  <li><strong>Governance and operational management</strong> — Is the business actually run properly? Show it with risk management, a continuity plan, defined roles and record-keeping.</li>
  <li><strong>Provision of supports</strong> — Are supports planned, delivered and reviewed with the participant? Show it with service agreements, support plans and progress notes.</li>
  <li><strong>Support provision environment</strong> — Is the place safe, clean and suitable? Show it with safety checks, incident records and emergency procedures.</li>
</ul>

<h2>"They say X, you show Y" — more worked translations</h2>
<p>Here are some of the most commonly misunderstood outcomes, and what they mean in practice:</p>
<ul>
  <li><strong>"Participants are supported to exercise choice and control"</strong> — This means each person's service agreement is individually negotiated, not a take-it-or-leave-it form. Show: a signed service agreement with the participant's goals in their own words, and notes from any review meetings.</li>
  <li><strong>"The provider has a complaints management system that participants can access"</strong> — This means participants know how to complain — not just that a complaints policy exists. Show: an Easy Read complaints brochure given to each participant, a signed acknowledgement, and at least one entry in your complaints register (even if it was a minor issue).</li>
  <li><strong>"The provider identifies and manages risks"</strong> — This means a live risk register that is actually reviewed, not a document you wrote once and filed. Show: a risk register with dates, updated risk ratings, and actions taken. Individual participant risk assessments are also expected.</li>
  <li><strong>"The provider delivers supports in a manner consistent with relevant laws"</strong> — This is about worker screening, privacy, mandatory reporting and employment law. Show: current NDIS Worker Screening clearances for everyone delivering supports, and evidence of mandatory reporter training.</li>
  <li><strong>"Workers are trained and supported"</strong> — This isn't just about qualifications. It's about ongoing supervision and professional development. Show: supervision records with dates and topics, and a training register for each worker.</li>
</ul>

<h2>Supplementary modules: when do they apply?</h2>
<p>Beyond the core module, some providers need to meet additional supplementary modules depending on the supports they deliver. For small SIL providers, the most relevant ones are:</p>
<ul>
  <li><strong>High-intensity daily activities</strong> — If your workers provide complex bowel care, enteral feeding, tracheostomy management or other clinical tasks, there are additional requirements around staff competencies and clinical governance. This is a significant extra layer and is worth being honest about upfront when you apply.</li>
  <li><strong>Specialist behaviour support</strong> — If any participant has a behaviour support plan involving regulated restrictive practices, additional requirements apply. Even if you're not the behaviour support provider, you may need policies around implementing and monitoring the plan.</li>
</ul>
<p>If none of those apply to your service, the core module and the SIL-specific outcomes are your focus. Don't over-complicate it — know your scope and build evidence for that scope.</p>

<h2>How an audit is actually scored</h2>
<p>Auditors don't just mark you pass or fail on the whole thing. Each outcome gets a finding: either "met" or "not met." If something is not met, you'll typically receive a non-conformity — either a major or minor one. Major non-conformities (usually things that put participants at risk) need to be resolved before certification is granted. Minor ones may have a timeframe to correct. The goal isn't perfection; it's demonstrating that your systems are real, working and proportionate to your service.</p>

<h2>The phrase that trips everyone up: "evidence"</h2>
<p>Auditors don't want to hear that you "always" do something. They want to <em>see</em> it — a signed agreement, a dated incident report, a completed induction checklist. A policy that says the right thing but has no records behind it is a fail waiting to happen.</p>

<div class="callout">
  <p><strong>Want to know where you stand right now?</strong> Our free Audit Readiness Self-Assessment scores you against each quality area and shows your biggest gaps — ranked, and mapped to the exact document that closes each one.</p>
  <a class="cta-btn" href="/audit-readiness.html">Check my readiness &rarr;</a>
</div>

<h2>A simple test you can run today</h2>
<p>Pick any quality area from the list above. Now ask yourself: if an auditor walked in tomorrow and asked to see evidence for that area, what would you hand them? A document with the right words in it is a start. A document <em>plus</em> a completed register or signed form showing it happened is what you need. If you have the document but not the evidence, that's your next priority.</p>

<h2>Building your quality management system over time</h2>
<p>The Practice Standards aren't just an audit checklist — they're the framework for running a genuinely good service. Providers who understand them this way tend to find audits much less stressful, because they're already doing what the Standards require as a matter of routine.</p>
<p>A quality management system doesn't need to be complicated. For a small provider, it can be as simple as:</p>
<ul>
  <li><strong>A policy folder</strong> — Physical or digital. All your policies and procedures in one place, clearly named, with version dates.</li>
  <li><strong>A set of registers</strong> — Incident, complaints, risk, conflict of interest, quality improvement. Used regularly, not just when an audit looms.</li>
  <li><strong>A training register</strong> — A record of every training session, including dates, topics and who attended.</li>
  <li><strong>A supervision log</strong> — A record of regular one-on-one supervision with each worker, including key discussion points and any actions agreed.</li>
  <li><strong>An annual review calendar</strong> — A schedule for reviewing each policy at least once a year and recording that the review happened.</li>
</ul>
<p>None of this is exotic. It's the kind of system that naturally grows as your business grows, as long as you build the habits early.</p>

<h2>Getting help when you're stuck</h2>
<p>The Practice Standards can still feel overwhelming, even after reading a plain-English guide like this. If you're stuck on a specific quality area or unsure whether your evidence is strong enough, there are options. The NDIS Commission's own website has guidance materials. Some disability peak bodies offer workshops and webinars for small providers. And tools like NDIS Ready exist specifically to help small providers build the evidence base without spending months doing it from scratch.</p>

<h2>Questions new providers ask all the time</h2>
<p><strong>"How long does the certification audit process take from start to finish?"</strong> There's no fixed answer, but from the time you submit your application to the Commission to the time you receive a registration decision, providers commonly report a process of several months. The bulk of that time is the document preparation and evidence-building phase before the audit itself. The on-site audit day (or days, for larger services) is typically just one part of the process.</p>
<p><strong>"Can I start delivering SIL while my registration is being processed?"</strong> Whether you can continue to deliver supports to existing plan-managed or self-managed participants while working through registration depends on the specific rules in place at the time. Don't assume — check with the NDIS Commission directly or get advice.</p>
<p><strong>"Do all my workers need to be fully qualified?"</strong> Not necessarily. Qualifications are desirable and relevant to SCHADS classification, but the Practice Standards focus more on whether workers are screened, inducted, supervised and competent for the supports they deliver. A worker without a formal qualification who is thoroughly inducted, closely supervised and demonstrably competent may satisfy the requirements for certain tasks. High-intensity supports are the exception — those have additional competency requirements.</p>
<p><strong>"What if my policy doesn't cover something an auditor asks about?"</strong> Be honest. Acknowledge the gap and explain what you're doing to address it. Auditors are not looking for perfection — they're looking for a genuinely functioning system and a provider who understands their obligations. A candid response combined with a clear remediation plan is far better than a bluff.</p>

<h2>The Practice Standards as a tool, not just a hurdle</h2>
<p>Providers who get the most out of the registration process are the ones who use the Practice Standards as a management tool, not just a compliance checklist. The quality areas are, at their core, a framework for running a good service: looking after participants, looking after staff, managing risk, learning from mistakes, and staying financially viable. All of the things a small business owner should be doing anyway.</p>
<p>When you build your document library and evidence trail with that mindset — not "what do I need to pass?" but "what do I need to run this well?" — compliance stops feeling like overhead. It becomes part of how the business works. And that's exactly the result the Practice Standards are designed to produce.</p>

<h2>A self-check you can do right now</h2>
<p>Before you close this article, pick one quality area from the core module. Write down the name of the document you'd hand an auditor for each outcome. Then go and physically find that document. Is it up to date? Does it have your organisation's name on it? Is there any accompanying evidence — a register entry, a signed form, a training record — that shows it's actually in use?</p>
<p>If yes to all three: you're in good shape for that quality area. If no to any of them: you've just found your next priority. That's the practical value of understanding the Standards — you can self-diagnose, fix the gap, and move on. No guesswork required.</p>

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
    read: '10 min read',
    date: 'June 2026',
    body: `
<p>You bought the template pack. You've got a binder with a policy for everything. So you're ready for your audit, right? Not quite — and this is the single most expensive misunderstanding in NDIS compliance.</p>

<h2>What a template actually is</h2>
<p>A template is a <em>promise</em>. Your incident management policy promises that when something goes wrong, you'll record it, report it and act on it. That promise is necessary — but on its own, it proves nothing.</p>

<h2>What an auditor is actually looking for</h2>
<p>Auditors check whether your promise is real. They'll ask: "Show me an incident you handled." "Show me a complaint and what you did." "Show me a participant's support plan and the progress notes against it." If your binder is full of pristine, blank templates, that's a red flag — it suggests the policy lives on paper and nowhere else.</p>

<blockquote>Evidence beats paperwork. Every time.</blockquote>

<h2>Before and after: what a blank template looks like vs what evidence looks like</h2>
<p>Here's a real-world example. Suppose your incident management policy says: <em>"All incidents will be recorded in the incident register within 24 hours of the event."</em></p>
<p><strong>Blank template version:</strong> You have the policy. The incident register is an empty spreadsheet with column headings. There are no entries.</p>
<p><strong>Evidenced version:</strong> You have the policy. The incident register has three entries from the past six months — each with a date, a description of what happened, the actions taken, whether it was reportable to the NDIS Commission, and a follow-up note. One of them has a "resolved" date and a brief note on what changed to prevent recurrence.</p>
<p>The first version fails. The second version passes — not because it's impressive, but because it's <em>real</em>.</p>

<h2>The three things that turn paperwork into evidence</h2>
<ul>
  <li><strong>Personalisation</strong> — A policy with your organisation's name, ABN and real processes beats a generic one with placeholder text still in it.</li>
  <li><strong>Records</strong> — Filled-in registers and forms that show the policy in action: dated, specific, real.</li>
  <li><strong>Consistency</strong> — Your day-to-day practice has to match what the document says. Auditors interview your staff to check.</li>
</ul>

<h2>The staff-interview consistency check</h2>
<p>Here is the thing most providers underestimate: during a certification audit, the auditor will often speak to your support workers — separately from you. They'll ask questions like: "What do you do if a participant has a fall?" or "How would a participant raise a complaint with you?"</p>
<p>If your worker says "I'd write it in the shift notes" but your incident management policy describes a different process — a formal incident report form, a specific person to notify, a 24-hour timeline — that's an inconsistency. And inconsistencies suggest your policy is decorative rather than operational.</p>
<p>The fix is straightforward: make sure every staff member has read and understood the key policies, and has practised the procedures. Your induction checklist should record this. A supervision session can be used to walk through a scenario. Don't assume your workers know the policies just because the binder exists.</p>

<h2>Building an evidence trail from day one</h2>
<p>The best time to start building evidence is the first day you start operating — not the month before your audit. Auditors can and do look at dates. A risk register with 20 entries all created in the same week looks like preparation theatre. A risk register that has been added to steadily over months looks like a business that actually uses it.</p>
<p>Here's a practical approach for new providers:</p>
<ul>
  <li><strong>Set up your registers before you start</strong> — incident, complaints, risk, conflict-of-interest. Even if they stay empty for a while, they exist with the right date on them.</li>
  <li><strong>Record everything, even small things</strong> — A participant mentioning they're unhappy with their roster is worth a note in the complaints register, even if it resolves in five minutes. It shows the system is used.</li>
  <li><strong>Do your supervision on time and record it</strong> — A supervision log that shows regular check-ins with each worker is solid evidence for the governance quality area.</li>
  <li><strong>Review your policies on a set schedule</strong> — Add a recurring reminder to review each policy annually. When you review, update the "date reviewed" field and make a note in your quality improvement register. This alone shows a functioning quality system.</li>
</ul>

<h2>The 30-day "make your binder real" plan</h2>
<p>If you already have the documents but haven't built the evidence trail yet, here's a practical month-long plan:</p>
<ul>
  <li><strong>Week 1</strong> — Personalise every document: replace all placeholder text with your actual business name, ABN, contact details and real procedures. Remove anything that doesn't match how you actually operate.</li>
  <li><strong>Week 2</strong> — Run a staff walkthrough of the three most critical policies: incident management, complaints, and safeguarding. Use a scenario-based discussion. Record the date and who attended.</li>
  <li><strong>Week 3</strong> — Populate your key registers with any real events from the past few months — incidents, near-misses, complaints (formal or informal), risks you've identified. If something happened and wasn't recorded, record it now with a note of the approximate date.</li>
  <li><strong>Week 4</strong> — Check every participant's file: service agreement signed? Support plan current? Progress notes up to date? Individual risk assessment in place? Close any gaps.</li>
</ul>

<div class="callout">
  <p><strong>Worried your practice won't match your paperwork?</strong> Our free Mock Audit Interview Simulator asks the questions a real auditor asks on the day — so you find the gaps between what you wrote and what you actually do, before they do.</p>
  <a class="cta-btn" href="/mock-audit.html">Try the mock audit &rarr;</a>
</div>

<h2>Common mistakes to avoid</h2>
<ul>
  <li><strong>Submitting policies with placeholder text still in them</strong> — "[Organisation name]" or "[Insert ABN here]" in a policy document is an automatic credibility hit.</li>
  <li><strong>Having a policy review date in the future, on a document that's never been used</strong> — Auditors can tell when something was written the week before the audit.</li>
  <li><strong>Training staff verbally and not recording it</strong> — Verbal inductions don't leave a trace. Use a checklist and get a signature.</li>
  <li><strong>Relying on memory instead of records</strong> — "We handled an incident in February" is not enough. The incident register entry is what counts.</li>
</ul>

<h2>What continuous improvement actually looks like</h2>
<p>One of the quality areas auditors check is "continuous improvement" — whether your organisation is actively getting better over time. Many providers find this vague. In practice, it doesn't need to be grand. It means having a quality improvement register (or log) where you record: what the issue or learning was, what you changed as a result, and when. Examples might include:</p>
<ul>
  <li>After an incident, you updated your emergency procedure because you noticed a gap — recorded.</li>
  <li>After a staff survey, you changed how you run supervision sessions — recorded.</li>
  <li>After a participant feedback session, you adjusted the scheduling of one person's supports — recorded.</li>
</ul>
<p>None of these are dramatic. But together they paint a picture of an organisation that pays attention, learns, and improves. That's exactly what the quality area is asking you to demonstrate.</p>

<h2>Frequently asked questions from new providers</h2>
<p><strong>"Do I need a quality manager?"</strong> Not necessarily. For a small provider, the owner or director often fulfils this role alongside their other responsibilities. What matters is that someone owns it — that there's a clear person responsible for keeping documents current, reviewing registers, and responding to non-conformities.</p>
<p><strong>"Can I use my template pack as evidence?"</strong> The templates themselves are not evidence of delivery — they're the structure for collecting evidence. A blank incident report template is not evidence that you manage incidents well. A completed incident report, filed in your register, is.</p>
<p><strong>"How long do I need to have records for before my audit?"</strong> There's no fixed rule that says "you need six months of records." But auditors want to see that your system has been running — not set up the week before. Even a few months of real, consistent records tells a much better story than a pristine new system. Start using your registers from day one.</p>

<h2>A note on digital vs paper systems</h2>
<p>Many small providers start with paper-based systems and that's fine. A ring binder with your policies, a spreadsheet for your registers, a paper induction checklist — these work. An auditor doesn't care whether your evidence is digital or paper. They care that it exists, it's real, and it's accessible.</p>
<p>As you grow, a digital system (even a basic one) makes things easier: you can find documents quickly, workers can access shift notes from their phones, and you have automatic date-stamps on entries. But don't delay building your evidence trail while you shop for the perfect software. Start with what you have. Improve the tools later.</p>

<h2>The "so what" question: why compliance evidence matters beyond audits</h2>
<p>It's easy to think about evidence purely in terms of passing an audit. But your records serve another purpose: they protect you, your workers and your participants if anything goes wrong. If a participant is injured, if a complaint escalates, if a worker is accused of misconduct — your records are the objective account of what happened. Clear, contemporaneous records that show a properly run service are your best defence in any of those situations.</p>
<p>Providers who think of compliance as "just for the auditor" are missing half the picture. The evidence you build day by day is the foundation of a service you can stand behind, in any circumstance. That's the real reason to get it right.</p>

<h2>What participants and families can see</h2>
<p>Here's a perspective worth keeping in mind: participants and their families can tell the difference between a provider who's organised and a provider who's winging it. When a family asks to see a participant's support plan and the file is up to date, they feel confident. When a worker can clearly explain what they do if there's an incident, the family feels reassured. When there's a readable, accessible complaints process, people know they can raise concerns safely.</p>
<p>Your compliance documents are, in part, your promise to the people you support and their families. The evidence behind those documents is the proof that you keep your promises. That's why it matters — not just for auditors, but for everyone who depends on you.</p>

<blockquote>The binder full of policies is the beginning of the story. The evidence of how you used them is the story itself.</blockquote>

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
    read: '10 min read',
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

<h2>More example questions — by quality area</h2>
<p>Auditors tend to follow the quality areas in sequence. Here's a broader picture of what they may ask across each area:</p>
<ul>
  <li><strong>Rights and responsibilities —</strong> "How do participants know about their rights?" / "Tell me about a time a participant made a decision you didn't agree with — what did you do?" / "How do you ensure a participant's cultural or religious needs are respected?"</li>
  <li><strong>Governance and operational management —</strong> "Who is responsible for compliance in your organisation?" / "What happens if a key person is unavailable — how do you keep the service running?" / "How often do you review your policies and how do you record that?"</li>
  <li><strong>Provision of supports —</strong> "Walk me through how you develop a support plan with a participant." / "How do you make sure the support delivered matches what the participant agreed to?" / "What do you do if a participant's needs change?"</li>
  <li><strong>Support provision environment —</strong> "How do you check that the home environment is safe for the participant?" / "What maintenance checks do you do and how often?" / "If a participant raised a safety concern about their home, what would happen?"</li>
  <li><strong>Workforce —</strong> "Show me your worker screening records." / "How do you supervise your support workers?" / "What training have your workers completed in the last 12 months?" / "How do you handle a complaint about a worker?"</li>
</ul>

<h2>What a strong answer sounds like — and what a weak one sounds like</h2>
<p>The difference between a strong answer and a weak one isn't confidence — it's specificity and evidence. Here are two examples:</p>
<p><strong>Weak answer:</strong> "We always document incidents as soon as they happen. Everyone knows what to do."</p>
<p><strong>Strong answer:</strong> "When an incident occurs, the support worker completes our incident report form — here's a copy — within 24 hours. It goes to me as the manager. I then assess whether it needs to be reported to the NDIS Commission under the reportable incidents framework. All incidents, whether reportable or not, go into our incident register — here it is — and we review them monthly to look for patterns. Here's an example from last month."</p>
<p>Notice the strong answer names the document, mentions the register, explains the process and offers a real example. That's the formula: policy → record → real example.</p>

<h2>How to prepare your staff</h2>
<p>Your workers will likely be interviewed separately, without you in the room. That's by design — the auditor wants to know whether the practice is real, not just polished by management. Here's how to prepare them without coaching them to give scripted answers (which auditors can spot):</p>
<ul>
  <li><strong>Run a staff Q&amp;A session using real scenarios</strong> — "What would you do if a participant had a fall during your shift?" Let them answer in their own words. Correct any gaps in their understanding of the actual procedure.</li>
  <li><strong>Make sure every worker has read the key policies</strong> — Not just been handed them. Use your induction checklist to record that they've read and understood the incident, complaints and safeguarding policies specifically.</li>
  <li><strong>Remind them it's not a test they can fail</strong> — The auditor is checking the organisation's systems, not judging individual workers. An honest answer of "I'm not sure, but I'd ask my manager" is fine; a confident wrong answer is worse than admitting uncertainty.</li>
  <li><strong>Practice the incident chain out loud</strong> — "Notice it, make the person safe, fill in the form, tell the manager, report if required, review." When it's a physical habit, it comes out naturally under pressure.</li>
</ul>

<h2>The day-of logistics</h2>
<p>A few practical things that will make your audit day smoother:</p>
<ul>
  <li><strong>Have your documents organised, not piled</strong> — Know where everything is. A folder per quality area works well. Being able to quickly produce the right document when asked makes a good impression and saves stress.</li>
  <li><strong>Have real examples ready</strong> — One incident, one complaint, one supervision session, one support plan review. You don't need dozens — you need a few real, complete examples you can walk the auditor through.</li>
  <li><strong>Don't try to bluff gaps</strong> — If something is missing, it's much better to acknowledge it and explain what you're doing about it. Auditors respect honesty. They're used to working with growing businesses.</li>
  <li><strong>Ask questions yourself</strong> — The audit is a two-way conversation. If an auditor raises a concern, ask them to clarify what evidence would address it. This shows maturity and gives you something concrete to act on.</li>
</ul>

<h2>The trap: confident words, missing evidence</h2>
<p>You can answer every question perfectly and still get a "needs improvement" if you can't <em>show</em> it. The strongest answers sound like: "Here's our policy, here's the register where we record it, and here's a real example from last month."</p>

<div class="callout">
  <p><strong>Practice before the real thing.</strong> Our free Mock Audit Interview Simulator runs you through twelve of the questions a real auditor asks — and shows you exactly where your answers need backup.</p>
  <a class="cta-btn" href="/mock-audit.html">Practise the interview &rarr;</a>
</div>

<h2>After the audit: what happens next</h2>
<p>When the on-site day is done, the auditor goes away and writes their report. This usually takes a few weeks. The report will cover each outcome that was assessed, with a finding for each. You'll receive a copy. If there are non-conformities, you'll need to address them and provide evidence of the fix — this is called a corrective action. Your auditor should be clear about what evidence they need to see to close each corrective action.</p>
<p>Once all major non-conformities are resolved, the auditor submits their final report to the NDIS Commission, and the Commission makes the registration decision. The whole process from audit booking to registration can take a number of months, so factor that into your planning.</p>

<h2>The mindset that makes audits manageable</h2>
<p>Providers who approach their first audit with dread often discover it was less frightening than they'd imagined — especially if they prepared. The auditor is not trying to catch you out. They are checking whether the systems are real and working. If your team delivers good support and your records reflect that, the audit is just a conversation about what you do every day.</p>
<p>The providers who find it hardest are the ones who built the documents but not the practice — who have the policy but not the register, or the register but not the consistent habit. Bridge that gap, and the audit becomes manageable for almost any provider.</p>

<h2>Practical audit-day tips</h2>
<p>The day itself doesn't have to be stressful. A few things that help:</p>
<ul>
  <li><strong>Have water and snacks ready</strong> — A certification audit can run most of the day. Keep your energy up.</li>
  <li><strong>Have a quiet, private space for staff interviews</strong> — The auditor needs to speak to your workers without you present. Arrange a suitable space beforehand.</li>
  <li><strong>Don't hover</strong> — Give the auditor space to do their job. Being overly present or jumping in to answer questions on behalf of your staff creates a poor impression.</li>
  <li><strong>Take notes during feedback</strong> — At the end of the audit, the auditor usually gives you verbal feedback before the formal report. Write it down. You'll want to act on it and having it in writing helps.</li>
  <li><strong>Follow up promptly on any corrective actions</strong> — If the auditor identifies gaps, don't delay. A fast, thorough response shows good faith and moves the process forward.</li>
</ul>

<h2>The relationship between your audit and your participants' experience</h2>
<p>It's worth stepping back and remembering why all of this matters. The audit exists because SIL participants are some of the most vulnerable people in the community. They live in their homes, often with limited ability to advocate for themselves, and they depend on you and your team to keep them safe, supported and respected. The Practice Standards and the audit process are the system society has built to make sure that happens consistently, not just when things are going well.</p>
<p>When you invest in doing the audit properly — the documents, the evidence, the staff training, the consistent practices — you're not just ticking a compliance box. You're building a service that genuinely looks after people. That's worth the effort, and most providers who go through the process come out the other side with a much better-run business as a result.</p>

<h2>After your first audit: building on what you've learned</h2>
<p>Your first certification audit is a learning experience, even if it goes smoothly. The auditor's report will highlight what's working and what could be stronger. Take that feedback seriously — not just the non-conformities you have to fix, but the suggestions and observations about areas that are merely adequate. Use them to improve.</p>
<p>Many providers find that their second renewal audit, two or three years later, feels dramatically easier — because by then, the systems are well-established, the evidence trail is deep, and the team knows what to expect. Getting to that point starts with taking the first audit seriously and using it well.</p>

<h2>One thing you can do today</h2>
<p>If you've read this far and you're feeling overwhelmed, here's a simple starting point: pick one question from the list above — the one that made you most uncomfortable — and work on it this week. Find the policy that should answer it. Check the register that should back it up. Test whether your staff could answer it if asked. One question, one week. That's how audit readiness is built — one gap closed at a time.</p>

<blockquote>Preparation is the difference between dreading the audit and being ready for it.</blockquote>

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
    read: '10 min read',
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

<h2>A worked example — illustrative numbers only</h2>
<p>Let's put some rough numbers together to show how the maths works. <em>These are illustrative only — your actual figures will differ based on your award classification, your worker's level and your state. Always verify against the current SCHADS award and NDIS pricing arrangements.</em></p>
<p>Imagine you have a casual support worker at a standard classification. Their base weekday rate might be around $30-something per hour (the exact rate depends on the SCHADS classification level — check the Fair Work Ombudsman for your specific situation). Add casual loading, and that rate climbs. Now add superannuation on top of the casual rate.</p>
<p>But that's just the direct wage for hours worked. Before you've calculated your true hourly cost, you also need to factor in:</p>
<ul>
  <li><strong>Travel time</strong> — If your worker drives 20 minutes to a participant's home, you may be obligated to pay for some of that travel time under SCHADS. That's paid time you can't bill to the NDIS.</li>
  <li><strong>Training and induction</strong> — The first week of a new worker's employment often involves induction, mandatory training, and policy walkthroughs. All paid time, zero revenue.</li>
  <li><strong>Supervision time</strong> — Regular one-on-ones with your workers are a compliance requirement. Add that time to your cost model.</li>
  <li><strong>Your own admin time</strong> — Invoicing, rostering, compliance paperwork. Even if you're not paying yourself properly yet, this time has a cost. At some point, either you get paid for it or you burn out.</li>
</ul>
<p>By the time you add all of this up and divide it across billable hours only, the true cost per delivered hour can be significantly higher than the base wage. That's why a shift that looks profitable on paper can look very different in your bank account.</p>

<h2>Penalty shifts: when do they make sense?</h2>
<p>Weekend and evening shifts attract penalty rates under SCHADS. The NDIS pricing arrangements do allow higher rates for these time slots — but the gap between the premium rate you can charge and the penalty rate you must pay can be tighter than you'd expect. Before you commit to a roster that's heavy on penalty-rate hours, it's worth modelling the specific shift:</p>
<ul>
  <li>What is the billable rate for a Saturday afternoon?</li>
  <li>What will I actually pay my worker for that shift, including penalties and super?</li>
  <li>After travel and non-billable time, is there anything left?</li>
</ul>
<p>Some shifts will always be thin on margin. That's okay, as long as you know it going in and your overall mix of shifts balances out. The problem is when providers roster weekend-heavy without ever checking whether the maths stacks up.</p>

<h2>Rostering tips to protect your margin</h2>
<ul>
  <li><strong>Minimise dead travel time</strong> — Group participants who live close together under the same worker where possible. Every kilometre of non-billable travel eats margin.</li>
  <li><strong>Use permanent part-time workers for predictable rosters</strong> — Permanent part-time workers cost less per hour than casual workers (no casual loading) on predictable, regularly scheduled shifts. If your roster is stable, the switch can make a real difference.</li>
  <li><strong>Set a minimum engagement length</strong> — SCHADS has minimum shift lengths. Short ad-hoc shifts can be disproportionately expensive once you factor in travel and the minimum engagement. Build shifts that make sense financially.</li>
  <li><strong>Track your billable ratio</strong> — What percentage of the hours you pay your workers are actually billed to participants? If it's below a healthy level, you need to find and fix the leak.</li>
</ul>

<h2>Cashflow: the hidden killer</h2>
<p>Even if your margins are healthy, cashflow can kill a young provider. The NDIS pays in arrears — you deliver the support, then claim, then wait for payment. Meanwhile, your workers need to be paid on time every fortnight. If you're growing quickly, the gap between cash out and cash in can become a serious problem. A few things that help:</p>
<ul>
  <li><strong>Claim promptly and frequently</strong> — Don't let claims pile up. The sooner you lodge a claim, the sooner you get paid.</li>
  <li><strong>Set aside a cash buffer before you hire</strong> — As a rough guide, having enough cash to cover at least a couple of payroll cycles before revenue comes in will protect you from cashflow crises.</li>
  <li><strong>Watch your service agreement values</strong> — If a participant's plan runs low unexpectedly and you're not tracking it, you may deliver services you can't claim. Keep an eye on remaining plan values for each participant.</li>
</ul>

<h2>Why this matters before you grow</h2>
<p>Scaling a service that loses money per hour just means losing money faster. The time to check the maths is <em>before</em> you take on more participants or hire more staff.</p>

<div class="callout">
  <p><strong>Run your numbers in under a minute.</strong> Our free Business Health Check calculates your true cost per support hour and your real margin against NDIS price limits — no signup, no backend, just the maths.</p>
  <a class="cta-btn" href="/health-check.html">Check my viability &rarr;</a>
</div>

<h2>Pricing and quoting tips</h2>
<p>When a new participant or their plan manager asks for your pricing, be clear and honest. Quote your actual rate from the NDIS pricing arrangements document — this is the maximum you can charge, not a flexible number you negotiate down. Know exactly what's included in that rate (direct support time) and what isn't (travel, if you're charging it separately). Clear, upfront pricing builds trust with plan managers and participants and avoids uncomfortable conversations later.</p>

<blockquote>The providers who thrive are the ones who know their numbers. The ones who don't find out the hard way.</blockquote>

<h2>When to review your numbers</h2>
<p>Your cost structure isn't fixed. The SCHADS award is updated periodically, the NDIS pricing arrangements are reviewed, and your own mix of shifts and workers changes as you grow. It's worth revisiting your financial model at least annually, and whenever something significant changes — a new award rate, a roster restructure, or a change in the types of support you deliver.</p>
<p>Providers who stay close to their numbers can spot problems early: a roster shift that's consistently unprofitable, a participant arrangement that's eating more admin time than it generates in revenue, or a superannuation rate change that's quietly widening the gap between income and cost. Catching these things early means you can fix them. Missing them for months means the damage is already done.</p>

<h2>The bigger picture: planning for growth</h2>
<p>Many small providers want to grow — more participants, more workers, perhaps a second house. Before you do, model it. Adding a second property means not just more revenue, but more overhead (rent, utilities, compliance costs), more staff, and more management time. The margin on house two might look the same as house one on paper, but if your management capacity is already stretched, the real cost of growth is your time and energy. Know what you're taking on before you commit.</p>
<p>A simple growth plan might ask: how many billable hours per week do I need to cover all costs and pay myself a reasonable wage? At current rates, how many participants does that represent? What's my plan if one participant's funding changes? These are the questions that turn a provider from reactive to strategic.</p>

<h2>Building a financially sustainable business, not just a compliant one</h2>
<p>Compliance and financial sustainability go hand in hand. Providers who underprice their services to win participants end up cutting corners on staffing, training and documentation — which creates compliance risk. Providers who price correctly, roster efficiently and manage cashflow carefully have the resources to do compliance well. The businesses that thrive long-term are the ones that get both right.</p>
<p>If you're not sure where to start, run your numbers first. Know your true cost per hour before you sign another service agreement. Then you can price with confidence and grow with your eyes open.</p>

<h2>Common financial mistakes new NDIS providers make</h2>
<ul>
  <li><strong>Treating the NDIS price guide rate as profit</strong> — The rate is revenue. Your margin is what's left after all costs. These are not the same number.</li>
  <li><strong>Not accounting for casual loading when quoting</strong> — If your worker is casual, your true wage cost is higher than the base hourly rate. Build this into your model from day one.</li>
  <li><strong>Ignoring the cost of your own time</strong> — Every hour you spend on admin, compliance, invoicing and coordination is an hour you're not being paid for. Eventually, either you pay yourself for it (through management fees built into your model) or you wear it yourself. Know which one you're doing.</li>
  <li><strong>Not tracking plan balances</strong> — A participant whose plan runs out mid-quarter means unclaimable shifts. Keep an eye on remaining plan values and flag early when a participant is running low.</li>
  <li><strong>Growing faster than your cashflow can support</strong> — Taking on a second participant before your first month's claims have been paid can create a cash crisis. Grow at a pace your bank balance can handle.</li>
</ul>

<h2>A quick financial health check you can run now</h2>
<p>Take one of your current participants and work out what a typical week looks like. Add up all the support hours you're delivering to them. Now calculate: what are you paying your worker for those hours, including all penalties and super? What's the total NDIS revenue you can claim? Subtract the wage cost, then subtract a fair share of overheads (software, insurance, your time). What's left?</p>
<p>If there's a meaningful positive number, your pricing is working for that participant. If it's close to zero, or negative, you're losing money on that arrangement. Do this exercise for each participant and each shift type. It takes an hour but it tells you more about the health of your business than any other exercise you'll do this month.</p>

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
    read: '10 min read',
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

<h2>Good vs bad: real examples</h2>
<p>Sometimes the easiest way to understand what good looks like is to see it side by side with what bad looks like. Here are a few common examples:</p>
<ul>
  <li><strong>Bad:</strong> "Had a good day. Was happy and cooperative." <strong>Good:</strong> "Assisted participant with meal preparation as per support plan. Participant made her own sandwich with minimal prompting and said she was pleased with how it turned out. No issues noted during the 2-hour shift."</li>
  <li><strong>Bad:</strong> "Difficult shift. Participant was non-compliant." <strong>Good:</strong> "Participant declined to attend his scheduled day program, stating he was tired. We discussed options and agreed he would rest at home. I contacted the supervisor to advise. Participant was calm and engaged for the remainder of the shift."</li>
  <li><strong>Bad:</strong> "Minor fall. Seems okay." <strong>Good:</strong> "At approximately 2:15pm, participant lost footing in the bathroom and fell, landing on her left side. No visible injury. Participant reported no pain. I assisted her to stand, checked for signs of injury, and completed an incident report. I notified the participant's emergency contact and my manager. Participant requested to rest for the remainder of the shift."</li>
</ul>
<p>Notice that the good versions take maybe 30 extra seconds to write, but they tell a complete story. Anyone who reads them months later knows exactly what happened, who was involved, and what was done about it.</p>

<h2>A simple template for everyday notes</h2>
<p>You don't need elaborate software to write a good note. A consistent structure helps. Try this as a mental checklist:</p>
<ul>
  <li><strong>Opening line</strong> — Date, time, who you supported, what the shift was for (e.g., "Community access support, 10am–2pm").</li>
  <li><strong>What was delivered</strong> — What actually happened during the shift, linked to the participant's goals or support plan where possible.</li>
  <li><strong>What was observed</strong> — How the participant was presenting, any notable behaviour or conversation (in their own words if relevant), any concerns.</li>
  <li><strong>Actions and follow-up</strong> — Anything you escalated, reported or communicated to anyone else. If nothing needed following up, say so briefly.</li>
  <li><strong>Sign-off</strong> — Your name and signature (or digital equivalent), and the time you wrote the note.</li>
</ul>

<h2>Words to avoid</h2>
<p>Steer clear of vague, judgmental or diagnostic language: "good day", "difficult", "manipulative", "non-compliant". They tell the reader nothing useful and can read as disrespectful. Stick to specifics.</p>
<p>Also avoid medical or clinical diagnoses in your notes unless you are qualified to make them. Instead of "appeared depressed," write "appeared quiet and withdrawn, made minimal eye contact, and declined to engage in planned activities." That's observable. "Depressed" is a clinical judgment you likely aren't qualified to make.</p>

<blockquote>If it isn't written down, it didn't happen. If it's written badly, it can be used against you.</blockquote>

<h2>Progress notes vs incident reports: what's the difference?</h2>
<p>This trips a lot of workers up. A <strong>progress note</strong> is a routine record of the support delivered during a shift. An <strong>incident report</strong> is a separate, specific document for when something goes wrong or outside the ordinary.</p>
<p>If something happened that needs an incident report (a fall, an allegation, a near-miss, a significant change in the participant's condition), you should write both: a brief mention in the progress note AND a full incident report in the incident management system. Don't try to fit the incident into the progress note and call it done. The incident report is what gets assessed for reportability to the NDIS Commission.</p>

<h2>Privacy and storage</h2>
<p>Progress notes contain sensitive personal information. They need to be stored securely, accessible only to the people who need them, and kept for the period required by your jurisdiction's records laws (check the specific requirements for your state, as they vary). A few basics:</p>
<ul>
  <li><strong>Paper notes</strong> — If you're still using paper, they need to be in a locked location, not sitting on a kitchen bench or left in a car.</li>
  <li><strong>Digital notes</strong> — Use a password-protected system. Don't store participant information in personal email or general messaging apps like WhatsApp.</li>
  <li><strong>Access controls</strong> — Not everyone in your organisation needs access to every participant's notes. Limit access to those who are actively supporting that person.</li>
  <li><strong>Participant access</strong> — Participants have the right to see their own records. Your privacy policy should explain how they can request access.</li>
</ul>

<h2>Common phrases to replace</h2>
<p>Here's a quick cheat-sheet for language upgrades. Replace these:</p>
<ul>
  <li><strong>"Had a good day"</strong> — Replace with a specific description of what happened.</li>
  <li><strong>"Was upset / emotional"</strong> — Replace with what you actually observed: "Cried during the morning routine" or "Raised his voice when asked to leave the house."</li>
  <li><strong>"Refused to cooperate"</strong> — Replace with what specifically happened: "Declined to attend the day program, stating he preferred to stay home."</li>
  <li><strong>"Challenging behaviour"</strong> — Describe the specific behaviour instead: "Paced the hallway for approximately 20 minutes, declined to speak with me, and did not eat at lunch."</li>
  <li><strong>"As per usual"</strong> — This tells the reader nothing. Write what actually happened, even if it was routine.</li>
</ul>

<div class="callout">
  <p><strong>Short on time at the end of a shift?</strong> Our AI Note &amp; Incident Writer takes your rough notes and returns a clean, objective, audit-ready progress note in seconds — in the factual language auditors expect. It's real AI, and you always review before use. Free to try.</p>
  <a class="cta-btn" href="/tools.html">Try the AI writer &rarr;</a>
</div>

<h2>What auditors look for in your notes</h2>
<p>During a certification audit, your progress notes are one of the primary evidence sources for the "provision of supports" quality area. Auditors look for:</p>
<ul>
  <li><strong>Consistency</strong> — Do the notes match what's in the support plan? If the plan says the participant is working toward cooking independently, are the notes tracking that goal?</li>
  <li><strong>Completeness</strong> — Are there notes for every shift? A support period with gaps in the notes is a question mark. What happened on those days?</li>
  <li><strong>Objectivity</strong> — Are the notes factual, or full of opinions and judgements? The more objective, the better.</li>
  <li><strong>Timeliness</strong> — Are notes being written at the time of the shift, or clearly backdated? Notes dated three days after a shift raise questions.</li>
</ul>

<h2>Using notes to track participant progress toward goals</h2>
<p>Progress notes shouldn't just document what happened — they should, over time, tell the story of the participant's journey toward their goals. If a participant's NDIS plan includes a goal around community participation, your notes should reflect what you're doing to support that goal, how the participant is progressing, and any barriers or achievements along the way. This is what makes notes valuable to the participant, not just to the auditor.</p>
<p>A practical habit: at the start of each shift, briefly remind yourself what goals this participant is working toward. At the end, ask: did anything happen today that's relevant to those goals? If so, include it in the note. This connects your day-to-day work to the purpose of the NDIS plan.</p>

<h2>Getting your team to write better notes</h2>
<p>If you have support workers who write poor notes, address it early. Vague notes are a habit, and habits are easier to fix in the first few weeks than after months of reinforcement. Some practical approaches:</p>
<ul>
  <li><strong>Share examples</strong> — Show your workers a good note and a poor note side by side. Make it concrete. "This is the standard we're aiming for."</li>
  <li><strong>Review notes regularly</strong> — As a manager, check in on notes weekly for new workers. Praise good examples. Gently correct poor ones in supervision, not in front of other staff.</li>
  <li><strong>Use the AI writer as a support tool</strong> — Not as a replacement for workers writing notes, but as a way for workers to check whether their rough draft is hitting the right standard before they submit it.</li>
</ul>

<h2>How long to keep progress notes</h2>
<p>Progress notes need to be retained for a minimum period after the support is delivered. The specific requirement varies by state and territory and may also be covered in your privacy policy obligations. As a general principle, most providers retain participant records for at least seven years after the last service delivery, or longer if the participant was a child. Check the requirements that apply to your state and build your retention schedule into your privacy policy. When records are disposed of, they should be destroyed securely — shredded if paper, properly deleted if digital.</p>

<h2>When notes become legal documents</h2>
<p>Progress notes can be subpoenaed as evidence in legal proceedings — including investigations by the NDIS Commission, coronial inquiries, civil claims, and criminal matters. This is not meant to frighten you, but to underline why accuracy matters. A note written in the heat of the moment, with language that sounds dismissive or judgmental, can be read very differently in a formal context months or years later. Write every note as if a judge might read it. Not because it's likely — but because that standard produces the clearest, most professional record.</p>

<h2>Making note-writing part of the shift routine</h2>
<p>The hardest part of good note-writing is not the skill — it's the habit. By the end of a long shift, the temptation to write something quick and move on is very human. Here are some practical ways to build the habit into the shift structure:</p>
<ul>
  <li><strong>Write notes at the end of each support task, not just the end of the shift</strong> — If you're supporting someone for four hours across different activities, jot a few words about each activity as you go. It's faster and more accurate than trying to reconstruct a whole shift from memory.</li>
  <li><strong>Use voice-to-text for a rough draft</strong> — Many workers find it easier to speak their notes than type them. Use your phone's voice-to-text function to capture the rough version, then tidy it up before submitting.</li>
  <li><strong>Set a rule: notes before you leave the shift</strong> — Whatever system you use, the note should be written before the support worker leaves. Notes written the next day are less accurate and look worse in an audit.</li>
  <li><strong>Review your own notes occasionally</strong> — Once a month, read back through your own notes for one participant. Are they telling a coherent story? Would someone unfamiliar with this person be able to understand what's been happening? If not, that's your calibration check.</li>
</ul>

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
    read: '10 min read',
    date: 'June 2026',
    body: `
<p>For years, plenty of SIL supports were delivered by unregistered providers paid through plan-managed or self-managed participants. That world is changing. Government reviews have made clear that higher-risk supports like Supported Independent Living are heading toward <strong>mandatory registration</strong> — and the direction of travel is one way.</p>

<h2>Why this is coming</h2>
<p>SIL is high-stakes: vulnerable people, often in their own homes, frequently overnight. The reviews into NDIS safeguarding concluded that this kind of support needs the oversight that registration brings. Whether or not a specific date applies to you, the safe assumption for any serious SIL operator is: get registration-ready now.</p>

<h2>What this means for your current participants</h2>
<p>If you currently deliver SIL to participants who are plan-managed or self-managed, they can use an unregistered provider — for now. But think about it from the participant's perspective. If they are reassigned an agency-managed plan, or if they move to a different arrangement, they may only be able to use a registered provider. If you're not registered, you could lose that participant through no fault of either of you.</p>
<p>That's worth a conversation with your current participants and their plan managers. Let them know you're working toward registration. It builds trust and reassures them that their support arrangement is stable.</p>

<h2>What "getting ready" actually means</h2>
<ul>
  <li><strong>Your document foundation</strong> — the full set of policies, procedures, registers and forms the Practice Standards require. This is the part that takes the longest, so start here.</li>
  <li><strong>Your evidence trail</strong> — start keeping real records now: incidents, complaints, supervision, consent. Auditors want history, not a folder created the week before.</li>
  <li><strong>Your worker screening</strong> — make sure everyone delivering supports has valid NDIS Worker Screening checks.</li>
  <li><strong>Your audit booking</strong> — certification audits take time to arrange. Leaving it late means scrambling.</li>
</ul>

<h2>A practical step-by-step prep plan</h2>
<p>Here's a realistic approach broken into phases. Adapt the timing to your situation, but don't compress it too much — building genuine evidence takes time.</p>
<ul>
  <li><strong>Phase 1: Get your documents sorted (allow several months)</strong> — Either write your document library from scratch or get a ready-made pack personalised to your organisation. Either way, personalise everything: your name, ABN, real processes. Don't submit anything with placeholder text.</li>
  <li><strong>Phase 2: Start building your evidence trail (ongoing from day one)</strong> — Set up your registers immediately and use them from the start. Every incident recorded. Every complaint logged. Every supervision session dated and noted. This history is what an auditor wants to see.</li>
  <li><strong>Phase 3: Train your team (before you book your audit)</strong> — Walk every worker through the key policies. Run a scenario-based session on incidents, complaints and safeguarding. Record who attended and when. Keep the sign-in sheet.</li>
  <li><strong>Phase 4: Choose your auditor</strong> — The NDIS Commission maintains a list of approved quality auditors. You get to choose who audits you. It's worth doing a bit of research: ask other providers who they used, look at turnaround times and communication style. Book well in advance — approved auditors can have long lead times.</li>
  <li><strong>Phase 5: Submit your application to the NDIS Commission</strong> — The application itself (through the NDIS Commission portal) happens before or alongside the audit booking. Allow time for this process, as there may be back-and-forth with the Commission before the audit is formally arranged.</li>
  <li><strong>Phase 6: The audit</strong> — For SIL, this is a certification audit with an on-site visit, staff interviews and document review. If your systems are real and your staff know the policies, this is manageable. It's a check, not a trap.</li>
</ul>

<h2>Choosing an auditor: what to look for</h2>
<p>Not all approved quality auditors are the same. When researching your options, consider:</p>
<ul>
  <li><strong>Experience with small SIL providers</strong> — Some auditors specialise in large organisations. You want someone who understands what a small or sole-operator SIL business looks like.</li>
  <li><strong>Availability</strong> — How far out are they booked? If you have a target registration date, work backwards from there.</li>
  <li><strong>Communication</strong> — Do they respond promptly? Are they clear about what they need from you before the audit? A good auditor makes the process easier, not harder.</li>
  <li><strong>Cost</strong> — Audit fees vary. Get quotes from a couple of approved auditors so you can budget properly.</li>
</ul>

<blockquote>The providers who start preparing now will glide through registration. The ones who wait will scramble.</blockquote>

<h2>The cost of waiting</h2>
<p>Providers who wait until registration is forced on them face a crunch: every approved auditor booked out, documents rushed, and the risk of losing participants who can only stay with a registered provider. Early movers get to do it calmly.</p>

<div class="callout">
  <p><strong>Start with clarity.</strong> Our free quiz tells you exactly which documents your SIL service needs and gives you three samples to download right away — so you can see the standard before you commit to anything.</p>
  <a class="cta-btn" href="/quiz.html">Take the free quiz &rarr;</a>
</div>

<h2>Common mistakes unregistered providers make when preparing</h2>
<ul>
  <li><strong>Waiting for a firm deadline before starting</strong> — The registration process takes time. If you start the week a deadline is announced, you're already behind.</li>
  <li><strong>Assuming past practice counts as evidence</strong> — If you've been delivering SIL for years but haven't been keeping formal records, you can't backfill an evidence trail. You can only start now and build from here.</li>
  <li><strong>Not telling your participants</strong> — Keep your current participants informed of your progress. It builds loyalty and avoids surprises.</li>
  <li><strong>Underestimating the document work</strong> — The document library for a SIL certification is substantial. Start building it now, not later.</li>
</ul>

<h2>Keeping your current participants informed</h2>
<p>One of the things providers often overlook is communicating with their current participants and their families. If you're working toward registration, tell them. Explain what it means: that your service is going through a formal quality check, that it's a good thing, and that it doesn't mean anything is changing day-to-day. Participants who understand what registration is are less likely to worry about it and more likely to feel confident in your service.</p>
<p>If participants are interviewed by an auditor as part of the process — and for certification, they may be, with their consent — they should already know this is happening. Surprise on audit day is avoidable with a simple conversation beforehand.</p>

<h2>What registration actually costs — and how to budget for it</h2>
<p>Registration isn't free. The main costs are:</p>
<ul>
  <li><strong>Your own document pack</strong> — Whether you build it yourself (time cost) or use a ready-made service (money cost).</li>
  <li><strong>NDIS Worker Screening checks</strong> — There's a fee per worker, paid to your state screening authority. Costs vary by state.</li>
  <li><strong>Auditor fees</strong> — The certification audit fee depends on your auditor, the size of your service, and the scope of the audit. Get quotes from at least two approved auditors.</li>
  <li><strong>NDIS Commission application fee</strong> — There is an application fee payable to the Commission. Check the current fee schedule on the Commission's website.</li>
  <li><strong>Your time</strong> — Preparing for an audit is not a small project. Budget for the hours you'll spend on documents, training, and preparation. If you have staff, budget for their time in training sessions too.</li>
</ul>
<p>Knowing the full cost upfront helps you plan and avoids nasty surprises. Factor the audit cost into your business plan as an investment in your ability to operate and grow.</p>

<h2>What happens after registration</h2>
<p>Once you're registered, you're registered for a period of time — typically three years for certification. During that time, you may have a mid-term review (a lighter-touch check, usually desktop-based). At the end of the period, you'll need to renew — another audit. This is why building your quality system as a living part of your business matters so much: registration is not a one-time event. It's a continuous commitment to operating to the standard.</p>

<h2>How to make the most of the time you have now</h2>
<p>Whether registration is months away or a couple of years away, the best thing you can do right now is treat your service <em>as if</em> you were already registered. Use the incident register. Record your supervision sessions. Keep participant notes to the standard. Renew screening checks before they expire. Review your policies on schedule.</p>
<p>When your audit eventually comes, you won't be scrambling to build a system from nothing. You'll already have months or years of evidence that your service runs properly. That's the difference between a stressful audit and a calm one.</p>
<p>You don't need to be perfect. You need to be genuine. Auditors can tell the difference, and so can your participants.</p>

<h2>A word on sole traders and family-run SIL</h2>
<p>Some of the smallest SIL providers are run by a single person — often someone who started by caring for a family member and then expanded to support others in the community. The registration process can feel disproportionately large for a business of one or two people. That's a fair feeling. But the standards are the same regardless of size, and the Commission does work with small providers through the process. The key is not to be put off by the scale of the requirements, but to break it into manageable steps and start early.</p>
<p>If you're a sole operator, the governance quality area in particular asks you to think about what happens if <em>you</em> are unavailable — illness, family emergency, burnout. Your continuity plan needs to have a real answer to that question. Who would support your participants if you couldn't? What's the backup arrangement? Building that network before you need it is both good practice and an audit requirement.</p>

<h2>Frequently asked questions from unregistered providers</h2>
<p><strong>"Do I need to stop taking new participants while I work toward registration?"</strong> This depends on who manages the participant's plan. If participants are self-managed or plan-managed, you may be able to continue as normal while you work toward registration. If you're seeking to work with agency-managed participants, you will need registration first. Check the current rules with the NDIS Commission if you're unsure.</p>
<p><strong>"Can I use the same documents for registration that I already use?"</strong> If you're currently delivering SIL without registration, you may have some documents in place. Start with what you have, but review each document against the Practice Standards — many unregistered providers' informal documentation doesn't meet the standard required for certification. It's better to know this early.</p>
<p><strong>"How do I choose between approved auditors?"</strong> The Commission's website lists all approved quality auditors. Contact two or three, describe your service and ask for a quote and a timeline. Ask if they have experience auditing small SIL providers. Pick the one who seems genuinely helpful, not just the cheapest — a good auditor makes the process easier.</p>

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
    read: '10 min read',
    date: 'June 2026',
    body: `
<p>Going from "just me" to your first employee is a big step — and one that comes with real legal obligations. Get the paperwork right and you protect yourself, your worker and your participants. Get it wrong and you're exposed to underpayment claims, unfair dismissal risk and audit problems.</p>

<h2>Start with the right award: SCHADS</h2>
<p>Most disability support workers are covered by the <strong>Social, Community, Home Care and Disability Services (SCHADS) Award</strong>. It sets minimum pay rates, penalty rates for evenings and weekends, casual loading, overtime, broken-shift rules and minimum engagement periods. Paying "a fair hourly rate" you made up yourself is how providers accidentally underpay — and the penalties are steep.</p>

<h2>SCHADS classifications explained simply</h2>
<p>SCHADS uses a classification structure to determine pay rates. The level you assign to your worker determines their minimum hourly rate, so it's important to get it right from day one. In simple terms:</p>
<ul>
  <li><strong>Lower classifications</strong> — Generally apply to workers with limited qualifications and experience who are performing routine support tasks under supervision.</li>
  <li><strong>Higher classifications</strong> — Apply to workers with relevant qualifications (such as a Certificate III or IV in Individual Support), more experience, or who take on more complex or independent work.</li>
  <li><strong>Supervisory roles</strong> — If someone is responsible for supervising other workers or coordinating shifts, they're typically on a higher classification.</li>
</ul>
<p>Check the current SCHADS Award on the Fair Work Ombudsman website — it has a summary of each level and what it covers. When in doubt, get advice. Misclassifying a worker (usually classifying them too low to save money) is one of the most common compliance failures in the sector, and the Fair Work Ombudsman does investigate complaints.</p>

<h2>Casual vs permanent: the trade-offs</h2>
<p>Many new providers default to casual because it feels flexible. But there are real trade-offs:</p>
<ul>
  <li><strong>Casual workers</strong> — Get a 25% casual loading on their base rate. No obligation to offer regular shifts. No paid leave entitlements. Good for genuinely variable rosters, but can be expensive on a stable roster where you know exactly when you need someone.</li>
  <li><strong>Permanent part-time workers</strong> — Have a guaranteed minimum number of hours per week or fortnight. Accrue annual leave and personal leave. Lower hourly rate than casuals on equivalent hours (no loading). Better for participants too — consistent relationships with the same workers are a quality indicator auditors notice.</li>
</ul>
<p>There's also a provision in SCHADS around "regular casual" workers — if a casual has been engaged on a regular, systematic pattern for a period of time, they may have the right to request conversion to permanent employment. This is worth being aware of as you build your team.</p>

<h2>The documents you need before day one</h2>
<ul>
  <li><strong>An employment contract</strong> — permanent or casual, written to SCHADS, with the right classification and rate.</li>
  <li><strong>A position description</strong> — so the role and expectations are clear.</li>
  <li><strong>A code of conduct</strong> — aligned to the NDIS Code of Conduct.</li>
  <li><strong>Worker screening records</strong> — a valid NDIS Worker Screening Check, plus any other required checks.</li>
  <li><strong>An induction checklist</strong> — proof they were trained in your policies before they started.</li>
  <li><strong>A roster and timesheet system</strong> — that correctly applies SCHADS penalties and records hours.</li>
</ul>

<h2>Onboarding and induction: what to cover</h2>
<p>Your induction isn't just a paperwork exercise — it's your worker's first real understanding of how your service runs. Cover these areas before their first shift with a participant:</p>
<ul>
  <li><strong>Your key policies</strong> — Incident management, complaints, safeguarding, privacy. Not just handed to them — walked through so they understand what to do.</li>
  <li><strong>The NDIS Code of Conduct</strong> — Every support worker must understand and sign to acknowledge the Code. This is a legal requirement for registered providers.</li>
  <li><strong>Each participant's individual profile</strong> — Before their first shift, your worker should know the participant's support plan, communication preferences, any known health or safety considerations, and their individual risk assessment.</li>
  <li><strong>Emergency procedures</strong> — What to do in a fire, medical emergency, or if a participant goes missing. They need to know the procedure before they need it.</li>
  <li><strong>Reporting obligations</strong> — How to report an incident, how to raise a concern, and who to contact after hours if something happens.</li>
</ul>
<p>Record all of this on a signed induction checklist. Keep it in the worker's personnel file. This document is one of the first things an auditor asks for.</p>

<h2>Probation and supervision</h2>
<p>The probation period exists for a reason — it's your opportunity to assess whether the worker is a good fit before the full rights of ongoing employment apply. A few things to know:</p>
<ul>
  <li><strong>Keep the probation period reasonable and clearly stated in the contract</strong> — Check what's permissible under SCHADS and the Fair Work Act for your situation.</li>
  <li><strong>Conduct formal supervision sessions during probation</strong> — Not just a chat. A recorded meeting where you discuss how things are going, raise any concerns, and set expectations. Keep notes from each session.</li>
  <li><strong>Don't skip the paperwork if you need to end employment during probation</strong> — Even during probation, you should follow a fair and documented process. Get HR or legal advice if you're unsure.</li>
</ul>
<p>After probation, continue regular supervision — at least quarterly for most workers, more frequently for new or developing workers. Supervision records are an audit requirement in the governance quality area.</p>

<h2>Why this matters for your audit too</h2>
<p>Your staff documents aren't just an HR formality — auditors check them. "How do you make sure your workers are suitable and supported?" is a standard audit question, and your contracts, screening records and induction checklists are the answer.</p>

<h2>Record-keeping for audits</h2>
<p>For each worker, maintain a personnel file that includes:</p>
<ul>
  <li><strong>NDIS Worker Screening clearance</strong> — with the clearance number and expiry date.</li>
  <li><strong>Signed employment contract</strong> — including classification and rate.</li>
  <li><strong>Signed induction checklist</strong> — with dates.</li>
  <li><strong>Training records</strong> — any mandatory or additional training completed.</li>
  <li><strong>Supervision records</strong> — dates, key topics discussed, any actions agreed.</li>
  <li><strong>Performance management records</strong> — if applicable, any performance-related discussions documented.</li>
</ul>
<p>Store these files securely. Personnel records are confidential. If you're using paper files, they need to be in a locked cabinet. If digital, in a password-protected system with controlled access.</p>

<blockquote>Your first hire is the foundation of your team culture. Build it right from day one.</blockquote>

<div class="callout">
  <p><strong>Don't build these from scratch.</strong> Our HR &amp; Workforce Pack includes SCHADS-aware employment contracts, position descriptions, rosters, timesheets and induction checklists — personalised to your business. It comes bundled in our complete toolkit alongside your full document pack and every compliance tool.</p>
  <a class="cta-btn" href="/#pricing">See the complete toolkit &rarr;</a>
</div>

<h2>Common hiring mistakes small providers make</h2>
<ul>
  <li><strong>Paying a flat rate without checking the award</strong> — Even well-intentioned providers accidentally underpay when they don't check the SCHADS classification for their worker's role, qualifications and experience. Underpayment claims can be backdated.</li>
  <li><strong>Starting someone before their screening check is complete</strong> — This is a serious compliance breach. No worker should be supporting participants without a valid NDIS Worker Screening clearance. Apply early and don't cut corners.</li>
  <li><strong>Using a verbal agreement instead of a written contract</strong> — Verbal agreements create uncertainty and disputes. Always use a written contract, signed by both parties, before work begins.</li>
  <li><strong>Skipping the induction</strong> — Induction takes time, but it protects everyone. A worker who doesn't know your incident procedure or the participant's risk assessment is a liability on day one.</li>
  <li><strong>Not keeping records of training and supervision</strong> — If it's not written down, it didn't happen. Auditors will ask for training records and supervision logs. Verbal check-ins don't count.</li>
</ul>

<h2>Beyond the first hire: building a team culture from the start</h2>
<p>The way you hire and onboard your first worker sets the tone for every hire after that. Providers who take the time to do it properly — clear expectations, thorough induction, regular supervision, documented everything — tend to retain their workers better, have fewer HR problems, and find audits much less stressful. Providers who rush it tend to spend a lot of time fixing things later.</p>
<p>Your team culture starts with how you treat your first employee. Pay them correctly. Induct them properly. Supervise them regularly. Be clear about expectations and open about problems. Workers who feel supported and respected deliver better support to participants — and that's the whole point.</p>

<blockquote>Your first hire is the foundation of your team culture. Build it right from day one.</blockquote>

<div class="callout">
  <p><strong>Want to see what good workforce documentation looks like?</strong> Our free Audit Readiness Self-Assessment includes a workforce section — so you can check where you stand before your first hire starts.</p>
  <a class="cta-btn" href="/audit-readiness.html">Check my readiness &rarr;</a>
</div>

<h2>What to do if a worker isn't working out</h2>
<p>Even with a careful hire, sometimes it doesn't work out. If a worker's performance is a concern, deal with it early and document everything. Here's the general approach:</p>
<ul>
  <li><strong>Have a direct conversation</strong> — Be specific about the concern, not vague. "Your progress notes need to be more detailed and objective" is actionable. "Your work isn't quite right" is not.</li>
  <li><strong>Record the conversation</strong> — A supervision note or a brief follow-up email confirming what was discussed creates a record. If the situation escalates, this documentation matters.</li>
  <li><strong>Set clear expectations and a timeline</strong> — Tell the worker what improvement looks like and when you'll review. Give them a fair chance to meet the standard.</li>
  <li><strong>Get advice before you act</strong> — If you're considering ending employment, get advice from a workplace relations professional first. The Fair Work Act applies to you and the rules are worth understanding before you act.</li>
</ul>
<p>Performance management done well protects you, protects the worker, and protects your participants. Done poorly, it creates liability and bad feeling. When in doubt, seek advice.</p>

<h2>Hiring well: a simple checklist before day one</h2>
<ul>
  <li><strong>NDIS Worker Screening clearance confirmed?</strong> — Non-negotiable. No clearance, no start.</li>
  <li><strong>Employment contract signed?</strong> — With the correct SCHADS classification and rate. Both parties have a copy.</li>
  <li><strong>Position description provided?</strong> — So expectations are clear from day one.</li>
  <li><strong>Induction completed?</strong> — Key policies walked through, checklist signed and filed.</li>
  <li><strong>Participant introductions arranged?</strong> — The worker knows who they're supporting, has read the support plan, and understands any health or safety considerations.</li>
  <li><strong>Supervision schedule set?</strong> — First supervision within the first few weeks, and a regular cadence after that.</li>
  <li><strong>Code of Conduct acknowledged?</strong> — Signed and filed.</li>
</ul>

<h2>The real cost of getting it wrong</h2>
<p>Getting the paperwork wrong with your first hire can be expensive in ways that aren't immediately obvious. Underpayment claims under the Fair Work Act can be backdated for years — a worker who was paid $2 an hour under the SCHADS rate for two years represents a significant liability. Unfair dismissal claims for workers who weren't managed properly through a documented process can result in compensation payments and reputational damage. NDIS Commission concerns about a worker who was allowed to work without a valid screening check can jeopardise your registration.</p>
<p>None of these are hypothetical. They happen to small providers regularly. The paperwork burden can feel heavy at the start, but it's far lighter than the alternative.</p>

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
