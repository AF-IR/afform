#!/bin/bash
# E2E: secure-exam identity gate — whitelist + one-entry-per-national-ID
set -e
BASE=http://localhost:3000
J=/tmp/exam.jar
rm -f $J
EMAIL="exam$RANDOM@test.local"
PASS="Passw0rd!234"
# checksum-valid national IDs (computed from base digits)
NID_OK1="0010532129"
NID_OK2="7682170621"
NID_OUT="1234567891"

echo "== register + login =="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\",\"displayName\":\"آزمون چک\",\"acceptTerms\":true}" > /dev/null
curl -s -c $J -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" > /dev/null

echo "== create quiz, then PATCH settings with identity gate (whitelist: $NID_OK1, $NID_OK2) =="
CREATE=$(curl -s -b $J -X POST $BASE/api/forms -H 'Content-Type: application/json' \
  -d '{"title":"آزمون امن","formType":"quiz"}')
FID=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['form']['id'])")
PID=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['form']['publicId'])")
echo "FID=$FID PID=$PID"
curl -s -b $J -X PATCH $BASE/api/forms/$FID -H 'Content-Type: application/json' \
  -d '{"settings":{"timeLimitMinutes":10,"identityGate":{"enabled":true,"requireFullName":true,"requireNationalId":true,"allowedNationalIds":["0010532129","7682170621"]}}}' \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('gate-saved:',d.get('form',{}).get('settings',{}).get('identityGate',{}).get('enabled'))"

echo "== save one scored question =="
curl -s -b $J -X PUT $BASE/api/forms/$FID/questions -H 'Content-Type: application/json' \
  -d '{"questions":[{"id":"q1","type":"single_choice","title":"۲+۲؟","required":true,"position":0,"config":{"choices":[{"id":"c1","label":"۳"},{"id":"c2","label":"۴"}]},"scoring":{"points":1,"correctChoices":["c2"]}}]}' > /dev/null
curl -s -b $J -X PATCH $BASE/api/forms/$FID -H 'Content-Type: application/json' -d '{"status":"published"}' > /dev/null

echo "== start WITHOUT identity (expect 422/403) =="
curl -s -o /dev/null -w "start-no-identity: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/start

echo "== start with non-whitelisted valid ID (expect 403 identity_not_allowed) =="
curl -s -w "\nstart-outsider: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/start \
  -H 'Content-Type: application/json' -d "{\"identity\":{\"fullName\":\"بازدیدکننده\",\"nationalId\":\"$NID_OUT\"}}"

echo "== start with whitelisted ID (expect 200 + token) =="
START=$(curl -s -X POST $BASE/api/public/forms/$PID/start -H 'Content-Type: application/json' \
  -d "{\"identity\":{\"fullName\":\"علی رضایی\",\"nationalId\":\"$NID_OK1\"}}")
echo "$START" | python3 -c "import sys,json;d=json.load(sys.stdin);print('start-ok:', 'attemptToken' in d)"

echo "== submit with whitelisted ID (expect ok + score 1/1) =="
SUB=$(curl -s -X POST $BASE/api/public/forms/$PID/submit -H 'Content-Type: application/json' \
  -d "{\"attemptToken\":\"$(echo "$START" | python3 -c "import sys,json;print(json.load(sys.stdin)['attemptToken'])")\",\"answers\":{\"q1\":\"c2\"},\"identity\":{\"fullName\":\"علی رضایی\",\"nationalId\":\"$NID_OK1\"}}")
echo "$SUB" | python3 -c "import sys,json;d=json.load(sys.stdin);print('submit-ok:',d.get('ok'),'| result:',d.get('result'))"

echo "== submit AGAIN with same ID (expect 403 identity_already_used) =="
curl -s -w "\nresubmit: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/submit -H 'Content-Type: application/json' \
  -d "{\"answers\":{\"q1\":\"c2\"},\"identity\":{\"fullName\":\"علی رضایی\",\"nationalId\":\"$NID_OK1\"}}"

echo "== invalid checksum ID (expect 422) =="
curl -s -o /dev/null -w "bad-checksum: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/start \
  -H 'Content-Type: application/json' -d '{"identity":{"fullName":"تست","nationalId":"1111111111"}}'

echo "== owner sees identity in responses =="
curl -s -b $J "$BASE/api/forms/$FID/responses" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=d['rows'][0]
print('name:',r.get('respondentName'),'| nid:',r.get('respondentNationalId'),'| score:',r.get('totalScore'))"

echo "== identity appears in CSV export =="
curl -s -b $J "$BASE/api/forms/$FID/export?format=csv" | head -2
