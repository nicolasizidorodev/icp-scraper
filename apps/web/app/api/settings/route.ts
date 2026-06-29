import { NextResponse } from "next/server";
import { listApiKeyStatus, setApiKey, deleteApiKey, MANAGED_KEYS } from "@icp/secrets";

export const runtime = "nodejs";

// GET /api/settings — status mascarado das chaves (nunca devolve o valor).
export async function GET() {
  return NextResponse.json({ keys: await listApiKeyStatus() });
}

// PUT /api/settings — define ou remove uma chave. Body: { name, value }.
export async function PUT(req: Request) {
  const body = (await req.json().catch(() => null)) as { name?: string; value?: string } | null;
  if (!body?.name || !MANAGED_KEYS.includes(body.name as (typeof MANAGED_KEYS)[number])) {
    return NextResponse.json({ error: "name inválido" }, { status: 400 });
  }
  const value = (body.value ?? "").trim();
  if (value) await setApiKey(body.name, value);
  else await deleteApiKey(body.name);
  return NextResponse.json({ ok: true });
}
