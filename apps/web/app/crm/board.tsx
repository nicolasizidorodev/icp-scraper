"use client";

import { useEffect, useState } from "react";

const STATUSES = ["NEW", "CONTACTED", "REPLIED", "MEETING", "PROPOSAL", "WON", "LOST"] as const;
type Status = (typeof STATUSES)[number];

interface Card {
  id: string;
  status: Status;
  priority: number;
  company: {
    id: string;
    name: string;
    city: string | null;
    landingPage: { slug: string } | null;
    icpScore: { total: number } | null;
  };
}

function scoreColor(n: number): string {
  if (n >= 70) return "bg-emerald-600";
  if (n >= 40) return "bg-amber-600";
  return "bg-neutral-700";
}

export function Board() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crm")
      .then((r) => r.json())
      .then((j) => setCards(j.cards ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function move(companyId: string, status: Status) {
    setCards((prev) => prev.map((c) => (c.company.id === companyId ? { ...c, status } : c)));
    await fetch("/api/crm", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyId, status }),
    });
  }

  if (loading) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (cards.length === 0)
    return <p className="text-sm text-neutral-500">Sem cartões. Empresas entram no CRM ao finalizar o pipeline.</p>;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {STATUSES.map((status) => {
        const col = cards.filter((c) => c.status === status);
        return (
          <div key={status} className="w-64 shrink-0 rounded-lg border border-neutral-800 bg-neutral-900/40">
            <div className="border-b border-neutral-800 px-3 py-2 text-xs font-semibold uppercase text-neutral-400">
              {status} <span className="text-neutral-600">({col.length})</span>
            </div>
            <div className="flex flex-col gap-2 p-2">
              {col.map((c) => (
                <div key={c.id} className="rounded border border-neutral-800 bg-neutral-900 p-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{c.company.name}</span>
                    {c.company.icpScore && (
                      <span className={`rounded px-1.5 text-xs font-bold text-white ${scoreColor(c.company.icpScore.total)}`}>
                        {c.company.icpScore.total}
                      </span>
                    )}
                  </div>
                  {c.company.city && <p className="text-xs text-neutral-500">{c.company.city}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    {c.company.landingPage ? (
                      <a
                        href={`/lp/${c.company.landingPage.slug}`}
                        target="_blank"
                        rel="noopener"
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        LP ↗
                      </a>
                    ) : (
                      <span className="text-xs text-neutral-600">sem LP</span>
                    )}
                    <select
                      value={c.status}
                      onChange={(e) => move(c.company.id, e.target.value as Status)}
                      className="rounded bg-neutral-800 px-1 py-0.5 text-xs outline-none"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
