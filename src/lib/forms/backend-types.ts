import type {
  AiAnalysisData,
  AnswerValue,
  FormSettings,
  FormStatus,
  FormSummary,
  FormType,
  Question,
  SavedAiAnalysis,
} from '@/types'

export interface ExportRow {
  responseId: string
  submittedAt: string
  status: string
  totalScore: number | null
  maxScore: number | null
  passed: boolean | null
  answers: Record<string, AnswerValue>
}

export interface ListResponsesOpts {
  from?: string
  to?: string
  status?: string
  ids?: string[]
  order?: 'asc' | 'desc'
  offset?: number
  limit?: number
}

export interface InsertResponseInput {
  formId: string
  respondentId?: string | null
  respondentKey: string
  status?: string
  totalScore?: number | null
  maxScore?: number | null
  passed?: boolean | null
  attemptNumber?: number
  startedAt?: string | null
  answers: Record<string, AnswerValue>
}

export interface FormsBackend {
  listForms(ownerId: string): Promise<FormSummary[]>
  getForm(formId: string, ownerId: string): Promise<(FormSummary & { questions: Question[] }) | null>
  getFormByPublicId(publicId: string): Promise<(FormSummary & { questions: Question[] }) | null>
  createForm(ownerId: string, input: { title: string; description?: string; formType?: FormType; publicId: string; settings?: FormSettings }): Promise<FormSummary>
  updateForm(formId: string, ownerId: string, patch: { title?: string; description?: string; formType?: FormType; status?: FormStatus; settings?: FormSettings }): Promise<FormSummary | null>
  deleteForm(formId: string, ownerId: string): Promise<boolean>
  duplicateForm(formId: string, ownerId: string): Promise<FormSummary | null>
  saveQuestions(formId: string, ownerId: string, questions: Question[]): Promise<boolean>
  insertResponse(input: InsertResponseInput): Promise<string>
  updateResponseAnswers(responseId: string, formId: string, respondentKey: string, answers: Record<string, AnswerValue>): Promise<boolean>
  countResponses(formId: string): Promise<number>
  countAttempts(formId: string, respondentKey: string): Promise<number>
  listResponses(formId: string, opts: ListResponsesOpts): Promise<{ rows: ExportRow[]; total: number }>
  searchResponseIds(formId: string, term: string): Promise<string[]>
  getResponseDetail(formId: string, responseId: string): Promise<ExportRow | null>
  deleteResponse(formId: string, responseId: string): Promise<boolean>
  getAnswerValues(formId: string): Promise<Record<string, AnswerValue[]>>
  overviewStats(ownerId: string): Promise<{
    totalForms: number
    publishedForms: number
    totalResponses: number
    recentResponses: number
    daily: { date: string; count: number }[]
  }>
  saveUploadedFile(input: { formId: string; path: string; name: string; mime: string; size: number }): Promise<string>
  getUploadedFile(fileId: string): Promise<{ id: string; formId: string; path: string; name: string; mime: string; size: number } | null>
  /** Persist a freshly generated AI analysis (owner-checked). */
  saveAiAnalysis(
    formId: string,
    ownerId: string,
    input: { analysis: AiAnalysisData; model: string; provider: string; responsesCount: number },
  ): Promise<SavedAiAnalysis>
  /** Latest stored AI analysis of a form (owner-checked), or null. */
  getLatestAiAnalysis(formId: string, ownerId: string): Promise<SavedAiAnalysis | null>
}
