import { listApiKeyStatus } from "@icp/secrets";
import { KeyForm } from "./key-form";

export const dynamic = "force-dynamic";

// Rótulos amigáveis + onde obter cada chave.
const META: Record<string, { label: string; hint: string }> = {
  GOOGLE_PLACES_API_KEY: { label: "Google Places", hint: "Descoberta de empresas (Maps)" },
  PAGESPEED_API_KEY: { label: "PageSpeed Insights", hint: "Análise de performance/Lighthouse" },
  GOOGLE_MAPS_API_KEY: { label: "Google Maps", hint: "Geocoding (opcional)" },
  ANTHROPIC_API_KEY: { label: "Anthropic (Claude)", hint: "Relatórios, copy, LP" },
  OPENAI_API_KEY: { label: "OpenAI", hint: "Provider alternativo de IA" },
  APIFY_TOKEN: { label: "Apify", hint: "Actors pagos (opcional)" },
};

export default async function SettingsPage() {
  const keys = await listApiKeyStatus();
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Chaves de API</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Insira suas chaves aqui. Ficam criptografadas no banco e têm prioridade sobre variáveis de
        ambiente. O valor nunca é exibido de volta — só os 4 últimos dígitos.
      </p>
      <div className="mt-6 flex flex-col gap-4">
        {keys.map((k) => (
          <KeyForm key={k.name} status={k} meta={META[k.name] ?? { label: k.name, hint: "" }} />
        ))}
      </div>
    </main>
  );
}
