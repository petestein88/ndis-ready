#!/usr/bin/env python3
"""Inject OG + Twitter meta tags into the standalone (non-generated) HTML pages.
Idempotent: skips a file that already contains 'og:image'. Inserts right after
the favicon <link> line, preserving its indentation."""
import re, sys, os

BASE = os.path.dirname(os.path.abspath(__file__))

# file -> (og_type, url_path, title, description, og_image_filename)
PAGES = {
    "index.html": (
        "website", "/",
        "NDIS Ready \u2014 Get and stay audit-ready",
        "65+ personalised NDIS compliance documents plus live tools \u2014 built for SIL providers who want to pass their audit with confidence.",
        "home.png",
    ),
    "tools-suite.html": (
        "website", "/tools-suite.html",
        "The NDIS Ready Toolkit \u2014 every tool to get and stay audit-ready",
        "Your personalised document pack plus an AI writer, business health check, audit self-assessment and mock audit simulator.",
        "home.png",
    ),
    "health-check.html": (
        "website", "/health-check.html",
        "Free NDIS Business Health Check",
        "Model your true cost per support hour and your real margin against NDIS price limits \u2014 in under a minute.",
        "is-your-ndis-business-making-money.png",
    ),
    "tools.html": (
        "website", "/tools.html",
        "AI Note & Incident Writer \u2014 NDIS Ready",
        "Turn rough shift notes into clean, audit-ready NDIS progress notes and incident reports in seconds.",
        "how-to-write-a-progress-note.png",
    ),
    "audit-readiness.html": (
        "website", "/audit-readiness.html",
        "Free NDIS Audit Readiness Self-Assessment",
        "Score yourself against the NDIS Practice Standards across seven quality areas and see your biggest gaps, ranked.",
        "ndis-practice-standards-plain-english.png",
    ),
    "mock-audit.html": (
        "website", "/mock-audit.html",
        "NDIS Mock Audit Interview Simulator",
        "Answer the questions a real NDIS auditor asks on the day and find the gaps between your practice and your paperwork.",
        "what-an-ndis-auditor-asks.png",
    ),
    "quiz.html": (
        "website", "/quiz.html",
        "Find the NDIS documents your business needs",
        "Take the free 2-minute quiz to get a personalised compliance checklist and three sample documents to download right away.",
        "ndis-sil-registration-checklist.png",
    ),
}

SITE = "https://ndis-ready.com.au"

def esc(s):
    return s.replace("&", "&amp;").replace('"', "&quot;")

def block(og_type, url_path, title, desc, img):
    url = SITE + url_path
    img_url = SITE + "/og/" + img
    t, d = esc(title), esc(desc)
    return (
        f'  <link rel="canonical" href="{url}" />\n'
        f'  <!-- Open Graph / Facebook -->\n'
        f'  <meta property="og:type" content="{og_type}" />\n'
        f'  <meta property="og:site_name" content="NDIS Ready" />\n'
        f'  <meta property="og:url" content="{url}" />\n'
        f'  <meta property="og:title" content="{t}" />\n'
        f'  <meta property="og:description" content="{d}" />\n'
        f'  <meta property="og:image" content="{img_url}" />\n'
        f'  <meta property="og:image:width" content="1200" />\n'
        f'  <meta property="og:image:height" content="630" />\n'
        f'  <meta property="og:image:alt" content="{t}" />\n'
        f'  <!-- Twitter -->\n'
        f'  <meta name="twitter:card" content="summary_large_image" />\n'
        f'  <meta name="twitter:title" content="{t}" />\n'
        f'  <meta name="twitter:description" content="{d}" />\n'
        f'  <meta name="twitter:image" content="{img_url}" />\n'
    )

fav_re = re.compile(r'^([ \t]*)<link rel="icon"[^>]*>\s*$', re.MULTILINE)

changed = []
skipped = []
for fname, cfg in PAGES.items():
    path = os.path.join(BASE, fname)
    if not os.path.exists(path):
        print(f"  MISSING {fname}"); continue
    html = open(path, encoding="utf-8").read()
    if "og:image" in html:
        skipped.append(fname); continue
    m = fav_re.search(html)
    if not m:
        print(f"  NO FAVICON LINE in {fname} \u2014 skipped"); continue
    insert = block(*cfg)
    # insert right after the favicon line
    end = m.end()
    new_html = html[:end] + "\n" + insert + html[end:]
    open(path, "w", encoding="utf-8").write(new_html)
    changed.append(fname)

print("Injected OG into:", ", ".join(changed) if changed else "(none)")
if skipped:
    print("Already had OG (skipped):", ", ".join(skipped))
