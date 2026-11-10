#!/usr/bin/env bash
# E2E test: AI analysis pipeline against the running dev server (local mode).
# register → login → create form → add questions → publish → submit real
# responses → generate AI analysis (Z.AI SDK fallback) → re-read it.
set -u
BASE="http://localhost:3000"
JAR="/tmp/af-e2e-cookies.txt"
rm -f "$JAR"
EMAIL="ai-e2e-$(date +%s)@arshamform.test"

step() { echo; echo "== $1 =="; }

step "1) register"
curl -s -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"displayName\":\"کاربر تست ای‌آی\",\"email\":\"$EMAIL\",\"password\":\"Passw0rd!23\",\"confirmPassword\":\"Passw0rd!23\",\"acceptTerms\":true}" | head -c 300

step "2) login"
LOGIN=$(curl -s -c "$JAR" -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Passw0rd!23\"}")
echo "$LOGIN" | head -c 300

step "3) create form"
FORM=$(curl -s -b "$JAR" -X POST "$BASE/api/forms" -H 'Content-Type: application/json' \
  -d '{"title":"نظرسنجی رضایت کاربران (تست ای‌آی)","description":"سنجش رضایت از پشتیبانی و سرعت پاسخگویی","formType":"survey"}')
FORM_ID=$(echo "$FORM" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.ok? j.form.id : 'ERR:'+j.error)})")
echo "formId=$FORM_ID"
PUBLIC_ID=$(echo "$FORM" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.ok? j.form.publicId : 'ERR')})")
echo "publicId=$PUBLIC_ID"

step "4) save questions (PUT)"
curl -s -b "$JAR" -X PUT "$BASE/api/forms/$FORM_ID/questions" -H 'Content-Type: application/json' -d '{
  "questions": [
    {"id":"q1","type":"info","title":"به این نظرسنجی خوش آمدید","position":0},
    {"id":"q2","type":"single_choice","title":"میزان رضایت کلی شما از پشتیبانی چقدر است؟","position":1,"required":true,
     "config":{"choices":[{"id":"c1","label":"بسیار راضی"},{"id":"c2","label":"راضی"},{"id":"c3","label":"نظرx بی‌تفاوت"},{"id":"c4","label":"ناراضی"}]}},
    {"id":"q3","type":"rating_5","title":"سرعت پاسخگویی را از ۱ تا ۵ امتیاز دهید","position":2,"required":true,"config":{}},
    {"id":"q4","type":"long_text","title":"چه چیزی را می‌توان بهبود داد؟","position":3,"required":false,"config":{}}
  ]
}' | head -c 200

step "5) publish"
curl -s -b "$JAR" -X PATCH "$BASE/api/forms/$FORM_ID" -H 'Content-Type: application/json' \
  -d '{"status":"published"}' | head -c 200

step "6) submit 5 real responses (different IPs)"
SUBMIT() {
  curl -s -X POST "$BASE/api/public/forms/$PUBLIC_ID/submit" \
    -H 'Content-Type: application/json' -H "X-Forwarded-For: 10.0.0.$1" -H 'User-Agent: e2e-bot' \
    -d "$2" | head -c 160
  echo
}
SUBMIT 11 '{"answers":{"q2":"c1","q3":5,"q4":"پشتیبانی عالی بود، فقط صفحه موبایل می‌تواند سریع‌تر باشد."}}'
SUBMIT 12 '{"answers":{"q2":"c2","q3":4,"q4":"قیمت طرح‌های حرفه‌ای کمی گران است."}}'
SUBMIT 13 '{"answers":{"q2":"c2","q3":3,"q4":"امکان خروجی اکسل عالی است؛ نمودارهای بیشتری بخواهم."}}'
SUBMIT 14 '{"answers":{"q2":"c4","q3":1,"q4":"پاسخ پشتیبانی بیش از ۴۸ ساعت طول کشید."}}'
SUBMIT 15 '{"answers":{"q2":"c1","q3":5,"q4":"همه چیز خوب بود، ممنون."}}'

step "7) GET ai-analysis before generation (expect null)"
curl -s -b "$JAR" "$BASE/api/forms/$FORM_ID/ai-analysis" | head -c 200

step "8) POST ai-analysis (real AI generation via fallback provider)"
AI=$(curl -s -b "$JAR" -X POST "$BASE/api/forms/$FORM_ID/ai-analysis")
echo "$AI" | head -c 1200

step "9) GET ai-analysis after generation"
curl -s -b "$JAR" "$BASE/api/forms/$FORM_ID/ai-analysis" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  try{const j=JSON.parse(s);
    if(j.ok && j.analysis){const a=j.analysis.analysis;
      console.log('ok=true  model='+j.analysis.model+'  responsesCount='+j.analysis.responsesCount);
      console.log('summary:', (a.summary||'').slice(0,180));
      console.log('insights:', (a.insights||[]).length, '| anomalies:', (a.anomalies||[]).length, '| suggestions:', (a.suggestions||[]).length);
      console.log('RESULT=PASS');
    } else { console.log('RESULT=FAIL', s.slice(0,300)); }
  }catch(e){console.log('RESULT=FAIL parse', s.slice(0,300))}
})"
echo "formId=$FORM_ID"
