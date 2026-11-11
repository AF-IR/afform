// ============================================================
// Arsham Form — Core domain types (single source of truth)
// Used by builder UI, public renderer, API validation and scoring.
// ============================================================

export type FormType = 'form' | 'survey' | 'quiz'
export type FormStatus = 'draft' | 'published' | 'closed'

/** All supported question types. */
export type QuestionType =
  // متنی
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'url'
  // انتخابی
  | 'single_choice'
  | 'multi_choice'
  | 'dropdown'
  | 'boolean'
  // عددی و امتیازی
  | 'rating_number'
  | 'likert'
  | 'rating_5'
  | 'rating_10'
  | 'stars'
  // پیشرفته
  | 'date'
  | 'time'
  | 'file'
  | 'matrix'
  | 'info'
  | 'separator'
  | 'multi_choice_comment'

export const ALL_QUESTION_TYPES: QuestionType[] = [
  'short_text', 'long_text', 'email', 'phone', 'number', 'url',
  'single_choice', 'multi_choice', 'dropdown', 'boolean',
  'rating_number', 'likert', 'rating_5', 'rating_10', 'stars',
  'date', 'time', 'file', 'matrix', 'info', 'separator', 'multi_choice_comment',
]

/** Choice option of a choice-type question. */
export interface Choice {
  id: string
  label: string
}

/** Conditional visibility rule (declarative — never user code). */
export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'includes'
  | 'gt'
  | 'lt'
  | 'answered'
  | 'not_answered'

export interface ConditionalRule {
  questionId: string
  operator: ConditionalOperator
  /** choice id / text / number depending on the source question type */
  value?: string
}

export interface QuestionScoring {
  /** points awarded when the answer is correct */
  points: number
  /** correct choice ids (single_choice / dropdown / multi_choice) */
  correctChoices?: string[]
  /** correct boolean answer */
  correctBoolean?: boolean
  /** exact numeric answer */
  correctNumber?: number
  /** numeric tolerance range (inclusive) */
  acceptRange?: { min: number; max: number }
}

/** Type-specific configuration, validated per question type. */
export interface QuestionConfig {
  // text
  minLength?: number
  maxLength?: number
  placeholder?: string
  // number / rating_number
  min?: number
  max?: number
  integer?: boolean
  unit?: string
  // choice types
  choices?: Choice[]
  allowOther?: boolean
  minSelects?: number
  maxSelects?: number
  // likert
  likertLabels?: string[]
  // matrix
  rows?: string[]
  cols?: string[]
  // file
  maxSizeMB?: number
  allowedTypes?: string[]
  // date
  minDate?: string
  maxDate?: string
}

export interface Question {
  id: string
  type: QuestionType
  title: string
  description: string
  required: boolean
  position: number
  config: QuestionConfig
  scoring: QuestionScoring | null
  conditionalRules: ConditionalRule[] | null
  conditionalMode: 'any' | 'all'
}

/** Special choice id used when allowOther is enabled. */
export const OTHER_CHOICE_ID = '__other__'

/** File upload answer stored value. */
export interface FileAnswer {
  fileId: string
  name: string
  size: number
  mime: string
}

/** Choice answer possibly carrying "other" text and/or a comment. */
export interface ChoiceAnswerValue {
  value: string | string[]
  text?: string
  comment?: string
}

export type AnswerValue =
  | string
  | string[]
  | number
  | boolean
  | Record<string, string> // matrix: { row: col }
  | FileAnswer
  | ChoiceAnswerValue
  | null

/**
 * Secure-exam identity gate — respondent must identify themselves before the
 * exam starts. National-ID whitelist and one-entry-per-national-ID are both
 * enforced server-side on every submit (the browser is never trusted).
 */
export interface IdentityGate {
  enabled: boolean
  /** require «نام و نام خانوادگی» before entering */
  requireFullName: boolean
  /** require a valid Iranian national ID (کد ملی) before entering */
  requireNationalId: boolean
  /** normalized 10-digit national IDs allowed to enter; empty = any valid ID */
  allowedNationalIds: string[]
}

export interface FormSettings {
  /** message shown after successful submission */
  thankYouMessage: string
  showProgressBar: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
  /** allow anonymous (not logged-in) respondents */
  allowAnonymous: boolean
  /** respondent may edit their response afterwards (same browser) */
  allowResponseEdit: boolean
  /** show quiz result to respondent */
  showResultsToRespondent: boolean
  /** allow search engines to index the public page */
  allowIndexing: boolean
  startAt: string | null
  endAt: string | null
  responseLimit: number | null
  // quiz-only
  timeLimitMinutes: number | null
  maxAttempts: number | null
  passingScorePercent: number | null
  showResultImmediately: boolean
  /** secure-exam identity gate (quiz security) */
  identityGate: IdentityGate | null
}

export const DEFAULT_FORM_SETTINGS: FormSettings = {
  thankYouMessage: 'پاسخ شما با موفقیت ثبت شد. سپاس از همکاری شما.',
  showProgressBar: true,
  shuffleQuestions: false,
  shuffleOptions: false,
  allowAnonymous: true,
  allowResponseEdit: false,
  showResultsToRespondent: false,
  allowIndexing: false,
  startAt: null,
  endAt: null,
  responseLimit: null,
  timeLimitMinutes: null,
  maxAttempts: null,
  passingScorePercent: null,
  showResultImmediately: false,
  identityGate: null,
}

export interface FormSummary {
  id: string
  title: string
  description: string
  formType: FormType
  status: FormStatus
  publicId: string
  settings: FormSettings
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  questionCount?: number
  responseCount?: number
}

export interface QuestionScoringResult {
  questionId: string
  earned: number
  max: number
  correct: boolean | null
}

export interface QuizResult {
  totalScore: number
  maxScore: number
  passed: boolean | null
  perQuestion: QuestionScoringResult[]
}

export interface SessionUser {
  id: string
  email: string
  displayName: string
  emailVerified: boolean
  createdAt: string
}

export interface QuestionTypeMeta {
  type: QuestionType
  label: string
  icon: string
  group: 'text' | 'choice' | 'rating' | 'advanced'
  /** types that accept an answer (info/separator do not) */
  answerable: boolean
  /** types supporting correct-answer scoring */
  scoreable: boolean
}

export const QUESTION_TYPE_META: Record<QuestionType, QuestionTypeMeta> = {
  short_text:          { type: 'short_text',          label: 'متن کوتاه',            icon: 'Type',        group: 'text',     answerable: true,  scoreable: false },
  long_text:           { type: 'long_text',           label: 'متن بلند',             icon: 'AlignRight',  group: 'text',     answerable: true,  scoreable: false },
  email:               { type: 'email',               label: 'ایمیل',                icon: 'Mail',        group: 'text',     answerable: true,  scoreable: false },
  phone:               { type: 'phone',               label: 'شماره تلفن',           icon: 'Phone',       group: 'text',     answerable: true,  scoreable: false },
  number:              { type: 'number',              label: 'عدد',                  icon: 'Hash',        group: 'text',     answerable: true,  scoreable: true },
  url:                 { type: 'url',                 label: 'لینک (URL)',           icon: 'Link',        group: 'text',     answerable: true,  scoreable: false },
  single_choice:       { type: 'single_choice',       label: 'انتخاب یک گزینه',      icon: 'CircleDot',   group: 'choice',   answerable: true,  scoreable: true },
  multi_choice:        { type: 'multi_choice',        label: 'انتخاب چند گزینه',     icon: 'CheckSquare', group: 'choice',   answerable: true,  scoreable: true },
  dropdown:            { type: 'dropdown',            label: 'فهرست کشویی',          icon: 'ChevronDown', group: 'choice',   answerable: true,  scoreable: true },
  boolean:             { type: 'boolean',             label: 'بله یا خیر',           icon: 'ToggleLeft',  group: 'choice',   answerable: true,  scoreable: true },
  rating_number:       { type: 'rating_number',       label: 'امتیازدهی عددی',       icon: 'SlidersHorizontal', group: 'rating', answerable: true, scoreable: true },
  likert:              { type: 'likert',              label: 'مقیاس لیکرت',          icon: 'BarChart2',   group: 'rating',   answerable: true,  scoreable: true },
  rating_5:            { type: 'rating_5',            label: 'امتیاز ۱ تا ۵',        icon: 'Star',        group: 'rating',   answerable: true,  scoreable: true },
  rating_10:           { type: 'rating_10',           label: 'امتیاز ۱ تا ۱۰',       icon: 'Star',        group: 'rating',   answerable: true,  scoreable: true },
  stars:               { type: 'stars',               label: 'انتخاب ستاره‌ای',      icon: 'Star',        group: 'rating',   answerable: true,  scoreable: true },
  date:                { type: 'date',                label: 'تاریخ',                icon: 'Calendar',    group: 'advanced', answerable: true,  scoreable: false },
  time:                { type: 'time',                label: 'ساعت',                 icon: 'Clock',       group: 'advanced', answerable: true,  scoreable: false },
  file:                { type: 'file',                label: 'بارگذاری فایل',        icon: 'Upload',      group: 'advanced', answerable: true,  scoreable: false },
  matrix:              { type: 'matrix',              label: 'ماتریس سؤالات',        icon: 'Grid3X3',     group: 'advanced', answerable: true,  scoreable: false },
  info:                { type: 'info',                label: 'بخش توضیحی',           icon: 'Info',        group: 'advanced', answerable: false, scoreable: false },
  separator:           { type: 'separator',           label: 'جداکننده بخش‌ها',      icon: 'Minus',       group: 'advanced', answerable: false, scoreable: false },
  multi_choice_comment:{ type: 'multi_choice_comment',label: 'چندگزینه‌ای با توضیح',  icon: 'MessageSquare', group: 'choice', answerable: true, scoreable: true },
}

export const FORM_TYPE_LABEL: Record<FormType, string> = {
  form: 'فرم',
  survey: 'پرسشنامه',
  quiz: 'آزمون',
}

export const STATUS_LABEL: Record<FormStatus, string> = {
  draft: 'پیش‌نویس',
  published: 'منتشرشده',
  closed: 'بسته‌شده',
}

// ---------- AI analysis ----------

/** Structured Persian analysis of real form results, produced by the Z.AI model. */
export interface AiAnalysisData {
  summary: string
  insights: string[]
  anomalies: string[]
  suggestions: string[]
}

/** A persisted AI analysis row (one per generation, latest is shown). */
export interface SavedAiAnalysis {
  id: string
  formId: string
  analysis: AiAnalysisData
  model: string
  provider: string
  responsesCount: number
  createdAt: string
}
