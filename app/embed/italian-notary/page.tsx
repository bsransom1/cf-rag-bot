import ChatWindow from "@/components/ChatWindow";
import { getProject } from "@/lib/config/project";
import type { Metadata } from "next";

const project = getProject("italian_notary");

export const metadata: Metadata = {
  title: `${project.brandName ?? project.name} — Assistant`,
  description: "Embedded FAQ assistant for Italian notarial services.",
  robots: { index: false, follow: false },
};

export default function ItalianNotaryEmbedPage() {
  return (
    <ChatWindow
      projectId="italian_notary"
      variant="embed"
      brandName={project.brandName ?? "ItalianNotary.com"}
    />
  );
}
