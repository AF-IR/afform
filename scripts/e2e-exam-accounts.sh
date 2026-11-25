#!/bin/bash
# E2E v3: account-based exam — username/password entry, one attempt per account,
# result lookup with the SAME credentials, password-leak guard, image upload.
set -e
BASE=http://localhost:3000
UA='User-Agent: af-e2e-v3'
J=/tmp/e3.owner.jar
rm -f $J /tmp/e3.stu1.jar /tmp/e3.stu2.jar
EMAIL="e3$RANDOM@test.local"
QID1="q$RANDOM"
QID2="q$RANDOM"
PASS="Passw0rd!234"

echo "== register + login owner =="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\",\"displayName\":\"آزمون سه\",\"acceptTerms\":true}" > /dev/null
curl -s -c $J -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" > /dev/null

echo "== create quiz with exam accounts =="
CREATE=$(curl -s -b $J -X POST $BASE/api/forms -H 'Content-Type: application/json' -d '{"title":"آزمون ریاضی","formType":"quiz"}')
FID=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['form']['id'])")
PID=$(echo "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['form']['publicId'])")
echo "FID=$FID PID=$PID"

curl -s -b $J -X PATCH $BASE/api/forms/$FID -H 'Content-Type: application/json' -d '{
  "settings": {
    "timeLimitMinutes": 10,
    "showResultsToRespondent": true,
    "resultRelease": "immediately",
    "examAccounts": {
      "enabled": true,
      "accounts": [
        {"username":"student01","password":"ab3x9f","name":"علی رضایی"},
        {"username":"student02","password":"k7p2mn","name":"سارا محمدی"}
      ]
    }
  }
}' | python3 -c "import sys,json;d=json.load(sys.stdin);s=d['form']['settings'];print('accounts saved:',len(s['examAccounts']['accounts']),'| release:',s['resultRelease'])"

echo "== save questions (with math title + image data URL) =="
IMG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
curl -s -b $J -X PUT $BASE/api/forms/$FID/questions -H 'Content-Type: application/json' -d "{
  \"questions\": [
    {\"id\":\"$QID1\",\"type\":\"single_choice\",\"title\":\"حاصل 2^3 چقدر است؟\",\"required\":true,\"position\":0,
     \"config\":{\"choices\":[{\"id\":\"c1\",\"label\":\"6\"},{\"id\":\"c2\",\"label\":\"8\"},{\"id\":\"c3\",\"label\":\"9\"}],\"imageUrl\":\"$IMG\"},
     \"scoring\":{\"points\":2,\"correctChoices\":[\"c2\"]}},
    {\"id\":\"$QID2\",\"type\":\"boolean\",\"title\":\"sqrt{16} برابر 4 است.\",\"required\":true,\"position\":1,
     \"config\":{},\"scoring\":{\"points\":1,\"correctBoolean\":true}}
  ]
}" | python3 -c "import sys,json;print('questions saved:',json.load(sys.stdin).get('count'))"

curl -s -b $J -X PATCH $BASE/api/forms/$FID -H 'Content-Type: application/json' -d '{"status":"published"}' > /dev/null

echo "== public read — passwords must be stripped =="
PUB=$(curl -s $BASE/api/public/forms/$PID -H "$UA")
echo "$PUB" | python3 -c "
import sys,json
d=json.load(sys.stdin)
s=d['form']['settings']
acc=s.get('examAccounts') or {}
leak = 'ab3x9f' in json.dumps(d)
print('accounts exposed to client:', acc.get('accounts'), '| password leaked:', leak)
assert acc.get('accounts')==[] and not leak, 'SECURITY LEAK'
print('image url present:', bool(d['questions'][0]['config'].get('imageUrl')))
"

echo "== start without credentials → expect 401 =="
curl -s -o /tmp/e3.o1 -w "start-nocreds: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/start -H 'Content-Type: application/json' -H "$UA" -d '{}'
grep -q account_invalid /tmp/e3.o1 && echo "code: account_invalid ✓"

echo "== start with WRONG password → expect 401 =="
curl -s -o /tmp/e3.o2 -w "start-badpw: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/start -H 'Content-Type: application/json' -H "$UA" -d '{"exam":{"username":"student01","password":"wrong"}}'
grep -q account_invalid /tmp/e3.o2 && echo "code: account_invalid ✓"

echo "== student01 starts (fresh jar) → token + deadline =="
S1=$(curl -s -c /tmp/e3.stu1.jar -X POST $BASE/api/public/forms/$PID/start -H 'Content-Type: application/json' -H "$UA" -d '{"exam":{"username":"student01","password":"ab3x9f"}}')
echo "$S1" | python3 -c "import sys,json;d=json.load(sys.stdin);print('start-ok:', 'attemptToken' in d and 'deadline' in d, '| resumed:', d.get('resumed'))"
TOKEN=$(echo "$S1" | python3 -c "import sys,json;print(json.load(sys.stdin)['attemptToken'])")

echo "== submit without creds → expect 401 =="
curl -s -o /tmp/e3.s0 -w "submit-nocreds: %{http_code}\n" -b /tmp/e3.stu1.jar -X POST $BASE/api/public/forms/$PID/submit -H 'Content-Type: application/json' -H "$UA" -d "{\"attemptToken\":\"$TOKEN\",\"answers\":{\"$QID1\":\"c2\",\"$QID2\":true}}"
grep -q account_invalid /tmp/e3.s0 && echo "code: account_invalid ✓"

echo "== student01 submits correct answers (with creds) → expect 3/3 =="
curl -s -b /tmp/e3.stu1.jar -c /tmp/e3.stu1.jar -X POST $BASE/api/public/forms/$PID/submit -H 'Content-Type: application/json' -H "$UA" \
  -d "{\"attemptToken\":\"$TOKEN\",\"answers\":{\"$QID1\":\"c2\",\"$QID2\":true},\"exam\":{\"username\":\"student01\",\"password\":\"ab3x9f\"}}" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('submit-ok:',d.get('ok'),'| result:',d.get('result'),'| releaseAt:',d.get('releaseAt'))"

echo "== student01 re-entry from ANOTHER device → expect 403 already =="
curl -s -o /tmp/e3.r1 -w "re-entry-new-device: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/start -H 'Content-Type: application/json' -H "$UA" -d '{"exam":{"username":"student01","password":"ab3x9f"}}'
grep -q already_participated /tmp/e3.r1 && echo "code: already_participated ✓"

echo "== same-device start again → expect 403 =="
curl -s -b /tmp/e3.stu1.jar -o /tmp/e3.r2 -w "re-entry-same-device: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/start -H 'Content-Type: application/json' -H "$UA" -d '{"exam":{"username":"student01","password":"ab3x9f"}}'

echo "== result endpoint — correct creds → released + 3/3 + per-question =="
curl -s -X POST $BASE/api/public/forms/$PID/result -H 'Content-Type: application/json' -H "$UA" \
  -d '{"exam":{"username":"student01","password":"ab3x9f"}}' \
  | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('found:',d.get('found'),'| released:',d.get('released'),'| name:',d.get('participantName'))
r=d.get('result') or {}
print('score:',r.get('totalScore'),'/',r.get('maxScore'),'| perQ:',len(r.get('perQuestion') or []))
assert d['found'] and d['released'] and r['totalScore']==3 and r['maxScore']==3
print('RESULT-OK ✓')
"

echo "== result endpoint — wrong creds → 401 =="
curl -s -o /tmp/e3.x1 -w "result-badpw: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/result -H 'Content-Type: application/json' -H "$UA" -d '{"exam":{"username":"student01","password":"nope"}}'

echo "== student02 submits wrong answer → 0/3, result page shows fail =="
S2=$(curl -s -c /tmp/e3.stu2.jar -X POST $BASE/api/public/forms/$PID/start -H 'Content-Type: application/json' -H "$UA" -d '{"exam":{"username":"student02","password":"k7p2mn"}}')
T2=$(echo "$S2" | python3 -c "import sys,json;print(json.load(sys.stdin)['attemptToken'])")
curl -s -b /tmp/e3.stu2.jar -X POST $BASE/api/public/forms/$PID/submit -H 'Content-Type: application/json' -H "$UA" \
  -d "{\"attemptToken\":\"$T2\",\"answers\":{\"$QID1\":\"c1\",\"$QID2\":false},\"exam\":{\"username\":\"student02\",\"password\":\"k7p2mn\"}}" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('student02 result:',d.get('result'))"

echo "== result page renders =="
curl -s -o /tmp/e3.page -w "result-page: %{http_code}\n" $BASE/f/$PID/result
grep -q "مشاهده نتیجه آزمون" /tmp/e3.page && echo "result page content ✓"

echo "== upload route exists (multipart w/o file → 422, not 404) =="
curl -s -o /tmp/e3.up -w "upload-route: %{http_code}\n" -X POST $BASE/api/public/forms/$PID/upload -H "$UA" -F "questionId=$QID1"

echo "== cleanup: delete test form =="
curl -s -b $J -X DELETE $BASE/api/forms/$FID | python3 -c "import sys,json;print('deleted:',json.load(sys.stdin).get('ok'))"
echo "ALL E2E V3 CHECKS DONE"
