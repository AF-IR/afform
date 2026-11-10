'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { templates, TEMPLATE_CATEGORIES } from '@/lib/templates/data'
import { FORM_TYPE_LABEL } from '@/types'

export function TemplatesClient() {
  const router = useRouter()
  const [category, setCategory] = useState('همه')
  const [query, setQuery] = useState('')
  const [using, setUsing] = useState<string | null>(null)

  const filtered = templates.filter((t) => {
    const catOk = category === 'همه' || t.category === category
    const q = query.trim()
    const qOk = !q || t.title.includes(q) || t.description.includes(q)
    return catOk && qOk
  })

  async function applyTemplate(id: string) {
    setUsing(id)
    try {
      const res = await fetch('/api/templates/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'ایجاد از قالب ناموفق بود')
        return
      }
      toast.success('نسخه مستقل از قالب ساخته شد')
      router.push(`/dashboard/forms/${data.form.id}/edit`)
    } catch {
      toast.error('خطای شبکه')
    } finally {
      setUsing(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">قالب‌های آماده</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          هر قالب با انتخاب شما یک نسخه مستقل می‌سازد؛ سؤال‌ها، عنوان و تنظیمات آن کاملاً قابل تغییر است.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="همه">همه</TabsTrigger>
            {TEMPLATE_CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجوی قالب…" className="pr-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            قالبی با این مشخصات پیدا نشد.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{t.category}</Badge>
                  <Badge variant="outline">{FORM_TYPE_LABEL[t.formType]}</Badge>
                </div>
                <CardTitle className="mt-2 text-base">{t.title}</CardTitle>
                <CardDescription className="text-sm leading-6">{t.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {t.questions.slice(0, 3).map((q, i) => (
                    <li key={i} className="truncate">• {q.title}</li>
                  ))}
                  {t.questions.length > 3 && <li>و {t.questions.length - 3} سؤال دیگر…</li>}
                </ul>
                <Button className="w-full" onClick={() => applyTemplate(t.id)} disabled={using !== null}>
                  {using === t.id && <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden />}
                  ساخت نسخه قابل ویرایش
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
