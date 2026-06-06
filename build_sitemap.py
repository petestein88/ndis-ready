#!/usr/bin/env python3
"""Regenerate sitemap.xml with all public pages at the canonical non-www host."""
import glob, datetime, pathlib

BASE = "https://ndis-ready.com.au"
TODAY = datetime.date.today().isoformat()

# Exclude transactional / token-gated / utility pages from the sitemap.
EXCLUDE = {"thank-you.html", "download.html", "profile.html"}

# Priority hints
PRIORITY = {
    "index.html": "1.0",
    "quiz.html": "0.9",
    "tools-suite.html": "0.8",
    "blog.html": "0.7",
}

def url_for(path):
    # index.html -> root
    if path == "index.html":
        return BASE + "/"
    return f"{BASE}/{path}"

entries = []

# Top-level pages
for f in sorted(glob.glob("*.html")):
    if f in EXCLUDE:
        continue
    loc = url_for(f)
    pr = PRIORITY.get(f, "0.6")
    entries.append((loc, pr))

# Blog posts
for f in sorted(glob.glob("blog/*.html")):
    entries.append((f"{BASE}/{f}", "0.6"))

lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for loc, pr in entries:
    lines += [
        "  <url>",
        f"    <loc>{loc}</loc>",
        f"    <lastmod>{TODAY}</lastmod>",
        f"    <priority>{pr}</priority>",
        "  </url>",
    ]
lines.append("</urlset>")

pathlib.Path("sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"sitemap.xml written with {len(entries)} URLs")
for loc, _ in entries:
    print("  ", loc)
