import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "arsham-form",
    health: "/api/health",
  });
}
