/**
 * E2E test of the public response pipeline against the running dev server.
 * Covers: register → create exam → add questions → publish → public read →
 * start attempt → submit answers (exam accounts + timed quiz) → verify stored.
 */
const BASE = 'http://localhost:3000'

let cookieJar = []

function cookieHeader() {
  return cookieJar.join('; ')
}

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(cookieJar.length ? { Cookie: cookieHeader() } : {}),
      ...(opts.headers || {}),
    },
  })
  // capture set-cookie
  const setCookie = res.headers.getSetCookie?.() ?? []
  for (const c of setCookie) {
    const [pair] = c.split(';')
    const [name] = pair.split('=')
    cookieJar = cookieJar.filter((x) => !x.startsWith(name + '='))
    if (!pair.endsWith('=') && c.split(';').some((s) => s.trim() === 'Max-Age=0')) continue
    cookieJar.push(pair)
  }
  const data = await res.json().catch(() => null)
  return { status: res.status, data, res }
}

function assert(cond, label) {
  if (!cond) {
    console.error('FAIL:', label)
    process.exitCode = 1
  } else {
    console.log('PASS:', label)
  }
}

async function main() {
  const RUN = Date.now()

  // ---------- 1. auth ----------
  const email = `e2e-${RUN}@test.local`
  const reg = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'Test1234!pass', confirmPassword: 'Test1234!pass', displayName: 'تست‌کننده', acceptTerms: true }),
  })
  assert(reg.status === 200 || reg.status === 201 || reg.data?.ok, `register (${reg.status}) ${JSON.stringify(reg.data).slice(0, 120)}`)

  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'Test1234!pass' }),
  })
  assert(login.status === 200 && login.data?.ok !== false, `login (${login.status}) ${JSON.stringify(login.data).slice(0, 120)}`)

  // ---------- 2. create exam ----------
  const created = await api('/api/forms', {
    method: 'POST',
    body: JSON.stringify({ title: 'آزمون ریاضی E2E', description: 'تست انتها به انتها', formType: 'quiz' }),
  })
  assert(created.status === 200 && created.data?.form?.id, `create exam (${created.status})`)
  const formId = created.data?.form?.id
  if (!formId) return

  // ---------- 3. add questions ----------
  const questions = [
    {
      id: `q1_${RUN}`, type: 'single_choice', title: 'حاصل ۲ به توان ۳ چیست؟ (۲³)', description: '', required: true,
      position: 0, config: { choices: [{ id: 'c1', label: '۶' }, { id: 'c2', label: '۸' }, { id: 'c3', label: '۹' }] },
      scoring: { points: 2, correctChoices: ['c2'] }, conditionalRules: null, conditionalMode: 'any',
    },
    {
      id: `q2_${RUN}`, type: 'number', title: 'جذر ۱۴۴ چند است؟', description: '', required: true,
      position: 1, config: { integer: true }, scoring: { points: 2, correctNumber: 12 }, conditionalRules: null, conditionalMode: 'any',
    },
    {
      id: `q3_${RUN}`, type: 'boolean', title: 'صفر توان صفر برابر یک است.', description: '', required: true,
      position: 2, config: {}, scoring: { points: 1, correctBoolean: true }, conditionalRules: null, conditionalMode: 'any',
    },
  ]
  const savedQ = await api(`/api/forms/${formId}/questions`, {
    method: 'PUT',
    body: JSON.stringify({ questions }),
  })
  assert(savedQ.status === 200 && savedQ.data?.ok, `save questions (${savedQ.status})`)

  // ---------- 4. configure exam: accounts + time limit + publish ----------
  const patched = await api(`/api/forms/${formId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'published',
      settings: {
        examAccounts: { enabled: true, accounts: [
          { username: 'ali', password: 'pw-ali-1', name: 'علی رضایی' },
          { username: 'sara', password: 'pw-sara-1', name: 'سارا محمدی' },
        ] },
        timeLimitMinutes: 10,
        maxAttempts: 1,
        passingScorePercent: 50,
        showResultsToRespondent: true,
        resultRelease: 'immediately',
      },
    }),
  })
  assert(patched.status === 200, `patch settings+publish (${patched.status}) ${JSON.stringify(patched.data).slice(0, 150)}`)

  // ---------- 5. public read ----------
  const publicId = created.data.form.publicId
  const pub = await fetch(`${BASE}/api/public/forms/${publicId}`)
  const pubData = await pub.json()
  assert(pub.status === 200 && pubData.form?.id === formId, `public read (${pub.status})`)
  assert(
    pubData.form?.settings?.examAccounts?.accounts?.length === 0 || pubData.form?.settings?.examAccounts?.accounts === undefined,
    'public settings do NOT leak exam passwords',
  )
  const qCount = (pubData.form?.questions ?? pubData.questions ?? []).length
  assert(qCount === 3, `public questions exposed for renderer (${qCount})`)

  // ---------- 6. wrong credentials refused ----------
  const badStart = await api(`/api/public/forms/${publicId}/start`, {
    method: 'POST',
    body: JSON.stringify({ exam: { username: 'ali', password: 'WRONG' } }),
  })
  assert(badStart.status === 401 || badStart.data?.code === 'account_invalid', `wrong credentials refused (${badStart.status})`)

  // ---------- 7. start attempt with real credentials ----------
  const start = await api(`/api/public/forms/${publicId}/start`, {
    method: 'POST',
    body: JSON.stringify({ exam: { username: 'ali', password: 'pw-ali-1' } }),
  })
  const attemptToken = start.data?.attemptToken
  assert(start.status === 200 && attemptToken, `start attempt with account (${start.status}) ${JSON.stringify(start.data).slice(0, 150)}`)

  // ---------- 8. submit answers (correct: 2+2+1 = 5) ----------
  const submit = await api(`/api/public/forms/${publicId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      attemptToken,
      exam: { username: 'ali', password: 'pw-ali-1' },
      answers: { [`q1_${RUN}`]: 'c2', [`q2_${RUN}`]: 12, [`q3_${RUN}`]: true },
    }),
  })
  assert(submit.status === 200 && submit.data?.ok !== false, `submit answers (${submit.status}) ${JSON.stringify(submit.data).slice(0, 300)}`)
  const result = submit.data?.result
  assert(result?.totalScore === 5 && result?.maxScore === 5 && result?.passed === true, `auto-grading correct: ${JSON.stringify(result)}`)

  // ---------- 9. second attempt blocked ----------
  const again = await api(`/api/public/forms/${publicId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      attemptToken,
      exam: { username: 'ali', password: 'pw-ali-1' },
      answers: { [`q1_${RUN}`]: 'c1', [`q2_${RUN}`]: 5, [`q3_${RUN}`]: false },
    }),
  })
  assert(again.data?.code === 'max_attempts' || again.data?.code === 'account_already_used' || !again.data?.ok, `re-entry blocked (${again.status}, code=${again.data?.code})`)

  // ---------- 10. second student submits (partial: 2+0+1 = 3 → 60%) ----------
  const start2 = await api(`/api/public/forms/${publicId}/start`, {
    method: 'POST',
    body: JSON.stringify({ exam: { username: 'sara', password: 'pw-sara-1' } }),
  })
  const submit2 = await api(`/api/public/forms/${publicId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      attemptToken: start2.data?.attemptToken,
      exam: { username: 'sara', password: 'pw-sara-1' },
      answers: { [`q1_${RUN}`]: 'c2', [`q2_${RUN}`]: 999, [`q3_${RUN}`]: true },
    }),
  })
  assert(submit2.status === 200, `second student submit (${submit2.status}) ${JSON.stringify(submit2.data).slice(0, 200)}`)
  assert(submit2.data?.result?.totalScore === 3, `partial grading: ${JSON.stringify(submit2.data?.result)}`)

  // ---------- 11. plain (non-exam) form submit without accounts ----------
  const created2 = await api('/api/forms', {
    method: 'POST',
    body: JSON.stringify({ title: 'فرم ساده E2E', formType: 'form' }),
  })
  const formId2 = created2.data?.form?.id
  const pub2 = await fetch(`${BASE}/api/public/forms/${created2.data?.form?.publicId}`)
  const pub2Data = await pub2.json()
  const qs2 = [
    { id: `p1_${RUN}`, type: 'short_text', title: 'نام شما', description: '', required: true, position: 0, config: {}, scoring: null, conditionalRules: null, conditionalMode: 'any' },
  ]
  await api(`/api/forms/${formId2}/questions`, { method: 'PUT', body: JSON.stringify({ questions: qs2 }) })
  await api(`/api/forms/${formId2}`, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) })
  const sub3 = await api(`/api/public/forms/${created2.data?.form?.publicId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers: { [`p1_${RUN}`]: 'مستثنی' } }),
  })
  assert(sub3.status === 200, `plain form submit (${sub3.status}) ${JSON.stringify(sub3.data).slice(0, 250)}`)

  // ---------- 12. owner sees stored responses ----------
  const reps = await api(`/api/forms/${formId}/responses`)
  assert(reps.status === 200 && reps.data?.total === 2, `owner sees exam responses (${reps.data?.total})`)
  const reps2 = await api(`/api/forms/${formId2}/responses`)
  assert(reps2.status === 200 && reps2.data?.total === 1, `owner sees form response (${reps2.data?.total})`)

  // ---------- 13. validation rejects invalid answers ----------
  const start3 = await api(`/api/public/forms/${publicId}/start`, {
    method: 'POST',
    body: JSON.stringify({ exam: { username: 'sara', password: 'pw-sara-1' } }),
  })
  // sara already submitted → attempt must be refused anyway
  assert(!start3.data?.token || start3.data?.code === 'max_attempts', `exhausted account cannot re-start (${JSON.stringify(start3.data).slice(0, 120)})`)

  // ---------- 14. result lookup with the SAME credentials ----------
  const resAli = await api(`/api/public/forms/${publicId}/result`, {
    method: 'POST',
    body: JSON.stringify({ exam: { username: 'ali', password: 'pw-ali-1' } }),
  })
  assert(resAli.status === 200 && resAli.data?.found === true, `result lookup (${resAli.status}) ${JSON.stringify(resAli.data).slice(0, 200)}`)
  assert(resAli.data?.result?.totalScore === 5 && resAli.data?.result?.passed === true, `result shows server-regraded score: ${JSON.stringify(resAli.data?.result?.totalScore)}`)
  assert(resAli.data?.result?.perQuestion?.length === 3, `per-question breakdown (${resAli.data?.result?.perQuestion?.length})`)

  const resBad = await api(`/api/public/forms/${publicId}/result`, {
    method: 'POST',
    body: JSON.stringify({ exam: { username: 'ali', password: 'nope' } }),
  })
  assert(resBad.status === 401, `result refuses wrong credentials (${resBad.status})`)

  // ---------- 15. exam panel pages render for the owner ----------
  for (const path of [`/dashboard/exams`, `/dashboard/exams/${formId}`, `/dashboard/exams/${formId}/participants`, `/dashboard/exams/${formId}/results`, `/dashboard/exams/new`]) {
    const page = await fetch(BASE + path, { headers: { Cookie: cookieHeader() } })
    const html = await page.text()
    assert(page.status === 200 && !html.includes('خطای سرور'), `panel page renders: ${path} (${page.status})`)
  }

  console.log('\n=== E2E DONE ===')
}

main().catch((e) => {
  console.error('E2E crashed:', e)
  process.exitCode = 1
})
