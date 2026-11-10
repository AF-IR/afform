import { getCurrentUser, updateDisplayName } from '@/lib/auth/service'
import { profileSchema } from '@/lib/validation/schemas'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)
  return jsonOk({ user })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)

  const body = await readJson<unknown>(req)
  if (!body) return jsonError('درخواست نامعتبر است')

  const parsed = profileSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر', 422)

  const result = await updateDisplayName(user.id, parsed.data.displayName)
  if (!result.ok) return jsonError(result.error ?? 'به‌روزرسانی ناموفق بود')
  return jsonOk({ message: 'پروفایل به‌روزرسانی شد.' })
}
