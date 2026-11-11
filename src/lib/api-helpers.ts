import 'server-only'
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/service'
import type { SessionUser } from '@/types'

export function jsonOk(data: Record<string, unknown> = {}, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init)
}

export function jsonError(error: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status })
}

export async function requireUser(): Promise<SessionUser | null> {
  return getCurrentUser()
}

/** Parse a JSON body with a hard size guard. */
export async function readJson<T>(req: Request, maxBytes = 512 * 1024): Promise<T | null> {
  const text = await req.text()
  if (text.length > maxBytes) return null
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
