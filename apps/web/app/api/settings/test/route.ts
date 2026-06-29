import { NextResponse } from "next/server";
import { getApiKey } from "@icp/secrets";
import { unauthorized } from "../../../_lib/auth";

export const runtime = "nodejs";

interface TestResult {
  ok: boolean;
  message: string;
}

/** fetch com timeout (testes não podem travar a UI). */
async function ping(url: string, init: RequestInit, timeoutMs = 20000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function testKey(name: string, key: string): Promise<TestResult> {
  switch (name) {
    case "ANTHROPIC_API_KEY": {
      const r = await ping("https://api.anthropic.com/v1/models?limit=1", {
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      });
      return r.ok
        ? { ok: true, message: "Conectado (Anthropic)." }
        : { ok: false, message: `Anthropic ${r.status} — chave inválida?` };
    }
    case "OPENAI_API_KEY": {
      const r = await ping("https://api.openai.com/v1/models", {
        headers: { authorization: `Bearer ${key}` },
      });
      return r.ok
        ? { ok: true, message: "Conectado (OpenAI)." }
        : { ok: false, message: `OpenAI ${r.status} — chave inválida?` };
    }
    case "GOOGLE_PLACES_API_KEY": {
      const r = await ping("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.id",
        },
        body: JSON.stringify({ textQuery: "cafe", pageSize: 1 }),
      });
      if (r.ok) return { ok: true, message: "Conectado (Google Places)." };
      const body = await r.text();
      return { ok: false, message: `Places ${r.status}: ${body.slice(0, 120)}` };
    }
    case "GOOGLE_MAPS_API_KEY": {
      const r = await ping(
        `https://maps.googleapis.com/maps/api/geocode/json?address=Sao+Paulo&key=${encodeURIComponent(key)}`,
        {},
      );
      const j = (await r.json().catch(() => ({}))) as { status?: string; error_message?: string };
      return j.status === "OK" || j.status === "ZERO_RESULTS"
        ? { ok: true, message: "Conectado (Google Maps)." }
        : { ok: false, message: `Maps: ${j.status ?? r.status} ${j.error_message ?? ""}`.trim() };
    }
    case "META_AD_LIBRARY_TOKEN": {
      const r = await ping(
        `https://graph.facebook.com/v21.0/ads_archive?search_terms=cafe&ad_reached_countries=%5B%22BR%22%5D&fields=id&limit=1&access_token=${encodeURIComponent(key)}`,
        {},
      );
      const j = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
      return r.ok && !j.error
        ? { ok: true, message: "Conectado (Meta Ad Library)." }
        : { ok: false, message: `Meta: ${j.error?.message ?? r.status}` };
    }
    case "APIFY_TOKEN": {
      const r = await ping(`https://api.apify.com/v2/users/me?token=${encodeURIComponent(key)}`, {});
      return r.ok
        ? { ok: true, message: "Conectado (Apify)." }
        : { ok: false, message: `Apify ${r.status} — token inválido?` };
    }
    case "PAGESPEED_API_KEY": {
      const r = await ping(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&strategy=mobile&key=${encodeURIComponent(key)}`,
        {},
        60000,
      );
      if (r.ok) return { ok: true, message: "Conectado (PageSpeed)." };
      const body = await r.text();
      return { ok: false, message: `PageSpeed ${r.status}: ${body.slice(0, 120)}` };
    }
    default:
      return { ok: false, message: "Teste não suportado para esta chave." };
  }
}

// POST /api/settings/test — testa a conexão da chave salva. Body: { name }.
export async function POST(req: Request) {
  const denied = unauthorized(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  if (!body?.name) return NextResponse.json({ ok: false, message: "name obrigatório" }, { status: 400 });

  const key = await getApiKey(body.name);
  if (!key) return NextResponse.json({ ok: false, message: "Chave não configurada." });

  try {
    const result = await testKey(body.name, key);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error && err.name === "AbortError" ? "timeout" : "falha de rede";
    return NextResponse.json({ ok: false, message: `Erro: ${msg}` });
  }
}
