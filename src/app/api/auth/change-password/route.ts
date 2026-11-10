import { getCurrentUser, changePassword } from '@/lib/auth/service'
import { changePasswordSchema } from '@/lib/validation/schemas'
import { jsonError, jsonOk, readJson } from '@/lib/api-helpers'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)

  const body = await readJson<unknown>(req)
  if (!body) return jsonError('درخواست نامعتبر است')

  const parsed = changePasswordSchema.safeParse(body)
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? 'ورودی نامعتبر', 422)

  const result = await changePassword(parsed.data.currentPassword, parsed.data.newPassword)
  if (!result.ok) return jsonError(result.error ?? 'عملیات ناموفق بود')
  return jsonOk({ message: 'رمز عبور با موفقیت تغییر کرد.' })
}
