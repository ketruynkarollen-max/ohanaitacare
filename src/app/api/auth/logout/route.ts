export const dynamic = "force-dynamic"
/**
 * API de Logout - Remove o token
 */
import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.set("auth-token", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  })
  return response
}
