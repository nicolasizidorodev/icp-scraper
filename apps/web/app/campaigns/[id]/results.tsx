"use client";

import { Fragment, useEffect, useState } from "react";

interface CompanyRow {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  website: string | null;
  pipelineStage: string;
  icpScore: { total: number; buyingIntent: number; reputation: number } | null;
  landingPage: { slug: string; status: string } | null;
  crmCard: { status: string } | null;
  _count: { opportunities: number };
}

interface Detail {
  opportunities: { id: string; title: string; detail: string; severity: string }[];
  proposal: { executiveSummary: string; priorities: string; roiEstimate: string } | null;
  messages: { channel: string; subject: string | null; body: string }[];
  landingPage: { slug: string } | null;
}

const sevColor: Record<string, string> = {
  CRITICAL: "text-red-400",
  HIGH: "text-orange-400",
  MEDIUM: "text-amber-400",
  LOW: "text-neutral-400",
};

function scoreColor(n: number): string {
  if (n >= 70) return "bg-emerald-600";
  if (n >= 40) return "bg-amber-600";
  return "bg-neutral-700";
}

function Expanded({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`/api/companies/${id}`)
      .then((r) => r.json())
      .then((j) => active && setD(j.company))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p className="p-4 text-sm text-neutral-500">Carregando diagnóstico…</p>;
  if (!d) return <p className="p-4 text-sm text-red-400">Falha ao carregar.</p>;

  return (
    <div className="grid gap-4 bg-neutral-900/50 p-4 md:grid-cols-3">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">Oportunidades</h4>
        {d.opportunities.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {d.opportunities.map((o) => (
              <li key={o.id}>
                <span className={sevColor[o.severity]}>● </span>
                <strong>{o.title}</strong>
                <p className="text-neutral-400">{o.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">Proposta</h4>
        {d.proposal ? (
          <div className="space-y-2 text-sm text-neutral-300">
            <p>{d.proposal.executiveSummary}</p>
            <p><span className="text-neutral-500">Prioridades:</span> {d.proposal.priorities}</p>
            <p><span className="text-neutral-500">ROI:</span> {d.proposal.roiEstimate}</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Não gerada.</p>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">Mensagens + LP</h4>
        {d.landingPage && (
          <a
            href={`/lp/${d.landingPage.slug}`}
            target="_blank"
            rel="noopener"
            className="mb-2 inline-block rounded bg-emerald-600 px-3 py-1 text-xs text-white"
          >
            Abrir landing page ↗
          </a>
        )}
        <ul className="space-y-2 text-sm">
          {d.messages.map((m) => (
            <li key={m.channel}>
              <strong className="text-neutral-400">{m.channel}</strong>
              {m.subject && <span className="text-neutral-500"> — {m.subject}</span>}
              <p className="whitespace-pre-wrap text-neutral-400">{m.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Results({ companies }: { companies: CompanyRow[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (companies.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Nenhuma empresa ainda. O pipeline preenche conforme processa (precisa de worker + chaves).
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-left text-neutral-400">
          <tr>
            <th className="px-4 py-2">Empresa</th>
            <th className="px-4 py-2 text-center">ICP</th>
            <th className="px-4 py-2 text-center">Intenção</th>
            <th className="px-4 py-2 text-center">Oport.</th>
            <th className="px-4 py-2">Estágio</th>
            <th className="px-4 py-2">LP</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c) => (
            <Fragment key={c.id}>
              <tr
                onClick={() => setOpen(open === c.id ? null : c.id)}
                className="cursor-pointer border-t border-neutral-800 hover:bg-neutral-900/50"
              >
                <td className="px-4 py-2">
                  {c.name}
                  {c.category && <span className="block text-xs text-neutral-500">{c.category}</span>}
                </td>
                <td className="px-4 py-2 text-center">
                  {c.icpScore ? (
                    <span className={`rounded px-2 py-0.5 text-xs font-bold text-white ${scoreColor(c.icpScore.total)}`}>
                      {c.icpScore.total}
                    </span>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center text-neutral-400">{c.icpScore?.buyingIntent ?? "—"}</td>
                <td className="px-4 py-2 text-center text-neutral-400">{c._count.opportunities}</td>
                <td className="px-4 py-2 text-neutral-400">{c.pipelineStage}</td>
                <td className="px-4 py-2">
                  {c.landingPage ? (
                    <a
                      href={`/lp/${c.landingPage.slug}`}
                      target="_blank"
                      rel="noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="text-emerald-400 hover:underline"
                    >
                      abrir ↗
                    </a>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
              </tr>
              {open === c.id && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <Expanded id={c.id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
