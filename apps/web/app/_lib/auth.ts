import { NextResponse } from "next/server";

/**
 * Guard de escrita (scaffold multi-tenant). Se ADMIN_TOKEN estiver setado,
 * exige header `Authorization: Bearer <token>`. Sem token = modo dev (libera).
 * Retorna uma Response 401 quando bloqueado, ou null quando autorizado.
 */
export function unauthorized(req: Request): Response | null {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return null;
  const header = req.headers.get("authorization") ?? "";
  if (header === `Bearer ${token}`) return null;
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
