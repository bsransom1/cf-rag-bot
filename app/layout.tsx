import type { Metadata } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import Script from "next/script";

import { THEME_STORAGE_KEY } from "@/lib/theme";

import "./globals.css";

const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var r=document.documentElement;if(s==="light"){r.classList.remove("dark");}else{r.classList.add("dark");}}catch(e){}})();`;

const fontSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans-official",
});

const fontDisplay = Lora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display",
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
    <html
      lang="en"
      className={`${fontSans.variable} ${fontDisplay.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-cf-page font-sans text-cf-body antialiased">
        <Script id="cf-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
