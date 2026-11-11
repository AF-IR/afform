import { notFound, redirect } from 'next/navigation'
import { backend, buildFormReport } from '@/lib/forms/service'
import { getCurrentUser } from '@/lib/auth/service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TimelineChart, ChoicePie, RatingBars, ScoreHistogram } from '@/components/reports/charts'
import { AiAnalysisCard } from '@/components/reports/ai-analysis-card'
import { faNumber } from '@/lib/persian'
import { QUESTION_TYPE_META, type SavedAiAnalysis } from '@/types'

export default async function ReportsPage({ params }: { params: Promise<{ formId: string }> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { formId } = await params
  const form = await backend().getForm(formId, user.id)
  if (!form) notFound()

  const report = await buildFormReport(form)
  const hasData = report.totalResponses > 0

  // Latest persisted AI analysis (resilient — never breaks the page).
  let savedAi: SavedAiAnalysis | null = null
  try {
    savedAi = await backend().getLatestAiAnalysis(formId, user.id)
  } catch {
    savedAi = null
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">گزارش و تحلیل</h1>
        <p className="mt-1 text-sm text-muted-foreground">{form.title} — همه نمودارها از داده واقعی تولید می‌شوند</p>
      </div>

      {/* summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">کل پاسخ‌ها</p>
            <p className="mt-1 text-2xl font-extrabold">{faNumber(report.totalResponses)}</p>
          </CardContent>
        </Card>
        {report.quiz.isQuiz && (
          <>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">میانگین نمره</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {report.quiz.averageScore === null
                    ? '—'
                    : `${faNumber(report.quiz.averageScore, { maximumFractionDigits: 1 })} از ${faNumber(form.questions.reduce((s, q) => s + (q.scoring?.points ?? 0), 0))}`}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">درصد قبولی</p>
                <p className="mt-1 text-2xl font-extrabold">
                  {report.quiz.passRate === null ? '—' : `${faNumber(Math.round(report.quiz.passRate))}٪`}
                </p>
              </CardContent>
            </Card>
          </>
        )}
        {!report.quiz.isQuiz && (
          <>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">میانگین روزانه (۳۰ روز اخیر)</p>
                <p className="mt-1 text-2xl font-extrabold">{faNumber(Math.round((report.timeline.reduce((s, d) => s + d.count, 0) / 30) * 10) / 10)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">پاسخ‌های ۷ روز اخیر</p>
                <p className="mt-1 text-2xl font-extrabold">{faNumber(report.timeline.slice(-7).reduce((s, d) => s + d.count, 0))}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* AI analysis of real results */}
      <AiAnalysisCard formId={formId} hasResponses={hasData} initial={savedAi} />

      {/* timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">روند پاسخ‌ها (۳۰ روز اخیر)</CardTitle>
          <CardDescription>بر اساس تاریخ ثبت پاسخ‌ها</CardDescription>
        </CardHeader>
        <CardContent>
          {hasData ? <TimelineChart data={report.timeline} /> : <EmptyChart />}
        </CardContent>
      </Card>

      {/* quiz histogram */}
      {report.quiz.isQuiz && hasData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزیع نمره آزمون</CardTitle>
            <CardDescription>درصد نمره هر شرکت‌کننده نسبت به سقف نمره</CardDescription>
          </CardHeader>
          <CardContent>
            {report.quiz.histogram.some((b) => b.count > 0) ? (
              <ScoreHistogram data={report.quiz.histogram} />
            ) : (
              <EmptyChart />
            )}
          </CardContent>
        </Card>
      )}

      {/* per-question */}
      {hasData ? (
        report.questions.map((q) => {
          const meta = QUESTION_TYPE_META[q.type]
          return (
            <Card key={q.questionId}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm">{q.title || meta.label}</CardTitle>
                  <Badge variant="secondary">{meta.label} · {faNumber(q.answeredCount)} پاسخ</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {q.answeredCount === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    هنوز پاسخی برای این سؤال ثبت نشده است.
                  </p>
                ) : q.choiceCounts?.length ? (
                  <ChoicePie data={q.choiceCounts} />
                ) : q.distribution?.length ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      میانگین امتیاز: <span className="font-bold text-foreground">{faNumber(Math.round((q.average ?? 0) * 100) / 100)}</span>
                    </p>
                    <RatingBars data={q.distribution} />
                  </div>
                ) : q.samples?.length ? (
                  <div className="space-y-2">
                    {q.samples.slice(-5).reverse().map((s, i) => (
                      <p key={i} className="rounded-lg bg-muted/50 p-3 text-sm leading-6">{s}</p>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      {q.samples.length >= 20 ? '۲۰ پاسخ اخیر' : `${faNumber(q.samples.length)} پاسخ`} — پاسخ‌های کامل در صفحه «پاسخ‌های دریافتی»
                    </p>
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">داده نمایش‌پذیری برای این سؤال وجود ندارد.</p>
                )}
              </CardContent>
            </Card>
          )
        })
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            هنوز پاسخی ثبت نشده است؛ پس از دریافت پاسخ، تحلیل کامل اینجا ساخته می‌شود.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      داده‌ای برای نمایش نمودار وجود ندارد.
    </div>
  )
}
