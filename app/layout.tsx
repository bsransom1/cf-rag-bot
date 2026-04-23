import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
