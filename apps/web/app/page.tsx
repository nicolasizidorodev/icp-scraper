import Link from "next/link";
import { prisma } from "@icp/db";
import { Nav } from "./_components/nav";
import { CampaignForm } from "./_components/campaign-form";

export const dynamic = "force-dynamic";

const statusColor: Record<string, string> = {
  DRAFT: "text-neutral-400",
  DISCOVERING: "text-blue-400",
  ANALYZING: "text-amber-400",
  COMPLETED: "text-emerald-400",
  FAILED: "text-red-400",
  CANCELLED: "text-neutral-500",
};

export default async function Home() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      niche: true,
      subNiche: true,
      city: true,
      state: true,
      status: true,
      discovered: true,
      qualified: true,
      _count: { select: { companies: true } },
    },
  });

  return (
    <>
      <Nav />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 p-6">
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold">Nova campanha</h1>
          <CampaignForm />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Campanhas</h2>
          {campaigns.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhuma campanha ainda. Crie a primeira acima.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900 text-left text-neutral-400">
                  <tr>
                    <th className="px-4 py-2">Nicho</th>
                    <th className="px-4 py-2">Local</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Empresas</th>
                    <th className="px-4 py-2 text-right">Qualificadas</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-t border-neutral-800">
                      <td className="px-4 py-2">
                        {c.niche}
                        {c.subNiche && <span className="text-neutral-500"> · {c.subNiche}</span>}
                      </td>
                      <td className="px-4 py-2 text-neutral-400">
                        {[c.city, c.state].filter(Boolean).join("/")}
                      </td>
                      <td className={`px-4 py-2 ${statusColor[c.status] ?? ""}`}>{c.status}</td>
                      <td className="px-4 py-2 text-right">{c._count.companies}</td>
                      <td className="px-4 py-2 text-right">{c.qualified}</td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/campaigns/${c.id}`} className="text-emerald-400 hover:underline">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
