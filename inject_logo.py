#!/usr/bin/env python3
"""Apply one clean, consistent NDIS Ready logo across every page.

Removes the patchy feTurbulence noise filter and standardises the mark.
Each page gets a uniquely-id'd gradient so multiple inline SVGs never collide.
"""
import re
import glob
import os

ICON_TEMPLATE = (
    '<svg width="32" height="32" viewBox="0 0 100 100" fill="none" '
    'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" '
    'style="flex-shrink:0;">'
    '<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0.35" y2="1">'
    '<stop offset="0%" stop-color="#cabdf6"/>'
    '<stop offset="100%" stop-color="#a18fd6"/>'
    '</linearGradient></defs>'
    '<path d="M50 5 L88 19 L88 51 Q88 77 50 95 Q12 77 12 51 L12 19 Z" '
    'fill="url(#{gid})"/>'
    '<path d="M50 5 L88 19 L88 51 Q88 77 50 95 Q12 77 12 51 L12 19 Z" '
    'fill="none" stroke="#8a76c2" stroke-width="3.5"/>'
    '<path d="M50 65 Q31 51 31 41 Q31 33 39.5 33 Q45 33 50 39.5 '
    'Q55 33 60.5 33 Q69 33 69 41 Q69 51 50 65 Z" fill="#ffffff" opacity="0.95"/>'
    '</svg>'
)

# the clean inner markup (paths only) used to replace existing svg innards
def clean_svg(gid):
    return ICON_TEMPLATE.format(gid=gid)


def process(path):
    fn = os.path.basename(path)
    gid = "navLogo_" + re.sub(r'[^a-z0-9]', '', fn.replace('.html', '').lower())
    with open(path, encoding="utf-8") as f:
        html = f.read()
    orig = html

    # CASE A: existing inline SVG inside the nav-logo anchor (noise-filter or plain).
    # Replace the entire <svg ...>...</svg> that sits inside class="nav-logo".
    m = re.search(r'(<a[^>]*class="nav-logo"[^>]*>)(\s*)<svg.*?</svg>',
                  html, flags=re.DOTALL)
    if m:
        html = html[:m.start()] + m.group(1) + "\n      " + clean_svg(gid) + html[m.end():]
    else:
        # CASE B: text-only nav-logo -> inject icon before the text.
        m2 = re.search(r'(<a[^>]*class="nav-logo"[^>]*>)(\s*)(NDIS Ready)',
                       html)
        if m2:
            html = (html[:m2.start()] + m2.group(1) + clean_svg(gid)
                    + " NDIS Ready" + html[m2.end():])
            # ensure the nav-logo is a flex row so icon + text align
            html = re.sub(
                r'(\.nav-logo\s*\{)([^}]*?)\}',
                lambda mm: mm.group(0) if 'display:flex' in mm.group(2).replace(' ', '')
                else mm.group(1) + mm.group(2).rstrip().rstrip(';') +
                ';display:inline-flex;align-items:center;gap:0.55rem;}',
                html, count=1)

    if html != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"updated {fn}")
    else:
        print(f"-- no change {fn}")


if __name__ == "__main__":
    for p in sorted(glob.glob(os.path.join(os.path.dirname(__file__), "*.html"))):
        process(p)
