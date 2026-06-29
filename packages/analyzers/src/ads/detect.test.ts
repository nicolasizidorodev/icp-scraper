import { describe, it, expect } from "vitest";
import { detectAdSignals } from "./detect.js";

describe("detectAdSignals", () => {
  it("detecta Google Ads (tag AW- + conversão)", () => {
    const html = `<script>gtag('config','AW-123456789');</script>
      <img src="https://googleadservices.com/pagead/conversion/123/">`;
    const r = detectAdSignals(html);
    expect(r.runsAdsLikely).toBe(true);
    expect(r.networks).toContain("Google Ads");
  });

  it("detecta Meta Ads por evento de conversão", () => {
    const r = detectAdSignals(`<script>fbq('track','Purchase');</script>`);
    expect(r.runsAdsLikely).toBe(true);
    expect(r.networks).toContain("Meta Ads");
  });

  it("detecta TikTok e LinkedIn", () => {
    const html = `<script src="https://analytics.tiktok.com/i18n/pixel/events.js"></script>
      <script>_linkedin_partner_id="123";</script>`;
    const r = detectAdSignals(html);
    expect(r.networks).toContain("TikTok Ads");
    expect(r.networks).toContain("LinkedIn Ads");
  });

  it("site sem mídia paga → runsAdsLikely false", () => {
    const r = detectAdSignals("<html><body><h1>Oi</h1></body></html>");
    expect(r.runsAdsLikely).toBe(false);
    expect(r.networks).toHaveLength(0);
  });

  it("analytics puro (GA sem ads) não conta como mídia paga", () => {
    const r = detectAdSignals(`<script src="https://www.google-analytics.com/analytics.js"></script>`);
    expect(r.runsAdsLikely).toBe(false);
  });
});
