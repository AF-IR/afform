#!/bin/bash
# End-to-end check: register → login → create form → bulk questions (PUT) →
# publish → public read (publicId) → public submit → download exports
set -e
BASE=http://localhost:3000
J=/tmp/ck.jar
rm -f $J

EMAIL="chk$RANDOM@test.local"
PASS="Passw0rd!234"

echo "== register =="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\",\"displayName\":\"تست چک\",\"acceptTerms\":true}"
echo

echo "== login =="
curl -s -c $J -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
echo

echo "== create form =="
CREATE=$(curl -s -b $J -X POST $BASE/api/forms -H 'Content-Type: application/json' \
  -d '{"title":"فرم چک خروجی","description":"تست دانلود","formType":"survey"}')
FID=$(echo "$CREATE" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('form',{}).get('id') or '')")
PID=$(echo "$CREATE" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('form',{}).get('publicId') or '')")
echo "FID=$FID PID=$PID"

echo "== bulk save questions (PUT) =="
curl -s -b $J -X PUT $BASE/api/forms/$FID/questions -H 'Content-Type: application/json' \
  -d '{"questions":[{"id":"q1","type":"short_text","title":"نام شما","required":true,"position":0},{"id":"q2","type":"rating_5","title":"امتیاز شما","required":true,"position":1}]}'
echo

echo "== publish =="
curl -s -b $J -X PATCH $BASE/api/forms/$FID -H 'Content-Type: application/json' \
  -d '{"status":"published"}' | python3 -c "import sys,json;print('status =',json.load(sys.stdin).get('form',{}).get('status'))"

echo "== public read by publicId =="
curl -s $BASE/api/public/forms/$PID | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok =',d.get('ok'),'| questions =',len(d.get('form',{}).get('questions',[])))"

echo "== public submit =="
curl -s -X POST $BASE/api/public/forms/$PID/submit -H 'Content-Type: application/json' \
  -d '{"answers":{"q1":"کاربر آزمون","q2":4}}'
echo

echo "== download exports =="
for FMT in csv xlsx json; do
  OUT=/tmp/export.$FMT
  CODE=$(curl -s -b $J -o $OUT -w '%{http_code}' "$BASE/api/forms/$FID/export?format=$FMT")
  SIZE=$(stat -c%s $OUT 2>/dev/null || echo 0)
  TYPE=$(file -b --mime-type $OUT 2>/dev/null || echo '-')
  echo "$FMT -> HTTP $CODE, $SIZE bytes, $TYPE"
done
echo "-- CSV content --"
head -3 /tmp/export.csv
