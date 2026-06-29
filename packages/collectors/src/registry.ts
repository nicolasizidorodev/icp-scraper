import type { ICollector } from "./types.js";
import { placesCollector } from "./places.js";

// Todos os collectors conhecidos. Próximas fontes (cnpj, social) entram aqui.
const ALL: ICollector[] = [placesCollector];

/** Apenas os habilitados (flag de config ligada + chave resolvível via UI/env). */
export async function getEnabledCollectors(): Promise<ICollector[]> {
  const flags = await Promise.all(ALL.map((c) => c.isEnabled()));
  return ALL.filter((_, i) => flags[i]);
}
