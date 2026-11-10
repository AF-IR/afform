#!/usr/bin/env bash
# Golden-path click test: regenerate AI analysis from the reports UI.
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

echo "before: $(agent-browser get text @e80 2>/dev/null)"
agent-browser click @e80 >/dev/null 2>&1 && echo "click-ok"
sleep 3
agent-browser snapshot -i -c > /tmp/af-shots/loading-state.txt 2>/dev/null
grep -o "در حال تحلیل مجدد" /tmp/af-shots/loading-state.txt | head -1 && echo "loading-state-ok"

# wait for completion (AI call can take up to ~60s)
for i in $(seq 1 20); do
  agent-browser snapshot -i -c > /tmp/af-shots/after-regen.txt 2>/dev/null
  if grep -qE '"تحلیل مجدد"' /tmp/af-shots/after-regen.txt && ! grep -q "در حال تحلیل مجدد" /tmp/af-shots/after-regen.txt; then
    echo "regen-done (iteration $i)"; break
  fi
  sleep 5
done
grep -qE "خطا|ناموفق" /tmp/af-shots/after-regen.txt && grep -E "خطا|ناموفق" /tmp/af-shots/after-regen.txt | head -3
agent-browser screenshot /tmp/af-shots/reports-after-regen.png >/dev/null 2>&1 && echo "after-shot-ok"
echo "console-errors:"; agent-browser errors 2>/dev/null | head -4
agent-browser close >/dev/null 2>&1
echo "GOLDEN-PATH-DONE"
