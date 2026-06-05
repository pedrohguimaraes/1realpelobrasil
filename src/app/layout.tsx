import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Garante que o conteúdo respeita o notch/home indicator do iPhone
  viewportFit: "cover",
  themeColor: "#0a0a0f",
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "1 Real pelo Brasil - Votação Beneficente",
  description:
    "Vote anonimamente entre dois candidatos. R$1 por voto via Pix. O valor vira compra de alimentos e utensílios entregues na Caritas Arquidiocesana de São Paulo.",
  openGraph: {
    title: "1 Real pelo Brasil - Votação Beneficente",
    description:
      "Vote anonimamente entre dois candidatos. R$1 por voto via Pix. O valor vira compra de alimentos e utensílios entregues na Caritas Arquidiocesana de São Paulo.",
    url: siteUrl,
    siteName: "1 Real pelo Brasil",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "1 Real pelo Brasil - Votação Beneficente",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "1 Real pelo Brasil - Votação Beneficente",
    description:
      "Vote anonimamente entre dois candidatos. R$1 por voto via Pix. O valor vira compra de alimentos e utensílios entregues na Caritas Arquidiocesana de São Paulo.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
