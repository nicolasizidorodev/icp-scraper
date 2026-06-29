import { describe, it, expect } from "vitest";
import { detectTech } from "./techdetect.js";
import { parseOnpage } from "./onpage.js";

describe("detectTech", () => {
  it("identifica WordPress + Meta Pixel + WhatsApp", () => {
    const html = `
      <link href="/wp-content/themes/x/style.css">
      <script>!function(f){fbq('init','123')}(window);</script>
      <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
      <a href="https://wa.me/5511999999999">Fale conosco</a>`;
    const t = detectTech(html);
    expect(t.cms).toBe("WordPress");
    expect(t.hasMetaPixel).toBe(true);
    expect(t.hasWhatsappBtn).toBe(true);
    expect(t.techStack).toContain("Meta Pixel");
  });

  it("identifica Next.js + GTM", () => {
    const html = `<script src="/_next/static/chunk.js"></script>
      <script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABCD"></script>`;
    const t = detectTech(html);
    expect(t.framework).toBe("Next.js");
    expect(t.hasGTM).toBe(true);
  });

  it("site sem rastreadores → flags falsas", () => {
    const t = detectTech("<html><body><h1>Oi</h1></body></html>");
    expect(t.hasMetaPixel).toBe(false);
    expect(t.hasGA).toBe(false);
    expect(t.techStack).toHaveLength(0);
  });

  it("detecta booking via Calendly", () => {
    expect(detectTech('<a href="https://calendly.com/x">Agendar</a>').hasBooking).toBe(true);
  });
});

describe("parseOnpage", () => {
  it("extrai meta, headings e flags", () => {
    const html = `<html><head>
        <title>Clínica X</title>
        <meta name="description" content="A melhor clínica">
        <meta name="viewport" content="width=device-width">
        <meta property="og:title" content="Clínica X">
        <link rel="canonical" href="https://x.com/">
        <link rel="icon" href="/fav.ico">
        <script type="application/ld+json">{}</script>
      </head><body>
        <h1>Bem-vindo</h1><h1>Segundo H1</h1>
        <form></form>
        <a href="https://x.com/blog">Blog</a>
        <a href="https://x.com/sobre">Sobre</a>
        <a href="https://externo.com">Ext</a>
      </body></html>`;
    const r = parseOnpage(html, "https://x.com/");
    expect(r.title).toBe("Clínica X");
    expect(r.description).toBe("A melhor clínica");
    expect(r.responsive).toBe(true);
    expect(r.hasSchema).toBe(true);
    expect(r.hasOG).toBe(true);
    expect(r.hasFavicon).toBe(true);
    expect(r.hasForms).toBe(true);
    expect(r.hasBlog).toBe(true);
    expect(r.headingIssues.multipleH1).toBe(true);
    expect(r.internalLinks).toBe(2);
  });

  it("sinaliza missingH1", () => {
    const r = parseOnpage("<html><body><p>nada</p></body></html>", "https://x.com/");
    expect(r.headingIssues.missingH1).toBe(true);
  });
});
