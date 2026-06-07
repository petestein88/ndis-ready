#!/usr/bin/env python3
"""Inject a consistent contact button + popup modal into every page.
Idempotent: re-running replaces the existing block between the markers."""
import re, glob, os

START = "<!-- CONTACT_WIDGET_START -->"
END = "<!-- CONTACT_WIDGET_END -->"

CSS = """
  <style id="contact-widget-css">
    .contact-fab { position: fixed; top: 1rem; right: 1rem; z-index: 9998; display: inline-flex; align-items: center; gap: 0.45rem; background: linear-gradient(135deg, #b8acdf, #e8a0a0); color: #fff; font-family: 'Nunito', system-ui, -apple-system, sans-serif; font-size: 0.85rem; font-weight: 800; padding: 0.6rem 1.25rem; border: none; border-radius: 999px; cursor: pointer; text-decoration: none; box-shadow: 0 4px 16px rgba(184,172,223,0.5); transition: transform 0.15s, box-shadow 0.2s; }
    .contact-fab:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(184,172,223,0.65); }
    .contact-fab svg { flex-shrink: 0; }
    @media (max-width: 640px) { .contact-fab { font-size: 0.78rem; padding: 0.5rem 0.9rem; top: 0.6rem; right: 0.6rem; } .contact-fab .cf-label { display: none; } }
    .contact-overlay { position: fixed; inset: 0; background: rgba(42,37,53,0.55); backdrop-filter: blur(3px); display: none; align-items: center; justify-content: center; z-index: 9999; padding: 1.25rem; }
    .contact-overlay.open { display: flex; }
    .contact-modal { background: #fff; border-radius: 20px; max-width: 480px; width: 100%; padding: 2rem 2rem 1.75rem; box-shadow: 0 24px 60px rgba(42,37,53,0.3); position: relative; font-family: 'DM Sans', system-ui, sans-serif; max-height: 92vh; overflow-y: auto; }
    .contact-modal h3 { font-family: 'DM Serif Display', Georgia, serif; font-size: 1.5rem; line-height: 1.2; color: #2a2535; margin: 0 0 0.5rem; }
    .contact-modal .cm-sub { font-size: 0.95rem; color: #5a5370; margin: 0 0 1.25rem; line-height: 1.55; }
    .contact-modal label { display: block; font-size: 0.8rem; font-weight: 700; color: #2a2535; margin: 0.75rem 0 0.3rem; }
    .contact-modal input, .contact-modal textarea { width: 100%; font-family: inherit; font-size: 0.95rem; padding: 0.7rem 0.9rem; border: 1.5px solid #e2ddd3; border-radius: 12px; background: #faf8f4; color: #2a2535; box-sizing: border-box; }
    .contact-modal input:focus, .contact-modal textarea:focus { outline: none; border-color: #b8acdf; }
    .contact-modal textarea { resize: vertical; min-height: 110px; }
    .contact-modal .cm-send { margin-top: 1.1rem; width: 100%; background: #2a2535; color: #fff; font-family: 'Nunito', system-ui, sans-serif; font-weight: 800; font-size: 0.95rem; padding: 0.85rem; border: none; border-radius: 999px; cursor: pointer; transition: background 0.2s; }
    .contact-modal .cm-send:hover { background: #3d3650; }
    .contact-modal .cm-send:disabled { opacity: 0.6; cursor: default; }
    .contact-modal .cm-close { position: absolute; top: 1rem; right: 1.1rem; background: none; border: none; font-size: 1.5rem; line-height: 1; color: #9990b0; cursor: pointer; }
    .contact-modal .cm-status { margin-top: 0.9rem; font-size: 0.9rem; text-align: center; min-height: 1.2rem; }
    .contact-modal .cm-status.ok { color: #2f8a5a; font-weight: 700; }
    .contact-modal .cm-status.err { color: #d42b2b; font-weight: 700; }
  </style>
"""

MODAL = """
  <button class="contact-fab" type="button" onclick="openContact()" aria-label="Contact us">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    <span class="cf-label">We're here to help &rarr;</span>
  </button>
  <div class="contact-overlay" id="contactOverlay" role="dialog" aria-modal="true" aria-labelledby="cmTitle">
    <div class="contact-modal">
      <button class="cm-close" type="button" aria-label="Close" onclick="closeContact()">&times;</button>
      <h3 id="cmTitle">Got an idea? Question? Suggestion? Request?</h3>
      <p class="cm-sub">Let us know &mdash; we love hearing from the community. Tell us what you want more of, what you're unsure about, or anything we can help with. A real person reads every message.</p>
      <form id="contactForm" onsubmit="return submitContact(event)">
        <label for="cmName">Your name</label>
        <input type="text" id="cmName" name="name" placeholder="First name is fine" />
        <label for="cmEmail">Your email <span style="font-weight:400;color:#9990b0;">(so we can reply)</span></label>
        <input type="email" id="cmEmail" name="email" placeholder="you@example.com" />
        <label for="cmMsg">Your message</label>
        <textarea id="cmMsg" name="message" placeholder="Type anything here..." required></textarea>
        <input type="text" id="cmCompany" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" />
        <button type="submit" class="cm-send" id="cmSend">Send it through &rarr;</button>
        <div class="cm-status" id="cmStatus" aria-live="polite"></div>
      </form>
    </div>
  </div>
  <script id="contact-widget-js">
    function openContact(){var o=document.getElementById('contactOverlay');o.classList.add('open');setTimeout(function(){var m=document.getElementById('cmMsg');if(m)m.focus();},50);}
    function closeContact(){document.getElementById('contactOverlay').classList.remove('open');}
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeContact();});
    document.addEventListener('click',function(e){if(e.target&&e.target.id==='contactOverlay')closeContact();});
    async function submitContact(e){
      e.preventDefault();
      var btn=document.getElementById('cmSend'), st=document.getElementById('cmStatus');
      var name=(document.getElementById('cmName').value||'').trim();
      var email=(document.getElementById('cmEmail').value||'').trim();
      var msg=(document.getElementById('cmMsg').value||'').trim();
      if(!msg){st.className='cm-status err';st.textContent='Please type a message first.';return false;}
      btn.disabled=true;btn.textContent='Sending...';st.className='cm-status';st.textContent='';
      try{
        var company=(document.getElementById('cmCompany').value||'');
        var res=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,email:email,message:msg,company:company,page:location.pathname})});
        if(res.ok){st.className='cm-status ok';st.textContent='Thank you! We\\'ve got your message and will be in touch.';document.getElementById('contactForm').reset();setTimeout(closeContact,2200);}
        else{var d=await res.json().catch(function(){return{};});st.className='cm-status err';st.textContent=d.error||'Something went wrong. Please email hello@ndis-ready.com.au directly.';}
      }catch(err){st.className='cm-status err';st.textContent='Network error. Please email hello@ndis-ready.com.au directly.';}
      btn.disabled=false;btn.textContent='Send it through \\u2192';
      return false;
    }
  </script>
"""

BLOCK = START + "\n" + CSS + MODAL + "\n  " + END

_root = os.path.dirname(os.path.abspath(__file__))
files = sorted(glob.glob(os.path.join(_root, "*.html"))) + \
        sorted(glob.glob(os.path.join(_root, "blog", "*.html")))
changed = []
for path in files:
    html = open(path, encoding="utf-8").read()
    # 1) Remove any prior widget block (idempotent)
    html = re.sub(re.escape(START) + r".*?" + re.escape(END), "", html, flags=re.DOTALL)
    # 2) Insert the block just before </body>
    if "</body>" in html:
        html = html.replace("</body>", BLOCK + "\n</body>", 1)
        open(path, "w", encoding="utf-8").write(html)
        changed.append(os.path.basename(path))

print("Injected contact widget into:", ", ".join(changed))
