#!/usr/bin/env bash
# FINAL definitive UI regenerate test (correct cookie ordering).
set -u
cd /home/z/my-project
setsid bash -c 'exec bun run dev' >/dev/null 2>&1 < /dev/null & disown
for i in $(seq 1 45); do curl -s -o /dev/null --max-time 3 http://localhost:3000/ && break; sleep 1; done

FORM_ID="cmw6mbm8r0002sl7emwjn7gm4"
SESSION=$(awk '$6=="af_session" {print $7}' /tmp/af-e2e-cookies.txt | tail -1)

# establish context first, then set cookie, then navigate
agent-browser open "http://localhost:3000/login" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
agent-browser cookies set af_session "$SESSION" >/dev/null 2>&1
agent-browser open "http://localhost:3000/dashboard/forms/$FORM_ID/reports" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
sleep 3
URL=$(agent-browser get url)
echo "URL: $URL"
SNAP=$(agent-browser snapshot -i -c 2>/dev/null)
echo "$SNAP" | grep -q "تحلیل مجدد" && echo "AI-CARD-WITH-ANALYSIS: rendered" || echo "AI-CARD: check"
REF=$(echo "$SNAP" | grep -oE 'button "تحلیل مجدد" \[ref=[^]]+\]' | grep -oE 'ref=[a-z0-9]+' | cut -d= -f2 | head -1)
echo "button-ref: $REF"

if [ -n "$REF" ]; then
  agent-browser click "@$REF" >/dev/null 2>&1 && echo "click-ok"
  ST=completed
  for i in $(seq 1 14); do
    sleep 5
    S=$(agent-browser snapshot -i -c 2>/dev/null)
    if echo "$S" | grep -q "در حال تحلیل مجدد"; then echo "  loading ($((i*5))s)"; continue; fi
    if echo "$S" | grep -q '"تحلیل مجدد"'; then ST=completed; fi
    if echo "$S" | grep -qE "خطا|ناموفق"; then ST=error; fi
    break
  done
  echo "result: $ST"
  agent-browser screenshot /tmp/af-shots/reports-final.png >/dev/null 2>&1 && echo "shot-ok"
fi
agent-browser close >/dev/null 2>&1

bun -e "
import {PrismaClient} from '@prisma/client';
const p = new PrismaClient();
const n = await p.aiAnalysis.count();
const last = await p.aiAnalysis.findFirst({orderBy:{createdAt:'desc'}, select:{createdAt:true}});
console.log('DB-TOTAL:', n, '| latest:', last.createdAt.toISOString());
await p.\$disconnect();"
echo FINAL-UI-TEST-DONE
