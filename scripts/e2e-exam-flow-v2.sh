#!/bin/bash
# E2E v2: exam lifecycle — start screen, cookie resume, re-entry block, server-side time limit
set -e
BASE=http://localhost:3000
UA='User-Agent: af-e2e-agent'
J=/tmp/exam2.jar
rm -f $J
EMAIL="exam2$RANDOM@test.local"
PASS="Passw0rd!234"
QID="q$RANDOM"

echo "== register + login =="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\",\"displayName\":\"آزمون دو\",\"acceptTerms\":true}" > /dev/null
curl -s -c $J -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" > /dev/null

echo "== create timed quiz (10 min) =="
CREATE=$(curl -s -b $J -X POST $BASE/api/forms -H 'Content-Type: application/json' \
  -d '{"title":"آزمون زمان‌دار","formType":"quiz"}')
FID=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['form']['id'])")
PID=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['form']['publicId'])")
echo "FID=$FID PID=$PID"
curl -s -b $J -X PATCH $BASE/api/forms/$FID -H 'Content-Type: application/json' \
  -d '{"settings":{"timeLimitMinutes":10}}' | python3 -c "import sys,json;d=json.load(sys.stdin);print('timeLimit saved:',d.get('form',{}).get('settings',{}).get('timeLimitMinutes'))"
curl -s -b $J -X PUT $BASE/api/forms/$FID/questions -H "Content-Type: application/json" \
  -d "{\"questions\":[{\"id\":\"$QID\",\"type\":\"single_choice\",\"title\":\"۲+۲؟\",\"required\":true,\"position\":0,\"config\":{\"choices\":[{\"id\":\"c1\",\"label\":\"۳\"},{\"id\":\"c2\",\"label\":\"۴\"}]},\"scoring\":{\"points\":1,\"correctChoices\":[\"c2\"]}}]}" > /dev/null
curl -s -b $J -X PATCH $BASE/api/forms/$FID -H 'Content-Type: application/json' -d '{"status":"published"}' > /dev/null

C=/tmp/exam2.public.jar
rm -f $C

echo "== 1) probe before start (expect none) =="
curl -s -c $C $BASE/api/public/forms/$PID/attempt -H "$UA" | python3 -c "import sys,json;print('probe1:',json.load(sys.stdin)['status'])"

echo "== 2) start attempt (expect token+deadline+cookie) =="
S1=$(curl -s -c $C -X POST $BASE/api/public/forms/$PID/start -H 'Content-Type: application/json' -H "$UA" -d '{}')
DL1=$(echo "$S1" | python3 -c "import sys,json;print(json.load(sys.stdin)['deadline'])")
echo "$S1" | python3 -c "import sys,json;d=json.load(sys.stdin);print('start-ok:', 'attemptToken' in d and 'deadline' in d, '| resumed:', d.get('resumed'))"
grep -q "af_attempt_$PID" $C && echo "attempt-cookie: set" || echo "attempt-cookie: MISSING"

echo "== 3) probe again (expect active, same deadline = resume) =="
P2=$(curl -s -b $C -c $C $BASE/api/public/forms/$PID/attempt -H "$UA")
DL2=$(echo "$P2" | python3 -c "import sys,json;print(json.load(sys.stdin).get('deadline'))")
echo "$P2" | python3 -c "import sys,json;print('probe2:',json.load(sys.stdin)['status'])"
[ "$DL1" = "$DL2" ] && echo "deadline-preserved: yes ($DL1)" || echo "deadline-preserved: NO ($DL1 vs $DL2)"

echo "== 4) submit (expect ok, score 1/1, done-cookie) =="
TOKEN=$(echo "$S1" | python3 -c "import sys,json;print(json.load(sys.stdin)['attemptToken'])")
SUB=$(curl -s -b $C -c $C -X POST $BASE/api/public/forms/$PID/submit -H 'Content-Type: application/json' -H "$UA" \
  -d "{\"attemptToken\":\"$TOKEN\",\"answers\":{\"$QID\":\"c2\"}}")
echo "$SUB" | python3 -c "import sys,json;d=json.load(sys.stdin);print('submit-ok:',d.get('ok'),'| result:',d.get('result'))"
grep -q "af_done_$PID" $C && echo "done-cookie: set" || echo "done-cookie: MISSING"

echo "== 5) probe after submit (expect done) =="
curl -s -b $C $BASE/api/public/forms/$PID/attempt -H "$UA" | python3 -c "import sys,json;print('probe3:',json.load(sys.stdin)['status'])"

echo "== 6) start again (expect 403 already_participated) =="
curl -s -b $C -w "\nstart-again: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/start -H 'Content-Type: application/json' -H "$UA" -d '{}' | tail -2

echo "== 7) submit again without token (expect 409 max_attempts) =="
curl -s -b $C -o /dev/null -w "resubmit: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/submit -H 'Content-Type: application/json' -H "$UA" \
  -d "{\"answers\":{\"$QID\":\"c2\"}}"

echo "== 8) stale (forged-older) token from a FRESH respondent → 410 time_expired =="
STALE_UA='af-e2e-stale'
STALE=$(LOCAL_AUTH_SECRET="${LOCAL_AUTH_SECRET:-local-secret-0123456789}" node -e "
const crypto=require('node:crypto');
const secret='exam:'+(process.env.LOCAL_AUTH_SECRET||'');
const key=crypto.createHash('sha256').update('rk:::1:$STALE_UA').digest('hex').slice(0,40);
const body=Buffer.from(JSON.stringify({formId:'$FID',startedAt:Date.now()-20*60*1000,key:key})).toString('base64url');
const sig=crypto.createHmac('sha256',secret).update('attempt:'+body).digest('base64url');
console.log(body+'.'+sig);
")
curl -s -w "\nstale-token-submit: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/submit -H 'Content-Type: application/json' -H "User-Agent: $STALE_UA" \
  -d "{\"attemptToken\":\"$STALE\",\"answers\":{\"$QID\":\"c2\"}}" | tail -2

echo "== 9) untimed form unaffected (no start screen / no cookies) =="
CREATE2=$(curl -s -b $J -X POST $BASE/api/forms -H 'Content-Type: application/json' -d '{"title":"فرم ساده"}')
PID2=$(echo "$CREATE2" | python3 -c "import sys,json;print(json.load(sys.stdin)['form']['publicId'])")
FID2=$(echo "$CREATE2" | python3 -c "import sys,json;print(json.load(sys.stdin)['form']['id'])")
Q2="q$RANDOM"
curl -s -b $J -X PUT $BASE/api/forms/$FID2/questions -H "Content-Type: application/json" \
  -d "{\"questions\":[{\"id\":\"$Q2\",\"type\":\"short_text\",\"title\":\"نام شما\",\"required\":true,\"position\":0,\"config\":{}}]}" > /dev/null
curl -s -b $J -X PATCH $BASE/api/forms/$FID2 -H 'Content-Type: application/json' -d '{"status":"published"}' > /dev/null
curl -s $BASE/api/public/forms/$PID2/attempt | python3 -c "import sys,json;print('plain-form-probe:',json.load(sys.stdin)['status'])"
SUB2=$(curl -s -X POST $BASE/api/public/forms/$PID2/submit -H 'Content-Type: application/json' -d "{\"answers\":{\"$Q2\":\"علی\"}}")
echo "$SUB2" | python3 -c "import sys,json;print('plain-submit-ok:',json.load(sys.stdin).get('ok'))"

echo "== 10) health endpoint =="
curl -s $BASE/api/health | python3 -c "import sys,json;d=json.load(sys.stdin);print('health-ok:',d.get('ok'),'| mode:',d.get('mode'))"

echo "ALL DONE"
