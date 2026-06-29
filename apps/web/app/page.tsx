export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">ICP Prospector</h1>
      <p className="text-neutral-400">
        Fundação (F0) no ar. Dashboard, CRM e disparo de campanha chegam nas fases F1–F7 (ver{" "}
        <code className="rounded bg-neutral-800 px-1">PLAN.md</code>).
      </p>
      <ul className="list-inside list-disc text-sm text-neutral-500">
        <li>web + worker + Postgres + Redis sobem via Docker</li>
        <li>pipeline BullMQ (10 estágios) + Google Places + dedupe</li>
        <li>chaves de API configuráveis pela própria UI</li>
      </ul>
      <a
        href="/settings"
        className="w-fit rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
      >
        Configurar chaves de API →
      </a>
    </main>
  );
}
