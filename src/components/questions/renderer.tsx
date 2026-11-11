'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertCircle, Loader2, Star, Upload } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  OTHER_CHOICE_ID,
  type AnswerValue,
  type Choice,
  type ChoiceAnswerValue,
  type Question,
} from '@/types'
import { faNumber } from '@/lib/persian'

export interface QuestionRendererProps {
  question: Question
  value: AnswerValue
  error?: string
  disabled?: boolean
  onChange: (value: AnswerValue) => void
  /** prepared choices (already shuffled by parent when needed) */
  choices?: Choice[]
  /** upload endpoint for file questions */
  uploadUrl?: string
  /** show numbering badge */
  number?: number
}

function choiceIds(value: AnswerValue): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    const cv = (value as ChoiceAnswerValue).value
    if (typeof cv === 'string') return [cv]
    if (Array.isArray(cv)) return cv.filter((v): v is string => typeof v === 'string')
  }
  return []
}

function choiceMeta(value: AnswerValue): { text?: string; comment?: string } {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
    const cv = value as ChoiceAnswerValue
    return { text: typeof cv.text === 'string' ? cv.text : undefined, comment: typeof cv.comment === 'string' ? cv.comment : undefined }
  }
  return {}
}

export function QuestionRenderer({
  question: q,
  value,
  error,
  disabled,
  onChange,
  choices: choicesProp,
  uploadUrl,
  number,
}: QuestionRendererProps) {
  const [uploading, setUploading] = useState(false)

  // info / separator — non-answerable blocks
  if (q.type === 'info') {
    return (
      <div className="rounded-xl border bg-accent/40 p-4" role="note">
        <h3 className="font-bold">{q.title}</h3>
        {q.description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{q.description}</p>}
      </div>
    )
  }
  if (q.type === 'separator') {
    return (
      <div role="separator" className="py-2">
        {q.title && <p className="mb-2 text-sm font-bold text-muted-foreground">{q.title}</p>}
        <hr />
      </div>
    )
  }

  const meta = choiceMeta(value)
  const ids = choiceIds(value)
  const choices = choicesProp ?? q.config.choices ?? []

  function setChoiceSingle(id: string) {
    if (id === OTHER_CHOICE_ID) onChange({ value: OTHER_CHOICE_ID, text: meta.text ?? '' })
    else onChange(id)
  }

  function toggleMulti(id: string) {
    let next: string[]
    if (ids.includes(id)) next = ids.filter((x) => x !== id)
    else next = [...ids, id]
    const out: ChoiceAnswerValue = { value: next }
    if (meta.text) out.text = meta.text
    if (meta.comment) out.comment = meta.comment
    onChange(out)
  }

  async function handleFileUpload(file: File) {
    if (!uploadUrl) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('questionId', q.id)
      const res = await fetch(uploadUrl, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'بارگذاری فایل ناموفق بود')
        return
      }
      onChange(data.file)
      toast.success('فایل بارگذاری شد')
    } catch {
      toast.error('خطای شبکه در بارگذاری فایل')
    } finally {
      setUploading(false)
    }
  }

  const label = (
    <div className="mb-1.5">
      <Label asChild>
        <h3 className="text-sm font-bold leading-7">
          {number !== undefined && (
            <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 text-xs font-bold text-primary">
              {faNumber(number)}
            </span>
          )}
          {q.title || 'سؤال بدون عنوان'}
          {q.required && <span className="mr-1 text-destructive">*</span>}
        </h3>
      </Label>
      {q.description && <p className="text-xs leading-5 text-muted-foreground">{q.description}</p>}
    </div>
  )

  const err = error ? (
    <p className="mt-2 flex items-center gap-1 text-xs text-destructive" role="alert">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
      {error}
    </p>
  ) : null

  switch (q.type) {
    // ---------- text ----------
    case 'short_text':
      return (
        <div>
          {label}
          <Input
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            placeholder={q.config.placeholder}
            maxLength={q.config.maxLength ?? 500}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          {err}
        </div>
      )
    case 'long_text':
      return (
        <div>
          {label}
          <Textarea
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            placeholder={q.config.placeholder}
            maxLength={q.config.maxLength ?? 5000}
            rows={4}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          {q.config.maxLength && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {faNumber((typeof value === 'string' ? value : '').length)} از {faNumber(q.config.maxLength)} نویسه
            </p>
          )}
          {err}
        </div>
      )
    case 'email':
      return (
        <div>
          {label}
          <Input
            type="email" dir="ltr" inputMode="email"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            placeholder="name@example.com"
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          {err}
        </div>
      )
    case 'phone':
      return (
        <div>
          {label}
          <Input
            type="tel" dir="ltr" inputMode="tel"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            placeholder="0912 345 6789"
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          {err}
        </div>
      )
    case 'url':
      return (
        <div>
          {label}
          <Input
            type="url" dir="ltr"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            placeholder="https://example.com"
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          {err}
        </div>
      )
    case 'number':
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <Input
              type="number" dir="ltr"
              value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
              disabled={disabled}
              min={q.config.min}
              max={q.config.max}
              step={q.config.integer ? 1 : 'any'}
              onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
              aria-invalid={Boolean(error)}
            />
            {q.config.unit && <span className="text-sm text-muted-foreground">{q.config.unit}</span>}
          </div>
          {(q.config.min !== undefined || q.config.max !== undefined) && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {q.config.min !== undefined && `حداقل: ${faNumber(q.config.min)}`}
              {q.config.min !== undefined && q.config.max !== undefined && ' — '}
              {q.config.max !== undefined && `حداکثر: ${faNumber(q.config.max)}`}
            </p>
          )}
          {err}
        </div>
      )

    // ---------- choices ----------
    case 'single_choice':
      return (
        <div>
          {label}
          <RadioGroup
            value={typeof value === 'string' ? value : ids[0] ?? ''}
            onValueChange={setChoiceSingle}
            disabled={disabled}
            className="space-y-2"
          >
            {choices.map((c) => (
              <label
                key={c.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors',
                  ids[0] === c.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                )}
              >
                <RadioGroupItem value={c.id} />
                <span>{c.label}</span>
              </label>
            ))}
            {q.config.allowOther && (
              <div className={cn('rounded-lg border p-3', ids[0] === OTHER_CHOICE_ID ? 'border-primary bg-primary/5' : '')}>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <RadioGroupItem value={OTHER_CHOICE_ID} />
                  <span className="font-medium">سایر موارد</span>
                </label>
                {ids[0] === OTHER_CHOICE_ID && (
                  <Input
                    className="mt-2"
                    disabled={disabled}
                    placeholder="لطفاً بنویسید…"
                    value={meta.text ?? ''}
                    onChange={(e) => onChange({ value: OTHER_CHOICE_ID, text: e.target.value })}
                  />
                )}
              </div>
            )}
          </RadioGroup>
          {err}
        </div>
      )
    case 'multi_choice':
    case 'multi_choice_comment':
      return (
        <div>
          {label}
          <div className="space-y-2">
            {choices.map((c) => (
              <label
                key={c.id}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors',
                  ids.includes(c.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                )}
              >
                <Checkbox checked={ids.includes(c.id)} onCheckedChange={() => toggleMulti(c.id)} disabled={disabled} />
                <span>{c.label}</span>
              </label>
            ))}
            {q.config.allowOther && (
              <div className={cn('rounded-lg border p-3', ids.includes(OTHER_CHOICE_ID) ? 'border-primary bg-primary/5' : '')}>
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <Checkbox checked={ids.includes(OTHER_CHOICE_ID)} onCheckedChange={() => toggleMulti(OTHER_CHOICE_ID)} disabled={disabled} />
                  <span className="font-medium">سایر موارد</span>
                </label>
                {ids.includes(OTHER_CHOICE_ID) && (
                  <Input
                    className="mt-2"
                    disabled={disabled}
                    placeholder="لطفاً بنویسید…"
                    value={meta.text ?? ''}
                    onChange={(e) => {
                      const out: ChoiceAnswerValue = { value: ids }
                      out.text = e.target.value
                      if (meta.comment) out.comment = meta.comment
                      onChange(out)
                    }}
                  />
                )}
              </div>
            )}
          </div>
          {q.type === 'multi_choice_comment' && (
            <div className="mt-3">
              <Label htmlFor={`comment-${q.id}`} className="text-xs">توضیح تکمیلی *</Label>
              <Textarea
                id={`comment-${q.id}`}
                rows={2}
                disabled={disabled}
                value={meta.comment ?? ''}
                onChange={(e) => {
                  const out: ChoiceAnswerValue = { value: ids }
                  if (meta.text) out.text = meta.text
                  out.comment = e.target.value
                  onChange(out)
                }}
              />
            </div>
          )}
          {(q.config.minSelects !== undefined || q.config.maxSelects !== undefined) && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              انتخاب‌شده: {faNumber(ids.length)}
              {q.config.minSelects !== undefined && ` — حداقل ${faNumber(q.config.minSelects)}`}
              {q.config.maxSelects !== undefined && ` — حداکثر ${faNumber(q.config.maxSelects)}`}
            </p>
          )}
          {err}
        </div>
      )
    case 'dropdown':
      return (
        <div>
          {label}
          <Select
            value={typeof value === 'string' ? value : ids[0] ?? ''}
            onValueChange={(v) => setChoiceSingle(v)}
            disabled={disabled}
            dir="rtl"
          >
            <SelectTrigger className="w-full" aria-invalid={Boolean(error)}>
              <SelectValue placeholder="انتخاب کنید…" />
            </SelectTrigger>
            <SelectContent>
              {choices.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
              {q.config.allowOther && <SelectItem value={OTHER_CHOICE_ID}>سایر موارد</SelectItem>}
            </SelectContent>
          </Select>
          {q.config.allowOther && ids[0] === OTHER_CHOICE_ID && (
            <Input
              className="mt-2"
              disabled={disabled}
              placeholder="لطفاً بنویسید…"
              value={meta.text ?? ''}
              onChange={(e) => onChange({ value: OTHER_CHOICE_ID, text: e.target.value })}
            />
          )}
          {err}
        </div>
      )
    case 'boolean':
      return (
        <div>
          {label}
          <RadioGroup
            value={typeof value === 'boolean' ? (value ? 'yes' : 'no') : ''}
            onValueChange={(v) => onChange(v === 'yes')}
            disabled={disabled}
            className="flex gap-3"
          >
            <label className={cn('flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors', value === true && 'border-primary bg-primary/5')}>
              <RadioGroupItem value="yes" /> بله
            </label>
            <label className={cn('flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors', value === false && 'border-primary bg-primary/5')}>
              <RadioGroupItem value="no" /> خیر
            </label>
          </RadioGroup>
          {err}
        </div>
      )

    // ---------- ratings ----------
    case 'rating_5':
    case 'rating_10': {
      const max = q.type === 'rating_5' ? 5 : 10
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={q.title}>
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => onChange(n)}
                className={cn(
                  'h-10 w-10 rounded-lg border text-sm font-bold transition-colors',
                  value === n ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted/60',
                )}
                aria-pressed={value === n}
              >
                {faNumber(n)}
              </button>
            ))}
          </div>
          {err}
        </div>
      )
    }
    case 'stars':
      return (
        <div>
          {label}
          <div className="flex gap-1" role="radiogroup" aria-label={q.title}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                disabled={disabled}
                onClick={() => onChange(n)}
                className="rounded p-1 transition-transform hover:scale-110"
                aria-label={`${faNumber(n)} ستاره`}
              >
                <Star className={cn('h-8 w-8', typeof value === 'number' && value >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />
              </button>
            ))}
          </div>
          {err}
        </div>
      )
    case 'likert': {
      const labels = q.config.likertLabels ?? ['کاملاً موافقم', 'موافقم', 'نظری ندارم', 'مخالفم', 'کاملاً مخالفم']
      return (
        <div>
          {label}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" role="radiogroup" aria-label={q.title}>
            {labels.map((lb, i) => (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => onChange(i + 1)}
                className={cn(
                  'rounded-lg border p-2.5 text-xs font-medium leading-5 transition-colors',
                  value === i + 1 ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted/60',
                )}
                aria-pressed={value === i + 1}
              >
                {lb}
              </button>
            ))}
          </div>
          {err}
        </div>
      )
    }
    case 'rating_number':
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <Input
              type="number" dir="ltr"
              value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
              disabled={disabled}
              min={q.config.min ?? 0}
              max={q.config.max ?? 100}
              onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
              aria-invalid={Boolean(error)}
            />
            {q.config.unit && <span className="text-sm text-muted-foreground">{q.config.unit}</span>}
          </div>
          {err}
        </div>
      )

    // ---------- date / time ----------
    case 'date':
      return (
        <div>
          {label}
          <Input
            type="date" dir="ltr"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            min={q.config.minDate}
            max={q.config.maxDate}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          {err}
        </div>
      )
    case 'time':
      return (
        <div>
          {label}
          <Input
            type="time" dir="ltr"
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          {err}
        </div>
      )

    // ---------- file ----------
    case 'file': {
      const fileVal = value && typeof value === 'object' && !Array.isArray(value) && 'fileId' in value
        ? (value as { fileId: string; name: string; size: number })
        : null
      const maxMB = q.config.maxSizeMB ?? 4
      return (
        <div>
          {label}
          {uploadUrl ? (
            <label className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors hover:bg-muted/50',
              error && 'border-destructive/60',
            )}>
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" aria-hidden />
              )}
              <span className="text-sm font-medium">{fileVal ? 'تغییر فایل' : 'انتخاب فایل'}</span>
              <span className="text-xs text-muted-foreground">
                حداکثر {faNumber(maxMB)} مگابایت — pdf، تصویر، متن یا آفیس
              </span>
              <input
                type="file" className="hidden" disabled={disabled || uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileUpload(f)
                  e.currentTarget.value = ''
                }}
              />
            </label>
          ) : (
            <div className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">
              بارگذاری فایل در پیش‌نمایش فعال نیست؛ در فرم عمومی کار می‌کند.
            </div>
          )}
          {fileVal && (
            <p className="mt-2 flex items-center gap-2 rounded-lg bg-muted/60 p-2.5 text-xs">
              <Upload className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="font-medium">{fileVal.name}</span>
              <span className="text-muted-foreground">({faNumber(Math.round(fileVal.size / 1024))} کیلوبایت)</span>
            </p>
          )}
          {err}
        </div>
      )
    }

    // ---------- matrix ----------
    case 'matrix': {
      const rows = q.config.rows ?? []
      const cols = q.config.cols ?? []
      const mv = value && typeof value === 'object' && !Array.isArray(value) && !('value' in value)
        ? (value as Record<string, string>)
        : {}
      return (
        <div>
          {label}
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr>
                  <th className="p-2" aria-hidden />
                  {cols.map((c, ci) => (
                    <th key={ci} className="min-w-24 p-2 text-center text-xs font-bold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="border-t">
                    <td className="p-2.5 text-right font-medium">{r}</td>
                    {cols.map((c, ci) => (
                      <td key={ci} className="p-2.5 text-center">
                        <input
                          type="radio"
                          name={`m-${q.id}-${ri}`}
                          checked={mv[String(ri)] === c}
                          disabled={disabled}
                          onChange={() => {
                            const next = { ...mv }
                            next[String(ri)] = c
                            onChange(next)
                          }}
                          className="h-4 w-4 accent-[var(--primary)]"
                          aria-label={`${r}: ${c}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {err}
        </div>
      )
    }
  }
}
