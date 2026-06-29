import type { CompanyDraft } from "@icp/core";

// Normaliza texto: minúsculo, sem acento, só alfanumérico.
function norm(s?: string): string {
  if (!s) return "";
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove diacríticos combinantes
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function domain(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function phoneDigits(p?: string): string {
  return (p ?? "").replace(/\D/g, "").slice(-9); // ignora DDI/0 inicial
}

/**
 * Chave de dedupe estável. Prioriza placeId (id forte do Google);
 * senão, combina domínio | telefone | nome+cidade.
 */
export function dedupeKey(d: CompanyDraft): string {
  if (d.googlePlaceId) return `place:${d.googlePlaceId}`;
  const dom = domain(d.website);
  if (dom) return `dom:${dom}`;
  const phone = phoneDigits(d.phone ?? d.whatsapp);
  if (phone) return `tel:${phone}`;
  return `nc:${norm(d.name)}:${norm(d.city ?? d.address)}`;
}

/** Funde dois drafts da mesma empresa (vindos de fontes diferentes). */
export function mergeDrafts(a: CompanyDraft, b: CompanyDraft): CompanyDraft {
  return {
    ...a,
    phone: a.phone ?? b.phone,
    whatsapp: a.whatsapp ?? b.whatsapp,
    email: a.email ?? b.email,
    website: a.website ?? b.website,
    instagram: a.instagram ?? b.instagram,
    facebook: a.facebook ?? b.facebook,
    linkedin: a.linkedin ?? b.linkedin,
    googlePlaceId: a.googlePlaceId ?? b.googlePlaceId,
    category: a.category ?? b.category,
    cnpj: a.cnpj ?? b.cnpj,
    address: a.address ?? b.address,
    city: a.city ?? b.city,
    state: a.state ?? b.state,
    lat: a.lat ?? b.lat,
    lng: a.lng ?? b.lng,
    rating: a.rating ?? b.rating,
    reviewCount: a.reviewCount ?? b.reviewCount,
    photoCount: a.photoCount ?? b.photoCount,
  };
}
