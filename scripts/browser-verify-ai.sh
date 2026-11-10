#!/usr/bin/env bash
# Browser self-verification (single tool-call: server + agent-browser together)
set -u
cd /home/z/my-project

# 1) start dev server detached
setsid bash -c 'exec bun run dev' >/dev/null 2>&1 < /dev/null & disown
for i in $(seq 1 45); do curl -s -o /dev/null --max-time 3 http://localhost:3000/ && break; sleep 1; done
echo "server-up"

FORM_ID="cmw6mbm8r0002sl7emwjn7gm4"
mkdir -p /tmp/af-shots

# 2) landing page + mega menu check
agent-browser open http://localhost:3000/ >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
echo "TITLE: $(agent-browser get title)"
agent-browser snapshot -i -c > /tmp/af-shots/landing-snap.txt 2>/dev/null
if grep -qiE "مگا|منوی محصولات|همه امکانات" /tmp/af-shots/landing-snap.txt; then echo "MEGA-MENU: found"; else echo "MEGA-MENU: not-in-snapshot (checking hover trigger)"; grep -iE "امکانات|محصولات|راهنما" /tmp/af-shots/landing-snap.txt | head -5; fi
agent-browser screenshot /tmp/af-shots/landing.png >/dev/null 2>&1 && echo "landing-shot-ok"

# 3) session cookie → dashboard reports page
SESSION=$(awk '$6=="af_session" {print $7}' /tmp/af-e2e-cookies.txt | tail -1)
if [ -z "$SESSION" ]; then echo "NO-SESSION-COOKIE"; exit 1; fi
agent-browser cookies set af_session "$SESSION" >/dev/null 2>&1
agent-browser open "http://localhost:3000/dashboard/forms/$FORM_ID/reports" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2
echo "REPORTS-URL: $(agent-browser get url)"
agent-browser snapshot -i -c > /tmp/af-shots/reports-snap.txt 2>/dev/null
if grep -q "تحلیل هوش مصنوعی نتایج" /tmp/af-shots/reports-snap.txt; then echo "AI-CARD: rendered"; else echo "AI-CARD: MISSING"; fi
if grep -q "یافته‌های کلیدی" /tmp/af-shots/reports-snap.txt; then echo "AI-INSIGHTS: rendered"; fi
if grep -q "پیشنهادهای بهبود" /tmp/af-shots/reports-snap.txt; then echo "AI-SUGGESTIONS: rendered"; fi
agent-browser screenshot /tmp/af-shots/reports.png >/dev/null 2>&1 && echo "reports-shot-ok"

# 4) golden path: click regenerate → wait → confirm new analysis
agent-browser find text "تحلیل مجدد" click >/dev/null 2>&1 && echo "clicked-regenerate" || echo "regenerate-click-failed"
sleep 45
agent-browser snapshot -i -c > /tmp/af-shots/reports-after.txt 2>/dev/null
if grep -q "تحلیل مجدد" /tmp/af-shots/reports-after.txt && ! grep -q "در حال تحلیل مجدد" /tmp/af-shots/reports-after.txt; then echo "REGENERATE: completed"; else echo "REGENERATE: state unclear (checking errors)"; grep -iE "خطا|error" /tmp/af-shots/reports-after.txt | head -3; fi

# 5) console errors
agent-browser errors 2>/dev/null | head -5
agent-browser close >/dev/null 2>&1
echo "BROWSER-VERIFY-DONE"
