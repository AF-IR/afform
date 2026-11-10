import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getCurrentUser } from '@/lib/auth/service'
import { backend } from '@/lib/forms/service'
import { jsonError } from '@/lib/api-helpers'

type Params = { params: Promise<{ fileId: string }> }

/** Authenticated download — only the form owner may fetch uploaded files. */
export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser()
  if (!user) return jsonError('ابتدا وارد شوید', 401)

  const { fileId } = await params
  try {
    const rec = await backend().getUploadedFile(fileId)
    if (!rec) return jsonError('فایل یافت نشد', 404)

    const form = await backend().getForm(rec.formId, user.id)
    if (!form) return jsonError('دسترسی مجاز نیست', 403)

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import('@supabase/supabase-js')
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
      const { data, error } = await admin.storage.from('form-uploads').createSignedUrl(rec.path, 120)
      if (error || !data) return jsonError('ساخت لینک دانلود ناموفق بود', 500)
      return Response.redirect(data.signedUrl, 302)
    }

    const abs = path.resolve(process.cwd(), rec.path)
    if (!abs.startsWith(path.resolve(process.cwd(), 'db', 'uploads'))) {
      return jsonError('مسیر فایل نامعتبر است', 400) // path traversal guard
    }
    const buf = await readFile(abs)
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': rec.mime,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(rec.name)}`,
      },
    })
  } catch {
    return jsonError('خطا در دریافت فایل', 500)
  }
}
