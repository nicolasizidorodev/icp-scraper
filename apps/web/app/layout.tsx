import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ICP Prospector",
  description: "Prospecção B2B orientada a ICP com análise profunda e LP automática",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
