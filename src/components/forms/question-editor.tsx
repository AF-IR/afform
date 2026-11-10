'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, Copy, GripVertical, Pencil, Plus, Trash2, X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  QUESTION_TYPE_META, type Choice, type ConditionalOperator, type ConditionalRule, type Question, type QuestionConfig,
} from '@/types'
import { cn } from '@/lib/utils'

export function newChoiceId(): string {
  return `c_${Math.random().toString(36).slice(2, 9)}`
}

export function newQuestionId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`
}

const CONDITIONAL_OPERATORS: { value: ConditionalOperator; label: string }[] = [
  { value: 'equals', label: 'برابر است با' },
  { value: 'not_equals', label: 'برابر نیست با' },
  { value: 'includes', label: 'شامل گزینه است' },
  { value: 'gt', label: 'بزرگ‌تر است از' },
  { value: 'lt', label: 'کوچک‌تر است از' },
  { value: 'answered', label: 'پاسخ داده شده' },
  { value: 'not_answered', label: 'پاسخ داده نشده' },
]

const CHOICE_TYPES = ['single_choice', 'multi_choice', 'dropdown', 'multi_choice_comment']
const NUMERIC_TYPES = ['number', 'rating_number']

interface Props {
  question: Question
  index: number
  total: number
  allQuestions: Question[]
  formType: 'form' | 'survey' | 'quiz'
  onChange: (q: Question) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onRemove: () => void
}

export function QuestionEditor({
  question: q, index, total, allQuestions, formType, onChange, onMoveUp, onMoveDown, onDuplicate, onRemove,
}: Props) {
  const [open, setOpen] = useState(true)
  const meta = QUESTION_TYPE_META[q.type]

  const patch = (p: Partial<Question>) => onChange({ ...q, ...p })
  const patchConfig = (p: Partial<QuestionConfig>) => onChange({ ...q, config: { ...q.config, ...p } })

  const earlierQuestions = allQuestions.filter((x, i) => i < index && x.type !== 'info' && x.type !== 'separator')

  function addRule() {
    const rules = [...(q.conditionalRules ?? [])]
    rules.push({ questionId: earlierQuestions[0]?.id ?? '', operator: 'equals' })
    patch({ conditionalRules: rules })
  }

  function updateRule(i: number, p: Partial<ConditionalRule>) {
    const rules = [...(q.conditionalRules ?? [])]
    rules[i] = { ...rules[i], ...p }
    patch({ conditionalRules: rules })
  }

  const rules = q.conditionalRules ?? []

  return (
    <Card className={cn('overflow-hidden', !open && 'opacity-90')}>
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2.5">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden />
        <Badge variant="secondary" className="shrink-0">{meta.label}</Badge>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {q.title || <span className="text-muted-foreground">سؤال بدون عنوان</span>}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{index + 1} از {total}</span>
        {q.required && <Badge variant="outline" className="shrink-0 text-destructive">اجباری</Badge>}
        {q.scoring && formType === 'quiz' && (
          <Badge variant="outline" className="shrink-0 text-primary">{q.scoring.points} امتیاز</Badge>
        )}
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveUp} disabled={index === 0} aria-label="انتقال به بالا">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMoveDown} disabled={index === total - 1} aria-label="انتقال به پایین">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} aria-label="کپی سؤال">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={onRemove} aria-label="حذف سؤال">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'بستن' : 'باز کردن'}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-4">
            {/* common */}
            <div className="space-y-2">
              <Label htmlFor={`t-${q.id}`}>متن سؤال</Label>
              {q.type === 'info' || q.type === 'separator' ? (
                <Input id={`t-${q.id}`} value={q.title} onChange={(e) => patch({ title: e.target.value })} placeholder="عنوان بخش" />
              ) : (
                <Input id={`t-${q.id}`} value={q.title} onChange={(e) => patch({ title: e.target.value })} placeholder="پرسش خود را بنویسید…" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`d-${q.id}`}>توضیح (اختیاری)</Label>
              {q.type === 'info' ? (
                <Textarea id={`d-${q.id}`} value={q.description} onChange={(e) => patch({ description: e.target.value })} placeholder="متن توضیحی برای پاسخ‌دهنده" rows={3} />
              ) : (
                <Input id={`d-${q.id}`} value={q.description} onChange={(e) => patch({ description: e.target.value })} placeholder="توضیح کوتاه زیر سؤال" />
              )}
            </div>
            {meta.answerable && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">پاسخ اجباری</p>
                  <p className="text-xs text-muted-foreground">پاسخ‌دهنده نمی‌تواند بدون پاسخ‌دادن ادامه دهد</p>
                </div>
                <Switch checked={q.required} onCheckedChange={(v) => patch({ required: v })} aria-label="پاسخ اجباری" />
              </div>
            )}

            {/* type-specific config */}
            {CHOICE_TYPES.includes(q.type) && <ChoicesEditor q={q} patchConfig={patchConfig} />}
            {(q.type === 'short_text' || q.type === 'long_text') && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>حداقل نویسه</Label>
                  <Input type="number" dir="ltr" min={0} value={q.config.minLength ?? ''} onChange={(e) => patchConfig({ minLength: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>حداکثر نویسه</Label>
                  <Input type="number" dir="ltr" min={1} value={q.config.maxLength ?? ''} onChange={(e) => patchConfig({ maxLength: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>متن راهنما (Placeholder)</Label>
                  <Input value={q.config.placeholder ?? ''} onChange={(e) => patchConfig({ placeholder: e.target.value })} />
                </div>
              </div>
            )}
            {NUMERIC_TYPES.includes(q.type) && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>حداقل</Label>
                  <Input type="number" dir="ltr" value={q.config.min ?? ''} onChange={(e) => patchConfig({ min: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>حداکثر</Label>
                  <Input type="number" dir="ltr" value={q.config.max ?? ''} onChange={(e) => patchConfig({ max: e.target.value === '' ? undefined : Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>واحد (اختیاری)</Label>
                  <Input value={q.config.unit ?? ''} onChange={(e) => patchConfig({ unit: e.target.value })} placeholder="مثلاً: سال، تومان" />
                </div>
                {q.type === 'number' && (
                  <label className="flex items-center gap-2 text-sm sm:col-span-3">
                    <Switch checked={q.config.integer ?? false} onCheckedChange={(v) => patchConfig({ integer: v })} />
                    فقط عدد صحیح
                  </label>
                )}
              </div>
            )}
            {q.type === 'matrix' && <MatrixEditor q={q} patchConfig={patchConfig} />}
            {q.type === 'file' && (
              <div className="space-y-2">
                <Label>حداکثر حجم فایل (مگابایت، تا ۴)</Label>
                <Input type="number" dir="ltr" min={0.5} max={4} step={0.5} value={q.config.maxSizeMB ?? 4} onChange={(e) => patchConfig({ maxSizeMB: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">
                  انواع مجاز (ثابت و امن): pdf، تصاویر، متن، xlsx/docx/pptx و zip — فایل‌های اجرایی پذیرفته نمی‌شوند.
                </p>
              </div>
            )}
            {(q.type === 'date') && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>از تاریخ (اختیاری)</Label>
                  <Input type="date" dir="ltr" value={q.config.minDate ?? ''} onChange={(e) => patchConfig({ minDate: e.target.value || undefined })} />
                </div>
                <div className="space-y-2">
                  <Label>تا تاریخ (اختیاری)</Label>
                  <Input type="date" dir="ltr" value={q.config.maxDate ?? ''} onChange={(e) => patchConfig({ maxDate: e.target.value || undefined })} />
                </div>
              </div>
            )}

            {/* scoring (quiz) */}
            {formType === 'quiz' && meta.scoreable && <ScoringEditor q={q} onChange={(s) => patch({ scoring: s })} />}

            {/* conditional logic */}
            {meta.answerable && earlierQuestions.length > 0 && (
              <Collapsible className="rounded-lg border">
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium">
                  <span>منطق شرطی — نمایش این سؤال به شرط…</span>
                  <Badge variant={rules.length ? 'default' : 'secondary'}>{rules.length ? `${rules.length} قاعده فعال` : 'بدون قاعده'}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 border-t p-3">
                  {rules.map((r, i) => {
                    const srcQ = allQuestions.find((x) => x.id === r.questionId)
                    const srcIsChoice = srcQ ? CHOICE_TYPES.includes(srcQ.type) : false
                    const srcIsNumeric = srcQ ? NUMERIC_TYPES.includes(srcQ.type) : false
                    return (
                      <div key={i} className="space-y-2 rounded-lg border bg-muted/30 p-3">
                        <div className="flex items-center gap-2">
                          <Select value={r.questionId} onValueChange={(v) => updateRule(i, { questionId: v })} dir="rtl">
                            <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="سؤال شرط" /></SelectTrigger>
                            <SelectContent>
                              {earlierQuestions.map((x) => (
                                <SelectItem key={x.id} value={x.id}>{x.title || x.type}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={r.operator} onValueChange={(v) => updateRule(i, { operator: v as ConditionalOperator })} dir="rtl">
                            <SelectTrigger className="w-44 shrink-0"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CONDITIONAL_OPERATORS.filter((op) =>
                                !(srcQ && ['info', 'separator'].includes(srcQ.type)) &&
                                !(srcIsNumeric && ['includes'].includes(op.value)) &&
                                !(srcIsChoice && ['gt', 'lt'].includes(op.value)),
                              ).map((op) => (
                                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => patch({ conditionalRules: rules.filter((_, j) => j !== i) })} aria-label="حذف قاعده">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {srcIsChoice && ['equals', 'not_equals', 'includes'].includes(r.operator) && srcQ && (
                          <Select value={r.value ?? ''} onValueChange={(v) => updateRule(i, { value: v })} dir="rtl">
                            <SelectTrigger className="w-full"><SelectValue placeholder="انتخاب گزینه" /></SelectTrigger>
                            <SelectContent>
                              {(srcQ.config.choices ?? []).map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                              ))}
                              {srcQ.config.allowOther && <SelectItem value="__other__">سایر موارد</SelectItem>}
                            </SelectContent>
                          </Select>
                        )}
                        {srcIsNumeric && ['gt', 'lt', 'equals', 'not_equals'].includes(r.operator) && (
                          <Input type="number" dir="ltr" value={r.value ?? ''} onChange={(e) => updateRule(i, { value: e.target.value })} placeholder="عدد" />
                        )}
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between">
                    <Button size="sm" variant="outline" onClick={addRule} type="button">
                      <Plus className="ml-1 h-4 w-4" /> افزودن قاعده
                    </Button>
                    {rules.length > 1 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>اجرا وقتی:</span>
                        <Select value={q.conditionalMode} onValueChange={(v) => patch({ conditionalMode: v as 'any' | 'all' })} dir="rtl">
                          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">حداقل یک قاعده</SelectItem>
                            <SelectItem value="all">همه قواعد</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    سؤال فقط وقتی نمایش داده می‌شود که شرط برقرار باشد. قاعده فقط می‌تواند به سؤال‌های قبلی اشاره کند؛
                    پاسخ‌های سؤال‌های پنهان در ارسال پذیرفته نمی‌شوند.
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

// ---------- choices editor ----------

function ChoicesEditor({ q, patchConfig }: { q: Question; patchConfig: (p: Partial<QuestionConfig>) => void }) {
  const choices = q.config.choices ?? []
  const isMulti = q.type === 'multi_choice' || q.type === 'multi_choice_comment'

  function addChoice() {
    patchConfig({ choices: [...choices, { id: newChoiceId(), label: `گزینه ${choices.length + 1}` }] })
  }
  function updateLabel(id: string, label: string) {
    patchConfig({ choices: choices.map((c) => (c.id === id ? { ...c, label } : c)) })
  }
  function removeChoice(id: string) {
    if (choices.length <= 2) return
    patchConfig({ choices: choices.filter((c) => c.id !== id) })
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Label>گزینه‌ها</Label>
      {choices.map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <Input value={c.label} onChange={(e) => updateLabel(c.id, e.target.value)} placeholder={`گزینه`} />
          <Button
            variant="ghost" size="icon" className="h-9 w-9 shrink-0 hover:text-destructive"
            onClick={() => removeChoice(c.id)}
            disabled={choices.length <= 2}
            aria-label="حذف گزینه"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={addChoice} type="button">
        <Plus className="ml-1 h-4 w-4" /> افزودن گزینه
      </Button>
      {(q.type === 'single_choice' || q.type === 'multi_choice' || q.type === 'dropdown') && (
        <label className="flex items-center gap-2 pt-1 text-sm">
          <Switch checked={q.config.allowOther ?? false} onCheckedChange={(v) => patchConfig({ allowOther: v })} />
          گزینه «سایر موارد» با پاسخ آزاد
        </label>
      )}
      {isMulti && (
        <div className="grid gap-3 pt-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>حداقل انتخاب</Label>
            <Input type="number" dir="ltr" min={0} value={q.config.minSelects ?? ''} onChange={(e) => patchConfig({ minSelects: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>حداکثر انتخاب</Label>
            <Input type="number" dir="ltr" min={1} value={q.config.maxSelects ?? ''} onChange={(e) => patchConfig({ maxSelects: e.target.value === '' ? undefined : Number(e.target.value) })} />
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- matrix editor ----------

function MatrixEditor({ q, patchConfig }: { q: Question; patchConfig: (p: Partial<QuestionConfig>) => void }) {
  const rowsText = (q.config.rows ?? []).join('\n')
  const colsText = (q.config.cols ?? []).join('\n')
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label>سطرها (هر خط یک مورد)</Label>
        <Textarea
          rows={4}
          value={rowsText}
          onChange={(e) => patchConfig({ rows: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
        />
      </div>
      <div className="space-y-2">
        <Label>ستون‌ها (هر خط یک مورد)</Label>
        <Textarea
          rows={4}
          value={colsText}
          onChange={(e) => patchConfig({ cols: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
        />
      </div>
    </div>
  )
}

// ---------- scoring editor (quiz) ----------

function ScoringEditor({ q, onChange }: { q: Question; onChange: (s: Question['scoring']) => void }) {
  const s = q.scoring
  const choices = q.config.choices ?? []
  const correct = new Set(s?.correctChoices ?? [])

  function toggleCorrect(id: string) {
    const next = new Set(correct)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    const single = q.type === 'single_choice' || q.type === 'dropdown'
    onChange({
      points: s?.points ?? 10,
      correctChoices: single ? [id] : [...next],
      correctBoolean: s?.correctBoolean,
      correctNumber: s?.correctNumber,
      acceptRange: s?.acceptRange,
    })
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <Label>نمره‌دهی خودکار</Label>
        <Switch
          checked={Boolean(s)}
          onCheckedChange={(v) => onChange(v ? { points: 10 } : null)}
          aria-label="فعال‌سازی نمره‌دهی"
        />
      </div>
      {s && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>امتیاز این سؤال</Label>
            <Input
              type="number" dir="ltr" min={1} max={1000}
              value={s.points}
              onChange={(e) => onChange({ ...s, points: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          {(q.type === 'single_choice' || q.type === 'dropdown') && (
            <div className="space-y-2">
              <Label>پاسخ صحیح</Label>
              <div className="space-y-1.5">
                {choices.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={s.correctChoices?.[0] === c.id}
                      onChange={() => onChange({ ...s, correctChoices: [c.id] })}
                      className="h-4 w-4"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          {q.type === 'multi_choice' && (
            <div className="space-y-2">
              <Label>گزینه‌های صحیح (چند انتخاب)</Label>
              <div className="space-y-1.5">
                {choices.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={correct.has(c.id)} onChange={() => toggleCorrect(c.id)} className="h-4 w-4" />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>
          )}
          {q.type === 'boolean' && (
            <div className="space-y-2">
              <Label>پاسخ صحیح</Label>
              <div className="flex gap-3 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`cb-${q.id}`} checked={s.correctBoolean === true} onChange={() => onChange({ ...s, correctBoolean: true })} className="h-4 w-4" />
                  بله
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name={`cb-${q.id}`} checked={s.correctBoolean === false} onChange={() => onChange({ ...s, correctBoolean: false })} className="h-4 w-4" />
                  خیر
                </label>
              </div>
            </div>
          )}
          {(q.type === 'number' || q.type === 'rating_number') && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>پاسخ صحیح</Label>
                <Input type="number" dir="ltr" value={s.correctNumber ?? ''} onChange={(e) => onChange({ ...s, correctNumber: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>حداقل قابل قبول</Label>
                <Input type="number" dir="ltr" value={s.acceptRange?.min ?? ''} onChange={(e) => onChange({ ...s, correctNumber: undefined, acceptRange: { min: Number(e.target.value) || 0, max: s.acceptRange?.max ?? 0 } })} />
              </div>
              <div className="space-y-2">
                <Label>حداکثر قابل قبول</Label>
                <Input type="number" dir="ltr" value={s.acceptRange?.max ?? ''} onChange={(e) => onChange({ ...s, correctNumber: undefined, acceptRange: { min: s.acceptRange?.min ?? 0, max: Number(e.target.value) || 0 } })} />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-3">اگر بازه قابل قبول تعیین شود، به‌جای پاسخ دقیق استفاده می‌شود.</p>
            </div>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            سؤال‌های متنی، تاریخ، ساعت، فایل و ماتریس نمره خودکار نمی‌گیرند (طبق سیاست محصول، نمره‌دهی تشریحی دستی است).
          </p>
        </div>
      )}
    </div>
  )
}

export { CHOICE_TYPES }
