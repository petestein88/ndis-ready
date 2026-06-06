#!/usr/bin/env python3
"""Align privacy.html and terms-of-service.html with the main site:
 - inject OG / Twitter / canonical tags (idempotent)
 - enrich nav with Tools / Blog / Pricing links to match main site
 - normalise footer (fixes the broken /terms-of-service self-link)
"""
import re, pathlib

BASE = "https://ndis-ready.com.au"

PAGES = {
    "privacy.html": {
        "url": f"{BASE}/privacy.html",
        "title": "Privacy Policy — NDIS Ready",
        "desc": "How NDIS Ready (Sacred Systems Pty Ltd) collects, uses, and protects your personal information under the Privacy Act 1988.",
        "og_image": f"{BASE}/og/home.png",
    },
    "terms-of-service.html": {
        "url": f"{BASE}/terms-of-service.html",
        "title": "Terms of Service — NDIS Ready",
        "desc": "Terms of Service for NDIS Ready, a product of Sacred Systems Pty Ltd.",
        "og_image": f"{BASE}/og/home.png",
    },
}

def og_block(p):
    return f'''  <link rel="canonical" href="{p['url']}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="NDIS Ready" />
  <meta property="og:url" content="{p['url']}" />
  <meta property="og:title" content="{p['title']}" />
  <meta property="og:description" content="{p['desc']}" />
  <meta property="og:image" content="{p['og_image']}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="NDIS Ready" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{p['title']}" />
  <meta name="twitter:description" content="{p['desc']}" />
  <meta name="twitter:image" content="{p['og_image']}" />
'''

# Canonical nav (matches main-site links; keeps each page's existing logo styles)
NAV_LINKS = (
    '  <div style="display:flex;align-items:center;gap:1.25rem;">\n'
    '    <a href="/tools-suite.html" style="font-size:0.875rem;font-weight:600;color:var(--ink-mid);text-decoration:none;">Tools</a>\n'
    '    <a href="/blog.html" style="font-size:0.875rem;font-weight:600;color:var(--ink-mid);text-decoration:none;">Blog</a>\n'
    '    <a href="/#pricing" style="font-size:0.875rem;font-weight:600;color:var(--ink-mid);text-decoration:none;">Pricing</a>\n'
    '    <a href="/quiz.html" class="nav-cta">Take the quiz →</a>\n'
    '  </div>\n'
)

FOOTER = (
    '<footer>\n'
    '  <div class="footer-logo">NDIS Ready</div>\n'
    '  <p style="margin-bottom:0.75rem;">by <a href="https://sacred.systems" target="_blank" rel="noopener">Sacred Systems Pty Ltd</a> &nbsp;·&nbsp; ABN 23 690 792 655 &nbsp;·&nbsp; <a href="mailto:hello@ndis-ready.com.au">hello@ndis-ready.com.au</a></p>\n'
    '  <p style="margin-bottom:0.75rem;">\n'
    '    <a href="/">Home</a> &nbsp;·&nbsp;\n'
    '    <a href="/blog.html">Blog</a> &nbsp;·&nbsp;\n'
    '    <a href="/terms-of-service.html">Terms of Service</a> &nbsp;·&nbsp;\n'
    '    <a href="/privacy.html">Privacy Policy</a>\n'
    '  </p>\n'
    '  <p>This platform provides compliance tools and document templates. It does not constitute legal or registration advice.</p>\n'
    '</footer>'
)

for fname, p in PAGES.items():
    path = pathlib.Path(fname)
    html = path.read_text(encoding="utf-8")

    # 1. OG tags — idempotent: skip if og:title already present
    if "og:title" not in html:
        html = html.replace("</title>", "</title>\n" + og_block(p), 1)

    # 2. Nav — replace the single CTA link with the full link group.
    #    Each page has exactly one nav-cta or nav-back anchor after the logo.
    html = re.sub(
        r'(<a href="/" class="nav-logo">NDIS Ready</a>)\s*\n\s*<a href="[^"]*" class="nav-(?:cta|back)">[^<]*</a>',
        r'\1\n' + NAV_LINKS,
        html, count=1,
    )

    # 3. Footer — replace whole <footer>...</footer> block
    html = re.sub(r'<footer>.*?</footer>', FOOTER, html, count=1, flags=re.DOTALL)

    path.write_text(html, encoding="utf-8")
    print(f"patched {fname}")
