"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const field = "rounded bg-neutral-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500";

export function CampaignForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      niche: String(fd.get("niche") ?? ""),
      subNiche: String(fd.get("subNiche") ?? "") || undefined,
      city: String(fd.get("city") ?? ""),
      state: String(fd.get("state") ?? "") || undefined,
      country: String(fd.get("country") ?? "BR"),
      maxCompanies: Number(fd.get("maxCompanies") ?? 50),
    };
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Falha ao criar campanha. Verifique os campos.");
      return;
    }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 rounded-lg border border-neutral-800 p-4 md:grid-cols-3">
      <input name="niche" required placeholder="Nicho (ex: clínica odontológica)" className={`${field} col-span-2 md:col-span-1`} />
      <input name="subNiche" placeholder="Subnicho (opcional)" className={field} />
      <input name="city" required placeholder="Cidade" className={field} />
      <input name="state" placeholder="UF" className={field} />
      <input name="country" defaultValue="BR" placeholder="País" className={field} />
      <input name="maxCompanies" type="number" min={1} max={5000} defaultValue={50} placeholder="Máx. empresas" className={field} />
      <button
        type="submit"
        disabled={busy}
        className="col-span-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 md:col-span-1"
      >
        {busy ? "Criando…" : "Criar campanha"}
      </button>
      {error && <p className="col-span-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
