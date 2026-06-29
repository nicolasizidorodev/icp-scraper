import { getEnv } from "@icp/config";
import { getApiKey } from "@icp/secrets";
import type { CompanyDraft } from "@icp/core";
import type { CollectorContext, ICollector } from "./types.js";

// Google Places API (New) — Text Search.
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.primaryTypeDisplayName",
  "places.types",
  "places.businessStatus",
  "nextPageToken",
].join(",");

interface PlacesResponse {
  places?: PlaceResult[];
  nextPageToken?: string;
}
interface PlaceResult {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  primaryTypeDisplayName?: { text?: string };
  businessStatus?: string;
}

function buildQuery(c: CollectorContext["campaign"]): string {
  const what = c.subNiche ? `${c.subNiche} (${c.niche})` : c.niche;
  const where = [c.city, c.state, c.country].filter(Boolean).join(", ");
  return `${what} em ${where}`;
}

function toDraft(p: PlaceResult, country: string): CompanyDraft {
  return {
    name: p.displayName?.text ?? "(sem nome)",
    phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber,
    website: p.websiteUri,
    googlePlaceId: p.id,
    category: p.primaryTypeDisplayName?.text,
    address: p.formattedAddress,
    country,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    rating: p.rating,
    reviewCount: p.userRatingCount,
    source: "places",
    raw: p,
  };
}

export const placesCollector: ICollector = {
  name: "places",
  async isEnabled() {
    if (!getEnv().COLLECTOR_PLACES_ENABLED) return false;
    return !!(await getApiKey("GOOGLE_PLACES_API_KEY"));
  },

  async *discover(ctx: CollectorContext): AsyncIterable<CompanyDraft> {
    const apiKey = await getApiKey("GOOGLE_PLACES_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY ausente (configure na UI ou .env)");

    const textQuery = buildQuery(ctx.campaign);
    let pageToken: string | undefined;
    let emitted = 0;

    do {
      await ctx.rateLimit.acquire();
      const res = await fetch(ENDPOINT, {
        method: "POST",
        signal: ctx.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "pt-BR",
          regionCode: ctx.campaign.country,
          pageSize: 20,
          ...(pageToken ? { pageToken } : {}),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Places API ${res.status}: ${body.slice(0, 300)}`);
      }

      const data = (await res.json()) as PlacesResponse;
      for (const p of data.places ?? []) {
        if (p.businessStatus === "CLOSED_PERMANENTLY") continue;
        yield toDraft(p, ctx.campaign.country);
        emitted++;
        if (emitted >= ctx.campaign.maxCompanies) {
          ctx.logger.info({ emitted }, "places: maxCompanies atingido");
          return;
        }
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    ctx.logger.info({ emitted }, "places: fim da busca");
  },
};
