import ChatWindow from "@/components/ChatWindow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CodiceFiscale.ai — Assistant",
  description: "Embedded FAQ assistant for the Italian codice fiscale.",
  robots: { index: false, follow: false },
};

export default function EmbedPage() {
  return <ChatWindow projectId="italian_immigration" variant="embed" />;
}
