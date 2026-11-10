#!/usr/bin/env bash
# Clean golden-path test: fresh refs, semantic click, verified completion.
set -u
cd /home/z/my-project
setsid bash -c 'exec bun run dev' >/dev/null 2>&1 < /dev/null & disown
for i in $(seq 1 45); do curl -s -o /dev/null --max-time 3 http://localhost:3000/ && break; sleep 1; done

FORM_ID="cmw6mbm8r0002sl7emwjn7gm4"
SESSION=$(awk '$6=="af_session" {print $7}' /tmp/af-e2e-cookies.txt | tail -1)
agent-browser cookies set af_session "$SESSION" >/dev/null 2>&1
agent-browser open "http://localhost:3000/dashboard/forms/$FORM_ID/reports" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 2

# click the regenerate button by accessible name (fresh session)
if agent-browser find role button click --name "تحلیل مجدد" >/dev/null 2>&1; then echo "click-ok"; else echo "click-failed"; fi

# poll until the button returns to normal state or an error shows
DONE=no
for i in $(seq 1 18); do
  sleep 5
  S=$(agent-browser snapshot -i -c 2>/dev/null)
  if echo "$S" | grep -q "در حال تحلیل مجدد"; then continue; fi
  if echo "$S" | grep -q '"تحلیل مجدد"'; then DONE=yes; echo "regen-completed (~$((i*5))s)"; break; fi
  if echo "$S" | grep -qE "خطا"; then DONE=err; echo "error-shown:"; echo "$S" | grep -E "خطا" | head -2; break; fi
done
[ "$DONE" = no ] && echo "regen-unknown-timeout"
agent-browser screenshot /tmp/af-shots/reports-final.png >/dev/null 2>&1 && echo "final-shot-ok"
echo "console:"; agent-browser errors 2>/dev/null | head -3
agent-browser close >/dev/null 2>&1
echo CLEAN-GOLDEN-PATH-DONE
