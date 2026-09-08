import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ItalianNotary.com — Embed preview",
  robots: { index: false, follow: false },
};

export default function ItalianNotaryEmbedPreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
