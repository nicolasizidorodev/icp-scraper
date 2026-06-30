"use client";

import { Fragment, useEffect, useState } from "react";

interface CompanyRow {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  website: string | null;
  rating: number | null;
  reviewCount: number | null;
  pipelineStage: string;
  icpScore: { total: number; buyingIntent: number; reputation: number } | null;
  landingPage: { slug: string; status: string } | null;
  crmCard: { status: string } | null;
  websiteAudit: { exists: boolean; linkKind: string | null } | null;
  gbp: { rating: number | null } | null;
  adProfile: { runsAds: boolean } | null;
  socialProfiles: { network: string }[];
  _count: { opportunities: number };
}

function Pill({ on, label, title }: { on: boolean; label: string; title?: string }) {
  return (
    <span
      title={title}
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
        on ? "bg-emerald-900/70 text-emerald-300" : "bg-neutral-800 text-neutral-600"
      }`}
    >
      {label}
    </span>
  );
}

function Presence({ c }: { c: CompanyRow }) {
  const hasSite = !!c.websiteAudit?.exists;
  const linkKind = c.websiteAudit?.linkKind;
  const socialLink = linkKind && ["instagram", "facebook", "aggregator"].includes(linkKind);
  const nets = new Set(c.socialProfiles.map((s) => s.network));
  return (
    <div className="flex flex-wrap gap-1">
      <Pill
        on={hasSite}
        label={hasSite ? "Site" : socialLink ? `Site? (${linkKind})` : "Sem site"}
        title={socialLink ? "O link cadastrado como site é um perfil/agregador, não um site real" : undefined}
      />
      <Pill on={!!c.gbp} label="GBP" title="Google Business Profile" />
      <Pill on={nets.has("instagram")} label="IG" />
      <Pill on={nets.has("facebook")} label="FB" />
      <Pill on={!!c.adProfile?.runsAds} label="Ads" title="Investe em tráfego pago" />
    </div>
  );
}

interface Detail {
  opportunities: { id: string; title: string; detail: string; severity: string }[];
  proposal: { executiveSummary: string; priorities: string; roiEstimate: string } | null;
  messages: { channel: string; subject: string | null; body: string }[];
  landingPage: { slug: string } | null;
  website: string | null;
  websiteAudit: {
    exists: boolean;
    linkKind: string | null;
    finalUrl: string | null;
    perfScore: number | null;
    seoScore: number | null;
  } | null;
  gbp: { rating: number | null; reviewCount: number | null } | null;
  adProfile: { runsAds: boolean; networks: string[]; activeAds: number | null } | null;
  socialProfiles: { network: string; url: string | null; handle: string | null }[];
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

  const wa = d.websiteAudit;
  const siteLine = wa?.exists
    ? `${wa.finalUrl ?? d.website ?? "site"} · perf ${wa.perfScore ?? "?"} / seo ${wa.seoScore ?? "?"}`
    : wa?.linkKind && wa.linkKind !== "site" && wa.linkKind !== "none"
      ? `sem site real — link cadastrado é ${wa.linkKind}`
      : "sem site detectado";

  return (
    <div className="bg-neutral-900/50 p-4">
      <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-950/40 p-3 text-sm">
        <h4 className="mb-2 text-xs font-semibold uppercase text-neutral-500">Presença / diagnóstico</h4>
        <div className="grid gap-1 md:grid-cols-2">
          <p><span className="text-neutral-500">Site:</span> {siteLine}</p>
          <p>
            <span className="text-neutral-500">Google Business:</span>{" "}
            {d.gbp ? `${d.gbp.rating ?? "?"}★ (${d.gbp.reviewCount ?? 0} reviews)` : "não encontrado"}
          </p>
          <p>
            <span className="text-neutral-500">Redes:</span>{" "}
            {d.socialProfiles.length
              ? d.socialProfiles.map((s) => s.handle ? `${s.network}:@${s.handle}` : s.network).join(" · ")
              : "nenhuma detectada"}
          </p>
          <p>
            <span className="text-neutral-500">Anúncios:</span>{" "}
            {d.adProfile?.runsAds
              ? `sim — ${d.adProfile.networks.join(", ") || "rede n/d"}${d.adProfile.activeAds != null ? ` (${d.adProfile.activeAds} ativos)` : ""}`
              : "sem sinal de tráfego pago"}
          </p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
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
    </div>
  );
}

const FILTERS: { key: string; label: string; fn: (c: CompanyRow) => boolean }[] = [
  { key: "todos", label: "Todos", fn: () => true },
  { key: "sem-site", label: "Sem site", fn: (c) => !c.websiteAudit?.exists },
  { key: "com-site", label: "Com site", fn: (c) => !!c.websiteAudit?.exists },
  { key: "com-ig", label: "Com IG", fn: (c) => c.socialProfiles.some((s) => s.network === "instagram") },
  { key: "sem-ig", label: "Sem IG", fn: (c) => !c.socialProfiles.some((s) => s.network === "instagram") },
  { key: "com-ads", label: "Com ads", fn: (c) => !!c.adProfile?.runsAds },
  { key: "sem-ads", label: "Sem ads", fn: (c) => !c.adProfile?.runsAds },
];

const CRM_STATUSES = ["NEW", "CONTACTED", "REPLIED", "MEETING", "PROPOSAL", "WON", "LOST"] as const;

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(rows: CompanyRow[], crm: Record<string, string>): void {
  const head = ["Empresa","Nicho","Cidade","Avaliacao","Reviews","ICP","Intencao","Site","LinkKind","Instagram","Ads","Estagio","CRM","LP"];
  const lines = rows.map((c) =>
    [
      c.name, c.category, c.city,
      c.rating ?? "", c.reviewCount ?? "",
      c.icpScore?.total ?? "", c.icpScore?.buyingIntent ?? "",
      c.websiteAudit?.exists ? "sim" : "nao", c.websiteAudit?.linkKind ?? "",
      c.socialProfiles.some((s) => s.network === "instagram") ? "sim" : "nao",
      c.adProfile?.runsAds ? "sim" : "nao",
      c.pipelineStage,
      crm[c.id] ?? c.crmCard?.status ?? "",
      c.landingPage ? `${location.origin}/lp/${c.landingPage.slug}` : "",
    ].map(csvCell).join(","),
  );
  const csv = [head.join(","), ...lines].join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "empresas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function Results({ companies }: { companies: CompanyRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState("todos");
  const [query, setQuery] = useState("");
  const [crm, setCrm] = useState<Record<string, string>>({});

  if (companies.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Nenhuma empresa ainda. O pipeline preenche conforme processa (precisa de worker + chaves).
      </p>
    );
  }

  async function moveCrm(companyId: string, status: string) {
    setCrm((m) => ({ ...m, [companyId]: status }));
    await fetch("/api/crm", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, status }),
    }).catch(() => undefined);
  }

  const filter = FILTERS.find((f) => f.key === tab) ?? FILTERS[0]!;
  const q = query.trim().toLowerCase();
  const rows = companies.filter(filter.fn).filter((c) =>
    !q ? true : `${c.name} ${c.category ?? ""} ${c.city ?? ""}`.toLowerCase().includes(q),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nome, nicho, cidade…"
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={() => exportCsv(rows, crm)}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
        >
          ↓ Exportar CSV ({rows.length})
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => {
          const count = companies.filter(f.fn).length;
          const active = f.key === tab;
          return (
            <button
              key={f.key}
              onClick={() => setTab(f.key)}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "bg-neutral-800 font-medium text-neutral-100"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
              }`}
            >
              {f.label} <span className="text-neutral-500">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-neutral-400">
            <tr>
              <th className="px-4 py-2">Empresa</th>
              <th className="px-4 py-2 text-center">ICP</th>
              <th className="px-4 py-2 text-center">Intenção</th>
              <th className="px-4 py-2 text-center">Avaliação</th>
              <th className="px-4 py-2 text-center">Oport.</th>
              <th className="px-4 py-2">Presença</th>
              <th className="px-4 py-2">Estágio</th>
              <th className="px-4 py-2">CRM</th>
              <th className="px-4 py-2">LP</th>
            </tr>
          </thead>
        <tbody>
          {rows.map((c) => (
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
                <td className="px-4 py-2 text-center text-neutral-400">
                  {c.rating != null ? (
                    <span title={`${c.reviewCount ?? 0} avaliações`}>
                      {c.rating.toFixed(1)}★{" "}
                      <span className="text-xs text-neutral-600">({c.reviewCount ?? 0})</span>
                    </span>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center text-neutral-400">{c._count.opportunities}</td>
                <td className="px-4 py-2"><Presence c={c} /></td>
                <td className="px-4 py-2 text-neutral-400">{c.pipelineStage}</td>
                <td className="px-4 py-2">
                  {c.crmCard ? (
                    <select
                      value={crm[c.id] ?? c.crmCard.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => moveCrm(c.id, e.target.value)}
                      className="rounded bg-neutral-800 px-1.5 py-1 text-xs outline-none"
                    >
                      {CRM_STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
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
                  <td colSpan={9} className="p-0">
                    <Expanded id={c.id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
