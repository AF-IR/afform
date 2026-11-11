import { signOut } from '@/lib/auth/service'
import { jsonOk } from '@/lib/api-helpers'

export async function POST() {
  await signOut()
  return jsonOk()
}
