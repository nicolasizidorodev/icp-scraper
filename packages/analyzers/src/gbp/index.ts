import { getApiKey } from "@icp/secrets";
import type { AuditStatus } from "@icp/core";

// Google Place Details (New). Aprofunda o perfil GBP além do que veio na descoberta.
const FIELD_MASK = [
  "id",
  "rating",
  "userRatingCount",
  "reviews",
  "photos",
  "types",
  "primaryTypeDisplayName",
  "editorialSummary",
  "businessStatus",
].join(",");

interface PlaceDetails {
  rating?: number;
  userRatingCount?: number;
  reviews?: { rating?: number; publishTime?: string }[];
  photos?: unknown[];
  types?: string[];
  primaryTypeDisplayName?: { text?: string };
  editorialSummary?: { text?: string };
}

export interface GbpResult {
  rating?: number;
  reviewCount?: number;
  reviewFrequency?: number; // reviews/mês estimado
  lastReviewAt?: Date;
  photoCount?: number;
  categories: string[];
  description?: string;
  status: AuditStatus;
  raw?: unknown;
}

/** Estima reviews/mês a partir dos publishTimes disponíveis (amostra limitada). */
function estimateFrequency(reviews: { publishTime?: string }[]): {
  freq?: number;
  last?: Date;
} {
  const times = reviews
    .map((r) => (r.publishTime ? new Date(r.publishTime) : null))
    .filter((d): d is Date => !!d && !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  if (times.length === 0) return {};
  const last = times[times.length - 1]!;
  if (times.length < 2) return { last };
  const spanMs = last.getTime() - times[0]!.getTime();
  const months = Math.max(1, spanMs / (1000 * 60 * 60 * 24 * 30));
  return { freq: Number((times.length / months).toFixed(2)), last };
}

/** Busca detalhes GBP de um place. Degradável: lança em erro de API/sem chave. */
export async function fetchGbpDetails(placeId: string): Promise<GbpResult> {
  const apiKey = await getApiKey("GOOGLE_PLACES_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY ausente (configure na UI ou .env)");

  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
  });
  if (!res.ok) {
    throw new Error(`Place Details ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const d = (await res.json()) as PlaceDetails;
  const { freq, last } = estimateFrequency(d.reviews ?? []);
  const categories = [d.primaryTypeDisplayName?.text, ...(d.types ?? [])].filter(
    (x): x is string => !!x,
  );

  return {
    rating: d.rating,
    reviewCount: d.userRatingCount,
    reviewFrequency: freq,
    lastReviewAt: last,
    photoCount: d.photos?.length,
    categories: [...new Set(categories)],
    description: d.editorialSummary?.text,
    status: "OK",
  };
}
