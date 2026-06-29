export { analyzeWebsite } from "./website/index.js";
export type { WebsiteAnalysis } from "./website/types.js";
export { extractPalette } from "./visual/palette.js";
export { detectSocial, type SocialHit } from "./social/detect.js";
export { fetchGbpDetails, type GbpResult } from "./gbp/index.js";
export { classifyLink, type LinkKind } from "./website/classify.js";
export { detectAdSignals, type AdSignals } from "./ads/detect.js";
export { fetchMetaAds, type AdLibraryResult } from "./ads/adlibrary.js";
