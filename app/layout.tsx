import type { Metadata } from "next";
import { Playfair_Display, Nunito, Libre_Baskerville, Crimson_Text, DM_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre",
});

const crimsonText = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-crimson",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://saikomaps.com';

export const metadata: Metadata = {
  title: {
    default: 'Saiko Maps — Curated Maps for People Who Care Where They Go',
    template: '%s | Saiko Maps',
  },
  description:
    'Discover curated restaurant guides, wine bars, and neighborhood gems in Los Angeles — or create your own map to share.',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Saiko Maps',
    title: 'Saiko Maps — Curated Maps for People Who Care Where They Go',
    description:
      'Discover curated restaurant guides, wine bars, and neighborhood gems in Los Angeles — or create your own map to share.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Saiko Maps',
    description:
      'Discover curated restaurant guides, wine bars, and neighborhood gems — or create your own map to share.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${nunito.variable} ${libreBaskerville.variable} ${crimsonText.variable} ${dmSans.variable} ${instrumentSerif.variable}`}>
      <body suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
