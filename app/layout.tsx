import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";

import "./globals.css";

const fontSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans-official",
});

export const metadata: Metadata = {
  title: "CodiceFiscale.ai — Assistant",
  description:
    "Ask questions about the Italian codice fiscale. Answers are grounded in a curated knowledge base.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontSans.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
