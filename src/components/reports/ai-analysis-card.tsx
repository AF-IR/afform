'use client'

import { useState } from 'react'
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  Target,
  Loader2,
  RefreshCw,
  Database,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { faNumber, faDate } from '@/lib/persian'
import type { SavedAiAnalysis } from '@/types'

interface AiAnalysisCardProps {
  formId: string
  hasResponses: boolean
  initial: SavedAiAnalysis | null
}

function modelLabel(model: string): string {
  if (model === 'zai-sdk') return 'GLM · Z.AI'
  return model.startsWith('glm') ? `GLM · ${model}` : model
}

export function AiAnalysisCard({ formId, hasResponses, initial }: AiAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<SavedAiAnalysis | null>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/forms/${formId}/ai-analysis`, { method: 'POST' })
      const data = (await res.json()) as { ok?: boolean; error?: string; analysis?: SavedAiAnalysis }
      if (!res.ok || !data.ok || !data.analysis) {
        throw new Error(data.error ?? 'خطا در تولید تحلیل هوش مصنوعی')
      }
      setAnalysis(data.analysis)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطای شبکه؛ دوباره تلاش کنید')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden border-violet-200/70 dark:border-violet-900/60">
      <div className="h-1 w-full bg-gradient-to-l from-violet-500 via-fuchsia-500 to-violet-500" />
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <CardTitle className="text-base">تحلیل هوش مصنوعی نتایج</CardTitle>
              <CardDescription className="text-xs">
                بینش‌های خودکار، فقط بر اساس داده واقعی پاسخ‌های ثبت‌شده
              </CardDescription>
            </div>
          </div>
          {analysis && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 font-mono text-[11px]" dir="ltr">
                {modelLabel(analysis.model)}
              </Badge>
              <Badge variant="outline" className="gap-1 text-[11px]">
                <Database className="h-3 w-3" aria-hidden />
                {faNumber(analysis.responsesCount)} پاسخ
              </Badge>
              <span className="text-[11px] text-muted-foreground">{faDate(analysis.createdAt, true)}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {analysis ? (
          <>
            <div className="rounded-xl border border-violet-200/60 bg-violet-50/60 p-4 text-sm leading-7 text-foreground dark:border-violet-900/60 dark:bg-violet-950/40">
              {analysis.analysis.summary}
            </div>

            {analysis.analysis.insights.length > 0 && (
              <section aria-label="یافته‌های کلیدی">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden />
                  یافته‌های کلیدی
                </h3>
                <ul className="space-y-2">
                  {analysis.analysis.insights.map((item, i) => (
                    <li key={i} className="flex gap-2 rounded-lg bg-muted/50 p-3 text-sm leading-6">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {analysis.analysis.anomalies.length > 0 && (
              <section aria-label="نکات قابل توجه">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
                  نکات قابل توجه
                </h3>
                <ul className="space-y-2">
                  {analysis.analysis.anomalies.map((item, i) => (
                    <li key={i} className="flex gap-2 rounded-lg border border-amber-200/70 bg-amber-50/60 p-3 text-sm leading-6 dark:border-amber-900/60 dark:bg-amber-950/30">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {analysis.analysis.suggestions.length > 0 && (
              <section aria-label="پیشنهادهای بهبود">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <Target className="h-4 w-4 text-emerald-500" aria-hidden />
                  پیشنهادهای بهبود
                </h3>
                <ol className="space-y-2">
                  {analysis.analysis.suggestions.map((item, i) => (
                    <li key={i} className="flex gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50/50 p-3 text-sm leading-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{faNumber(i + 1)}.</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                تحلیل توسط مدل GLM تولید شده و تنها بر پایهٔ آمار واقعی همین فرم است؛ تصمیم نهایی با شماست.
              </p>
              <Button onClick={generate} disabled={loading} size="sm" variant="outline" className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                {loading ? 'در حال تحلیل مجدد…' : 'تحلیل مجدد'}
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-violet-300/70 p-6 text-center dark:border-violet-800/60">
            <Sparkles className="mx-auto h-8 w-8 text-violet-400" aria-hidden />
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {hasResponses
                ? 'نتایج فرم شما آماده است؛ با یک کلیک، تحلیل هوش مصنوعی فارسی شامل خلاصه، یافته‌های کلیدی و پیشنهادهای بهبود دریافت کنید.'
                : 'برای فعال شدن تحلیل هوش مصنوعی، ابتدا این فرم را منتشر کنید و اجازه دهید پاسخ‌ها ثبت شوند.'}
            </p>
            <Button
              onClick={generate}
              disabled={loading || !hasResponses}
              className="mt-4 gap-2 bg-violet-600 text-white hover:bg-violet-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
              {loading ? 'در حال تحلیل نتایج…' : 'دریافت تحلیل هوش مصنوعی'}
            </Button>
            {hasResponses && !loading && (
              <p className="mt-2 text-[11px] text-muted-foreground">این عملیات معمولاً چند ثانیه تا یک دقیقه زمان می‌برد.</p>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div className="flex-1">{error}</div>
            <Button onClick={generate} disabled={loading} size="sm" variant="outline" className="h-7 border-red-300 px-2 text-xs text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300">
              تلاش دوباره
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
