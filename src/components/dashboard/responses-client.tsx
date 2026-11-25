'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Download, FileJson, FileSpreadsheet, FileText, Loader2, Search, Trash2, Eye } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { QuestionRenderer } from '@/components/questions/renderer'
import { faDate, faNumber } from '@/lib/persian'
import { FORM_TYPE_LABEL, type AnswerValue, type Question } from '@/types'

interface ResponseRow {
  responseId: string
  submittedAt: string
  status: string
  totalScore: number | null
  respondentName?: string | null
  respondentNationalId?: string | null
  answers: Record<string, AnswerValue>
}

export function ResponsesClient({ formId, formType }: { formId: string; formType: 'form' | 'survey' | 'quiz' }) {
  const [rows, setRows] = useState<ResponseRow[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [order, setOrder] = useState<'desc' | 'asc'>('desc')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<ResponseRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ResponseRow | null>(null)
  const limit = 20

  const load = useCallback(async (p = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit), order })
      if (from) params.set('from', new Date(from).toISOString())
      if (to) params.set('to', new Date(to).toISOString())
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/forms/${formId}/responses?${params}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'خطا در دریافت پاسخ‌ها')
        return
      }
      setRows(data.rows)
      setTotal(data.total)
      setQuestions(data.questions)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [formId, order, from, to, q, page])

  useEffect(() => {
    load(1)
  }, [order, from, to, q])

  async function removeResponse() {
    if (!deleteTarget) return
    const res = await fetch(`/api/forms/${formId}/responses/${deleteTarget.responseId}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      toast.error(d.error ?? 'حذف ناموفق بود')
      return
    }
    toast.success('پاسخ حذف شد')
    setDeleteTarget(null)
    load(page)
  }

  const pages = Math.max(1, Math.ceil(total / limit))
  const showIdentity = rows.some((r) => r.respondentName || r.respondentNationalId)

  function stringifyValue(question: Question | undefined, value: AnswerValue): string {
    if (value === null || value === undefined || question === undefined) return '—'
    if (typeof value === 'boolean') return value ? 'بله' : 'خیر'
    if (typeof value === 'string' && question.type !== 'single_choice' && question.type !== 'dropdown') return value
    if (Array.isArray(value)) return value.join('، ')
    if (typeof value === 'object' && 'value' in value) {
      const cv = value as { value: unknown; text?: string; comment?: string }
      const labels = new Map((question.config.choices ?? []).map((c) => [c.id, c.label]))
      const ids = Array.isArray(cv.value) ? cv.value : [cv.value]
      const parts = ids.map((id) => (id === '__other__' ? `سایر: ${cv.text ?? ''}` : labels.get(String(id)) ?? String(id)))
      if (cv.comment) parts.push(`توضیح: ${cv.comment}`)
      return parts.join('، ')
    }
    if (typeof value === 'object' && 'name' in (value as object)) {
      return (value as { name: string }).name
    }
    if (typeof value === 'object' && question.type === 'matrix') {
      const rows = question.config.rows ?? []
      return Object.entries(value as Record<string, string>)
        .map(([r, c]) => `${rows[Number(r)] ?? r}: ${c}`)
        .join('، ')
    }
    return typeof value === 'string' ? value : JSON.stringify(value)
  }

  return (
    <div className="space-y-4">
      {/* filters + exports */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs">جست‌وجو در پاسخ‌ها</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="متن پاسخ…" className="w-56 pr-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">از تاریخ</Label>
            <Input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">تا تاریخ</Label>
            <Input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ترتیب</Label>
            <div className="flex gap-1">
              <Button size="sm" variant={order === 'desc' ? 'default' : 'outline'} onClick={() => setOrder('desc')}>جدیدترین</Button>
              <Button size="sm" variant={order === 'asc' ? 'default' : 'outline'} onClick={() => setOrder('asc')}>قدیمی‌ترین</Button>
            </div>
          </div>
          <div className="mr-auto flex gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`/api/forms/${formId}/export?format=csv`}><FileText className="ml-1 h-4 w-4" aria-hidden />CSV</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/forms/${formId}/export?format=xlsx`}><FileSpreadsheet className="ml-1 h-4 w-4" aria-hidden />Excel</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`/api/forms/${formId}/export?format=json`}><FileJson className="ml-1 h-4 w-4" aria-hidden />JSON</a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        مجموع پاسخ‌ها: <span className="font-bold text-foreground">{faNumber(total)}</span>
      </p>

      {/* table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-40">زمان ثبت</TableHead>
                {showIdentity && <TableHead>پاسخ‌دهنده</TableHead>}
                {formType === 'quiz' && <TableHead>نمره</TableHead>}
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-left">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={formType === 'quiz' ? 5 : 4} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={formType === 'quiz' ? 5 : 4} className="py-10 text-center text-sm text-muted-foreground">
                    هنوز پاسخی ثبت نشده است. پس از انتشار فرم و دریافت پاسخ‌ها، اینجا نمایش داده می‌شوند.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.responseId} className="transition-colors hover:bg-muted/40">
                    <TableCell>{faDate(r.submittedAt, true)}</TableCell>
                    {showIdentity && (
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{r.respondentName || '—'}</p>
                          {r.respondentNationalId && (
                            <p className="text-xs text-muted-foreground" dir="ltr">{r.respondentNationalId}</p>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {formType === 'quiz' && (
                      <TableCell>
                        {r.totalScore === null ? '—' : faNumber(r.totalScore, { maximumFractionDigits: 1 })}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={r.status === 'submitted' ? 'secondary' : 'outline'}>
                        {r.status === 'submitted' ? 'ثبت‌شده' : r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDetail(r)} aria-label="مشاهده جزئیات">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteTarget(r)} aria-label="حذف پاسخ">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page >= pages} onClick={() => load(page + 1)} aria-label="صفحه بعد">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">صفحه {faNumber(page)} از {faNumber(pages)}</span>
          <Button size="icon" variant="outline" className="h-8 w-8" disabled={page <= 1} onClick={() => load(page - 1)} aria-label="صفحه قبل">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* detail dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>جزئیات پاسخ</DialogTitle>
            <DialogDescription>
              ثبت‌شده در {faDate(detail?.submittedAt, true)}
              {detail?.respondentName ? <> — {detail.respondentName}</> : null}
              {detail?.respondentNationalId ? <> — کد ملی <span dir="ltr">{detail.respondentNationalId}</span></> : null}
              {detail?.totalScore !== null && detail?.totalScore !== undefined && formType === 'quiz' && (
                <> — نمره: {faNumber(detail.totalScore, { maximumFractionDigits: 1 })}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="custom-scroll max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {questions.map((question) => {
              const value = detail?.answers[question.id] ?? null
              const isEmpty = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
              return (
                <div key={question.id} className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-bold">{question.title || question.type}</p>
                  {isEmpty ? (
                    <p className="text-sm text-muted-foreground">بدون پاسخ</p>
                  ) : question.type === 'info' || question.type === 'separator' ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    <div className="pointer-events-none opacity-80">
                      <QuestionRenderer
                        question={question}
                        value={value}
                        onChange={() => {}}
                        disabled
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف این پاسخ؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عملیات بازگشت‌پذیر نیست و پاسخ برای همیشه حذف می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); removeResponse() }}
            >
              <Download className="hidden" aria-hidden />
              حذف قطعی
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
